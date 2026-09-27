// Complete confirmed football lineups for the five major leagues, via
// API-Sports. This is intentionally separate from the older event-lineup
// fallback chain: TheSportsDB free responses can contain only 2–3 players,
// which must never be presented as a full formation.
//
// Self-contained because Supabase MCP deployment rejects imports outside the
// function directory. Keep normalization in sync with
// `src/services/providers/api-sports-fixture.ts`.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const LEAGUES: Record<string, number> = {
  'Süper Lig': 203, 'Premier League': 39, LaLiga: 140, Bundesliga: 78, 'Serie A': 135, 'Ligue 1': 61,
};
const CACHE_TTL_MS = 6 * 60 * 60_000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_response');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('invalid_response');
  return value;
}
function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}
function nullableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}
function fold(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function hasUser(supabase: ReturnType<typeof createClient>, request: Request) {
  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return false;
  return (await supabase.auth.getUser(jwt)).data.user !== null;
}
async function api(url: string, key: string) {
  const response = await fetch(url, { headers: { 'x-apisports-key': key }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const data = object(await response.json());
  if (data.errors && Object.keys(Object(data.errors)).length > 0) throw new Error('provider_error');
  if (!Array.isArray(data.response)) throw new Error('invalid_response');
  return data.response as unknown[];
}
function player(value: unknown, isSubstitute: boolean) {
  const row = object(value);
  const p = object(row.player);
  const rawGrid = nullableText(p.grid);
  const match = rawGrid?.match(/^(\d+):(\d+)$/);
  return {
    id: String(nullableInteger(p.id) ?? text(p.name)), name: text(p.name), number: nullableInteger(p.number),
    position: nullableText(p.pos), isSubstitute, photoUrl: null, isCaptain: Boolean(p.captain),
    countryCode: null, grid: match ? { row: Number(match[1]), col: Number(match[2]) } : null,
  };
}
function complete(lineup: Record<string, unknown> | null) {
  if (!lineup || !Array.isArray(lineup.home) || !Array.isArray(lineup.away)) return false;
  return lineup.home.filter((p) => !object(p).isSubstitute).length >= 11 &&
    lineup.away.filter((p) => !object(p).isSubstitute).length >= 11;
}
async function resolveFixture(params: { home: string; away: string; league: string; startsAt: string; key: string }) {
  const leagueId = LEAGUES[params.league];
  const rows = await api(`https://v3.football.api-sports.io/fixtures?date=${params.startsAt.slice(0, 10)}`, params.key);
  for (const value of rows) {
    const row = object(value);
    if (nullableInteger(object(row.league).id) !== leagueId) continue;
    const teams = object(row.teams);
    if (fold(text(object(teams.home).name)) === fold(params.home) && fold(text(object(teams.away).name)) === fold(params.away)) {
      return nullableInteger(object(row.fixture).id);
    }
  }
  return null;
}
async function fetchLineup(fixtureId: number, key: string) {
  const rows = await api(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, key);
  if (rows.length !== 2) return null;
  const sides = rows.map(value => {
    const side = object(value);
    const starters = Array.isArray(side.startXI) ? side.startXI.map(value => player(value, false)) : [];
    const substitutes = Array.isArray(side.substitutes) ? side.substitutes.map(value => player(value, true)) : [];
    return { starters: starters.length, players: [...starters, ...substitutes], formation: nullableText(side.formation) };
  });
  if (sides.some(side => side.starters < 11)) return null;
  return { home: sides[0].players, away: sides[1].players, homeFormation: sides[0].formation, awayFormation: sides[1].formation };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let eventId: string | null = null;
  try { const body = await request.json(); if (typeof body.eventId === 'string') eventId = body.eventId; } catch {}
  if (!eventId) return json({ error: 'eventId is required' }, 400);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await hasUser(supabase, request))) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await supabase.from('events').select(
    'starts_at, external_ids, lineup_cache, lineup_cached_at, leagues(name), home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)',
  ).eq('id', eventId).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);
  const league = data.leagues?.name ?? '';
  if (!(league in LEAGUES)) return json({ available: false, lineup: null, reason: 'league_not_covered' });
  if (complete(data.lineup_cache) && data.lineup_cached_at && Date.now() - new Date(data.lineup_cached_at).getTime() < CACHE_TTL_MS) {
    return json({ available: true, lineup: data.lineup_cache, cached: true });
  }
  const key = Deno.env.get('API_SPORTS_FOOTBALL_KEY');
  if (!key) return json({ available: false, lineup: null, reason: 'not_configured' });
  try {
    const external = data.external_ids ?? {};
    let fixtureId = external.apisports ? Number(external.apisports) : null;
    if (!fixtureId) fixtureId = await resolveFixture({ home: data.home_team?.name ?? '', away: data.away_team?.name ?? '', league, startsAt: data.starts_at, key });
    if (!fixtureId) return json({ available: false, lineup: null, reason: 'fixture_not_resolved' });
    const lineup = await fetchLineup(fixtureId, key);
    if (!lineup) return json({ available: false, lineup: null, reason: 'not_published' });
    await supabase.from('events').update({
      external_ids: { ...external, apisports: String(fixtureId) }, lineup_cache: lineup, lineup_cached_at: new Date().toISOString(),
    }).eq('id', eventId);
    return json({ available: true, lineup });
  } catch (caught) {
    return json({ available: false, lineup: null, reason: caught instanceof Error ? caught.message : 'unknown_error' });
  }
});
