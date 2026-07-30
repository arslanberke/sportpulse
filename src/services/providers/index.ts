import { espnProvider } from './espn.ts';
import { euroleagueProvider } from './euroleague.ts';
import { theSportsDbProvider } from './thesportsdb.ts';
import type {
    EventLineup,
    LeagueRef,
    ProviderEvent,
    ProviderSeason,
    ProviderTeam,
    TeamListProvider,
} from './types.ts';
import { warnProviderFailure } from './log.ts';
import { wikipediaProvider } from './wikipedia.ts';

export type {
    EventLineup,
    FixtureProvider,
    LeagueRef,
    LineupPlayer,
    ProviderEvent,
    ProviderSeason,
    ProviderTeam,
    TeamListProvider
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
    } catch (error) {
      warnProviderFailure('fetchUpcomingEvents', provider.name, `league ${league.leagueId}`, error);
    }
  }
  return [];
}

/**
 * Sezon araligi, bilen ilk saglayicidan.
 *
 * Fikstur listesi yalnizca yakin gunleri kapsadigi icin ligin ne zaman
 * basladigi bu bilgi olmadan cikarilamaz.
 */
export async function fetchSeason(league: LeagueRef): Promise<ProviderSeason | null> {
  for (const provider of providers) {
    if (!provider.fetchSeason || !provider.supports(league)) continue;
    try {
      const season = await provider.fetchSeason(league);
      if (season) return season;
    } catch (error) {
      warnProviderFailure('fetchSeason', provider.name, `league ${league.leagueId}`, error);
    }
  }
  return null;
}

/**
 * The teams taking part in a league, from the first provider that knows them.
 * Unlike the fixture list this is available between seasons, which is what
 * lets the follow screens show a squad before any match is scheduled.
 */
export async function fetchLeagueTeams(
  league: LeagueRef,
): Promise<{ provider: string | null; teams: ProviderTeam[] }> {
  // Order matters. The competition's own feed is authoritative; Wikipedia's
  // season article covers the leagues nobody else does; ESPN comes before
  // TheSportsDB because the latter's free tier truncates list endpoints to
  // ten rows, which would leave half a league missing.
  const chain: TeamListProvider[] = [
    euroleagueProvider,
    wikipediaProvider,
    ...[espnProvider, theSportsDbProvider]
      .filter((provider) => provider.fetchLeagueTeams)
      .map((provider) => ({
        name: provider.name,
        supports: (ref: LeagueRef) => provider.supports(ref),
        fetchLeagueTeams: (ref: LeagueRef) => provider.fetchLeagueTeams!(ref),
      })),
  ];

  for (const provider of chain) {
    if (!provider.supports(league)) continue;
    try {
      const teams = await provider.fetchLeagueTeams(league);
      if (teams.length > 0) return { provider: provider.name, teams };
    } catch (error) {
      warnProviderFailure('fetchLeagueTeams', provider.name, `league ${league.leagueId}`, error);
    }
  }
  return { provider: null, teams: [] };
}

/**
 * Whether a source can be trusted to list a league's entrants in full. Only
 * these may prune a membership; TheSportsDB's free tier stops at ten rows, so
 * treating its answer as complete would drop half a league.
 */
export function isCompleteTeamList(provider: string | null): boolean {
  return provider === 'euroleague' || provider === 'wikipedia' || provider === 'espn';
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
    } catch (error) {
      warnProviderFailure('fetchLineup', provider.name, `event ${externalId}`, error);
    }
  }
  return null;
}
