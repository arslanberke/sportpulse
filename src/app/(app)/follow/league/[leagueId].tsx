import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useTeams } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { useLeagueStart } from '@/features/events/hooks/use-league-start';
import { FollowRow } from '@/features/follows/components/follow-row';
import {
    useFollowActions,
    type FollowGroup,
} from '@/features/follows/hooks/use-follow-actions';
import { formatDay, formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

/** Teams inside one league, plus a toggle for the league as a whole. */
export default function LeagueFollowScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: leagues } = useLeagues();
  const { data: teams } = useTeams(leagueId);
  const { isFollowing, toggleAll, toggleWithin } = useFollowActions();
  const [search, setSearch] = useState('');

  const league = (leagues ?? []).find((l) => l.id === leagueId);
  const leagueStart = useLeagueStart(league);
  // Reachable by deep link even for sports that have no team level.
  const teamLevel = hasTeams(league?.sportId);
  const leagueFollowed = isFollowing('league', leagueId);
  // Following the parent sport already brings in every team below it.
  const sportFollowed = league ? isFollowing('sport', league.sportId) : false;
  const covered = leagueFollowed || sportFollowed;

  const visibleTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = teams ?? [];
    if (!term) return list;
    return list.filter((team) => team.name.toLowerCase().includes(term));
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
      <View className="pt-4">
        {/* Yarisma ara donemdeyken ilk maca kalan sure; lig oynanirken gizli. */}
        {leagueStart.startsAt && leagueStart.daysUntil !== null && (
          <Card className="mb-4" index={0}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="hourglass-outline" size={22} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">
                  {leagueStart.daysUntil === 1
                    ? t('explore.startsTomorrow')
                    : t('explore.startsInDays', { count: leagueStart.daysUntil })}
                </Text>
                <Text className="mt-0.5 text-sm text-ink-secondary">
                  {t('explore.firstMatch', {
                    date: leagueStart.hasTime
                      ? formatDayTime(leagueStart.startsAt.toISOString())
                      : formatDay(leagueStart.startsAt),
                  })}
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Card className="mb-4" index={1}>
          <FollowRow
            label={t('explore.followWholeLeague')}
            imageUrl={league?.logoUrl}
            following={leagueFollowed}
            coveredByParent={sportFollowed}
            onToggleFollow={() => toggleAll(group)}
          />
          <Text className="mt-1 text-sm text-ink-secondary">
            {sportFollowed
              ? t('explore.coveredBySport')
              : !teamLevel
                ? t('explore.noTeamLevel')
                : leagueFollowed
                  ? t('explore.coveredByLeague')
                  : t('explore.pickTeamsHint')}
          </Text>
        </Card>

        {teamLevel && (
        <Card className="mb-4" index={2}>
          <Text className="mb-2 text-lg font-semibold text-ink">{t('explore.teams')}</Text>
          {(teams ?? []).length > 6 && (
            <TextInput
              className="mb-2 rounded-button bg-background px-4 py-3 text-ink"
              placeholder={t('explore.searchTeams')}
              placeholderTextColor={colors.inkTertiary}
              value={search}
              onChangeText={setSearch}
            />
          )}
          {visibleTeams.length === 0 ? (
            <Text className="py-2 text-sm text-ink-secondary">{t('explore.noTeams')}</Text>
          ) : (
            visibleTeams.map((team, i) => (
              <FollowRow
                key={team.id}
                index={i}
                label={team.name}
                imageUrl={team.logoUrl}
                following={covered || isFollowing('team', team.id)}
                coveredByParent={sportFollowed}
                onToggleFollow={() => toggleWithin(group, team.id)}
                onPress={() => router.push(`/team/${team.id}`)}
              />
            ))
          )}
        </Card>
        )}
      </View>
    </Screen>
  );
}
