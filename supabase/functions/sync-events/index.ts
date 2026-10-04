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

import { fixtureSyncState } from '../../../src/features/events/lib/fixture-health.ts';
import { espnProvider, fetchTournamentMatches } from '../../../src/services/providers/espn.ts';
import { fetchFixtureSnapshot, fetchSeason } from '../../../src/services/providers/index.ts';
import { alignF1SessionTimes } from '../../../src/services/providers/openf1.ts';
import { fetchTsdbResults } from '../../../src/services/providers/thesportsdb.ts';
import type { LeagueRef } from '../../../src/services/providers/types.ts';
import { createProviderDiagnostics } from '../_shared/provider-diagnostics.ts';

const SYNC_DAYS = 14;
// Bitmis maclarin sonucu icin ESPN'e geriye donuk da bakilir. Varsayilan kisa
// (cron her 30 dk); ?lookback=N ile bir kerelik geriye donuk doldurma yapilir.
const RESULT_LOOKBACK_DAYS = 3;
const TSDB_RESULTS_PER_LEAGUE = 12;
const MAX_RESULT_LOOKBACK_DAYS = 120;
// TheSportsDB's free tier allows 30 requests/min and the function has a ~150s
// wall clock budget, so a full catalog scan doesn't fit in one invocation.
// Leagues are split into chunks; each run (cron every 30 min) processes one
// chunk, cycling through the whole catalog every LEAGUE_CHUNKS half-hours.
const LEAGUE_CHUNKS = 8;
const CHUNK_SLOT_MS = 1_800_000; // 30 min, must match the cron cadence
// Sezon araligi yilda birkac kez degisir; her senkronda saglayiciya sormak
// gereksiz istek olur. Bilgi bu sureden eskiyse ya da sezon bitmisse yenilenir.
const SEASON_REFRESH_MS = 7 * 86_400_000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH = 100;

interface LeagueRow {
  id: string;
  name: string;
  sport_id: string;
  external_ids: Record<string, string>;
  season_end: string | null;
  season_synced_at: string | null;
}

/**
 * Sezon bilgisi yenilenmeli mi: hic alinmadiysa, uzerinden bir haftadan fazla
 * gectiyse ya da kayitli sezon bittiyse.
 */
function needsSeason(league: LeagueRow): boolean {
  if (!league.season_synced_at) return true;
  const age = Date.now() - new Date(league.season_synced_at).getTime();
  if (age > SEASON_REFRESH_MS) return true;
  return league.season_end !== null && new Date(league.season_end).getTime() < Date.now();
}

interface UpsertResult {
  event_id: string;
  change_type: 'time' | 'status' | null;
}

interface ResultRow {
  id: string;
  home_score: number | null;
  away_score: number | null;
  result_status: string;
}

/**
 * Sonuclari mevcut satirlara id ile yazar (set_event_results, migration
 * 0070). events.upsert() kullanilmaz: INSERT ... ON CONFLICT eksik NOT NULL
 * kolonlar yuzunden duser. Hata sessizce yutulmaz.
 */
async function writeResults(
  supabase: ReturnType<typeof createClient>,
  rows: ResultRow[],
  failures: string[],
  label: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase.rpc('set_event_results', { p_rows: rows });
  if (error) {
    console.error(`sync-events: set_event_results failed (${label}): ${error.code} ${error.message}`);
    failures.push(`${label}: set_event_results ${error.code ?? error.message}`);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
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
    .select('id, name, sport_id, external_ids, season_end, season_synced_at')
    .order('id');
  if (error) return new Response(error.message, { status: 500 });

  const params = new URL(request.url).searchParams;
  const chunkParam = params.get('chunk');
  const chunk = chunkParam !== null ? Number(chunkParam) : Math.floor(Date.now() / CHUNK_SLOT_MS) % LEAGUE_CHUNKS;
  if (!Number.isInteger(chunk) || chunk < 0 || chunk >= LEAGUE_CHUNKS) {
    return Response.json({ error: 'invalid chunk' }, { status: 400 });
  }
  const lookbackParam = params.get('lookback');
  const lookbackDays = lookbackParam === null ? RESULT_LOOKBACK_DAYS : Number(lookbackParam);
  if (!Number.isInteger(lookbackDays) || lookbackDays < 0 || lookbackDays > MAX_RESULT_LOOKBACK_DAYS) {
    return Response.json({ error: 'invalid lookback' }, { status: 400 });
  }
  const requestedLeague = params.get('leagueId');
  const selected = (leagues ?? []).filter((league, index) => requestedLeague
    ? league.id === requestedLeague : index % LEAGUE_CHUNKS === chunk);
  if (requestedLeague && selected.length === 0) return Response.json({ error: 'unknown league' }, { status: 400 });
  const { data: health, error: healthError } = await supabase.from('fixture_sync_health')
    .select('league_id, last_attempt_at');
  if (healthError) return Response.json({ error: 'fixture health unavailable' }, { status: 503 });
  const lastAttempts = new Map((health ?? []).map((row) => [row.league_id, row.last_attempt_at]));
  selected.sort((a, b) => String(lastAttempts.get(a.id) ?? '').localeCompare(String(lastAttempts.get(b.id) ?? '')));
  const startedAt = Date.now();
  const deferredLeagues: string[] = [];

  let upserted = 0;
  let matchesUpserted = 0;
  let resultsWritten = 0;
  // Kaynaktan kac kura maci geldigi ayrica sayiliyor: yazilan sayi sifir
  // oldugunda sorunun cekmede mi yazmada mi oldugu yanittan anlasilsin.
  let bracketFetched = 0;
  const failures: string[] = [];
  const changed: ChangedEvent[] = [];
  const fixtureSources: Record<string, string[]> = {};
  const fixtureStates: Record<string, ReturnType<typeof fixtureSyncState>> = {};
  const diagnostics = createProviderDiagnostics('sync-events', async (issue) => {
    const { error } = await supabase.from('provider_issues').insert({
      run_id: issue.runId,
      job: issue.job,
      league_id: issue.leagueId,
      source: issue.source,
      kind: issue.kind,
      http_status: issue.status,
      observed_at: issue.observedAt,
    });
    if (error) throw error;
  });

  for (const league of selected as LeagueRow[]) {
    if (Date.now() - startedAt > 110_000) { deferredLeagues.push(league.id); continue; }
    const { data: acquired, error: leaseError } = await supabase.rpc('begin_fixture_sync', {
      p_league_id: league.id, p_run_id: diagnostics.runId,
    });
    if (leaseError || !acquired) {
      deferredLeagues.push(league.id);
      if (leaseError) failures.push(`lease ${league.id}: unavailable`);
      continue;
    }
    const windowStart = new Date();
    let received = 0;
    let writtenForLeague = 0;
    let source: string | null = null;
    let fixtureIssues = 0;
    const ref: LeagueRef = {
      leagueId: league.id,
      leagueName: league.name,
      sportId: league.sport_id,
      externalIds: league.external_ids,
      providerKeys: {
        bsd: Deno.env.get('API_BSD_FOOTBALL_KEY'),
        goal: Deno.env.get('GOAL_API_KEY'),
      },
      onIssue: diagnostics.forLeague(league.id),
    };

    try {
      const snapshot = await fetchFixtureSnapshot(ref, SYNC_DAYS);
      const events = league.sport_id === 'f1' ? await alignF1SessionTimes(snapshot.events) : snapshot.events;
      source = snapshot.provider;
      received = events.length;
      fixtureIssues = snapshot.issues.length;
      fixtureSources[league.id] = source ? [source] : [];
      const results: ResultRow[] = [];
      for (const event of events) {
        const { data: result, error: upsertError } = await supabase.rpc('upsert_event', {
          p_provider: event.provider,
          p_external_id: event.externalId,
          p_sport_id: league.sport_id,
          p_league_id: league.id,
          p_title: event.title,
          p_starts_at: event.startsAtUtc,
          p_ends_at: event.endsAtUtc ?? null,
          p_status: event.postponed ? 'postponed' : 'scheduled',
          p_image_url: event.imageUrl,
          p_home_team: event.homeTeam,
          p_away_team: event.awayTeam,
          p_venue: event.venue,
          p_venue_image_url: event.venueImageUrl,
          p_home_team_ext: event.homeTeamExternalId,
          p_away_team_ext: event.awayTeamExternalId,
          p_home_logo: event.homeTeamLogoUrl,
          p_away_logo: event.awayTeamLogoUrl,
        });
        if (upsertError) {
          failures.push(`${event.title}: ${upsertError.message}`);
          continue;
        }
        upserted += 1;
        writtenForLeague += 1;
        const row = (result as UpsertResult[] | null)?.[0];
        if (row?.event_id && event.resultStatus && event.resultStatus !== 'notstarted') {
          results.push({ id: row.event_id, home_score: event.homeScore ?? null, away_score: event.awayScore ?? null, result_status: event.resultStatus });
        }
        // Gecmis bir macin saati/durumu icin bildirim gonderilmez.
        if (row?.change_type && new Date(event.startsAtUtc).getTime() > Date.now()) {
          changed.push({
            eventId: row.event_id,
            title: event.title,
            startsAtUtc: event.startsAtUtc,
            changeType: row.change_type,
          });
        }
      }
      resultsWritten += await writeResults(supabase, results, failures, `league ${league.id}`);
    } catch (fetchError) {
      fixtureIssues += 1;
      failures.push(`league ${league.id}: ${fetchError instanceof Error ? fetchError.name : 'UnknownError'}`);
    }
    const syncState = fixtureSyncState(source, received, writtenForLeague, fixtureIssues);
    fixtureStates[league.id] = syncState;
    const completedAt = new Date().toISOString();
    const { error: checkpointError } = await supabase.from('fixture_sync_health').update({
      status: syncState,
      source,
      last_completed_at: completedAt,
      ...(syncState === 'ok' || syncState === 'empty' ? { last_success_at: completedAt } : {}),
      window_start: windowStart.toISOString(),
      window_end: new Date(windowStart.getTime() + SYNC_DAYS * 86_400_000).toISOString(),
      received_count: received,
      written_count: writtenForLeague,
      issue_count: fixtureIssues + Math.max(0, received - writtenForLeague),
    }).eq('league_id', league.id).eq('run_id', diagnostics.runId);
    if (checkpointError) failures.push(`checkpoint ${league.id}: unavailable`);
    if (Date.now() - startedAt > 110_000) continue;

    // Bireysel sporlarda kura: turnuva satiri yukarida yazildi, maclar ona
    // baglaniyor. Ayri bir is olarak kurmak yerine burada: mac ancak turnuvasi
    // kayitliyken yazilabiliyor ve ikisi ayni ucta geliyor.
    //
    // Butun kura tek cagride gonderiliyor. Once mac basina bir RPC vardi ve US
    // Open'da 625 mac ~1900 istek demek oldu; fonksiyon butcesini asip yanit
    // dondurmeden kesildi, kura hic yazilmadi ve ayni parcadaki diger ligler de
    // yarida kaldi.
    if (league.sport_id === 'tennis') {
      try {
        const matches = await fetchTournamentMatches(ref);
        bracketFetched += matches.length;
        if (matches.length > 0) {
          const payload = matches.map((match) => {
            const [home, away] = match.players;
            return {
              externalId: match.externalId,
              tournamentExternalId: match.tournamentExternalId,
              startsAt: match.startsAtUtc,
              status: match.postponed ? 'postponed' : 'scheduled',
              round: match.round,
              bracket: match.bracket,
              homeName: home.name,
              homeExt: home.externalId,
              homeFlag: home.countryFlagUrl,
              awayName: away.name,
              awayExt: away.externalId,
              awayFlag: away.countryFlagUrl,
            };
          });

          const { data: written, error: bracketError } = await supabase.rpc(
            'upsert_player_matches',
            {
              p_provider: 'espn',
              p_sport_id: league.sport_id,
              p_league_id: league.id,
              p_matches: payload,
            },
          );
          if (bracketError) {
            failures.push(`bracket ${league.id}: ${bracketError.message}`);
          } else {
            matchesUpserted += (written as number | null) ?? 0;
          }
        }
      } catch (bracketError) {
        ref.onIssue?.({ source: 'espn.bracket', kind: 'request', status: null });
        failures.push(`bracket ${league.id}: ${bracketError instanceof Error ? bracketError.name : 'UnknownError'}`);
      }
    }

    // Fikstur penceresi bugunden baslar; biten maclarin sonucu ESPN'in
    // gecmis gunlerinden ayrica okunur. Yalnizca sonuc yazilir (upsert yok):
    // gecmis mac icin baslik/saat/takim ezilmez, bildirim uretilmez.
    if (lookbackDays > 0 && espnProvider.supports(ref) && Date.now() - startedAt <= 110_000) {
      try {
        const past = (await espnProvider.fetchUpcomingEvents(ref, 0, lookbackDays))
          .filter((event) => event.resultStatus === 'finished' && event.homeScore != null && event.awayScore != null);
        // Kimlik listesi URL'ye yazildigi icin parca parca sorulur.
        for (let offset = 0; offset < past.length; offset += 150) {
          const slice = past.slice(offset, offset + 150);
          const { data: rows, error: lookupError } = await supabase.from('events')
            .select('id, external_ids')
            .in('external_ids->>espn', slice.map((event) => event.externalId))
            .is('merged_into_event_id', null);
          if (lookupError) {
            failures.push(`results lookup ${league.id}: ${lookupError.message}`);
            break;
          }
          const byEspn = new Map((rows ?? []).map((row) => [String((row.external_ids as Record<string, unknown>).espn), row.id as string]));
          const results = slice.flatMap((event) => {
            const id = byEspn.get(event.externalId);
            return id ? [{ id, home_score: event.homeScore ?? null, away_score: event.awayScore ?? null, result_status: 'finished' }] : [];
          });
          resultsWritten += await writeResults(supabase, results, failures, `results ${league.id}`);
        }
      } catch (resultError) {
        ref.onIssue?.({ source: 'espn.results', kind: 'request', status: null });
        failures.push(`results ${league.id}: ${resultError instanceof Error ? resultError.name : 'UnknownError'}`);
      }
    }

    if (league.external_ids.thesportsdb && Date.now() - startedAt <= 100_000) {
      try {
        const { data: missing, error: missingError } = await supabase.from('events')
          .select('id, external_ids')
          .eq('league_id', league.id).is('merged_into_event_id', null).is('result_status', null)
          .not('external_ids->>thesportsdb', 'is', null)
          .lt('starts_at', new Date(Date.now() - 3 * 3_600_000).toISOString())
          .gt('starts_at', new Date(Date.now() - 120 * 86_400_000).toISOString())
          .order('starts_at', { ascending: false }).limit(TSDB_RESULTS_PER_LEAGUE);
        if (missingError) {
          failures.push(`tsdb results lookup ${league.id}: ${missingError.message}`);
        } else if (missing?.length) {
          const byTsdb = new Map(missing.map((row) => [String((row.external_ids as Record<string, unknown>).thesportsdb), row.id as string]));
          const found = await fetchTsdbResults([...byTsdb.keys()], ref.onIssue);
          const results = found.map((event) => ({
            id: byTsdb.get(event.externalId)!, home_score: event.homeScore, away_score: event.awayScore, result_status: 'finished',
          }));
          resultsWritten += await writeResults(supabase, results, failures, `tsdb results ${league.id}`);
        }
      } catch (resultError) {
        ref.onIssue?.({ source: 'thesportsdb.results', kind: 'request', status: null });
        failures.push(`tsdb results ${league.id}: ${resultError instanceof Error ? resultError.name : 'UnknownError'}`);
      }
    }

    if (needsSeason(league)) {
      try {
        let seasonFailed = false;
        const season = await fetchSeason({ ...ref, onIssue: (issue) => {
          seasonFailed = true;
          ref.onIssue?.(issue);
        } });
        if (!season && seasonFailed) continue;
        // Bulunamadiginda da zaman damgasi yazilir, aksi halde her kosuda ayni
        // sonucsuz istek tekrarlanir.
        const { error: seasonError } = await supabase
          .from('leagues')
          .update({
            season_start: season?.startsAtUtc ?? null,
            season_end: season?.endsAtUtc ?? null,
            season_synced_at: new Date().toISOString(),
          })
          .eq('id', league.id);
        if (seasonError) failures.push(`season ${league.id}: ${seasonError.message}`);
      } catch (seasonFetchError) {
        failures.push(`season ${league.id}: ${String(seasonFetchError)}`);
      }
    }
  }

  for (const event of changed) {
    await notifyFollowers(supabase, event, failures);
  }

  const diagnosticResult = await diagnostics.flush();
  for (const issue of diagnostics.issues) {
    failures.push(`${issue.source} ${issue.status ?? issue.kind} (league ${issue.leagueId})`);
  }
  if (!diagnosticResult.diagnosticsPersisted) failures.push('provider diagnostics could not be persisted');

  return Response.json({
    ...diagnosticResult,
    status: failures.length > 0 || deferredLeagues.length > 0 ||
      Object.values(fixtureStates).some((state) => state !== 'ok' && state !== 'empty') ? 'degraded' : 'ok',
    deferredLeagues,
    fixtureSources,
    fixtureStates,
    chunk,
    leagues: selected.length,
    upserted,
    bracketFetched,
    matches: matchesUpserted,
    resultsWritten,
    changed: changed.length,
    failures,
  });
});
