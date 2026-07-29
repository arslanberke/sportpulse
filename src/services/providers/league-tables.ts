import { fetchEuroleagueTable } from './euroleague-standings.ts';
import type { LeagueTableGroup, LeagueTableRow } from './types.ts';

/**
 * League tables, generalized so one function covers a football league
 * ("Süper Lig"), a cup's league phase ("UEFA Conference League") and a
 * basketball conference alike. ESPN serves most of them; the competitions it
 * doesn't carry fall to their own feed.
 *
 * Cups that are pure knockout have no table; the source answers with no
 * groups and the caller simply doesn't show a standings section for them.
 */

const BASE = 'https://site.api.espn.com/apis/v2/sports';

/** Sport id -> ESPN path segment. Only sports whose leagues have tables. */
const SPORT_PATHS: Record<string, string> = {
  football: 'soccer',
  basketball: 'basketball',
};

interface EspnStat {
  name: string;
  displayValue?: string;
  value?: number;
}

interface EspnEntry {
  team?: { displayName?: string; logos?: { href?: string }[] };
  stats?: EspnStat[];
}

interface EspnStandingsResponse {
  season?: { displayName?: string; year?: number };
  children?: { name?: string; standings?: { entries?: EspnEntry[] } }[];
  standings?: { entries?: EspnEntry[] };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function num(entry: EspnEntry, name: string): number | null {
  const stat = entry.stats?.find((s) => s.name === name);
  return stat?.value == null ? null : Math.round(stat.value);
}

function text(entry: EspnEntry, name: string): string | null {
  return entry.stats?.find((s) => s.name === name)?.displayValue ?? null;
}

function toRow(entry: EspnEntry, index: number): LeagueTableRow | null {
  const team = entry.team?.displayName;
  if (!team) return null;
  return {
    // Football uses `rank`, basketball `playoffSeed`; fall back to the order
    // ESPN sent, which is already the table order.
    rank: num(entry, 'rank') ?? num(entry, 'playoffSeed') ?? index + 1,
    team,
    teamLogoUrl: entry.team?.logos?.[0]?.href ?? null,
    played: num(entry, 'gamesPlayed') ?? 0,
    wins: num(entry, 'wins') ?? 0,
    draws: num(entry, 'ties'),
    losses: num(entry, 'losses') ?? 0,
    points: num(entry, 'points'),
    goalDiff: text(entry, 'pointDifferential'),
    winPct: text(entry, 'winPercent'),
    gamesBehind: text(entry, 'gamesBehind'),
  };
}

function toGroup(name: string, entries: EspnEntry[]): LeagueTableGroup | null {
  const rows = entries
    .map(toRow)
    .filter((row): row is LeagueTableRow => row !== null)
    .sort((a, b) => a.rank - b.rank);
  return rows.length > 0 ? { name, rows } : null;
}

/**
 * The table(s) of one competition, from whichever source knows it. ESPN's
 * basketball catalog stops at the NBA, WNBA, college and FIBA, so European
 * basketball is served by EuroLeague's own feed instead.
 *
 * Returns null when no source covers the competition — a pure knockout cup,
 * or a league nobody publishes a table for.
 */
export async function fetchLeagueTable(params: {
  sportId: string;
  externalIds: Record<string, string>;
}): Promise<{ season: string; groups: LeagueTableGroup[] } | null> {
  const euroleague = params.externalIds.euroleague;
  if (euroleague) return fetchEuroleagueTable(euroleague);

  const path = SPORT_PATHS[params.sportId];
  const slug = params.externalIds.espn;
  if (!path || !slug) return null;

  const data = await getJson<EspnStandingsResponse>(
    `${BASE}/${path}/${slug}/standings`,
  );
  if (!data) return null;

  const groups: LeagueTableGroup[] = [];
  for (const child of data.children ?? []) {
    const group = toGroup(child.name ?? '', child.standings?.entries ?? []);
    if (group) groups.push(group);
  }
  // Some competitions answer with a single unnamed table instead of children.
  if (groups.length === 0 && data.standings?.entries?.length) {
    const group = toGroup('', data.standings.entries);
    if (group) groups.push(group);
  }
  if (groups.length === 0) return null;

  return {
    season: data.season?.displayName ?? String(data.season?.year ?? ''),
    groups,
  };
}
