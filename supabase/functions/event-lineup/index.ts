// On-demand confirmed lineups for a single event.
//
// The client calls this from the event detail screen. It runs server-side so
// the client never hits third-party APIs directly (rate limits + ToS) and the
// provider key stays private. Successful responses are cached on the event for
// a few minutes so repeat views don't burn the free-tier quota; the cache is
// short because official lineups change until ~kickoff.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import type { EventLineup } from '../../../src/services/providers/types.ts';
import { fetchEventLineup } from '../../../src/services/providers/index.ts';
import {
  fetchApiFootballLineup,
  resolveApiFootballFixture,
} from '../../../src/services/providers/apifootball.ts';

// Reuse a cached lineup for this long before hitting the provider again.
const CACHE_TTL_MS = 10 * 60 * 1000;

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
  lineup_cache: EventLineup | null;
  lineup_cached_at: string | null;
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
      'external_ids, starts_at, lineup_cache, lineup_cached_at, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)',
    )
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  // Serve a recent cached lineup without touching the provider.
  if (data.lineup_cache && data.lineup_cached_at) {
    const age = Date.now() - new Date(data.lineup_cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return json({ available: true, lineup: data.lineup_cache });
    }
  }

  const externalIds = data.external_ids ?? {};
  const apiKey = Deno.env.get('API_FOOTBALL_KEY');

  const cacheAndReturn = async (lineup: EventLineup) => {
    await supabase
      .from('events')
      .update({ lineup_cache: lineup, lineup_cached_at: new Date().toISOString() })
      .eq('id', eventId);
    return json({ available: true, lineup });
  };

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
        if (lineup) return await cacheAndReturn(lineup);
      }
    } catch {
      // Fall through to the free provider.
    }
  }

  // Fallback: TheSportsDB (capped, but works without a key).
  const lineup = await fetchEventLineup(externalIds);
  if (lineup) return await cacheAndReturn(lineup);
  return json({ available: false, lineup: null });
});
