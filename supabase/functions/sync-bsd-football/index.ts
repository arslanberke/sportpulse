// Reliable fixture sync for Süper Lig + UEFA Europa League.
//
// Independent from the broad sync-events job so the new authenticated
// BSD -> GOAL chain can be deployed through the Supabase MCP sandbox without
// changing every existing multi-sport provider. Uses the same per-league
// lease and health table, the same upsert_event identity RPC, and the same
// SYNC_SECRET custom auth as scheduled jobs.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DAYS = 30;
const BSD_IDS: Record<string, number> = {
  'Süper Lig': 11,
  'Premier League': 1,
  LaLiga: 3,
  Bundesliga: 5,
  'Serie A': 4,
  'Ligue 1': 6,
  Eredivisie: 10,
  'Primeira Liga': 2,
  'UEFA Champions League': 7,
  'UEFA Europa League': 8,
  'UEFA Conference League': 83,
  'UEFA Nations League': 64,
  'UEFA Super Cup': 90,
  'FA Cup': 39,
  'Carabao Cup': 40,
  'Copa del Rey': 41,
  'Coppa Italia': 42,
  'DFB-Pokal': 43,
  'Coupe de France': 44,
  'Dünya Kupası Elemeleri – Avrupa': 58,
  'Milli Hazırlık Maçları': 31,
};
const GOAL_IDS: Record<string, string> = {
  'Süper Lig': 'cmr77dw0q00eprx06rqew3m48',
  'Trendyol 1. Lig': 'cmr77dw0q00eqrx06ekzy1wgb',
  'Premier League': 'cmr77dvkr005nrx06lp7rvp49',
  LaLiga: 'cmr77dvnt006nrx063v3w622e',
  Bundesliga: 'cmr77dvgm0002rx06rt2uqxii',
  'Serie A': 'cmr77dvpd006yrx06zig7907g',
  'Ligue 1': 'cmr77dvqg007crx06q1kaceyo',
  Eredivisie: 'cmr77dvrh007vrx0664phtxs5',
  'Primeira Liga': 'cmr77dvwz00e2rx06e40pc5tr',
  'UEFA Champions League': 'cmr77dw3900f5rx06j05wgzv4',
  'UEFA Europa League': 'cmr77dw3900f6rx06tuqwft2d',
  'UEFA Conference League': 'cmr77dw3900f9rx06laad8onf',
  'UEFA Nations League': 'cmr77dw4800fgrx06rwmig2h8',
  'UEFA Super Cup': 'cmr77dw4800fhrx065oy5co7g',
  'FA Cup': 'cmr77dvkr005jrx06moiox5oh',
  'Carabao Cup': 'cmr77dvkr005krx069ypbvs0i',
  'Copa del Rey': 'cmr77dvnt006mrx06cxed28bn',
  'Coppa Italia': 'cmr77dvpd006xrx068552obpr',
  'Coupe de France': 'cmr77dvqg007brx06kxzw78vu',
  'DFB-Pokal': 'cmr77dvgm0003rx06nnbqia6t',
  'Dünya Kupası Elemeleri – Avrupa': 'cmr77dw3900f7rx06p5hrzt3h',
  'Milli Hazırlık Maçları': 'cmr77dwv800nzrx06faqngjwh',
};

type Event = {
  externalId: string; provider: 'bsd' | 'goal'; title: string; startsAt: string;
  home: string; away: string; homeId: string; awayId: string;
  homeLogo: string | null; awayLogo: string | null; venue: string | null; postponed: boolean;
  homeScore: number | null; awayScore: number | null; resultStatus: string;
};
const json = (body: unknown, status = 200) => Response.json(body, { status });
const day = (date: Date) => date.toISOString().slice(0, 10);
function seasonStart(now = new Date()) {
  const year = now.getUTCMonth() < 6 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 6, 1));
}
function validDate(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('invalid_date');
  return new Date(value).toISOString();
}
async function request(url: string, authorization: string) {
  const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Object.assign(new Error('http'), { status: response.status });
  return response.json();
}
async function bsd(name: string, key: string): Promise<Event[]> {
  const from = seasonStart(); const to = new Date(Date.now() + DAYS * 86_400_000);
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 1_000; offset += 200) {
    const body = await request(`https://sports.bzzoiro.com/api/v2/events/?league_id=${BSD_IDS[name]}&date_from=${day(from)}&date_to=${day(to)}&limit=200&offset=${offset}`, `Token ${key}`);
    if (!Array.isArray(body.results)) throw new Error('invalid_response');
    rows.push(...body.results);
    if (!body.next || body.results.length < 200) break;
  }
  return rows.map((row: Record<string, unknown>) => ({
    externalId: String(row.id), provider: 'bsd', title: `${row.home_team} vs ${row.away_team}`,
    startsAt: validDate(row.event_date), home: String(row.home_team), away: String(row.away_team),
    homeId: String(row.home_team_id), awayId: String(row.away_team_id),
    homeLogo: `https://sports.bzzoiro.com/img/team/${row.home_team_id}/`,
    awayLogo: `https://sports.bzzoiro.com/img/team/${row.away_team_id}/`,
    venue: typeof row.match_stadium === 'string' ? row.match_stadium : null,
    postponed: ['postponed', 'cancelled'].includes(String(row.status).toLowerCase()),
    homeScore: typeof row.home_score === 'number' ? row.home_score : null,
    awayScore: typeof row.away_score === 'number' ? row.away_score : null,
    resultStatus: String(row.status ?? 'notstarted'),
  }));
}
async function goal(name: string, key: string): Promise<Event[]> {
  const goalId = GOAL_IDS[name];
  if (!goalId) throw Object.assign(new Error('http'), { status: 404 });
  const from = seasonStart(); const to = new Date(Date.now() + DAYS * 86_400_000);
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 1_000; offset += 100) {
    const body = await request(`https://api.goal-api.com/v1/fixtures?leagueId=${goalId}&from=${day(from)}&to=${day(to)}&limit=100&offset=${offset}`, `Bearer ${key}`);
    if (!Array.isArray(body.data)) throw new Error('invalid_response');
    rows.push(...body.data);
    if (!body.pagination?.hasMore || body.data.length < 100) break;
  }
  return rows.map((row: Record<string, unknown>) => ({
    externalId: String(row.id), provider: 'goal', title: `${row.homeTeamName} vs ${row.awayTeamName}`,
    startsAt: validDate(row.kickoffUtc), home: String(row.homeTeamName), away: String(row.awayTeamName),
    homeId: String(row.homeTeamId), awayId: String(row.awayTeamId),
    homeLogo: typeof row.teamHomeBadge === 'string' ? row.teamHomeBadge : null,
    awayLogo: typeof row.teamAwayBadge === 'string' ? row.teamAwayBadge : null,
    venue: typeof row.matchStadium === 'string' ? row.matchStadium : null,
    postponed: ['POSTPONED', 'CANCELLED', 'ABANDONED'].includes(String(row.matchStatus)),
    homeScore: row.homeTeamScore == null ? null : Number(row.homeTeamScore),
    awayScore: row.awayTeamScore == null ? null : Number(row.awayTeamScore),
    resultStatus: String(row.matchStatus ?? 'SCHEDULED'),
  }));
}

Deno.serve(async request => {
  const expected = `Bearer ${Deno.env.get('SYNC_SECRET') ?? ''}`;
  if (!Deno.env.get('SYNC_SECRET') || request.headers.get('Authorization') !== expected) return json({ error: 'unauthorized' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const names = [...new Set([...Object.keys(BSD_IDS), ...Object.keys(GOAL_IDS)])];
  const { data: leagues, error } = await supabase.from('leagues').select('id,name,sport_id,external_ids').in('name', names);
  if (error) return json({ error: 'catalog_unavailable' }, 503);
  // BSD lig kimligini katalog satirina yaz: oyuncu profili gibi diger BSD
  // uclari lig adlarini bu kimlikten cozer.
  for (const league of leagues ?? []) {
    const bsdId = BSD_IDS[league.name];
    const ids = typeof league.external_ids === 'object' && league.external_ids ? league.external_ids as Record<string, unknown> : {};
    if (bsdId !== undefined && ids.bsd !== String(bsdId)) {
      await supabase.from('leagues').update({ external_ids: { ...ids, bsd: String(bsdId) } }).eq('id', league.id);
    }
  }
  const bsdKey = Deno.env.get('API_BSD_FOOTBALL_KEY');
  const goalKey = Deno.env.get('GOAL_API_KEY');
  const runId = crypto.randomUUID();
  const results = [];

  // Ligler sirayla islenince tek cagri duvar saati siniri asiyordu; kucuk bir
  // isci havuzu yeterli (BSD istekleri agir degil, DB yazimlari ic).
  const processLeague = async (league: { id: string; name: string; sport_id: string }) => {
    const { data: acquired } = await supabase.rpc('begin_fixture_sync', { p_league_id: league.id, p_run_id: runId });
    if (!acquired) { results.push({ league: league.name, status: 'deferred' }); return; }
    const issues: { source: string; kind: string; status: number | null }[] = [];
    let source: string | null = null; let events: Event[] = [];
    for (const candidate of [
      { name: 'bsd', key: bsdKey && league.name in BSD_IDS ? bsdKey : null, fetcher: bsd },
      { name: 'goal', key: goalKey && league.name in GOAL_IDS ? goalKey : null, fetcher: goal },
    ]) {
      if (!candidate.key) continue;
      try {
        const rows = await candidate.fetcher(league.name, candidate.key);
        source = candidate.name;
        if (rows.length > 0) { events = rows; break; }
      } catch (caught) {
        const status = typeof (caught as { status?: unknown }).status === 'number' ? (caught as { status: number }).status : null;
        const issue = { source: `${candidate.name}.events`, kind: status ? 'http' : 'request', status };
        issues.push(issue);
        await supabase.from('provider_issues').insert({ run_id: runId, job: 'sync-bsd-football', league_id: league.id, source: issue.source, kind: issue.kind, http_status: issue.status, observed_at: new Date().toISOString() });
      }
    }
    // Skorlar tek toplu yazimla guncellenir. events.upsert() kullanilmaz: o bir
    // INSERT ... ON CONFLICT'tir ve eksik sport_id yuzunden her cagri NOT NULL
    // hatasiyla dusuyordu (migration 0070). set_event_results mevcut satiri id
    // ile gunceller ve kac satir yazdigini doner.
    const scoreUpdates: { id: string; home_score: number | null; away_score: number | null; result_status: string }[] = [];

    let written = 0;
    for (const event of events) {
      const { data: upserted, error: writeError } = await supabase.rpc('upsert_event', {
        p_provider: event.provider, p_external_id: event.externalId, p_sport_id: 'football', p_league_id: league.id,
        p_title: event.title, p_starts_at: event.startsAt, p_status: event.postponed ? 'postponed' : 'scheduled',
        p_image_url: null, p_home_team: event.home, p_away_team: event.away, p_venue: event.venue,
        p_venue_image_url: null, p_home_team_ext: event.homeId, p_away_team_ext: event.awayId,
        p_home_logo: event.homeLogo, p_away_logo: event.awayLogo,
      });
      if (!writeError) {
        written++;
        const eventId = Array.isArray(upserted) ? upserted[0]?.event_id : null;
        if (eventId) scoreUpdates.push({ id: eventId, home_score: event.homeScore, away_score: event.awayScore, result_status: event.resultStatus });
      }
    }
    let scoresWritten = 0;
    if (scoreUpdates.length) {
      const { data: count, error: scoreError } = await supabase.rpc('set_event_results', { p_rows: scoreUpdates });
      if (scoreError) {
        console.error(`sync-bsd-football: set_event_results failed for ${league.name}: ${scoreError.code} ${scoreError.message}`);
        issues.push({ source: 'db.set_event_results', kind: 'write', status: null });
        await supabase.from('provider_issues').insert({ run_id: runId, job: 'sync-bsd-football', league_id: league.id, source: 'db.set_event_results', kind: 'write', http_status: null, observed_at: new Date().toISOString() });
      } else {
        scoresWritten = typeof count === 'number' ? count : 0;
      }
    }
    const status = !source || (events.length > 0 && written === 0) ? 'failed'
      : issues.length || written < events.length ? 'degraded' : events.length ? 'ok' : 'empty';
    const completed = new Date().toISOString();
    await supabase.from('fixture_sync_health').update({
      status, source, last_completed_at: completed,
      ...(['ok', 'empty'].includes(status) ? { last_success_at: completed } : {}),
      window_start: seasonStart().toISOString(), window_end: new Date(Date.now() + DAYS * 86_400_000).toISOString(),
      received_count: events.length, written_count: written, issue_count: issues.length + Math.max(0, events.length - written),
    }).eq('league_id', league.id).eq('run_id', runId);
    results.push({ league: league.name, status, source, received: events.length, written, scoresWritten, issues: issues.length });
  };

  // Ligler her calismada ayni sirayla islenince ~150 sn'lik duvar saati
  // sondakileri hic gormuyordu (Trendyol 1. Lig'e GOAL'dan skor gelmemesinin
  // nedeni). En uzun suredir denenmeyen once; 110 sn'den sonra yeni lige
  // baslanmaz, kalanlar sonraki calismaya kalir.
  const startedAt = Date.now();
  const { data: health } = await supabase.from('fixture_sync_health').select('league_id, last_attempt_at');
  const lastAttempt = new Map((health ?? []).map((row) => [row.league_id, String(row.last_attempt_at ?? '')]));
  const queue = [...(leagues ?? [])].sort((a, b) => (lastAttempt.get(a.id) ?? '').localeCompare(lastAttempt.get(b.id) ?? ''));
  await Promise.all(Array.from({ length: 4 }, async () => {
    let league = queue.shift();
    while (league) {
      if (Date.now() - startedAt > 110_000) { results.push({ league: league.name, status: 'deferred' }); }
      else await processLeague(league);
      league = queue.shift();
    }
  }));
  return json({ runId, results });
});
