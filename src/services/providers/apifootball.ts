/**
 * API-Football (api-sports.io) lineup provider.
 *
 * Unlike TheSportsDB, this returns the full starting XI + substitutes, the
 * formation string, and pitch grid coordinates — everything the formation
 * view needs. It's pure TypeScript over `fetch` so it runs in the Deno Edge
 * Function; the API key is passed in by the caller (never read from a global)
 * to keep the module environment-agnostic.
 *
 * Free plan constraints handled here:
 *   - 10 requests/minute, 100/day  → callers cache the resolved fixture id and
 *     only poll near kickoff.
 *   - `date` param is limited to a window around "today" → fine because we only
 *     resolve fixtures near kickoff.
 */

import type { EventLineup, LineupPlayer } from './types.ts';

const BASE = 'https://v3.football.api-sports.io';

interface AfPlayer {
  id: number;
  name: string;
  number: number | null;
  pos: string | null; // "G" | "D" | "M" | "F"
  grid: string | null; // "row:col", row 1 = keeper. Null for subs.
}

interface AfTeamLineup {
  team: { id: number; name: string };
  formation: string | null;
  startXI: { player: AfPlayer }[];
  substitutes: { player: AfPlayer }[];
}

interface AfFixture {
  fixture: { id: number };
  teams: { home: { name: string }; away: { name: string } };
}

interface AfResponse<T> {
  errors: unknown;
  results: number;
  response: T;
}

const POSITION_LABELS: Record<string, string> = {
  G: 'Goalkeeper',
  D: 'Defender',
  M: 'Midfielder',
  F: 'Forward',
};

async function afFetch<T>(
  path: string,
  apiKey: string,
): Promise<AfResponse<T> | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as AfResponse<T>;
  const errors = body.errors;
  const hasErrors = Array.isArray(errors)
    ? errors.length > 0
    : errors != null && Object.keys(errors as object).length > 0;
  if (hasErrors) return null;
  return body;
}

/** Strips accents, punctuation and common club noise words for fuzzy matching. */
export function normalizeTeamName(name: string): string {
  const stripped = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks
    .toLowerCase()
    .replace(/[.'()-]/g, ' ');
  const noise = new Set([
    'fc',
    'sc',
    'sk',
    'ac',
    'as',
    'if',
    'cf',
    'club',
    'kulubu',
    'kulübü',
    'spor',
    'sports',
    'women',
    'kadinlar',
    'w',
    'ladies',
    'feminine',
    'the',
    'de',
    'city',
    'united',
    'utd',
  ]);
  return stripped
    .split(/\s+/)
    .filter((w) => w.length > 0 && !noise.has(w))
    .join(' ')
    .trim();
}

/** Token-overlap score in [0,1] between two normalized names. */
function nameScore(a: string, b: string): number {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits += 1;
  const denom = Math.min(ta.size, tb.size);
  return denom === 0 ? 0 : hits / denom;
}

/**
 * Resolves our event to an API-Football fixture id by matching both team names
 * on the kickoff date. Returns null when there's no confident match.
 */
export async function resolveApiFootballFixture(
  params: {
    homeTeam: string | null;
    awayTeam: string | null;
    startsAtUtc: string;
    apiKey: string;
  },
): Promise<number | null> {
  const { homeTeam, awayTeam, startsAtUtc, apiKey } = params;
  if (!homeTeam || !awayTeam) return null;

  const date = startsAtUtc.slice(0, 10); // YYYY-MM-DD (UTC)
  const body = await afFetch<AfFixture[]>(
    `/fixtures?date=${date}`,
    apiKey,
  );
  if (!body || body.results === 0) return null;

  let best: { id: number; score: number } | null = null;
  for (const fx of body.response) {
    const score =
      nameScore(homeTeam, fx.teams.home.name) +
      nameScore(awayTeam, fx.teams.away.name);
    if (!best || score > best.score) {
      best = { id: fx.fixture.id, score };
    }
  }
  // Require a strong match on both sides (max score is 2.0).
  if (best && best.score >= 1.5) return best.id;
  return null;
}

function normalizePlayer(
  p: AfPlayer,
  isSubstitute: boolean,
): LineupPlayer {
  let grid: { row: number; col: number } | null = null;
  if (p.grid) {
    const [row, col] = p.grid.split(':').map((n) => Number(n));
    if (Number.isFinite(row) && Number.isFinite(col)) grid = { row, col };
  }
  return {
    id: String(p.id),
    name: p.name,
    number: p.number ?? null,
    position: p.pos ? (POSITION_LABELS[p.pos] ?? p.pos) : null,
    isSubstitute,
    photoUrl: `https://media.api-sports.io/football/players/${p.id}.png`,
    isCaptain: false,
    countryCode: null,
    grid,
  };
}

function toSide(team: AfTeamLineup): LineupPlayer[] {
  return [
    ...team.startXI.map((e) => normalizePlayer(e.player, false)),
    ...team.substitutes.map((e) => normalizePlayer(e.player, true)),
  ];
}

/** Full lineup for a known API-Football fixture, or null when not published. */
export async function fetchApiFootballLineup(
  fixtureId: number | string,
  apiKey: string,
): Promise<EventLineup | null> {
  const body = await afFetch<AfTeamLineup[]>(
    `/fixtures/lineups?fixture=${fixtureId}`,
    apiKey,
  );
  if (!body || body.results < 2) return null; // need both teams

  const [home, away] = body.response;
  if (!home.startXI.length || !away.startXI.length) return null;

  return {
    home: toSide(home),
    away: toSide(away),
    homeFormation: home.formation ?? null,
    awayFormation: away.formation ?? null,
  };
}
