import { warnHttp } from './log.ts';
import type {
  ConferenceStandings,
  LeagueStandings,
  LeagueTableGroup,
  LeagueTableRow,
  TeamStandingEntry,
} from './types.ts';

/**
 * EuroLeague / EuroCup tables, straight from EuroLeague Basketball.
 *
 * ESPN carries no European basketball at all (its basketball catalog is the
 * NBA, WNBA, college and FIBA), and TheSportsDB's table endpoint is not on
 * the free tier — so the competition's own feed is the only source. It is the
 * v1 API, which answers XML; the newer JSON one has no standings route.
 *
 * The XML is flat and predictable, so it is read with regexes rather than
 * pulling in a parser (Deno has no DOMParser in the Edge runtime).
 */

const V1 = 'https://api-live.euroleague.net/v1/standings';
const V2 = 'https://api-live.euroleague.net/v2/competitions';

/** Season code, e.g. "E2026" — the season is keyed by the year it starts. */
function seasonCode(competition: string, date: Date): string {
  const year = date.getUTCFullYear();
  return `${competition}${date.getUTCMonth() >= 6 ? year : year - 1}`;
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return match ? match[1].trim() : null;
}

function int(xml: string, name: string): number {
  const value = Number(tag(xml, name));
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** ".684" — the leading zero is dropped, as basketball tables are written. */
function winPercent(wins: number, played: number): string {
  if (played <= 0) return '-';
  return (wins / played).toFixed(3).replace(/^0/, '');
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return warnHttp('euroleague-standings', res, null);
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Club crest per team code. The standings feed carries no images, so they
 * come from the same clubs endpoint the team sync uses.
 */
async function crestsByCode(
  competition: string,
  season: string,
): Promise<Map<string, string>> {
  const crests = new Map<string, string>();
  try {
    const res = await fetch(`${V2}/${competition}/seasons/${season}/clubs`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return warnHttp('euroleague-standings.crests', res, crests);
    const body = (await res.json()) as {
      data?: { code?: string; images?: { crest?: string } }[];
    };
    for (const club of body.data ?? []) {
      if (club.code && club.images?.crest) crests.set(club.code, club.images.crest);
    }
  } catch {
    // Crests are cosmetic; a table without them is still worth showing.
  }
  return crests;
}

interface ParsedGroup {
  name: string;
  rows: LeagueTableRow[];
  codes: string[];
}

function parseGroups(xml: string, crests: Map<string, string>): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  const groupPattern = /<group\b([^>]*)>([\s\S]*?)<\/group>/g;

  for (const groupMatch of xml.matchAll(groupPattern)) {
    const name = groupMatch[1].match(/name="([^"]*)"/)?.[1] ?? '';
    const rows: LeagueTableRow[] = [];
    const codes: string[] = [];

    for (const teamMatch of groupMatch[2].matchAll(/<team>([\s\S]*?)<\/team>/g)) {
      const team = teamMatch[1];
      const teamName = tag(team, 'name');
      if (!teamName) continue;
      const code = tag(team, 'code') ?? '';
      const played = int(team, 'totalgames');
      const wins = int(team, 'wins');
      const difference = int(team, 'difference');

      codes.push(code);
      rows.push({
        rank: int(team, 'ranking') || rows.length + 1,
        team: teamName,
        teamLogoUrl: crests.get(code) ?? null,
        played,
        wins,
        // Basketball has no draws, and the table is ordered on wins, not points.
        draws: null,
        losses: int(team, 'losses'),
        points: null,
        goalDiff: difference > 0 ? `+${difference}` : String(difference),
        winPct: winPercent(wins, played),
        gamesBehind: null,
      });
    }

    if (rows.length > 0) {
      rows.sort((a, b) => a.rank - b.rank);
      groups.push({ name, rows, codes });
    }
  }
  return groups;
}

async function fetchSeason(
  competition: string,
  season: string,
): Promise<{ season: string; groups: ParsedGroup[] } | null> {
  const xml = await getText(`${V1}?seasonCode=${season}`);
  if (!xml || !xml.includes('<team>')) return null;
  const groups = parseGroups(xml, await crestsByCode(competition, season));
  if (groups.length === 0) return null;
  return { season, groups };
}

/**
 * The competition's table(s). `competition` is the code we store in
 * `external_ids.euroleague`: "E" for the EuroLeague, "U" for the EuroCup.
 *
 * A season that has not tipped off yet has no standings route, so the
 * previous season's final table is shown until the first games are played —
 * the same fallback the club list uses.
 */
export async function fetchEuroleagueTable(
  competition: string,
): Promise<{ season: string; groups: LeagueTableGroup[] } | null> {
  const now = new Date();
  const candidates = [
    seasonCode(competition, now),
    seasonCode(competition, new Date(now.getTime() - 200 * 86_400_000)),
  ];

  for (const season of candidates) {
    const result = await fetchSeason(competition, season);
    if (result) {
      return {
        season: result.season.slice(1),
        groups: result.groups.map(({ name, rows }) => ({ name, rows })),
      };
    }
  }
  return null;
}

/**
 * The same table in the shape the event screen's standings card expects.
 */
export async function fetchEuroleagueStandings(
  competition: string,
): Promise<LeagueStandings | null> {
  const table = await fetchEuroleagueTable(competition);
  if (!table) return null;

  const conferences: ConferenceStandings[] = table.groups.map((group) => ({
    name: group.name,
    entries: group.rows.map(
      (row): TeamStandingEntry => ({
        seed: row.rank,
        team: row.team,
        teamLogoUrl: row.teamLogoUrl,
        wins: row.wins,
        losses: row.losses,
        winPct: row.winPct ?? '-',
        gamesBehind: row.gamesBehind ?? '-',
      }),
    ),
  }));

  return { season: table.season, conferences };
}
