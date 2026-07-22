/**
 * apifootball.com lineup provider.
 *
 * Returns the full starting XI + substitutes and the formation string for a
 * match. The `get_events` response embeds the lineup inline, so one request
 * gives us everything. It's pure TypeScript over `fetch`, with the key passed
 * in by the caller, so it runs in the Deno Edge Function.
 *
 * apifootball.com doesn't give pitch (x,y) coordinates, so we derive a grid
 * from the formation string + player order: row 1 = keeper, then one row per
 * formation line, players spread across the columns of their line. This yields
 * the same `{row, col}` shape the pitch view expects.
 */

import type { EventLineup, LineupPlayer } from './types.ts';

const BASE = 'https://apiv3.apifootball.com';

interface AfLineupPlayer {
  lineup_player: string;
  lineup_number: string;
  lineup_position: string; // "1".."11" for covered leagues, "0" otherwise
  player_key: string;
}

interface AfSide {
  starting_lineups: AfLineupPlayer[];
  substitutes: AfLineupPlayer[];
}

interface AfMatch {
  match_id: string;
  match_hometeam_id: string;
  match_awayteam_id: string;
  match_hometeam_name: string;
  match_awayteam_name: string;
  match_hometeam_system: string; // formation e.g. "4-2-3-1"
  match_awayteam_system: string;
  lineup?: { home: AfSide; away: AfSide };
}

interface AfSquadPlayer {
  player_key: string | number;
  player_image: string;
  player_country: string;
  player_type: string; // "Goalkeepers" | "Defenders" | ...
  player_is_captain: string; // "" / "0" when not a captain
}

interface AfTeam {
  players?: AfSquadPlayer[];
}

async function afFetch<T>(path: string): Promise<T[] | null> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) return null;
  const body = (await res.json()) as unknown;
  // Errors come back as an object with an `error` field, not an array.
  if (!Array.isArray(body)) return null;
  return body as T[];
}

interface SquadInfo {
  photoUrl: string | null;
  position: string | null;
  isCaptain: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  Goalkeepers: 'Goalkeeper',
  Defenders: 'Defender',
  Midfielders: 'Midfielder',
  Forwards: 'Forward',
};

/**
 * One request per team returns the full squad with photos, captain flag and
 * position group. Keyed by player_key so we can enrich the lineup rows.
 */
async function fetchSquad(
  teamId: string,
  apiKey: string,
): Promise<Map<string, SquadInfo>> {
  const map = new Map<string, SquadInfo>();
  if (!teamId) return map;
  const teams = await afFetch<AfTeam>(
    `/?action=get_teams&team_id=${teamId}&APIkey=${apiKey}`,
  );
  const players = teams?.[0]?.players ?? [];
  for (const p of players) {
    map.set(String(p.player_key), {
      photoUrl: p.player_image || null,
      position: p.player_type ? (TYPE_LABELS[p.player_type] ?? null) : null,
      isCaptain: Boolean(p.player_is_captain && p.player_is_captain !== '0'),
    });
  }
  return map;
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
 * Resolves our event to an apifootball.com match id by matching both team
 * names on the kickoff date. Returns null when there's no confident match.
 */
export async function resolveApiFootballFixture(params: {
  homeTeam: string | null;
  awayTeam: string | null;
  startsAtUtc: string;
  apiKey: string;
}): Promise<number | null> {
  const { homeTeam, awayTeam, startsAtUtc, apiKey } = params;
  if (!homeTeam || !awayTeam) return null;

  const date = startsAtUtc.slice(0, 10); // YYYY-MM-DD (UTC)
  const matches = await afFetch<AfMatch>(
    `/?action=get_events&from=${date}&to=${date}&APIkey=${apiKey}`,
  );
  if (!matches || matches.length === 0) return null;

  let best: { id: number; score: number } | null = null;
  for (const m of matches) {
    const score =
      nameScore(homeTeam, m.match_hometeam_name) +
      nameScore(awayTeam, m.match_awayteam_name);
    if (!best || score > best.score) {
      best = { id: Number(m.match_id), score };
    }
  }
  // Require a strong match on both sides (max score is 2.0).
  if (best && best.score >= 1.5 && Number.isFinite(best.id)) return best.id;
  return null;
}

/** Formation string -> outfield line sizes, with the keeper as row 1. */
function formationRows(formation: string): number[] {
  const lines = formation
    .split('-')
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
  return lines.length ? [1, ...lines] : [];
}

/**
 * Assigns a pitch grid to the ordered starters from the formation. Players are
 * expected keeper-first; when the provider gives `lineup_position` (1..11) we
 * sort by it, otherwise we trust the array order.
 */
function withGrid(
  players: AfLineupPlayer[],
  formation: string,
): { player: AfLineupPlayer; grid: { row: number; col: number } | null }[] {
  const havePos = players.every(
    (p) => p.lineup_position && p.lineup_position !== '0',
  );
  const ordered = havePos
    ? [...players].sort(
        (a, b) => Number(a.lineup_position) - Number(b.lineup_position),
      )
    : players;

  const rows = formationRows(formation);
  const total = rows.reduce((a, b) => a + b, 0);
  // Only lay out on the pitch when the formation matches the XI count.
  if (total !== ordered.length) {
    return ordered.map((player) => ({ player, grid: null }));
  }

  const out: {
    player: AfLineupPlayer;
    grid: { row: number; col: number } | null;
  }[] = [];
  let idx = 0;
  rows.forEach((size, rowIdx) => {
    for (let col = 1; col <= size; col += 1) {
      out.push({ player: ordered[idx], grid: { row: rowIdx + 1, col } });
      idx += 1;
    }
  });
  return out;
}

function normalizePlayer(
  p: AfLineupPlayer,
  isSubstitute: boolean,
  grid: { row: number; col: number } | null,
  squad: Map<string, SquadInfo>,
): LineupPlayer {
  const number = Number(p.lineup_number);
  const info = squad.get(String(p.player_key));
  return {
    id: p.player_key,
    name: p.lineup_player,
    number: Number.isFinite(number) && number > 0 ? number : null,
    position: info?.position ?? null,
    isSubstitute,
    photoUrl: info?.photoUrl ?? null,
    isCaptain: info?.isCaptain ?? false,
    countryCode: null,
    grid,
  };
}

function toSide(
  side: AfSide,
  formation: string,
  squad: Map<string, SquadInfo>,
): LineupPlayer[] {
  const starters = withGrid(side.starting_lineups ?? [], formation).map((e) =>
    normalizePlayer(e.player, false, e.grid, squad),
  );
  const subs = (side.substitutes ?? []).map((p) =>
    normalizePlayer(p, true, null, squad),
  );
  return [...starters, ...subs];
}

/** Full lineup for a known apifootball.com match, or null when not published. */
export async function fetchApiFootballLineup(
  matchId: number | string,
  apiKey: string,
): Promise<EventLineup | null> {
  const matches = await afFetch<AfMatch>(
    `/?action=get_events&match_id=${matchId}&APIkey=${apiKey}`,
  );
  if (!matches || matches.length === 0) return null;

  const m = matches[0];
  const lu = m.lineup;
  if (!lu) return null;

  const homeStart = lu.home?.starting_lineups ?? [];
  const awayStart = lu.away?.starting_lineups ?? [];
  if (homeStart.length === 0 || awayStart.length === 0) return null;

  // Enrich rows with photos, captain and position from each squad (2 requests,
  // best-effort — the lineup still renders if these fail).
  const [homeSquad, awaySquad] = await Promise.all([
    fetchSquad(m.match_hometeam_id, apiKey),
    fetchSquad(m.match_awayteam_id, apiKey),
  ]);

  return {
    home: toSide(lu.home, m.match_hometeam_system, homeSquad),
    away: toSide(lu.away, m.match_awayteam_system, awaySquad),
    homeFormation: m.match_hometeam_system || null,
    awayFormation: m.match_awayteam_system || null,
  };
}
