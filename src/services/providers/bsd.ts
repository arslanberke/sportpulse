import { fetchProvider, warnHttp } from './log.ts';
import type { FixtureProvider, LeagueRef, ProviderEvent } from './types.ts';

const API = 'https://sports.bzzoiro.com/api/v2';
const LEAGUE_IDS: Record<string, number> = {
  'Süper Lig': 11,
  'Premier League': 1,
  LaLiga: 3,
  Bundesliga: 5,
  'Serie A': 4,
  'Ligue 1': 6,
  Eredivisie: 10,
  'UEFA Champions League': 7,
  'UEFA Europa League': 8,
  'UEFA Conference League': 83,
};

interface BsdEvent {
  id: number;
  event_date: string;
  status: string;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  venue?: { name?: string } | string | null;
  match_stadium?: string | null;
}

function normalize(row: BsdEvent): ProviderEvent {
  const date = new Date(row.event_date);
  if (!Number.isFinite(date.getTime()) || !row.home_team || !row.away_team) {
    throw new Error('bsd.events: invalid response');
  }
  return {
    externalId: String(row.id), provider: 'bsd', title: `${row.home_team} vs ${row.away_team}`,
    startsAtUtc: date.toISOString(), endsAtUtc: null,
    homeTeam: row.home_team, awayTeam: row.away_team,
    homeTeamExternalId: String(row.home_team_id), awayTeamExternalId: String(row.away_team_id),
    homeTeamLogoUrl: null, awayTeamLogoUrl: null, imageUrl: null,
    venue: typeof row.venue === 'string' ? row.venue : row.venue?.name ?? row.match_stadium ?? null,
    venueImageUrl: null,
    postponed: ['postponed', 'cancelled'].includes(row.status.toLowerCase()),
  };
}

export const bsdProvider: FixtureProvider = {
  name: 'bsd',
  supports(league) {
    return league.sportId === 'football' && Boolean(LEAGUE_IDS[league.leagueName ?? '']) && Boolean(league.providerKeys?.bsd);
  },
  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const id = LEAGUE_IDS[league.leagueName ?? ''];
    const key = league.providerKeys?.bsd;
    if (!id || !key) return [];
    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    const rows: BsdEvent[] = [];
    for (let offset = 0; offset < 1_000; offset += 200) {
      const url = `${API}/events/?league_id=${id}&date_from=${from.toISOString().slice(0, 10)}&date_to=${to.toISOString().slice(0, 10)}&limit=200&offset=${offset}`;
      const response = await fetchProvider('bsd.events', url, league.onIssue, {
        headers: { Authorization: `Token ${key}` },
      });
      if (!response.ok) return warnHttp('bsd.events', response, [], league.onIssue);
      const body = await response.json() as { results?: BsdEvent[]; next?: string | null };
      if (!Array.isArray(body.results)) throw new Error('bsd.events: invalid response');
      rows.push(...body.results);
      if (!body.next || body.results.length < 200) break;
    }
    return rows.map(normalize);
  },
};
