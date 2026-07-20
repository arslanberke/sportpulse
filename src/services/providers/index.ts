import { espnProvider } from './espn';
import { theSportsDbProvider } from './thesportsdb';
import type { LeagueRef, ProviderEvent } from './types';

export type { FixtureProvider, LeagueRef, ProviderEvent } from './types';

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
