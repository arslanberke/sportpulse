import { espnProvider } from './espn.ts';
import { theSportsDbProvider } from './thesportsdb.ts';
import type { EventLineup, LeagueRef, ProviderEvent } from './types.ts';

export type {
  EventLineup,
  FixtureProvider,
  LeagueRef,
  LineupPlayer,
  ProviderEvent,
} from './types.ts';

/** Ordered by preference: primary first, fallbacks after. */
export const providers = [theSportsDbProvider, espnProvider];

/**
 * Fetches upcoming events for a league, trying each provider in order until
 * one returns data. A provider that throws or returns nothing simply hands
 * over to the next one.
 */
export async function fetchUpcomingEvents(
  league: LeagueRef,
  days: number,
): Promise<ProviderEvent[]> {
  for (const provider of providers) {
    if (!provider.supports(league)) continue;
    try {
      const events = await provider.fetchUpcomingEvents(league, days);
      if (events.length > 0) return events;
    } catch {
      // Fall through to the next provider.
    }
  }
  return [];
}

/**
 * Confirmed lineups for an event, using whichever provider knows it. Returns
 * null when no provider has the event or lineups aren't published yet.
 */
export async function fetchEventLineup(
  externalIds: Record<string, string>,
): Promise<EventLineup | null> {
  for (const provider of providers) {
    const externalId = externalIds[provider.name];
    if (!externalId || !provider.fetchLineup) continue;
    try {
      const lineup = await provider.fetchLineup(externalId);
      if (lineup) return lineup;
    } catch {
      // Fall through to the next provider.
    }
  }
  return null;
}
