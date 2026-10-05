import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionPill, FlatEmpty, IdentityRow, PillTabs } from '@/components/ui/flat';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { useTeam, useTeamTables } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { useTeamEvents } from '@/features/events/hooks/use-events';
import { useFavorites, useToggleFavoriteTeam } from '@/features/follows/hooks/use-favorites';
import { useFollowActions } from '@/features/follows/hooks/use-follow-actions';
import { useTeamSquad } from '@/features/players/hooks/use-football-players';
import { LeagueTableCard } from '@/features/teams/components/league-table';
import { TeamEventRow } from '@/features/teams/components/team-event-row';
import { isTeamEventLive, splitTeamSeasonEvents } from '@/features/teams/lib/team-season';
import { useI18n } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import { useNow } from '@/lib/now';
type Tab = 'results' | 'fixtures' | 'squad' | 'standings';

/**
 * A club's own page: its upcoming fixtures grouped per competition (so a cup
 * tie never hides between league games) and the table of every competition it
 * plays in.
 */
export default function TeamScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('fixtures');

  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { events, isLoading: eventsLoading, refetch, isRefetching } = useTeamEvents(teamId);
  // Only pulled once the tab is opened: it fans out to one request per league.
  const { data: tables, isLoading: tablesLoading } = useTeamTables(
    tab === 'standings' ? teamId : undefined,
  );
  // Kadro kaynagi sunucuda secilir: BSD -> TheSportsDB -> ayni kulubun
  // kimlikli kardes satiri. Takim sporlari icin sekme hep gorunur; veri
  // bulunamadiginda "kadro yok" karti gosterilir. Istek ancak sekme acikken gider.
  const hasSquad = Boolean(team && hasTeams(team.sportId));
  const { data: squad, isLoading: squadLoading } = useTeamSquad(
    tab === 'squad' && hasSquad ? teamId : undefined,
  );
  const { isFollowing, toggleFollow } = useFollowActions();
  const { favoriteTeamIds } = useFavorites();
  const toggleFavoriteTeam = useToggleFavoriteTeam();

  // Kadro sekmesi secilemeyen takimda (takim sporu degil) "kadro yok"
  // kartiyla degil fiksturle acilmali.
  const activeTab: Tab = team && !hasSquad && tab === 'squad' ? 'fixtures' : tab;

  const season = useMemo(() => splitTeamSeasonEvents(events, now), [events, now]);
  const following = isFollowing('team', teamId);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'fixtures', label: t('team.fixtures') },
    { key: 'results', label: t('team.results') },
    { key: 'standings', label: t('team.standings') },
    ...(hasSquad ? [{ key: 'squad' as Tab, label: t('team.squad') }] : []),
  ];
  const favorite = favoriteTeamIds.has(teamId);

  if (!team && !teamLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Text className="pt-8 text-base text-ink-secondary">{t('team.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Stack.Screen options={{ title: team?.name ?? '' }} />
      <View className="pt-2">
        <IdentityRow
          imageUrl={team?.logoUrl ? logoThumb(team.logoUrl) : null}
          title={team?.name ?? ''}
          subtitle={season.upcoming[0]?.leagueName ?? season.results[0]?.leagueName ?? null}
        />
        <View className="mb-3 flex-row gap-2">
          <ActionPill
            label={following ? t('team.following') : t('team.follow')}
            icon={following ? 'checkmark' : 'add'}
            active={following}
            onPress={() => toggleFollow('team', teamId)}
          />
          <ActionPill
            label={favorite ? t('team.favorite') : t('team.addFavorite')}
            icon={favorite ? 'star' : 'star-outline'}
            tone="favorite"
            active={favorite}
            onPress={() => {
              if (!favorite && !following) toggleFollow('team', teamId);
              toggleFavoriteTeam.mutate({ teamId, isFavorite: favorite });
            }}
          />
        </View>

        <PillTabs tabs={tabs} value={activeTab} onChange={setTab} />

        {!team && teamLoading ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : activeTab === 'squad' ? (
          squadLoading ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (squad ?? []).length === 0 ? (
            <FlatEmpty message={t('team.noSquad')} />
          ) : (
            <View>
              {(squad ?? []).map((p) => {
                const row = (
                  <>
                    {p.photoUrl ? (
                      <Image
                        source={{ uri: p.photoUrl }}
                        style={{ width: 30, height: 30, borderRadius: 15 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-raised">
                        <Ionicons name="person" size={16} color={colors.inkTertiary} />
                      </View>
                    )}
                    <Text className="w-7 text-center text-sm font-bold text-ink-secondary">
                      {p.jerseyNumber ?? ''}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="text-xs text-ink-tertiary" numberOfLines={1}>
                        {[p.position, p.nationality].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    {p.availability && p.availability !== 'available' && (
                      <Ionicons name="bandage" size={14} color={colors.danger} />
                    )}
                    {p.bsdId && (
                      <Ionicons name="chevron-forward" size={16} color={colors.inkTertiary} />
                    )}
                  </>
                );
                // Profil ekrani yalnizca BSD kimligine sahip oyuncularda var.
                return p.bsdId ? (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/football-player/${p.bsdId}`)}
                    className="flex-row items-center gap-3 border-b border-line py-2.5 last:border-b-0 active:opacity-60"
                  >
                    {row}
                  </Pressable>
                ) : (
                  <View
                    key={p.id}
                    className="flex-row items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    {row}
                  </View>
                );
              })}
            </View>
          )
        ) : activeTab === 'results' || activeTab === 'fixtures' ? (
          eventsLoading ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (activeTab === 'results' ? season.results : season.upcoming).length === 0 ? (
            <FlatEmpty message={t(activeTab === 'results' ? 'team.noResults' : 'team.noFixtures')} />
          ) : (
            (activeTab === 'results' ? season.results : season.upcoming).map((event) => (
              <TeamEventRow
                key={event.id}
                event={event}
                teamId={teamId}
                live={activeTab === 'fixtures' && isTeamEventLive(event, now)}
              />
            ))
          )
        ) : tablesLoading ? (
          <View className="items-center gap-2 py-6">
            <ActivityIndicator color={colors.primaryDark} />
            <Text className="text-sm text-ink-secondary">{t('team.standingsLoading')}</Text>
          </View>
        ) : (tables ?? []).length === 0 ? (
          <FlatEmpty message={t('team.noStandings')} />
        ) : (
          (tables ?? []).map((table) => (
            <LeagueTableCard
              key={table.leagueId}
              table={table}
              highlightTeam={team?.name ?? null}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
