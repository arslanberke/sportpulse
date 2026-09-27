import { fetchProvider, warnHttp } from './log.ts';
import type { FixtureProvider, LeagueRef, ProviderEvent } from './types.ts';

const API = 'https://api.goal-api.com/v1';
const LEAGUE_IDS: Record<string, string> = {
  'Süper Lig': 'cmr77dw0q00eprx06rqew3m48',
  'Premier League': 'cmr77dvkr005nrx06lp7rvp49',
  LaLiga: 'cmr77dvnt006nrx063v3w622e',
  Bundesliga: 'cmr77dvgm0002rx06rt2uqxii',
  'Serie A': 'cmr77dvpd006yrx06zig7907g',
  'Ligue 1': 'cmr77dvqg007crx06q1kaceyo',
  Eredivisie: 'cmr77dvrh007vrx0664phtxs5',
  'UEFA Champions League': 'cmr77dw3900f5rx06j05wgzv4',
  'UEFA Europa League': 'cmr77dw3900f6rx06tuqwft2d',
  'UEFA Conference League': 'cmr77dw3900f9rx06laad8onf',
};

interface GoalEvent {
  id: string;
  kickoffUtc: string;
  matchStatus: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  teamHomeBadge?: string | null;
  teamAwayBadge?: string | null;
  matchStadium?: string | null;
}

function normalize(row: GoalEvent): ProviderEvent {
  const date = new Date(row.kickoffUtc);
  if (!Number.isFinite(date.getTime()) || !row.homeTeamName || !row.awayTeamName) {
    throw new Error('goal.events: invalid response');
  }
  return {
    externalId: row.id, provider: 'goal', title: `${row.homeTeamName} vs ${row.awayTeamName}`,
    startsAtUtc: date.toISOString(), endsAtUtc: null,
    homeTeam: row.homeTeamName, awayTeam: row.awayTeamName,
    homeTeamExternalId: row.homeTeamId, awayTeamExternalId: row.awayTeamId,
    homeTeamLogoUrl: row.teamHomeBadge ?? null, awayTeamLogoUrl: row.teamAwayBadge ?? null,
    imageUrl: null, venue: row.matchStadium ?? null, venueImageUrl: null,
    postponed: ['POSTPONED', 'CANCELLED', 'ABANDONED'].includes(row.matchStatus),
  };
}

export const goalProvider: FixtureProvider = {
  name: 'goal',
  supports(league) {
    return league.sportId === 'football' && Boolean(LEAGUE_IDS[league.leagueName ?? '']) && Boolean(league.providerKeys?.goal);
  },
  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const id = LEAGUE_IDS[league.leagueName ?? ''];
    const key = league.providerKeys?.goal;
    if (!id || !key) return [];
    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    const url = `${API}/fixtures?leagueId=${id}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&status=SCHEDULED&limit=200`;
    const response = await fetchProvider('goal.events', url, league.onIssue, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return warnHttp('goal.events', response, [], league.onIssue);
    const body = await response.json() as { data?: GoalEvent[] };
    if (!Array.isArray(body.data)) throw new Error('goal.events: invalid response');
    return body.data.map(normalize);
  },
};
