import type {
  ConferenceStandings,
  LeagueStandings,
  TeamStandingEntry,
} from './types.ts';

/**
 * Team-league basketball standings from ESPN's public standings endpoint.
 * Grouped by conference (Eastern / Western for the NBA), with W-L record,
 * win %, games behind and the team logo. Available year-round (off-season
 * shows the last completed table), so it degrades to null only on error.
 */

const BASE = 'https://site.api.espn.com/apis/v2/sports/basketball';

interface EspnStat {
  name: string;
  displayValue?: string;
  value?: number;
}

interface EspnEntry {
  team?: { displayName?: string; logos?: { href?: string }[] };
  stats?: EspnStat[];
}

interface EspnChild {
  name?: string;
  standings?: { entries?: EspnEntry[] };
}

interface EspnStandings {
  season?: { displayName?: string; year?: number };
  children?: EspnChild[];
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

function stat(entry: EspnEntry, name: string): EspnStat | undefined {
  return entry.stats?.find((s) => s.name === name);
}

function toEntry(e: EspnEntry): TeamStandingEntry | null {
  const team = e.team?.displayName;
  if (!team) return null;
  return {
    seed: Math.round(stat(e, 'playoffSeed')?.value ?? 0),
    team,
    teamLogoUrl: e.team?.logos?.[0]?.href ?? null,
    wins: Math.round(stat(e, 'wins')?.value ?? 0),
    losses: Math.round(stat(e, 'losses')?.value ?? 0),
    winPct: stat(e, 'winPercent')?.displayValue ?? '-',
    gamesBehind: stat(e, 'gamesBehind')?.displayValue ?? '-',
  };
}

/** `leagueSlug` is the ESPN slug, e.g. "nba". */
export async function fetchBasketballStandings(
  leagueSlug: string,
): Promise<LeagueStandings | null> {
  const data = await getJson<EspnStandings>(`${BASE}/${leagueSlug}/standings`);
  if (!data?.children?.length) return null;

  const conferences: ConferenceStandings[] = [];
  for (const child of data.children) {
    const entries = (child.standings?.entries ?? [])
      .map(toEntry)
      .filter((e): e is TeamStandingEntry => e !== null)
      .sort((a, b) => a.seed - b.seed);
    if (entries.length > 0) {
      conferences.push({ name: child.name ?? 'Standings', entries });
    }
  }
  if (conferences.length === 0) return null;
  return {
    season: data.season?.displayName ?? String(data.season?.year ?? ''),
    conferences,
  };
}
