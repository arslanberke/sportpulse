// Motorsport championship standings (F1 / MotoGP) for the season of a given
// event. Runs server-side and caches the standings on the event so repeat
// views don't re-hit the upstream API. Returns available:false for
// non-motorsport events or when the series isn't covered.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import type { Standings } from '../../../src/services/providers/types.ts';
import { fetchMotorsportStandings } from '../../../src/services/providers/standings.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Standings move only after a race; an hour is plenty fresh and keeps us well
// clear of the upstream rate limits.
const CACHE_TTL_MS = 60 * 60 * 1000;
const MOTORSPORT = new Set(['f1', 'motogp']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface EventRow {
  sport_id: string;
  starts_at: string;
  standings_cache: Standings | null;
  standings_cached_at: string | null;
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
    .select('sport_id, starts_at, standings_cache, standings_cached_at')
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);
  if (!MOTORSPORT.has(data.sport_id)) {
    return json({ available: false, standings: null });
  }

  if (data.standings_cache && data.standings_cached_at) {
    const age = Date.now() - new Date(data.standings_cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return json({ available: true, standings: data.standings_cache });
    }
  }

  const standings = await fetchMotorsportStandings({
    sportId: data.sport_id,
    year: new Date(data.starts_at).getUTCFullYear(),
  });
  if (!standings) return json({ available: false, standings: null });

  await supabase
    .from('events')
    .update({
      standings_cache: standings,
      standings_cached_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  return json({ available: true, standings });
});
