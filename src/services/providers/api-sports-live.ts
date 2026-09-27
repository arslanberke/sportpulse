export interface FootballLiveScore {
  fixtureId: number;
  leagueId: number;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamLogoUrl: string | null;
  awayTeamLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  elapsed: number | null;
  status: string;
  startsAt: string;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('API-Sports: invalid_response');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('API-Sports: invalid_response');
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('API-Sports: invalid_response');
  }
  return value;
}

function nullableInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function normalize(value: unknown): FootballLiveScore {
  const row = object(value);
  const fixture = object(row.fixture);
  const status = object(fixture.status);
  const league = object(row.league);
  const teams = object(row.teams);
  const goals = object(row.goals);
  const startsAt = text(fixture.date);
  if (!Number.isFinite(Date.parse(startsAt))) throw new Error('API-Sports: invalid_response');
  return {
    fixtureId: integer(fixture.id),
    leagueId: integer(league.id),
    leagueName: text(league.name),
    homeTeam: text(object(teams.home).name),
    awayTeam: text(object(teams.away).name),
    homeTeamId: integer(object(teams.home).id),
    awayTeamId: integer(object(teams.away).id),
    homeTeamLogoUrl: nullableText(object(teams.home).logo),
    awayTeamLogoUrl: nullableText(object(teams.away).logo),
    homeScore: nullableInteger(goals.home),
    awayScore: nullableInteger(goals.away),
    elapsed: nullableInteger(status.elapsed),
    status: text(status.short),
    startsAt,
  };
}

export async function fetchFootballLiveScores(apiKey: string): Promise<{
  source: 'api-sports';
  fetchedAt: string;
  remainingRequests: number | null;
  scores: FootballLiveScore[];
}> {
  if (!apiKey.trim()) throw new Error('API-Sports: missing_key');
  let response: Response;
  try {
    response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': apiKey.trim() },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('API-Sports: network_error');
  }
  if (!response.ok) throw new Error(`API-Sports: http_${response.status}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('API-Sports: invalid_response');
  }
  const data = object(body);
  if (data.errors && Object.keys(Object(data.errors)).length > 0) {
    throw new Error('API-Sports: provider_error');
  }
  if (!Array.isArray(data.response)) throw new Error('API-Sports: invalid_response');
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  return {
    source: 'api-sports',
    fetchedAt: new Date().toISOString(),
    remainingRequests: remaining !== null && /^\d+$/.test(remaining) ? Number(remaining) : null,
    scores: data.response.map(normalize),
  };
}
