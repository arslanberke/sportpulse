import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { ActionPill, FlatEmpty, IdentityRow, PillTabs } from '@/components/ui/flat';
import { Screen } from '@/components/ui/screen';
import { FlatHeader } from '@/components/ui/section-header';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useLeagueTables, useSports, useTeams } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { useLeagueEvents } from '@/features/events/hooks/use-events';
import { useLeagueStart } from '@/features/events/hooks/use-league-start';
import { FollowRow } from '@/features/follows/components/follow-row';
import {
  useFavoriteTeams,
  useToggleFavoriteTeam,
} from '@/features/follows/hooks/use-favorites';
import {
  useFollowActions,
  type FollowGroup,
} from '@/features/follows/hooks/use-follow-actions';
import { LeagueEventRow } from '@/features/leagues/components/league-event-row';
import { LeagueTableCard } from '@/features/teams/components/league-table';
import { isTeamEventLive } from '@/features/teams/lib/team-season';
import { formatDay, formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import { useNow } from '@/lib/now';
import { matchesAny, searchNeedles } from '@/lib/search';
import type { SportEvent } from '@/types';

type Tab = 'results' | 'fixtures' | 'standings' | 'teams';
const TABS: Tab[] = ['results', 'fixtures', 'standings', 'teams'];

/** Ayni gune dusen maclar tek baslik altinda. */
function groupByDay(events: SportEvent[]) {
  const groups: { key: string; date: Date; events: SportEvent[] }[] = [];
  for (const event of events) {
    const date = new Date(event.startsAt);
    const key = date.toDateString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, date, events: [event] });
  }
  return groups;
}

/**
 * Ligin kendi sayfasi: sonuclar, fikstur, puan durumu ve takimlar. Takip
 * dugmesi ustte; takim takibi Takimlar sekmesinde. Aramadan gelince Sonuclar
 * ile acilir, `?tab=` ile baska sekme istenebilir.
 */
export default function LeagueScreen() {
  const { leagueId, tab: initialTab } = useLocalSearchParams<{ leagueId: string; tab?: string }>();
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const { data: leagues } = useLeagues();
  const { data: sports } = useSports();
  const { data: teams } = useTeams(leagueId);
  const { isFollowing, toggleAll, toggleWithin } = useFollowActions();
  const { favoriteTeamIds } = useFavoriteTeams();
  const toggleFavorite = useToggleFavoriteTeam();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>(
    TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'results',
  );

  const league = (leagues ?? []).find((l) => l.id === leagueId);
  const sport = (sports ?? []).find((s) => s.id === league?.sportId);
  const leagueStart = useLeagueStart(league);
  const { events, isLoading: eventsLoading, refetch, isRefetching } = useLeagueEvents(leagueId);
  // Yalnizca sekme acilinca istenir.
  const { data: table, isLoading: tableLoading } = useLeagueTables(
    tab === 'standings' ? leagueId : undefined,
  );

  // Kupalarda kadro tutulmaz (sync_teams kapali), dolayisiyla takim listesi
  // hicbir zaman dolmaz; "kadro senkronlaninca gorunecek" demek yaniltir. Yine
  // de fiksturden bazi takimlar eklenmis olabilir, liste bos degilse gosterilir.
  const rosterKept = league?.syncTeams !== false;
  const hasRoster = (teams ?? []).length > 0;
  const teamLevel = hasTeams(league?.sportId) && (rosterKept || hasRoster);
  const leagueFollowed = isFollowing('league', leagueId);
  // Following the parent sport already brings in every team below it.
  const sportFollowed = league ? isFollowing('sport', league.sportId) : false;
  const covered = leagueFollowed || sportFollowed;

  const { results, upcoming } = useMemo(() => {
    const live = events.filter((e) => isTeamEventLive(e, now));
    const past = events
      .filter((e) => new Date(e.startsAt) < now && !isTeamEventLive(e, now))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    const next = events.filter((e) => new Date(e.startsAt) >= now);
    return { results: past, upcoming: [...live, ...next] };
  }, [events, now]);

  const visibleTeams = useMemo(() => {
    const needles = searchNeedles(search);
    return (teams ?? []).filter((team) => matchesAny([team.name], needles));
  }, [teams, search]);

  const group: FollowGroup = useMemo(
    () => ({
      parentKind: 'league',
      parentId: leagueId,
      childKind: 'team',
      childIds: (teams ?? []).map((team) => team.id),
    }),
    [leagueId, teams],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'results', label: t('team.results') },
    { key: 'fixtures', label: t('team.fixtures') },
    { key: 'standings', label: t('team.standings') },
    ...(teamLevel ? [{ key: 'teams' as Tab, label: t('explore.teams') }] : []),
  ];
  const activeTab: Tab = !teamLevel && tab === 'teams' ? 'results' : tab;

  const sportName = sport ? (language === 'tr' ? sport.nameTr : sport.nameEn) : null;
  const subtitle = [sportName, hasRoster ? `${(teams ?? []).length} ${t('explore.teams').toLowerCase()}` : null]
    .filter(Boolean)
    .join(' · ');

  const renderDays = (list: SportEvent[], liveOnTop: boolean) =>
    groupByDay(list).map((day) => (
      <View key={day.key}>
        <FlatHeader
          label={formatDay(day.date)}
          note={t('league.matchCount', { count: day.events.length })}
        />
        {day.events.map((event) => (
          <LeagueEventRow
            key={event.id}
            event={event}
            live={liveOnTop && isTeamEventLive(event, now)}
          />
        ))}
      </View>
    ));

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Stack.Screen options={{ title: league?.name ?? '' }} />
      <View className="pt-2">
        <IdentityRow
          imageUrl={league?.logoUrl ? logoThumb(league.logoUrl) : null}
          placeholder="trophy-outline"
          title={league?.name ?? ''}
          subtitle={subtitle || null}
        />
        <View className="mb-3 flex-row gap-2">
          <ActionPill
            label={covered ? t('team.following') : t('explore.followWholeLeague')}
            icon={covered ? 'checkmark' : 'add'}
            active={covered}
            disabled={sportFollowed}
            onPress={() => toggleAll(group)}
          />
        </View>
        {sportFollowed && (
          <Text className="-mt-1.5 mb-2 text-xs text-ink-secondary">{t('explore.coveredBySport')}</Text>
        )}

        {/* Yarisma ara donemdeyken ilk maca kalan sure; lig oynanirken gizli. */}
        {leagueStart.startsAt && leagueStart.daysUntil !== null && (
          <View className="mb-1 flex-row items-center gap-3 border-b border-line py-2.5">
            <Ionicons name="hourglass-outline" size={18} color={colors.primaryDark} />
            <View className="flex-1">
              <Text className="text-[13.5px] font-semibold text-ink">
                {leagueStart.daysUntil === 1
                  ? t('explore.startsTomorrow')
                  : t('explore.startsInDays', { count: leagueStart.daysUntil })}
              </Text>
              <Text className="mt-0.5 text-xs text-ink-secondary">
                {t('explore.firstMatch', {
                  date: leagueStart.hasTime
                    ? formatDayTime(leagueStart.startsAt.toISOString())
                    : formatDay(leagueStart.startsAt),
                })}
              </Text>
            </View>
          </View>
        )}

        <PillTabs tabs={tabs} value={activeTab} onChange={setTab} />

        {activeTab === 'results' || activeTab === 'fixtures' ? (
          eventsLoading ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (activeTab === 'results' ? results : upcoming).length === 0 ? (
            <FlatEmpty message={t(activeTab === 'results' ? 'league.noResults' : 'league.noFixtures')} />
          ) : (
            <View>
              {renderDays(activeTab === 'results' ? results : upcoming, activeTab === 'fixtures')}
              <Text className="py-3 text-center text-xs text-ink-tertiary">
                {t(activeTab === 'results' ? 'league.resultsNote' : 'league.fixturesNote')}
              </Text>
            </View>
          )
        ) : activeTab === 'standings' ? (
          tableLoading ? (
            <View className="items-center gap-2 py-6">
              <ActivityIndicator color={colors.primaryDark} />
              <Text className="text-sm text-ink-secondary">{t('team.standingsLoading')}</Text>
            </View>
          ) : !table ? (
            <FlatEmpty message={t('league.noStandings')} />
          ) : (
            <LeagueTableCard table={table} highlightTeam={null} />
          )
        ) : (
          <View>
            <Text className="mb-1 text-xs text-ink-secondary">
              {leagueFollowed ? t('explore.coveredByLeague') : sportFollowed ? t('explore.coveredBySport') : t('explore.pickTeamsHint')}
            </Text>
            {(teams ?? []).length > 6 && (
              <TextInput
                className="my-1.5 rounded-pill border border-line bg-surface px-4 py-2.5 text-[13px] text-ink"
                placeholder={t('explore.searchTeams')}
                placeholderTextColor={colors.inkTertiary}
                value={search}
                onChangeText={setSearch}
              />
            )}
            {visibleTeams.length === 0 ? (
              <Text className="py-2 text-sm text-ink-secondary">
                {hasRoster ? t('explore.noTeamMatches') : t('explore.noTeams')}
              </Text>
            ) : (
              visibleTeams.map((team, i) => (
                <View key={team.id} className="border-b border-line">
                  <FollowRow
                    index={i}
                    label={team.name}
                    imageUrl={team.logoUrl}
                    following={covered || isFollowing('team', team.id)}
                    coveredByParent={sportFollowed}
                    onToggleFollow={() => toggleWithin(group, team.id)}
                    onPress={() => router.push(`/team/${team.id}`)}
                    favorite={favoriteTeamIds.has(team.id)}
                    favoriteLabel={t('team.favorite')}
                    onToggleFavorite={() => {
                      const favorite = favoriteTeamIds.has(team.id);
                      const followed = sportFollowed || covered || isFollowing('team', team.id);
                      if (!favorite && !followed) toggleWithin(group, team.id);
                      toggleFavorite.mutate({ teamId: team.id, isFavorite: favorite });
                    }}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
