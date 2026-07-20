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
}

function toUtcIso(event: TsdbEvent): string | null {
  if (event.strTimestamp) return `${event.strTimestamp.replace(' ', 'T')}Z`;
  if (event.dateEvent && event.strTime) return `${event.dateEvent}T${event.strTime}Z`;
  return null;
}

function normalize(event: TsdbEvent): ProviderEvent | null {
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
    postponed: (event.strStatus ?? '').toLowerCase().includes('postponed'),
  };
}

async function getJson(url: string): Promise<{ events: TsdbEvent[] | null } | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  return (await response.json()) as { events: TsdbEvent[] | null };
}

export const theSportsDbProvider: FixtureProvider = {
  name: 'thesportsdb',

  supports(league: LeagueRef): boolean {
    return Boolean(league.externalIds.thesportsdb);
  },

  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const leagueId = league.externalIds.thesportsdb;
    const results: ProviderEvent[] = [];

    // The free "next events" endpoint is truncated but cheap — take it first.
    const next = await getJson(`${BASE}/eventsnextleague.php?id=${leagueId}`);
    for (const raw of next?.events ?? []) {
      const normalized = normalize(raw);
      if (normalized) results.push(normalized);
    }

    // Then scan day by day for full coverage of the window.
    const today = new Date();
    for (let offset = 0; offset < days; offset += 1) {
      const day = new Date(today.getTime() + offset * 86_400_000);
      const dateStr = day.toISOString().slice(0, 10);
      const daily = await getJson(`${BASE}/eventsday.php?d=${dateStr}&l=${leagueId}`);
      for (const raw of daily?.events ?? []) {
        if (raw.idLeague !== leagueId) continue;
        const normalized = normalize(raw);
        if (normalized) results.push(normalized);
      }
    }

    // De-duplicate (the two endpoints overlap).
    const byId = new Map<string, ProviderEvent>();
    for (const event of results) byId.set(event.externalId, event);
    return [...byId.values()];
  },
};
