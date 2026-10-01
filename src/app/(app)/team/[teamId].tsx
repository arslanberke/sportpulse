import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
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
import { useNow } from '@/lib/now';
type Tab = 'results' | 'fixtures' | 'squad' | 'standings';

function TabBar({ tab, onChange, hasSquad }: { tab: Tab; onChange: (tab: Tab) => void; hasSquad: boolean }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const tabs: { key: Tab; label: string }[] = [
    { key: 'fixtures', label: t('team.fixtures') },
    { key: 'results', label: t('team.results') },
    ...(hasSquad ? [{ key: 'squad' as Tab, label: t('team.squad') }] : []),
    { key: 'standings', label: t('team.standings') },
  ];

  return (
    <View className="mb-4 flex-row rounded-button bg-surface-raised p-1">
      {tabs.map((item) => {
        const active = item.key === tab;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className="flex-1 items-center rounded-button py-2.5 active:opacity-70"
            style={active ? { backgroundColor: colors.primary } : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: active ? '#FFFFFF' : colors.inkSecondary }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      <View className="pt-4">
        <Card className="mb-4" index={0}>
          <View className="flex-row items-center gap-3">
            {team?.logoUrl && (
              <Image
                source={{ uri: team.logoUrl }}
                style={{ width: 48, height: 48 }}
                contentFit="contain"
              />
            )}
            <Text className="flex-1 text-xl font-bold text-ink" numberOfLines={2}>
              {team?.name ?? ''}
            </Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => toggleFollow('team', teamId)}
              hitSlop={8}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-button px-3 py-2 active:opacity-70"
              style={{
                backgroundColor: following ? `${colors.primary}1F` : colors.primary,
              }}
            >
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={16}
                color={following ? colors.primary : colors.onPrimary}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: following ? colors.primaryDark : colors.onPrimary }}
              >
                {following ? t('team.following') : t('team.follow')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!favorite && !following) toggleFollow('team', teamId);
                toggleFavoriteTeam.mutate({ teamId, isFavorite: favorite });
              }}
              hitSlop={8}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-button border px-3 py-2 active:opacity-70"
              style={{
                borderColor: favorite ? FAVORITE_COLOR : colors.border,
                backgroundColor: favorite ? `${FAVORITE_COLOR}1F` : 'transparent',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: favorite }}
            >
              <Ionicons
                name={favorite ? 'star' : 'star-outline'}
                size={16}
                color={favorite ? FAVORITE_COLOR : colors.inkSecondary}
              />
              <Text className="text-sm font-semibold text-ink">
                {favorite ? t('team.favorite') : t('team.addFavorite')}
              </Text>
            </Pressable>
          </View>
        </Card>

        <TabBar tab={activeTab} onChange={setTab} hasSquad={hasSquad} />

        {!team && teamLoading ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : activeTab === 'squad' ? (
          squadLoading ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (squad ?? []).length === 0 ? (
            <Card index={1}>
              <Text className="text-sm text-ink-secondary">{t('team.noSquad')}</Text>
            </Card>
          ) : (
            <Card index={1}>
              {(squad ?? []).map((p) => {
                const row = (
                  <>
                    {p.photoUrl ? (
                      <Image
                        source={{ uri: p.photoUrl }}
                        style={{ width: 34, height: 34, borderRadius: 17 }}
                        contentFit="cover"
                        allowDownscaling={false}
                      />
                    ) : (
                      <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-raised">
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
            </Card>
          )
        ) : activeTab === 'results' || activeTab === 'fixtures' ? (
          eventsLoading ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (activeTab === 'results' ? season.results : season.upcoming).length === 0 ? (
            <Card index={1}>
              <Text className="text-sm text-ink-secondary">
                {t(activeTab === 'results' ? 'team.noResults' : 'team.noFixtures')}
              </Text>
            </Card>
          ) : (
            (activeTab === 'results' ? season.results : season.upcoming).map((event) => (
              <TeamEventRow
                key={event.id}
                event={event}
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
          <Card index={1}>
            <Text className="text-sm text-ink-secondary">{t('team.noStandings')}</Text>
          </Card>
        ) : (
          (tables ?? []).map((table, i) => (
            <LeagueTableCard
              key={table.leagueId}
              table={table}
              highlightTeam={team?.name ?? null}
              index={i}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
