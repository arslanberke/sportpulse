// Aggregated "which matches are live right now" feed for the home screen's
// "Canlı" filter. One `fixtures?live=all` call covers every league at once,
// unlike `event-live` (one specific fixture's full events timeline).
//
// Shared server-side cache (migration 0056): every user reads the same
// recent snapshot instead of each triggering their own request, which would
// burn through the free-tier's 100/day quota in minutes if this were called
// per-client on every "Canlı" tap.
//
// Self-contained on purpose, same reason as event-live/index.ts: the
// Supabase MCP deploy tool rejects `..` path segments that escape the
// function's own directory. The canonical, unit-tested copy of this fetch
// logic lives at `src/services/providers/api-sports-live.ts`.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PROVIDER_USER_AGENT } from '../../../src/services/providers/log.ts';

const CACHE_TTL_MS = 45_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function hasUser(supabase: ReturnType<typeof createClient>, request: Request): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? '';
  const jwt = header.replace(/^Bearer\s+/i, '').trim();
  if (jwt === '') return false;
  const { data } = await supabase.auth.getUser(jwt);
  return data.user !== null;
}

interface FootballLiveScore {
  fixtureId: number;
  leagueId: number;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamLogoUrl: string | null;
  awayTeamLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  elapsed: number | null;
  status: string;
  startsAt: string;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('API-Sports: invalid_response');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('API-Sports: invalid_response');
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('API-Sports: invalid_response');
  }
  return value;
}

function nullableInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function foldTeamName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalize(value: unknown): FootballLiveScore {
  const row = object(value);
  const fixture = object(row.fixture);
  const status = object(fixture.status);
  const league = object(row.league);
  const teams = object(row.teams);
  const goals = object(row.goals);
  return {
    fixtureId: integer(fixture.id),
    leagueId: integer(league.id),
    leagueName: text(league.name),
    homeTeam: text(object(teams.home).name),
    awayTeam: text(object(teams.away).name),
    homeTeamId: integer(object(teams.home).id),
    awayTeamId: integer(object(teams.away).id),
    homeTeamLogoUrl: nullableText(object(teams.home).logo),
    awayTeamLogoUrl: nullableText(object(teams.away).logo),
    homeScore: nullableInteger(goals.home),
    awayScore: nullableInteger(goals.away),
    elapsed: nullableInteger(status.elapsed),
    status: text(status.short),
    startsAt: text(fixture.date),
  };
}

async function syncKnownLiveEvents(supabase: ReturnType<typeof createClient>, scores: FootballLiveScore[]) {
  const [{ data: leagues }, { data: teams }, { data: aliases }] = await Promise.all([
    supabase.from('leagues').select('id, external_ids'),
    supabase.from('teams').select('id, name').eq('sport_id', 'football'),
    supabase.from('team_name_aliases').select('team_id, alias_folded'),
  ]);
  const byApiId = new Map((leagues ?? []).map((league) => [Number(league.external_ids.apisports), league.id]));
  const teamById = new Map((teams ?? []).map(team => [team.id, team.name]));
  const canonicalByFolded = new Map((teams ?? []).map(team => [foldTeamName(team.name), team.name]));
  for (const alias of aliases ?? []) {
    const canonical = teamById.get(alias.team_id);
    if (canonical) canonicalByFolded.set(alias.alias_folded, canonical);
  }
  for (const score of scores) {
    const leagueId = byApiId.get(score.leagueId);
    if (!leagueId) continue;
    const homeTeam = canonicalByFolded.get(foldTeamName(score.homeTeam)) ?? score.homeTeam;
    const awayTeam = canonicalByFolded.get(foldTeamName(score.awayTeam)) ?? score.awayTeam;
    await supabase.rpc('upsert_event', {
      p_provider: 'apisports',
      p_external_id: String(score.fixtureId),
      p_sport_id: 'football',
      p_league_id: leagueId,
      p_title: `${homeTeam} vs ${awayTeam}`,
      p_starts_at: score.startsAt,
      p_status: 'scheduled',
      p_image_url: null,
      p_home_team: homeTeam,
      p_away_team: awayTeam,
      p_venue: null,
      p_venue_image_url: null,
      p_home_team_ext: String(score.homeTeamId),
      p_away_team_ext: String(score.awayTeamId),
      p_home_logo: score.homeTeamLogoUrl,
      p_away_logo: score.awayTeamLogoUrl,
    });
  }
}

// API-Sports disindaki canli kayitlar: ESPN'in anahtarsiz scoreboard uclari
// (series='uefa.nations'/'nba'/'atp'/'wta'/'f1'/'ufc') ve BSD'nin events/live
// ucu (series='bsd', futbol — id'si events.external_ids.bsd ile ayni). Esleme
// istemcide ad+saat veya BSD kimligi uzerinden yapilir (live-match.ts).
// Yalnizca o an oynananlar dondurulur.
export interface EspnLiveEntry {
  id: string;
  sport: 'football' | 'basketball' | 'tennis' | 'f1' | 'ufc';
  /** Tur/seri: 'nba', 'atp', 'f1', 'ufc' — ayni isimli maclar ayristirilsin diye. */
  series: string;
  name: string;
  statusDetail: string | null; // "Q3 4:32", "Set 2", yaris icin null
  home: string | null;
  away: string | null;
  homeScore: number | null;
  awayScore: number | null;
  /** Teniste setler, basketbolda ceyrekler. */
  homeLines: number[];
  awayLines: number[];
  startsAt: string;
}

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';

/**
 * BSD live window feed (football only). Its `id` is the same BSD event id we
 * persist in events.external_ids.bsd, so the client can match by identity
 * instead of names — more reliable than API-Sports' name equality and it
 * covers every league we sync from BSD (incl. UEFA Nations League, which the
 * free API-Sports plan excludes from live=all). Entries join the `espn`
 * payload array with series 'bsd'; the field name predates the second source.
 */
async function fetchBsdLive(key: string): Promise<EspnLiveEntry[]> {
  const response = await fetch(`${BSD_BASE}/events/live/?limit=300`, {
    headers: { Authorization: `Token ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`bsd_live: http_${response.status}`);
  const body = espnObj(await response.json());
  const events = Array.isArray(body.events) ? body.events.map(espnObj) : [];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const out: EspnLiveEntry[] = [];
  for (const e of events) {
    const status = espnText(e.status);
    // 'finished'/'delayed' still sit in the live window — only truly running
    // matches mark an event live.
    if (status !== 'inprogress' && status !== 'penalties') continue;
    const period = espnText(e.period);
    const minute = num(e.current_minute);
    const detail = period === 'halftime' ? 'HT'
      : status === 'penalties' || period === 'penalties' ? 'PEN'
      : period === 'extra_time' ? (minute ? `UZ ${minute}'` : 'UZ')
      : minute !== null ? `${minute}'`
      : null;
    const home = espnText(e.home_team);
    const away = espnText(e.away_team);
    out.push({
      id: String(e.id ?? ''),
      sport: 'football',
      series: 'bsd',
      name: home && away ? `${home} vs ${away}` : '',
      statusDetail: detail,
      home,
      away,
      homeScore: num(e.home_score),
      awayScore: num(e.away_score),
      homeLines: [],
      awayLines: [],
      startsAt: espnText(e.event_date) ?? '',
    });
  }
  return out;
}

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN_BOARDS: { sport: EspnLiveEntry['sport']; series: string; path: string }[] = [
  // Futbol panolari BSD'nin kimlik eslesmesine ikinci hat: BSD live duserse
  // veya GOAL kaynakli liglerde (1. Lig, WCQ, hazirlik maclari) tek kaynak
  // olur. API-Sports ucretsiz plani UNL'yi live=all'a dahil etmiyor.
  { sport: 'football', series: 'uefa.nations', path: 'soccer/uefa.nations' },
  { sport: 'football', series: 'fifa.worldq.uefa', path: 'soccer/fifa.worldq.uefa' },
  { sport: 'football', series: 'fifa.friendly', path: 'soccer/fifa.friendly' },
  { sport: 'football', series: 'tur.1', path: 'soccer/tur.1' },
  { sport: 'football', series: 'tur.2', path: 'soccer/tur.2' },
  { sport: 'football', series: 'uefa.champions', path: 'soccer/uefa.champions' },
  { sport: 'football', series: 'uefa.europa', path: 'soccer/uefa.europa' },
  { sport: 'football', series: 'uefa.europa.conf', path: 'soccer/uefa.europa.conf' },
  { sport: 'basketball', series: 'nba', path: 'basketball/nba' },
  { sport: 'basketball', series: 'euroleague', path: 'basketball/euroleague' },
  { sport: 'tennis', series: 'atp', path: 'tennis/atp' },
  { sport: 'tennis', series: 'wta', path: 'tennis/wta' },
  { sport: 'f1', series: 'f1', path: 'racing/f1' },
  { sport: 'ufc', series: 'ufc', path: 'mma/ufc' },
];

function espnObj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function espnText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
function espnLines(value: unknown): number[] {
  return (Array.isArray(value) ? value : [])
    .map((l) => Number(espnObj(l).value))
    .filter((n) => Number.isFinite(n));
}
function espnIsLive(statusType: Record<string, unknown>): boolean {
  return espnText(statusType.state) === 'in' || espnText(statusType.name) === 'STATUS_IN_PROGRESS';
}

function espnCompetitor(comp: Record<string, unknown>, side: 'home' | 'away') {
  const list = Array.isArray(comp.competitors) ? comp.competitors : [];
  const found = list.map(espnObj).find((c) => espnText(c.homeAway) === side) ?? espnObj(list[side === 'home' ? 0 : 1]);
  const name = espnText(espnObj(found.athlete).displayName) ?? espnText(espnObj(found.team).displayName);
  const rawScore = found.score;
  const score = rawScore === null || rawScore === undefined ? null : Number(rawScore);
  return { name, score: score !== null && Number.isFinite(score) ? score : null, lines: espnLines(found.linescores) };
}

/** Bir ESPN competition'ini (mac, seans veya bout) canli kayda cevirir; degilse null. */
function espnLiveEntry(
  comp: Record<string, unknown>,
  sport: EspnLiveEntry['sport'],
  series: string,
  fallbackName: string | null,
): EspnLiveEntry | null {
  const statusType = espnObj(espnObj(comp.status).type);
  if (!espnIsLive(statusType)) return null;
  const home = espnCompetitor(comp, 'home');
  const away = espnCompetitor(comp, 'away');
  return {
    id: espnText(comp.id) ?? espnText(comp.uid) ?? '',
    sport,
    series,
    name: espnText(comp.name) ?? fallbackName ?? '',
    statusDetail: espnText(statusType.detail) ?? espnText(statusType.shortDetail),
    home: home.name,
    away: away.name,
    homeScore: home.score,
    awayScore: away.score,
    homeLines: home.lines,
    awayLines: away.lines,
    startsAt: espnText(comp.date) ?? '',
  };
}

async function fetchEspnBoard(board: (typeof ESPN_BOARDS)[number]): Promise<EspnLiveEntry[]> {
  const response = await fetch(`${ESPN_BASE}/${board.path}/scoreboard`, {
    headers: { 'User-Agent': PROVIDER_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`espn_${board.series}: http_${response.status}`);
  const body = await response.json();
  const events = Array.isArray(body?.events) ? body.events.map(espnObj) : [];
  const out: EspnLiveEntry[] = [];
  for (const event of events) {
    const eventName = espnText(event.name);
    // Tenis: maclar groupings[].competitions[] altinda; yarista seanslar
    // event.competitions[] altinda; kartlar/maclar duz events[] duzeyinde.
    const comps = [
      ...(Array.isArray(event.competitions) ? event.competitions : []),
      ...(Array.isArray(event.groupings) ? event.groupings : [])
        .flatMap((g) => (Array.isArray(espnObj(g).competitions) ? espnObj(g).competitions : [])),
    ].map(espnObj);
    if (comps.length === 0) {
      const asComp = espnLiveEntry({ ...event, competitors: espnObj(event).competitors }, board.sport, board.series, eventName);
      if (asComp) out.push(asComp);
      continue;
    }
    for (const comp of comps) {
      const entry = espnLiveEntry(comp, board.sport, board.series, eventName);
      if (entry) out.push(entry);
    }
  }
  return out;
}

async function fetchEspnLive(): Promise<EspnLiveEntry[]> {
  const settled = await Promise.allSettled(ESPN_BOARDS.map(fetchEspnBoard));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function fetchLiveScores(apiKey: string): Promise<FootballLiveScore[]> {
  let response: Response;
  try {
    response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('API-Sports: network_error');
  }
  if (!response.ok) throw new Error(`API-Sports: http_${response.status}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('API-Sports: invalid_response');
  }
  const data = object(body);
  if (data.errors && Object.keys(Object(data.errors)).length > 0) throw new Error('API-Sports: provider_error');
  if (!Array.isArray(data.response)) throw new Error('API-Sports: invalid_response');
  return data.response.map(normalize);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  if (!(await hasUser(supabase, request))) return json({ error: 'unauthorized' }, 401);

  const { data: cached } = await supabase
    .from('live_scores_cache')
    .select('payload, cached_at')
    .eq('id', true)
    .maybeSingle();
  const age = cached ? Date.now() - new Date(cached.cached_at).getTime() : Infinity;
  // Eski satirlar futbol listesi tasiyordu; yeni bicim { scores, espn }.
  const cachedFootball: FootballLiveScore[] | null = Array.isArray(cached?.payload)
    ? cached.payload
    : (Array.isArray(espnObj(cached?.payload).scores) ? espnObj(cached.payload).scores as FootballLiveScore[] : null);
  const cachedEspn: EspnLiveEntry[] = Array.isArray(espnObj(cached?.payload).espn)
    ? espnObj(cached.payload).espn as EspnLiveEntry[]
    : [];
  // Old cache rows (before migration 0057) don't carry team ids/logos and
  // cannot rescue a missing event, so force one refresh after deployment.
  const cacheCanSync = cachedFootball !== null && cachedFootball.every((score) =>
    typeof score.homeTeamId === 'number' && typeof score.awayTeamId === 'number');
  if (cached && cacheCanSync && age < CACHE_TTL_MS) {
    return json({ available: true, scores: cachedFootball, espn: cachedEspn, cached: true });
  }

  const apiKey = Deno.env.get('API_SPORTS_FOOTBALL_KEY');
  const bsdKey = Deno.env.get('API_BSD_FOOTBALL_KEY');
  // ESPN/BSD akislari API-Sports anahtarindan bagimsiz: anahtar yoksa da
  // diger kaynaklar toplanir.
  const [bsdLive, espnBoards, footballResult] = await Promise.all([
    bsdKey ? fetchBsdLive(bsdKey).catch(() => [] as EspnLiveEntry[]) : Promise.resolve([] as EspnLiveEntry[]),
    fetchEspnLive().catch(() => [] as EspnLiveEntry[]),
    apiKey
      ? fetchLiveScores(apiKey).then((scores) => {
          // Canli-kurtarma yazimi (dizide 40+ sirali RPC) yaniti bloklamasin:
          // arka planda yazilir, kullanici skoru hemen gorur.
          const persist = syncKnownLiveEvents(supabase, scores).catch(() => {});
          const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
          if (runtime?.waitUntil) runtime.waitUntil(persist);
          return scores;
        }).catch((error: unknown) => error)
      : Promise.resolve<null | Error>(null),
  ]);

  const espnLive = [...bsdLive, ...espnBoards];

  if (footballResult !== null && !(footballResult instanceof Error)) {
    await supabase.from('live_scores_cache').upsert({
      id: true,
      payload: { scores: footballResult, espn: espnLive },
      cached_at: new Date().toISOString(),
    });
    return json({ available: true, scores: footballResult, espn: espnLive });
  }
  if (footballResult === null) {
    // Anahtar yok: futbol icin eski onbellege dus, diger akis yine de taze.
    if (cachedFootball) return json({ available: true, scores: cachedFootball, espn: espnLive, cached: true, stale: true });
    return json({ available: espnLive.length > 0, scores: [], espn: espnLive, reason: 'not_configured' });
  }
  if (cachedFootball) return json({ available: true, scores: cachedFootball, espn: espnLive, cached: true, stale: true });
  return json({ available: espnLive.length > 0, scores: [], espn: espnLive, reason: footballResult instanceof Error ? footballResult.message : 'unknown_error' });
});
