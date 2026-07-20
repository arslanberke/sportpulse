// Scheduled fixture sync.
//
// Pulls upcoming events for every league in the catalog through the
// provider abstraction (TheSportsDB primary, ESPN fallback) and upserts them
// into `events`. Runs server-side so the client never hits third-party APIs
// (rate limits + ToS), and so postponements update the row — Realtime then
// pushes the change to every client, which reschedules local reminders.
//
// Schedule it with pg_cron (see supabase/functions/README.md), e.g. every
// 6 hours.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchUpcomingEvents } from '../../../src/services/providers/index.ts';
import type { LeagueRef } from '../../../src/services/providers/types.ts';

const SYNC_DAYS = 14;

interface LeagueRow {
  id: string;
  sport_id: string;
  external_ids: Record<string, string>;
}

Deno.serve(async (request) => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SYNC_SECRET') ?? ''}`;
  if (!Deno.env.get('SYNC_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, sport_id, external_ids');
  if (error) return new Response(error.message, { status: 500 });

  let upserted = 0;
  const failures: string[] = [];

  for (const league of (leagues ?? []) as LeagueRow[]) {
    const ref: LeagueRef = {
      leagueId: league.id,
      sportId: league.sport_id,
      externalIds: league.external_ids,
    };

    try {
      const events = await fetchUpcomingEvents(ref, SYNC_DAYS);
      for (const event of events) {
        const { error: upsertError } = await supabase.rpc('upsert_event', {
          p_provider: event.provider,
          p_external_id: event.externalId,
          p_sport_id: league.sport_id,
          p_league_id: league.id,
          p_title: event.title,
          p_starts_at: event.startsAtUtc,
          p_status: event.postponed ? 'postponed' : 'scheduled',
          p_image_url: event.imageUrl,
          p_home_team: event.homeTeam,
          p_away_team: event.awayTeam,
        });
        if (upsertError) failures.push(`${event.title}: ${upsertError.message}`);
        else upserted += 1;
      }
    } catch (fetchError) {
      failures.push(`league ${league.id}: ${String(fetchError)}`);
    }
  }

  return Response.json({ upserted, failures });
});
