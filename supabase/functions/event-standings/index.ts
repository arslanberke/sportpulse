// Standings for the season/league of a given event. Runs server-side and
// caches the result on the event so repeat views don't re-hit the upstream
// API. Covers two shapes:
//   - motorsport (F1 / MotoGP): drivers'/riders' championship points table
//   - basketball (NBA): conference W-L standings table
// Returns available:false for anything else or when the series isn't covered.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import type {
  LeagueStandings,
  Standings,
} from '../../../src/services/providers/types.ts';
import { fetchMotorsportStandings } from '../../../src/services/providers/standings.ts';
import { fetchBasketballStandings } from '../../../src/services/providers/basketball-standings.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Standings move at most once a day; an hour is plenty fresh and keeps us well
// clear of the upstream rate limits.
const CACHE_TTL_MS = 60 * 60 * 1000;
const MOTORSPORT = new Set(['f1', 'motogp']);

// Discriminated cache payload so a cached row is interpreted as the right kind.
type CachePayload =
  | { kind: 'motorsport'; motorsport: Standings }
  | { kind: 'league'; league: LeagueStandings };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface EventRow {
  sport_id: string;
  league_id: string | null;
  starts_at: string;
  standings_cache: CachePayload | Standings | null;
  standings_cached_at: string | null;
}

interface LeagueRow {
  external_ids: { espn?: string } | null;
}

function respond(payload: CachePayload): Response {
  return payload.kind === 'motorsport'
    ? json({ available: true, standings: payload.motorsport, leagueStandings: null })
    : json({ available: true, standings: null, leagueStandings: payload.league });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let eventId: string | null = null;
  try {
    const body = (await request.json()) as { eventId?: unknown };
    if (typeof body.eventId === 'string') eventId = body.eventId;
  } catch {
    // Fall through to the missing-id error below.
  }
  if (!eventId) return json({ error: 'eventId is required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('events')
    .select('sport_id, league_id, starts_at, standings_cache, standings_cached_at')
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  const isMotorsport = MOTORSPORT.has(data.sport_id);
  const isBasketball = data.sport_id === 'basketball';
  if (!isMotorsport && !isBasketball) {
    return json({ available: false, standings: null, leagueStandings: null });
  }

  if (data.standings_cache && data.standings_cached_at) {
    const age = Date.now() - new Date(data.standings_cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      const cache = data.standings_cache;
      // New payloads carry `kind`; older motorsport caches were the bare
      // Standings object.
      if ('kind' in cache) return respond(cache as CachePayload);
      return respond({ kind: 'motorsport', motorsport: cache as Standings });
    }
  }

  let payload: CachePayload | null = null;
  if (isMotorsport) {
    const standings = await fetchMotorsportStandings({
      sportId: data.sport_id,
      year: new Date(data.starts_at).getUTCFullYear(),
    });
    if (standings) payload = { kind: 'motorsport', motorsport: standings };
  } else {
    let slug: string | undefined;
    if (data.league_id) {
      const { data: league } = await supabase
        .from('leagues')
        .select('external_ids')
        .eq('id', data.league_id)
        .maybeSingle<LeagueRow>();
      slug = league?.external_ids?.espn;
    }
    if (slug) {
      const league = await fetchBasketballStandings(slug);
      if (league) payload = { kind: 'league', league };
    }
  }

  if (!payload) {
    return json({ available: false, standings: null, leagueStandings: null });
  }

  await supabase
    .from('events')
    .update({
      standings_cache: payload,
      standings_cached_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  return respond(payload);
});
