import { PROVIDER_USER_AGENT, warnHttp } from './log.ts';
import { f1DriverPhoto, f1TeamLogo } from './motorsport-brands.ts';
import type { SessionEntry, SessionResults } from './types.ts';

/**
 * F1 session results from ESPN's hidden APIs.
 *
 * The site scoreboard lists every session of the Grand Prix week with its
 * status and running order (names included), so one call covers both live
 * and finished sessions. The core API's competition list adds each driver's
 * constructor. Unofficial + undocumented, so every call degrades to null on
 * any error and the caller treats that as "no results yet".
 *
 * ESPN rejects Supabase Edge Function IPs (403), so the app calls this from
 * the device.
 */

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/racing';
const CORE = 'https://sports.core.api.espn.com/v2/sports/racing/leagues';

// ESPN only exposes Formula 1 on these endpoints today (MotoGP is absent).
const LEAGUE_SLUG: Record<string, string> = { f1: 'f1' };

// A session's scheduled start in our data and ESPN's can drift slightly.
const MATCH_WINDOW_MS = 30 * 60_000;

const SESSION_LABEL: Record<string, string> = {
  FP1: 'Free Practice 1',
  FP2: 'Free Practice 2',
  FP3: 'Free Practice 3',
  SS: 'Sprint Shootout',
  SR: 'Sprint Race',
  Qual: 'Qualifying',
  Race: 'Race',
};

export interface ScoreboardCompetition {
  id: string;
  date: string;
  type?: { abbreviation?: string };
  status?: { type?: { state?: string } };
  competitors?: {
    id: string;
    order?: number;
    athlete?: { displayName?: string };
  }[];
}

export interface ScoreboardEvent {
  id: string;
  competitions?: ScoreboardCompetition[];
}

interface CoreCompetition {
  id: string;
  competitors?: { id: string; vehicle?: { manufacturer?: string } }[];
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': PROVIDER_USER_AGENT } });
    if (!res.ok) return warnHttp('espn-racing', res, null);
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** The scoreboard session starting closest to `startsAtUtc`, if any. */
export function findSession(
  events: ScoreboardEvent[],
  startsAtUtc: string,
): { gpId: string; competition: ScoreboardCompetition } | null {
  const start = new Date(startsAtUtc).getTime();
  let best: { gpId: string; competition: ScoreboardCompetition; gap: number } | null = null;
  for (const ev of events) {
    for (const c of ev.competitions ?? []) {
      const gap = Math.abs(new Date(c.date).getTime() - start);
      if (gap <= MATCH_WINDOW_MS && (!best || gap < best.gap)) {
        best = { gpId: ev.id, competition: c, gap };
      }
    }
  }
  return best && { gpId: best.gpId, competition: best.competition };
}

/** Running order / classification of a scoreboard session. */
export function sessionResults(
  competition: ScoreboardCompetition,
  teams: Map<string, string>,
): SessionResults | null {
  const entries: SessionEntry[] = (competition.competitors ?? [])
    .filter((c) => c.order && c.athlete?.displayName)
    .map((c) => {
      const name = c.athlete!.displayName!;
      const team = teams.get(c.id) ?? null;
      return {
        position: c.order!,
        name,
        team,
        photoUrl: f1DriverPhoto(name),
        teamLogoUrl: f1TeamLogo(team),
      };
    })
    .sort((a, b) => a.position - b.position);
  if (entries.length === 0) return null;
  const abbr = competition.type?.abbreviation ?? '';
  return {
    session: SESSION_LABEL[abbr] ?? abbr,
    entries,
    live: competition.status?.type?.state === 'in',
  };
}

/**
 * Classification (or live running order) for the session an event
 * represents. Returns null when ESPN doesn't cover the series, no session
 * starts near the event, or the session hasn't run yet.
 */
export async function fetchRacingResults(params: {
  sportId: string;
  title: string;
  startsAtUtc: string;
}): Promise<SessionResults | null> {
  const slug = LEAGUE_SLUG[params.sportId];
  if (!slug) return null;

  const start = new Date(params.startsAtUtc);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const from = new Date(start.getTime() - 4 * 86_400_000);
  const to = new Date(start.getTime() + 4 * 86_400_000);
  const board = await getJson<{ events?: ScoreboardEvent[] }>(
    `${SITE}/${slug}/scoreboard?dates=${fmt(from)}-${fmt(to)}`,
  );
  const match = findSession(board?.events ?? [], params.startsAtUtc);
  if (!match) return null;

  const core = await getJson<{ items?: CoreCompetition[] }>(
    `${CORE}/${slug}/events/${match.gpId}/competitions?limit=50`,
  );
  const teams = new Map<string, string>();
  const comp = core?.items?.find((c) => c.id === match.competition.id);
  for (const c of comp?.competitors ?? []) {
    if (c.vehicle?.manufacturer) teams.set(c.id, c.vehicle.manufacturer);
  }

  return sessionResults(match.competition, teams);
}
