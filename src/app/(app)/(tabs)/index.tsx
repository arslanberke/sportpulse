import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { EventCard, FeaturedEventCard } from '@/features/events/components/event-card';
import { useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { formatDay, isSameDay } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { SportEvent } from '@/types';

/** Groups events by calendar day (local timezone), keeping order. */
function groupByDay(events: SportEvent[]): { day: Date; events: SportEvent[] }[] {
  const groups: { day: Date; events: SportEvent[] }[] = [];
  for (const event of events) {
    const day = new Date(event.startsAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, day)) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

/** "This week": every upcoming event for the user's follows, day by day. */
export default function HomeScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: follows, isFetched: followsFetched } = useFollows();
  const { events, isLoading, error } = useUpcomingEvents(7);

  // First run after sign-up: send the user to the follow/country setup.
  useEffect(() => {
    if (followsFetched && (follows ?? []).length === 0) {
      router.push('/setup');
    }
  }, [followsFetched, follows, router]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['events'] }),
      queryClient.refetchQueries({ queryKey: ['follows'] }),
    ]);
  }, [queryClient]);

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const dayLabel = (day: Date) => {
    if (isSameDay(day, today)) return t('home.today');
    if (isSameDay(day, tomorrow)) return t('home.tomorrow');
    return formatDay(day);
  };

  const featuredId = events.find((e) => e.status === 'scheduled')?.id;

  return (
    <Screen onRefresh={handleRefresh} refreshing={queryClient.isFetching() > 0}>
      <View className="pt-4">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold uppercase tracking-widest text-primary">
              SportPulse
            </Text>
            <Text className="text-3xl font-bold text-ink">{t('home.title')}</Text>
          </View>
          <Link href="/settings" asChild>
            <Pressable className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70">
              <Ionicons name="settings-outline" size={20} color={colors.ink} />
            </Pressable>
          </Link>
        </View>

        {isLoading && <LoadingCard />}
        {error && events.length === 0 && (
          <ErrorCard
            message={error.message}
            onRetry={() => void queryClient.refetchQueries({ queryKey: ['events'] })}
          />
        )}

        {groupByDay(events).map((group) => (
          <View key={group.day.toISOString()} className="mb-2">
            <View className="mb-3 flex-row items-center gap-3">
              <Text className="text-base font-bold uppercase tracking-wider text-ink">
                {dayLabel(group.day)}
              </Text>
              <View className="h-px flex-1 bg-line" />
            </View>
            {group.events.map((event) =>
              event.id === featuredId ? (
                <FeaturedEventCard key={event.id} event={event} />
              ) : (
                <EventCard key={event.id} event={event} />
              ),
            )}
          </View>
        ))}

        {!isLoading && !error && events.length === 0 && (
          <EmptyCard iconName="calendar-outline" message={t('home.noEvents')} />
        )}
      </View>
    </Screen>
  );
}
