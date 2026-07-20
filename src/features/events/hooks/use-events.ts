import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useLeagueChannels } from '@/features/catalog/hooks/use-catalog';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { fetchEvent, fetchEventBroadcasts, fetchEvents } from '@/services/events';
import type { SportEvent, UserFollow } from '@/types';

/** Raw events for a window, driven by the user's follow list. */
function useRawEvents(from: Date, to: Date, follows: UserFollow[] | undefined) {
  const followsKey = (follows ?? []).map((f) => f.id).join(',');
  return useQuery({
    queryKey: ['events', from.toISOString(), to.toISOString(), followsKey],
    queryFn: () => fetchEvents({ from, to, follows: follows ?? [] }),
    enabled: follows !== undefined,
  });
}

/**
 * Upcoming events for the user's follows, with the broadcast channels for
 * their country merged in (event-specific broadcasts override the static
 * league -> channel mapping).
 */
export function useUpcomingEvents(days = 7) {
  const { data: profile } = useProfile();
  const { data: follows } = useFollows();

  const { from, to } = useMemo(() => {
    const now = new Date();
    return { from: now, to: new Date(now.getTime() + days * 86_400_000) };
  }, [days]);

  const eventsQuery = useRawEvents(from, to, follows);
  const { data: leagueChannels } = useLeagueChannels(profile?.countryCode);

  const eventIds = (eventsQuery.data ?? []).map((e) => e.id);
  const { data: eventBroadcasts } = useQuery({
    queryKey: ['event-broadcasts', eventIds.join(','), profile?.countryCode],
    queryFn: () =>
      fetchEventBroadcasts({ eventIds, countryCode: profile!.countryCode }),
    enabled: Boolean(profile) && eventIds.length > 0,
  });

  const events: SportEvent[] = useMemo(
    () =>
      (eventsQuery.data ?? []).map((event) => ({
        ...event,
        channels:
          eventBroadcasts?.get(event.id) ??
          (event.leagueId ? (leagueChannels?.get(event.leagueId) ?? []) : []),
      })),
    [eventsQuery.data, eventBroadcasts, leagueChannels],
  );

  return { ...eventsQuery, events };
}

/** A single event with its channels for the user's country. */
export function useEvent(id: string | undefined) {
  const { data: profile } = useProfile();
  const { data: leagueChannels } = useLeagueChannels(profile?.countryCode);

  const eventQuery = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEvent(id!),
    enabled: Boolean(id),
  });

  const { data: eventBroadcasts } = useQuery({
    queryKey: ['event-broadcasts', id, profile?.countryCode],
    queryFn: () => fetchEventBroadcasts({ eventIds: [id!], countryCode: profile!.countryCode }),
    enabled: Boolean(profile) && Boolean(id),
  });

  const event: SportEvent | null = useMemo(() => {
    const raw = eventQuery.data;
    if (!raw) return null;
    return {
      ...raw,
      channels:
        eventBroadcasts?.get(raw.id) ??
        (raw.leagueId ? (leagueChannels?.get(raw.leagueId) ?? []) : []),
    };
  }, [eventQuery.data, eventBroadcasts, leagueChannels]);

  return { ...eventQuery, event };
}
