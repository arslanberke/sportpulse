import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useLeagueChannels } from '@/features/catalog/hooks/use-catalog';
import { resolveEventChannels } from '@/features/events/lib/broadcast-resolution';
import { useFavorites } from '@/features/follows/hooks/use-favorites';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { useProfile } from '@/features/profile/hooks/use-profile';
import {
    fetchBroadcastCoverage,
    fetchEvent,
    fetchEventBriefing,
    fetchEventBroadcasts,
    fetchEventLeagueStandings,
    fetchEventLineup,
    fetchEventLive,
    fetchEventLiveCache,
    fetchEventResults,
    fetchEventStandings,
    fetchEventStats,
    fetchEvents,
    fetchLiveScores,
    fetchTeamEvents,
} from '@/services/events';
import { FINAL_STATUSES } from '@/services/providers/api-sports-fixture';
import { fetchBoxScore } from '@/services/providers/espn-boxscore';
import { fetchTennisSets } from '@/services/providers/espn-tennis';
import type { SportEvent, UserFollow } from '@/types';

const HOUR_MS = 3_600_000;

/** Yayin kaynaginin kapsadigi gunler; kapsam ulke bazlidir. */
function useBroadcastCoverage(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['broadcast-coverage', countryCode],
    queryFn: () => fetchBroadcastCoverage(countryCode!),
    enabled: Boolean(countryCode),
    staleTime: HOUR_MS,
  });
}

/**
 * Raw events for a window, driven by the user's follow list.
 *
 * Yildizlanan sporcular da sorguya giriyor: kura maclari listeye girmiyor ama bu
 * oyuncularin maclari istisna.
 */
function useRawEvents(
  from: Date,
  to: Date,
  follows: UserFollow[] | undefined,
  favoritePlayerIds: string[],
  favoriteTeamIds: string[],
) {
  const followsKey = (follows ?? []).map((f) => f.id).join(',');
  const favoritesKey = [...favoritePlayerIds, ...favoriteTeamIds].sort().join(',');
  return useQuery({
    queryKey: ['events', from.toISOString(), to.toISOString(), followsKey, favoritesKey],
    queryFn: () => fetchEvents({ from, to, follows: follows ?? [], favoritePlayerIds, favoriteTeamIds }),
    enabled: follows !== undefined,
  });
}

/**
 * Upcoming events for the user's follows, with the broadcast channels for
 * their country merged in (event-specific broadcasts override the static
 * league -> channel mapping).
 */
export function useUpcomingEvents(days = 7, pastHours = 0) {
  const { data: profile } = useProfile();
  const { data: follows } = useFollows();

  const { from, to } = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getTime() - pastHours * HOUR_MS),
      to: new Date(now.getTime() + days * 86_400_000),
    };
  }, [days, pastHours]);

  const { favoritePlayerIds, favoriteTeamIds } = useFavorites();
  const favoritePlayerList = useMemo(() => [...favoritePlayerIds], [favoritePlayerIds]);
  const favoriteTeamList = useMemo(() => [...favoriteTeamIds], [favoriteTeamIds]);
  const eventsQuery = useRawEvents(from, to, follows, favoritePlayerList, favoriteTeamList);
  const { data: leagueChannels } = useLeagueChannels(profile?.countryCode);
  const { data: coveredDays } = useBroadcastCoverage(profile?.countryCode);

  const eventIds = (eventsQuery.data ?? []).flatMap((e) => [e.id, ...(e.duplicateIds ?? [])]);
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
        channels: resolveEventChannels(event, eventBroadcasts, leagueChannels, coveredDays),
      })),
    [eventsQuery.data, eventBroadcasts, leagueChannels, coveredDays],
  );

  return { ...eventsQuery, events };
}

/**
 * A club's upcoming fixtures across every competition, with broadcast
 * channels merged in the same way as the week list. Independent of the
 * follow list: this is the team page, not the feed.
 */
export function useTeamEvents(teamId: string | undefined, days = 120) {
  const { data: profile } = useProfile();
  const { data: leagueChannels } = useLeagueChannels(profile?.countryCode);
  const { data: coveredDays } = useBroadcastCoverage(profile?.countryCode);

  const eventsQuery = useQuery({
    queryKey: ['team-events', teamId, days],
    queryFn: () => fetchTeamEvents({ teamId: teamId!, days }),
    enabled: Boolean(teamId),
    staleTime: 5 * 60_000,
  });

  const eventIds = (eventsQuery.data ?? []).flatMap((e) => [e.id, ...(e.duplicateIds ?? [])]);
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
        channels: resolveEventChannels(event, eventBroadcasts, leagueChannels, coveredDays),
      })),
    [eventsQuery.data, eventBroadcasts, leagueChannels, coveredDays],
  );

  return { ...eventsQuery, events };
}

/** A single event with its channels for the user's country. */
export function useEvent(id: string | undefined) {
  const { data: profile } = useProfile();
  const { data: leagueChannels } = useLeagueChannels(profile?.countryCode);
  const { data: coveredDays } = useBroadcastCoverage(profile?.countryCode);

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
      channels: resolveEventChannels(raw, eventBroadcasts, leagueChannels, coveredDays),
    };
  }, [eventQuery.data, eventBroadcasts, leagueChannels, coveredDays]);

  return { ...eventQuery, event };
}

/**
 * Confirmed lineups for a football event. A complete cached lineup is served
 * straight from the database at any age, so finished matches keep showing
 * their XIs. Provider calls only happen from ~3h before kickoff onward
 * (official lineups drop ~1h before); polls every ~4 min until published.
 */
export function useEventLineup(event: SportEvent | null) {
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const phase = useMemo(() => {
    if (event?.sportId !== 'football') return 'na';
    const now = new Date().getTime();
    return now < startsAt - 3 * HOUR_MS ? 'early' : 'ready';
  }, [event?.sportId, startsAt]);

  return useQuery({
    queryKey: ['event-lineup', event?.id],
    queryFn: () =>
      fetchEventLineup(event!.id, event!.leagueName, event!.externalIds, {
        remote: phase === 'ready',
      }),
    enabled: Boolean(event) && phase !== 'na',
    staleTime: 120_000,
    refetchInterval: (query) =>
      query.state.data == null && Date.now() < startsAt ? 240_000 : false,
  });
}

/**
 * Every event currently reported as live, for the "Canlı" filter:
 * `{ scores }` API-Sports football fixtures, `{ espn }` ESPN scoreboard
 * entries for basketball/tennis/F1/UFC (one aggregated Edge Function call).
 *
 * Polls every 20s while enabled and the app is in the foreground — the shared
 * server-side cache (20s TTL) absorbs these requests, so upstream calls don't
 * grow with the number of users. Still gated on `enabled`: nothing polls in
 * the background when the live filter/detail isn't on screen.
 */
export function useLiveScores(enabled: boolean) {
  return useQuery({
    queryKey: ['live-scores'],
    queryFn: fetchLiveScores,
    enabled,
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}

/**
 * Match statistics (team rows + player ratings) for BSD-backed football
 * events. Stats only exist once the match has kicked off; refreshes gently
 * during the live window and stays cached afterwards.
 */
export function useEventStats(event: SportEvent | null) {
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const started = useMemo(
    () => event?.sportId === 'football' && new Date().getTime() >= startsAt,
    [event?.sportId, startsAt],
  );

  return useQuery({
    queryKey: ['event-stats', event?.id],
    queryFn: () => fetchEventStats(event!.id, event!.externalIds),
    enabled: Boolean(event?.externalIds.bsd) && started,
    staleTime: 5 * 60_000,
    refetchInterval: () =>
      Date.now() < startsAt + 4 * HOUR_MS ? 240_000 : false,
  });
}

/**
 * Live score and key-events timeline for a football match in one of the five
 * covered leagues. Only polls while the match can plausibly still be live —
 * from kickoff to ~3h after — and stops once a final result is cached, so a
 * finished match's card doesn't keep spending the free-tier quota.
 */
export function useEventLive(event: SportEvent | null) {
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const phase = useMemo(() => {
    if (event?.sportId !== 'football') return 'na';
    const now = new Date().getTime();
    if (now < startsAt) return 'early';
    return now <= startsAt + 24 * HOUR_MS ? 'live' : 'past';
  }, [event?.sportId, startsAt]);

  return useQuery({
    queryKey: ['event-live', event?.id],
    // Past the live window the server-side cache (or the synced final score)
    // answers without touching the provider.
    queryFn: async () => {
      if (phase === 'past') {
        const cached = await fetchEventLiveCache(event!.id);
        if (cached) return cached;
        const { homeScore, awayScore } = event!;
        return homeScore != null && awayScore != null
          ? { fixtureId: 0, status: 'FT', elapsed: null, homeScore, awayScore, events: [] }
          : null;
      }
      return fetchEventLive(event!.id, event!.externalIds);
    },
    enabled: Boolean(event) && phase !== 'na' && phase !== 'early',
    staleTime: 30_000,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state && FINAL_STATUSES.has(state.status)) return false;
      return 60_000;
    },
  });
}

/**
 * AI event briefing (grounded in real form/H2H). Fetched once per event and
 * cached; the server also caches the generated text, so this stays cheap.
 */
export function useEventBriefing(event: SportEvent | null) {
  return useQuery({
    queryKey: ['event-briefing', event?.id],
    queryFn: () => fetchEventBriefing(event!.id),
    enabled: Boolean(event),
    staleTime: 6 * HOUR_MS,
    retry: false,
  });
}

/**
 * Motorsport (F1) session results. Only queried once a session has started;
 * polls a few times while it's running/settling, then stops once results land.
 */
export function useEventResults(event: SportEvent | null) {
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const isMotorsport = event?.sportId === 'f1' || event?.sportId === 'motogp';
  const started = useMemo(() => {
    if (!isMotorsport) return false;
    return new Date().getTime() >= startsAt;
  }, [isMotorsport, startsAt]);

  return useQuery({
    queryKey: ['event-results', event?.id],
    queryFn: () => fetchEventResults(event!),
    enabled: Boolean(event) && started,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.live) return 30_000;
      return data == null ? 5 * 60_000 : false;
    },
  });
}

/**
 * Motorsport (F1/MotoGP) championship standings for the event's season. The
 * server caches per event, so this stays cheap across views.
 */
export function useEventStandings(event: SportEvent | null) {
  const isMotorsport = event?.sportId === 'f1' || event?.sportId === 'motogp';
  return useQuery({
    queryKey: ['event-standings', event?.id],
    queryFn: () => fetchEventStandings(event!.id),
    enabled: Boolean(event) && isMotorsport,
    staleTime: HOUR_MS,
    retry: false,
  });
}

/**
 * Team-league (basketball) conference standings for the event's league. The
 * server caches per event, so this stays cheap across views.
 */
export function useEventLeagueStandings(event: SportEvent | null) {
  const isBasketball = event?.sportId === 'basketball';
  return useQuery({
    queryKey: ['event-league-standings', event?.id],
    queryFn: () => fetchEventLeagueStandings(event!.id),
    enabled: Boolean(event) && isBasketball,
    staleTime: HOUR_MS,
    retry: false,
  });
}

/** ESPN league slug for basketball leagues ESPN covers. */
const ESPN_BASKETBALL: Record<string, string> = { NBA: 'nba' };

/** ESPN league slug for a basketball event's box score and player pages. */
export function espnBasketballLeague(event: SportEvent | null): string | undefined {
  return event?.sportId === 'basketball' ? ESPN_BASKETBALL[event.leagueName ?? ''] : undefined;
}

/**
 * NBA box score (quarters, team and player stats) from ESPN. Polls every 30s
 * while the game is live, then stays cached.
 */
export function useEventBoxScore(event: SportEvent | null) {
  const league = espnBasketballLeague(event);
  const espnId = event?.externalIds.espn;
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const started = useMemo(() => new Date().getTime() >= startsAt, [startsAt]);
  return useQuery({
    queryKey: ['event-boxscore', event?.id],
    queryFn: () => fetchBoxScore(league!, espnId!),
    enabled: Boolean(league && espnId) && started,
    staleTime: 20_000,
    refetchInterval: (query) => (query.state.data?.live ? 30_000 : false),
  });
}

/** Tenis macinin set skorlari (ESPN panosu). Mac surerken 30 sn'de bir yenilenir. */
export function useTennisSets(event: SportEvent | null) {
  const espnId = event?.externalIds.espn;
  const tour = event?.leagueName?.toUpperCase().includes('WTA') ? 'wta' : 'atp';
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const started = useMemo(() => new Date().getTime() >= startsAt, [startsAt]);
  return useQuery({
    queryKey: ['event-tennis-sets', event?.id],
    queryFn: () => fetchTennisSets(tour, espnId!, event!.startsAt, event!.homeTeamName),
    enabled: event?.sportId === 'tennis' && Boolean(event?.parentEventId && espnId) && started,
    staleTime: 20_000,
    refetchInterval: (query) => (query.state.data?.live ? 30_000 : false),
  });
}
