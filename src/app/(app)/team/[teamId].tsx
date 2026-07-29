import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { useTeam, useTeamTables } from '@/features/catalog/hooks/use-catalog';
import { EventCard } from '@/features/events/components/event-card';
import { useTeamEvents } from '@/features/events/hooks/use-events';
import { useFollowActions } from '@/features/follows/hooks/use-follow-actions';
import { LeagueTableCard } from '@/features/teams/components/league-table';
import { useI18n } from '@/lib/i18n';
import type { SportEvent } from '@/types';

type Tab = 'fixtures' | 'standings';

/** Fixtures grouped by competition, in order of the next kickoff. */
function groupByCompetition(events: SportEvent[]) {
  const groups = new Map<string, { name: string; logoUrl: string | null; events: SportEvent[] }>();
  for (const event of events) {
    const key = event.leagueId ?? event.leagueName ?? 'other';
    const group = groups.get(key) ?? {
      name: event.leagueName ?? '',
      logoUrl: event.leagueBadgeUrl ?? null,
      events: [],
    };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const tabs: { key: Tab; label: string }[] = [
    { key: 'fixtures', label: t('team.fixtures') },
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
  const [tab, setTab] = useState<Tab>('fixtures');

  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { events, isLoading: eventsLoading, refetch, isRefetching } = useTeamEvents(teamId);
  // Only pulled once the tab is opened: it fans out to one request per league.
  const { data: tables, isLoading: tablesLoading } = useTeamTables(
    tab === 'standings' ? teamId : undefined,
  );
  const { isFollowing, toggleFollow } = useFollowActions();

  const competitions = useMemo(() => groupByCompetition(events), [events]);
  const following = isFollowing('team', teamId);

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
            <Pressable
              onPress={() => toggleFollow('team', teamId)}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-button px-3 py-2 active:opacity-70"
              style={{
                backgroundColor: following ? `${colors.primary}1F` : colors.primary,
              }}
            >
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={16}
                color={following ? colors.primary : '#FFFFFF'}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: following ? colors.primary : '#FFFFFF' }}
              >
                {following ? t('team.following') : t('team.follow')}
              </Text>
            </Pressable>
          </View>
        </Card>

        <TabBar tab={tab} onChange={setTab} />

        {tab === 'fixtures' ? (
          eventsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : competitions.length === 0 ? (
            <Card index={1}>
              <Text className="text-sm text-ink-secondary">{t('team.noFixtures')}</Text>
            </Card>
          ) : (
            competitions.map((competition, ci) => (
              <View key={competition.name || ci} className="mb-4">
                <View className="mb-2 flex-row items-center gap-2">
                  {competition.logoUrl && (
                    <Image
                      source={{ uri: competition.logoUrl }}
                      style={{ width: 18, height: 18 }}
                      contentFit="contain"
                    />
                  )}
                  <Text className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
                    {competition.name}
                  </Text>
                </View>
                {competition.events.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </View>
            ))
          )
        ) : tablesLoading ? (
          <View className="items-center gap-2 py-6">
            <ActivityIndicator color={colors.primary} />
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
