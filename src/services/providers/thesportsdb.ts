import type { FixtureProvider, LeagueRef, ProviderEvent } from './types.ts';

/**
 * TheSportsDB — primary provider.
 *
 * Free tier (key "3"): ~30 requests/min and each list endpoint returns only
 * a handful of rows, so instead of "next N events per league" we scan day by
 * day (`eventsday.php`) which is not truncated, filtering by league id.
 * https://www.thesportsdb.com/free_sports_api
 */

const API_KEY = '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

interface TsdbEvent {
  idEvent: string;
  strEvent: string;
  strTimestamp: string | null; // '2026-08-16T17:00:00' (UTC, no zone suffix)
  dateEvent: string | null;
  strTime: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  strThumb: string | null;
  strPoster: string | null;
  strStatus: string | null;
  idLeague: string;
  idVenue: string | null;
  strVenue: string | null;
}

interface TsdbVenue {
  strThumb: string | null;
}

function toUtcIso(event: TsdbEvent): string | null {
  if (event.strTimestamp) return `${event.strTimestamp.replace(' ', 'T')}Z`;
  if (event.dateEvent && event.strTime) return `${event.dateEvent}T${event.strTime}Z`;
  return null;
}

function normalize(event: TsdbEvent, venueImageUrl: string | null): ProviderEvent | null {
  const startsAtUtc = toUtcIso(event);
  if (!startsAtUtc) return null;
  return {
    externalId: event.idEvent,
    provider: 'thesportsdb',
    title: event.strEvent,
    startsAtUtc,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    imageUrl: event.strThumb || event.strPoster || null,
    venue: event.strVenue || null,
    venueImageUrl,
    postponed: (event.strStatus ?? '').toLowerCase().includes('postponed'),
  };
}

/** Sports where the venue (circuit) image is worth an extra lookup. */
const VENUE_IMAGE_SPORTS = new Set(['f1', 'motogp']);

const venueImageCache = new Map<string, string | null>();

async function venueImage(venueId: string | null): Promise<string | null> {
  if (!venueId) return null;
  const cached = venueImageCache.get(venueId);
  if (cached !== undefined) return cached;
  const data = (await getJson(`${BASE}/lookupvenue.php?id=${venueId}`)) as {
    venues: TsdbVenue[] | null;
  } | null;
  const image = data?.venues?.[0]?.strThumb ?? null;
  venueImageCache.set(venueId, image);
  return image;
}

const THROTTLE_MS = 2_050; // free tier allows 30 requests/min
const RETRY_AFTER_MS = 10_000;

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url: string): Promise<unknown> {
  const wait = lastRequestAt + THROTTLE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  let response = await fetch(url);
  if (response.status === 429) {
    await sleep(RETRY_AFTER_MS);
    lastRequestAt = Date.now();
    response = await fetch(url);
  }
  if (!response.ok) return null;
  return await response.json();
}

export const theSportsDbProvider: FixtureProvider = {
  name: 'thesportsdb',

  supports(league: LeagueRef): boolean {
    return Boolean(league.externalIds.thesportsdb);
  },

  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const leagueId = league.externalIds.thesportsdb;
    const results: ProviderEvent[] = [];

    // Scan day by day: the free-tier list endpoints (eventsnextleague,
    // eventsseason) are truncated to a handful of rows, but the per-league
    // daily endpoint is not.
    const today = new Date();
    for (let offset = 0; offset < days; offset += 1) {
      const day = new Date(today.getTime() + offset * 86_400_000);
      const dateStr = day.toISOString().slice(0, 10);
      const daily = (await getJson(`${BASE}/eventsday.php?d=${dateStr}&l=${leagueId}`)) as {
        events: TsdbEvent[] | null;
      } | null;
      for (const raw of daily?.events ?? []) {
        if (raw.idLeague !== leagueId) continue;
        const image = VENUE_IMAGE_SPORTS.has(league.sportId)
          ? await venueImage(raw.idVenue)
          : null;
        const normalized = normalize(raw, image);
        if (normalized) results.push(normalized);
      }
    }

    // De-duplicate.
    const byId = new Map<string, ProviderEvent>();
    for (const event of results) byId.set(event.externalId, event);
    return [...byId.values()];
  },
};
