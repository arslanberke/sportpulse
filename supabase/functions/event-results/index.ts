// Motorsport session results for a single event (F1 today; MotoGP once a
// source exists). Runs server-side and caches the classification on the event
// so repeat views don't re-hit the upstream API. Returns available:false when
// the session hasn't run yet or the series isn't covered.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import type { SessionResults } from '../../../src/services/providers/types.ts';
import { fetchRacingResults } from '../../../src/services/providers/espn-racing.ts';
import { fetchMotoGpResults } from '../../../src/services/providers/motogp.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Short enough that a not-yet-run session gets retried; long enough that a
// finished one isn't re-fetched on every view.
const CACHE_TTL_MS = 30 * 60 * 1000;
const MOTORSPORT = new Set(['f1', 'motogp']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface EventRow {
  sport_id: string;
  title: string;
  starts_at: string;
  results_cache: SessionResults | null;
  results_cached_at: string | null;
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
    .select('sport_id, title, starts_at, results_cache, results_cached_at')
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);
  if (!MOTORSPORT.has(data.sport_id)) {
    return json({ available: false, results: null });
  }

  if (data.results_cache && data.results_cached_at) {
    const age = Date.now() - new Date(data.results_cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return json({ available: true, results: data.results_cache });
    }
  }

  const results =
    data.sport_id === 'motogp'
      ? await fetchMotoGpResults({ title: data.title, startsAtUtc: data.starts_at })
      : await fetchRacingResults({
          sportId: data.sport_id,
          title: data.title,
          startsAtUtc: data.starts_at,
        });
  if (!results) return json({ available: false, results: null });

  await supabase
    .from('events')
    .update({
      results_cache: results,
      results_cached_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  return json({ available: true, results });
});
