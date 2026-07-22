// On-demand confirmed lineups for a single event.
//
// The client calls this from the event detail screen. It runs server-side so
// the client never hits third-party APIs directly (rate limits + ToS) and the
// provider key stays private. Lineups are fetched live (not stored) because
// official lineups only appear ~1h before kickoff and change until then, so
// the client refetches as start time approaches.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchEventLineup } from '../../../src/services/providers/index.ts';
import {
  fetchApiFootballLineup,
  resolveApiFootballFixture,
} from '../../../src/services/providers/apifootball.ts';

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
  starts_at: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
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
    .select(
      'external_ids, starts_at, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)',
    )
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  const externalIds = data.external_ids ?? {};
  const apiKey = Deno.env.get('API_FOOTBALL_KEY');

  // Primary: API-Football (full XI + formation + grid). Resolve the fixture id
  // once and cache it back on the event so later polls skip the lookup call.
  if (apiKey) {
    try {
      let fixtureId = externalIds.apifootball;
      if (!fixtureId) {
        const resolved = await resolveApiFootballFixture({
          homeTeam: data.home_team?.name ?? null,
          awayTeam: data.away_team?.name ?? null,
          startsAtUtc: data.starts_at,
          apiKey,
        });
        if (resolved) {
          fixtureId = String(resolved);
          await supabase
            .from('events')
            .update({ external_ids: { ...externalIds, apifootball: fixtureId } })
            .eq('id', eventId);
        }
      }
      if (fixtureId) {
        const lineup = await fetchApiFootballLineup(fixtureId, apiKey);
        if (lineup) return json({ available: true, lineup });
      }
    } catch {
      // Fall through to the free provider.
    }
  }

  // Fallback: TheSportsDB (capped, but works without a key).
  const lineup = await fetchEventLineup(externalIds);
  return json({ available: lineup !== null, lineup });
});
