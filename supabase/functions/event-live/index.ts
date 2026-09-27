// On-demand live score + key-events timeline for the match-centre screen.
//
// Scoped to the five leagues with a confirmed API-Sports league id
// (APISPORTS_LEAGUE_IDS): guessing an id for an uncovered league risks
// silently attaching another match's score to ours. Uses the same
// `API_SPORTS_FOOTBALL_KEY` secret already validated for the free-tier
// `fixtures?live=all` check — this is a second, separate use of that key,
// not a new provider.
//
// Caching mirrors event-lineup (migration 0015): once a match reaches a
// final status the response is cached permanently (the result won't
// change), which keeps repeat views free. While the match is still live the
// cache is short so the client's ~60s poll actually sees new events.
//
// Self-contained on purpose: the Supabase MCP deploy tool sandboxes each
// function and rejects `..` path segments that escape the function's own
// directory, so this cannot import `../../../src/services/providers/...`
// the way other functions in this repo do when deployed via the Supabase
// CLI. The canonical, unit-tested copy of this fixture logic lives at
// `src/services/providers/api-sports-fixture.ts` and
// `src/features/events/lib/match-events.ts` — keep this file in sync with
// it by hand if either changes.

import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const APISPORTS_LEAGUE_IDS: Record<string, number> = {
  'Süper Lig': 203,
  'Premier League': 39,
  LaLiga: 140,
  Bundesliga: 78,
  'Serie A': 135,
  'Ligue 1': 61,
};

interface ApiSportsFixtureEvent {
  minute: number;
  extraMinute: number | null;
  type: 'goal' | 'card' | 'substitution' | 'var' | 'other';
  detail: string;
  isHome: boolean;
  player: string | null;
  assistOrSubIn: string | null;
}

interface ApiSportsFixtureState {
  fixtureId: number;
  status: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  events: ApiSportsFixtureEvent[];
}

const LIVE_CACHE_TTL_MS = 45_000;
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT']);
const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN', 'ABD', 'AWD', 'WO', 'CANC', 'PST']);
void LIVE_STATUSES;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Anon key alone is a valid JWT, so a real user check needs `auth.getUser`. */
async function hasUser(supabase: SupabaseClient, request: Request): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? '';
  const jwt = header.replace(/^Bearer\s+/i, '').trim();
  if (jwt === '') return false;
  const { data } = await supabase.auth.getUser(jwt);
  return (data.user as User | null) !== null;
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

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function nullableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

async function apiSportsRequest(url: string, apiKey: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'x-apisports-key': apiKey }, signal: AbortSignal.timeout(15_000) });
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
  if (data.errors && Object.keys(Object(data.errors)).length > 0) throw new Error('API-Sports: provider_error');
  if (!Array.isArray(data.response)) throw new Error('API-Sports: invalid_response');
  return data;
}

function fold(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves our event to an API-Sports fixture id by fetching the day's full
 * fixture list and requiring an exact folded name match on both teams within
 * one of the five covered leagues (not a substring match — AGENTS.md already
 * documents a false-positive class there, e.g. `Angers` ⊂ `Queens Park
 * Rangers`). A missed match means no card is shown, which is safer than a
 * wrong one.
 */
async function resolveApiSportsFixture(params: {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  startsAtUtc: string;
  apiKey: string;
}): Promise<number | null> {
  const leagueId = APISPORTS_LEAGUE_IDS[params.leagueName];
  if (!leagueId) return null;
  const date = params.startsAtUtc.slice(0, 10);
  const data = await apiSportsRequest(`https://v3.football.api-sports.io/fixtures?date=${date}`, params.apiKey);
  const home = fold(params.homeTeam);
  const away = fold(params.awayTeam);
  for (const row of data.response as unknown[]) {
    const fixture = object(row);
    const league = object(fixture.league);
    if (nullableInteger(league.id) !== leagueId) continue;
    const teams = object(fixture.teams);
    const homeName = text(object(teams.home).name);
    const awayName = text(object(teams.away).name);
    if (fold(homeName) === home && fold(awayName) === away) {
      return nullableInteger(object(fixture.fixture).id);
    }
  }
  return null;
}

function eventType(apiType: string): ApiSportsFixtureEvent['type'] {
  const kind = apiType.toLowerCase();
  if (kind === 'goal') return 'goal';
  if (kind === 'card') return 'card';
  if (kind === 'subst') return 'substitution';
  if (kind === 'var') return 'var';
  return 'other';
}

/** Single fixture's current score/status plus its full events timeline. */
async function fetchFixtureState(fixtureId: number, apiKey: string): Promise<ApiSportsFixtureState> {
  const [fixtureData, eventsData] = await Promise.all([
    apiSportsRequest(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, apiKey),
    apiSportsRequest(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, apiKey),
  ]);
  const row = object((fixtureData.response as unknown[])[0]);
  const fixture = object(row.fixture);
  const status = object(fixture.status);
  const goals = object(row.goals);
  const teams = object(row.teams);
  const homeTeamId = nullableInteger(object(teams.home).id);

  const events: ApiSportsFixtureEvent[] = (eventsData.response as unknown[]).map((item) => {
    const entry = object(item);
    const time = object(entry.time);
    const team = object(entry.team);
    const player = object(entry.player);
    const assist = object(entry.assist);
    return {
      minute: nullableInteger(time.elapsed) ?? 0,
      extraMinute: nullableInteger(time.extra),
      type: eventType(text(entry.type)),
      detail: nullableText(entry.detail) ?? text(entry.type),
      isHome: nullableInteger(team.id) === homeTeamId,
      player: nullableText(player.name),
      assistOrSubIn: nullableText(assist.name),
    };
  });

  return {
    fixtureId,
    status: text(status.short),
    elapsed: nullableInteger(status.elapsed),
    homeScore: nullableInteger(goals.home),
    awayScore: nullableInteger(goals.away),
    events,
  };
}

interface EventRow {
  sport_id: string;
  starts_at: string;
  external_ids: Record<string, string>;
  live_cache: ApiSportsFixtureState | null;
  live_cached_at: string | null;
  leagues: { name: string } | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  let eventId: string | null = null;
  try {
    const body = (await request.json()) as { eventId?: unknown };
    if (typeof body.eventId === 'string') eventId = body.eventId;
  } catch {
    // Falls through to the missing-id error below.
  }
  if (!eventId) return json({ error: 'eventId is required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  if (!(await hasUser(supabase, request))) return json({ error: 'unauthorized' }, 401);

  const { data, error } = await supabase
    .from('events')
    .select(
      'sport_id, starts_at, external_ids, live_cache, live_cached_at, leagues (name), home_team:teams!home_team_id (name), away_team:teams!away_team_id (name)',
    )
    .eq('id', eventId)
    .maybeSingle<EventRow>();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  const leagueName = data.leagues?.name ?? '';
  if (data.sport_id !== 'football' || !(leagueName in APISPORTS_LEAGUE_IDS)) {
    return json({ available: false, state: null, reason: 'league_not_covered' });
  }

  if (data.live_cache && data.live_cached_at) {
    const cached = data.live_cache;
    const isFinal = FINAL_STATUSES.has(cached.status);
    const age = Date.now() - new Date(data.live_cached_at).getTime();
    if (isFinal || age < LIVE_CACHE_TTL_MS) {
      return json({ available: true, state: cached });
    }
  }

  const apiKey = Deno.env.get('API_SPORTS_FOOTBALL_KEY');
  if (!apiKey) return json({ available: false, state: null, reason: 'not_configured' });

  try {
    let fixtureId = data.external_ids.apisports ? Number(data.external_ids.apisports) : null;
    if (!fixtureId) {
      fixtureId = await resolveApiSportsFixture({
        homeTeam: data.home_team?.name ?? '',
        awayTeam: data.away_team?.name ?? '',
        leagueName,
        startsAtUtc: data.starts_at,
        apiKey,
      });
      if (fixtureId) {
        await supabase
          .from('events')
          .update({ external_ids: { ...data.external_ids, apisports: String(fixtureId) } })
          .eq('id', eventId);
      }
    }
    if (!fixtureId) return json({ available: false, state: null, reason: 'fixture_not_resolved' });

    const state = await fetchFixtureState(fixtureId, apiKey);
    await supabase
      .from('events')
      .update({ live_cache: state, live_cached_at: new Date().toISOString() })
      .eq('id', eventId);
    return json({ available: true, state });
  } catch (fetchError) {
    if (data.live_cache) return json({ available: true, state: data.live_cache, stale: true });
    return json({ available: false, state: null, reason: fetchError instanceof Error ? fetchError.message : 'unknown_error' });
  }
});
