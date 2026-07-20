import type { FixtureProvider, LeagueRef, ProviderEvent } from './types';

/**
 * ESPN hidden API (site.api.espn.com) — fallback provider.
 *
 * Unofficial and undocumented; it currently responds without special headers
 * but can break or start returning 403 at any time, which is why it is only
 * used when the primary provider has no data for a league.
 */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

/** ESPN scoreboard path per sport (league slug appended for soccer). */
const SPORT_PATHS: Record<string, string> = {
  football: 'soccer', // + '/{leagueSlug}'
  basketball: 'basketball', // + '/{leagueSlug}'
  f1: 'racing/f1',
  ufc: 'mma/ufc',
  tennis: 'tennis', // + '/{leagueSlug}'
};

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team?: { displayName?: string };
}

interface EspnEvent {
  id: string;
  name: string;
  date: string; // ISO with zone, e.g. '2026-07-17T11:30Z'
  status?: { type?: { name?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

function scoreboardUrl(league: LeagueRef, dates: string): string | null {
  const path = SPORT_PATHS[league.sportId];
  if (!path) return null;
  const slug = league.externalIds.espn;
  const needsSlug = ['football', 'basketball', 'tennis'].includes(league.sportId);
  if (needsSlug && !slug) return null;
  const full = needsSlug ? `${path}/${slug}` : path;
  return `${BASE}/${full}/scoreboard?dates=${dates}`;
}

function normalize(event: EspnEvent): ProviderEvent {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home')?.team?.displayName ?? null;
  const away = competitors.find((c) => c.homeAway === 'away')?.team?.displayName ?? null;
  return {
    externalId: event.id,
    provider: 'espn',
    title: event.name,
    startsAtUtc: new Date(event.date).toISOString(),
    homeTeam: home,
    awayTeam: away,
    imageUrl: null,
    postponed: event.status?.type?.name === 'STATUS_POSTPONED',
  };
}

export const espnProvider: FixtureProvider = {
  name: 'espn',

  supports(league: LeagueRef): boolean {
    return scoreboardUrl(league, '') !== null;
  },

  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const url = scoreboardUrl(league, `${fmt(from)}-${fmt(to)}`);
    if (!url) return [];

    const response = await fetch(url);
    if (!response.ok) return [];
    const data = (await response.json()) as { events?: EspnEvent[] };
    return (data.events ?? []).map(normalize);
  },
};
