import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { FlatHeader } from '@/components/ui/section-header';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useTeams } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
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
import { formatDay, formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { matchesAny, searchNeedles } from '@/lib/search';

/** Teams inside one league, plus a toggle for the league as a whole. */
export default function LeagueFollowScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: leagues } = useLeagues();
  const { data: teams } = useTeams(leagueId);
  const { isFollowing, toggleAll, toggleWithin } = useFollowActions();
  const { favoriteTeamIds } = useFavoriteTeams();
  const toggleFavorite = useToggleFavoriteTeam();
  const [search, setSearch] = useState('');

  const league = (leagues ?? []).find((l) => l.id === leagueId);
  const leagueStart = useLeagueStart(league);

  // Kupalarda kadro tutulmaz (sync_teams kapali), dolayisiyla takim listesi
  // hicbir zaman dolmaz; "kadro senkronlaninca gorunecek" demek yaniltir. Yine
  // de fiksturden bazi takimlar eklenmis olabilir, liste bos degilse gosterilir.
  //
  // Reachable by deep link even for sports that have no team level.
  const rosterKept = league?.syncTeams !== false;
  const hasRoster = (teams ?? []).length > 0;
  const teamLevel = hasTeams(league?.sportId) && (rosterKept || hasRoster);
  const leagueFollowed = isFollowing('league', leagueId);
  // Following the parent sport already brings in every team below it.
  const sportFollowed = league ? isFollowing('sport', league.sportId) : false;
  const covered = leagueFollowed || sportFollowed;

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

  return (
    <Screen>
      <Stack.Screen options={{ title: league?.name ?? '' }} />
      <View className="pt-2">
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

        <View className="border-b border-line pb-2">
          <FollowRow
            label={t('explore.followWholeLeague')}
            imageUrl={league?.logoUrl}
            following={leagueFollowed}
            coveredByParent={sportFollowed}
            onToggleFollow={() => toggleAll(group)}
          />
          <Text className="text-xs text-ink-secondary">
            {sportFollowed
              ? t('explore.coveredBySport')
              : !teamLevel
                ? t('explore.noTeamLevel')
                : leagueFollowed
                  ? t('explore.coveredByLeague')
                  : t('explore.pickTeamsHint')}
          </Text>
        </View>

        {teamLevel && (
        <View>
          <FlatHeader label={t('explore.teams')} note={hasRoster ? String((teams ?? []).length) : null} />
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
