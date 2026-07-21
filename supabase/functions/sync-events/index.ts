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
// TheSportsDB's free tier allows 30 requests/min and the function has a ~150s
// wall clock budget, so a full catalog scan doesn't fit in one invocation.
// Leagues are split into chunks; each run (cron every 30 min) processes one
// chunk, cycling through the whole catalog every LEAGUE_CHUNKS half-hours.
const LEAGUE_CHUNKS = 8;
const CHUNK_SLOT_MS = 1_800_000; // 30 min, must match the cron cadence
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH = 100;

interface LeagueRow {
  id: string;
  sport_id: string;
  external_ids: Record<string, string>;
}

interface UpsertResult {
  event_id: string;
  change_type: 'time' | 'status' | null;
}

interface ChangedEvent {
  eventId: string;
  title: string;
  startsAtUtc: string;
  changeType: 'time' | 'status';
}

function pushText(event: ChangedEvent, countryCode: string) {
  const local = new Date(event.startsAtUtc);
  if (countryCode === 'TR') {
    const time = local.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    return event.changeType === 'time'
      ? { title: 'Fikstür değişti', body: `${event.title} yeni saati: ${time}` }
      : { title: 'Etkinlik güncellendi', body: `${event.title} durumu değişti.` };
  }
  const time = local.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  return event.changeType === 'time'
    ? { title: 'Fixture changed', body: `${event.title} new time: ${time}` }
    : { title: 'Event updated', body: `${event.title} status changed.` };
}

/** Insert in-app notifications and send Expo pushes to followers. */
// deno-lint-ignore no-explicit-any
async function notifyFollowers(supabase: any, event: ChangedEvent, failures: string[]) {
  const { error: notifyError } = await supabase.rpc('notify_event_change', {
    p_event_id: event.eventId,
    p_change_type: event.changeType,
  });
  if (notifyError) failures.push(`notify ${event.title}: ${notifyError.message}`);

  const { data: followers, error: followersError } = await supabase.rpc('event_followers', {
    p_event_id: event.eventId,
  });
  if (followersError || !followers?.length) return;
  const userIds = followers.map((row: { event_followers?: string } | string) =>
    typeof row === 'string' ? row : Object.values(row)[0],
  );

  const [{ data: tokens }, { data: profiles }] = await Promise.all([
    supabase.from('push_tokens').select('user_id, token').in('user_id', userIds),
    supabase.from('profiles').select('id, country_code').in('id', userIds),
  ]);
  if (!tokens?.length) return;
  const countryByUser = new Map<string, string>(
    (profiles ?? []).map((p: { id: string; country_code: string }) => [p.id, p.country_code]),
  );

  const messages = tokens.map((row: { user_id: string; token: string }) => ({
    to: row.token,
    sound: 'default',
    ...pushText(event, countryByUser.get(row.user_id) ?? 'TR'),
    data: { eventId: event.eventId, type: `event_${event.changeType}_changed` },
  }));

  for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + EXPO_PUSH_BATCH)),
    });
    if (!response.ok) {
      failures.push(`push ${event.title}: HTTP ${response.status}`);
    }
  }
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
    .select('id, sport_id, external_ids')
    .order('id');
  if (error) return new Response(error.message, { status: 500 });

  const chunkParam = new URL(request.url).searchParams.get('chunk');
  const chunk =
    chunkParam !== null
      ? Number(chunkParam) % LEAGUE_CHUNKS
      : Math.floor(Date.now() / CHUNK_SLOT_MS) % LEAGUE_CHUNKS;
  const selected = (leagues ?? []).filter((_, index) => index % LEAGUE_CHUNKS === chunk);

  let upserted = 0;
  const failures: string[] = [];
  const changed: ChangedEvent[] = [];

  for (const league of selected as LeagueRow[]) {
    const ref: LeagueRef = {
      leagueId: league.id,
      sportId: league.sport_id,
      externalIds: league.external_ids,
    };

    try {
      const events = await fetchUpcomingEvents(ref, SYNC_DAYS);
      for (const event of events) {
        const { data: result, error: upsertError } = await supabase.rpc('upsert_event', {
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
          p_venue: event.venue,
          p_venue_image_url: event.venueImageUrl,
        });
        if (upsertError) {
          failures.push(`${event.title}: ${upsertError.message}`);
          continue;
        }
        upserted += 1;
        const row = (result as UpsertResult[] | null)?.[0];
        if (row?.change_type) {
          changed.push({
            eventId: row.event_id,
            title: event.title,
            startsAtUtc: event.startsAtUtc,
            changeType: row.change_type,
          });
        }
      }
    } catch (fetchError) {
      failures.push(`league ${league.id}: ${String(fetchError)}`);
    }
  }

  for (const event of changed) {
    await notifyFollowers(supabase, event, failures);
  }

  return Response.json({ chunk, leagues: selected.length, upserted, changed: changed.length, failures });
});
