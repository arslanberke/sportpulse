// On-demand confirmed lineups for a single event.
//
// The client calls this from the event detail screen. It runs server-side so
// the client never hits third-party APIs directly (rate limits + ToS) and the
// provider key stays private. Lineups are fetched live (not stored) because
// official lineups only appear ~1h before kickoff and change until then, so
// the client refetches as start time approaches.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchEventLineup } from '../../../src/services/providers/index.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface EventRow {
  external_ids: Record<string, string>;
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
    .select('external_ids')
    .eq('id', eventId)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  const lineup = await fetchEventLineup((data as EventRow).external_ids ?? {});
  return json({ available: lineup !== null, lineup });
});
