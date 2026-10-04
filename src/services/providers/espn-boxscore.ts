import { PROVIDER_USER_AGENT } from './log.ts';

export interface BoxPlayer {
  id: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
  starter: boolean;
  minutes: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  plusMinus: string;
}

export interface BoxTeamStat {
  key: string;
  home: string;
  away: string;
}

export interface BoxScore {
  live: boolean;
  periods: { home: number[]; away: number[] };
  teamStats: BoxTeamStat[];
  players: { home: BoxPlayer[]; away: BoxPlayer[] };
}

/** ESPN team stat names shown in the team tab, in display order. */
export const BOX_TEAM_STATS = [
  'fieldGoalsMade-fieldGoalsAttempted',
  'fieldGoalPct',
  'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
  'threePointFieldGoalPct',
  'freeThrowsMade-freeThrowsAttempted',
  'totalRebounds',
  'assists',
  'steals',
  'blocks',
  'turnovers',
  'pointsInPaint',
  'fastBreakPoints',
  'largestLead',
] as const;

interface EspnStat { name: string; displayValue: string }
interface EspnAthlete {
  athlete: { id: string; shortName: string; position?: { abbreviation?: string }; headshot?: { href?: string } };
  starter: boolean;
  didNotPlay: boolean;
  stats: string[];
}
interface EspnSummary {
  header?: {
    competitions?: {
      status?: { type?: { state?: string } };
      competitors?: { homeAway: string; team: { id: string }; linescores?: { displayValue: string }[] }[];
    }[];
  };
  boxscore?: {
    teams?: { team: { id: string }; statistics?: EspnStat[] }[];
    players?: { team: { id: string }; statistics?: { keys: string[]; athletes: EspnAthlete[] }[] }[];
  };
}

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** ESPN's resizer serves a ~8 KB thumbnail instead of the ~60 KB full PNG. */
function smallHeadshot(href: string | undefined): string | null {
  if (!href) return null;
  const path = href.replace(/^https?:\/\/a\.espncdn\.com/, '');
  return path.startsWith('/') ? `https://a.espncdn.com/combiner/i?img=${path}&w=96&h=70` : href;
}

function players(group: { keys: string[]; athletes: EspnAthlete[] } | undefined): BoxPlayer[] {
  if (!group) return [];
  const at = (a: EspnAthlete, key: string) => a.stats[group.keys.indexOf(key)];
  return group.athletes
    .filter((a) => !a.didNotPlay && a.stats.length > 0)
    .map((a) => ({
      id: a.athlete.id,
      name: a.athlete.shortName,
      position: a.athlete.position?.abbreviation ?? null,
      photoUrl: smallHeadshot(a.athlete.headshot?.href),
      starter: a.starter,
      minutes: at(a, 'minutes') ?? '0',
      points: num(at(a, 'points')),
      rebounds: num(at(a, 'rebounds')),
      assists: num(at(a, 'assists')),
      steals: num(at(a, 'steals')),
      blocks: num(at(a, 'blocks')),
      plusMinus: at(a, 'plusMinus') ?? '0',
    }))
    .sort((a, b) => Number(b.starter) - Number(a.starter) || b.points - a.points);
}

/** Box score from an ESPN game summary; null before tip-off (no stats yet). */
export function parseBoxScore(summary: EspnSummary): BoxScore | null {
  const comp = summary.header?.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  const box = summary.boxscore;
  if (!home || !away || !box) return null;

  const teamStats = (id: string) =>
    new Map((box.teams?.find((t) => t.team.id === id)?.statistics ?? []).map((s) => [s.name, s.displayValue]));
  const homeStats = teamStats(home.team.id);
  const awayStats = teamStats(away.team.id);
  const group = (id: string) => box.players?.find((p) => p.team.id === id)?.statistics?.[0];

  const result: BoxScore = {
    live: comp?.status?.type?.state === 'in',
    periods: {
      home: (home.linescores ?? []).map((l) => num(l.displayValue)),
      away: (away.linescores ?? []).map((l) => num(l.displayValue)),
    },
    teamStats: BOX_TEAM_STATS.filter((k) => homeStats.has(k) && awayStats.has(k)).map((key) => ({
      key,
      home: homeStats.get(key)!,
      away: awayStats.get(key)!,
    })),
    players: { home: players(group(home.team.id)), away: players(group(away.team.id)) },
  };
  const empty = result.teamStats.length === 0 && result.players.home.length === 0 && result.periods.home.length === 0;
  return empty ? null : result;
}

export async function fetchBoxScore(league: string, espnId: string): Promise<BoxScore | null> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/summary?event=${encodeURIComponent(espnId)}`,
    { headers: { 'User-Agent': PROVIDER_USER_AGENT } },
  );
  if (!res.ok) throw new Error(`ESPN summary ${res.status}`);
  return parseBoxScore((await res.json()) as EspnSummary);
}
