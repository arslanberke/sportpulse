import { PROVIDER_USER_AGENT } from './log.ts';

/**
 * EuroLeague'in kendi canli verisi. ESPN'in `basketball/euroleague` panosu
 * 2026-27'de bos donuyor; TheSportsDB ise sonucu saatler sonra yaziyor. Iki uc:
 * - v2 `games`: sezonun fiksturu (utcDate, kulup kodlari, `played`, skor).
 * - live.euroleague.net `Header`: suren macin skoru, ceyregi ve kalan suresi.
 *   Baslamamis macta bos govde doner; biten macta `Live=false`, `GameTime=40:00`.
 */

const GAMES_BASE = 'https://api-live.euroleague.net/v2/competitions/E/seasons';
const HEADER_BASE = 'https://live.euroleague.net/api/Header';
/** Basladiktan bu kadar sonra hala `played=false` olan mac artik yoklanmaz. */
export const EUROLEAGUE_LIVE_WINDOW_MS = 4 * 3_600_000;
/** Biten maclarin sonucu bu sure boyunca yazilmaya calisilir. */
const FINAL_WINDOW_MS = 12 * 3_600_000;

export function euroleagueSeasonCode(date: Date): string {
  const year = date.getUTCFullYear();
  return `E${date.getUTCMonth() >= 6 ? year : year - 1}`;
}

export interface EuroleagueGame {
  season: string;
  code: number;
  utcDate: string;
  played: boolean;
  homeCode: string;
  awayCode: string;
  homeName: string | null;
  awayName: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

export function parseEuroleagueGames(body: unknown, season: string): EuroleagueGame[] {
  const data = obj(body).data;
  if (!Array.isArray(data)) return [];
  const out: EuroleagueGame[] = [];
  for (const raw of data) {
    const g = obj(raw);
    const code = num(g.gameCode);
    const utcDate = str(g.utcDate);
    const home = obj(g.local);
    const away = obj(g.road);
    const homeCode = str(obj(home.club).code);
    const awayCode = str(obj(away.club).code);
    if (code === null || !utcDate || !homeCode || !awayCode) continue;
    const played = g.played === true;
    out.push({
      season,
      code,
      utcDate,
      played,
      homeCode,
      awayCode,
      homeName: str(obj(home.club).name),
      awayName: str(obj(away.club).name),
      homeScore: played ? num(home.score) : null,
      awayScore: played ? num(away.score) : null,
    });
  }
  return out;
}

export interface EuroleagueHeader {
  live: boolean;
  homeScore: number | null;
  awayScore: number | null;
  quarter: number | null;
  /** "04:09" — ceyrekte kalan sure. */
  remaining: string | null;
  /** "36:00" — oynanan toplam sure. */
  gameTime: string | null;
  homeLines: number[];
  awayLines: number[];
}

/** Header ceyrek skorlarini kumulatif verir (24, 51, 74, 89); ceyrek basina cevrilir. */
function quarterLines(h: Record<string, unknown>, side: 'A' | 'B'): number[] {
  const cumulative = [1, 2, 3, 4].map((q) => num(h[`ScoreQuarter${q}${side}`]) ?? 0);
  const extra = num(h[`ScoreExtraTime${side}`]) ?? 0;
  const lines: number[] = [];
  let prev = 0;
  for (const c of cumulative) {
    if (c === 0 && prev === 0) continue;
    if (c < prev) break;
    lines.push(c - prev);
    prev = c;
  }
  if (extra > 0) lines.push(extra);
  return lines;
}

export function parseEuroleagueHeader(body: unknown): EuroleagueHeader | null {
  const h = obj(body);
  if (typeof h.Live !== 'boolean') return null;
  return {
    live: h.Live,
    homeScore: num(h.ScoreA),
    awayScore: num(h.ScoreB),
    quarter: num(h.Quarter),
    remaining: str(h.RemainingPartialTime),
    gameTime: str(h.GameTime),
    homeLines: quarterLines(h, 'A'),
    awayLines: quarterLines(h, 'B'),
  };
}

/** Header canli degil ve 40 dakika oynanmis: mac bitti (fikstur `played` henuz guncellenmemis olabilir). */
export function euroleagueHeaderOver(header: EuroleagueHeader): boolean {
  if (header.live) return false;
  const minutes = Number(header.gameTime?.split(':')[0]);
  return Number.isFinite(minutes) && minutes >= 40 && header.homeScore !== null && header.awayScore !== null;
}

/** ESPN NBA panosuyla ayni bicim ("4:09 - 4th", "Halftime", "OT"); localizeStatus ikisini de cevirir. */
export function euroleagueStatusDetail(header: EuroleagueHeader): string | null {
  const q = header.quarter;
  if (q === null) return null;
  const remaining = header.remaining?.replace(/^0(\d:)/, '$1') ?? null;
  if (q === 2 && remaining === '0:00') return 'Halftime';
  if (q >= 5) return remaining ? `${remaining} - OT` : 'OT';
  const suffix = q === 1 ? 'st' : q === 2 ? 'nd' : q === 3 ? 'rd' : 'th';
  return remaining ? `${remaining} - ${q}${suffix}` : `${q}${suffix}`;
}

export interface EuroleagueLiveGame extends EuroleagueGame {
  header: EuroleagueHeader;
}

export interface EuroleagueLiveResult {
  live: EuroleagueLiveGame[];
  finals: EuroleagueGame[];
}

/** Yoklanacak (baslamis, `played=false`) ve sonucu yazilacak (`played=true`, yeni biten) maclar. */
export function selectEuroleagueCandidates(games: EuroleagueGame[], now: number): { probe: EuroleagueGame[]; finals: EuroleagueGame[] } {
  const probe: EuroleagueGame[] = [];
  const finals: EuroleagueGame[] = [];
  for (const g of games) {
    const start = Date.parse(g.utcDate);
    if (!Number.isFinite(start) || start > now) continue;
    const age = now - start;
    if (g.played) {
      if (age <= FINAL_WINDOW_MS && g.homeScore !== null && g.awayScore !== null) finals.push(g);
    } else if (age <= EUROLEAGUE_LIVE_WINDOW_MS) {
      probe.push(g);
    }
  }
  return { probe, finals };
}

export async function fetchEuroleagueLive(now = Date.now(), fetchImpl: typeof fetch = fetch): Promise<EuroleagueLiveResult> {
  const season = euroleagueSeasonCode(new Date(now));
  const response = await fetchImpl(`${GAMES_BASE}/${season}/games`, {
    headers: { Accept: 'application/json', 'User-Agent': PROVIDER_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`euroleague_games: http_${response.status}`);
  const games = parseEuroleagueGames(await response.json(), season);
  const { probe, finals } = selectEuroleagueCandidates(games, now);
  const live: EuroleagueLiveGame[] = [];
  const headers = await Promise.allSettled(probe.map(async (g) => {
    const r = await fetchImpl(`${HEADER_BASE}?gamecode=${g.code}&seasoncode=${g.season}`, {
      headers: { Accept: 'application/json', 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return null;
    const text = await r.text();
    if (!text.trim()) return null;
    return parseEuroleagueHeader(JSON.parse(text));
  }));
  headers.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const header = result.value;
    const game = probe[i];
    if (header.live) live.push({ ...game, header });
    else if (euroleagueHeaderOver(header)) finals.push({ ...game, played: true, homeScore: header.homeScore, awayScore: header.awayScore });
  });
  return { live, finals };
}
