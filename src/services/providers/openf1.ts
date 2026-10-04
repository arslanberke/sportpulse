import { PROVIDER_USER_AGENT, warnHttp } from './log.ts';
import { f1DriverPhoto, f1TeamLogo } from './motorsport-brands.ts';
import type { ProviderEvent, SessionEntry, SessionResults } from './types.ts';

/**
 * OpenF1 (api.openf1.org), free tier. Live data is paid; the free tier serves
 * the session calendar and, shortly after a session ends, its timing data.
 * Used for accurate session times (TheSportsDB's drift by up to an hour) and
 * the final classification once a session is over. Responses take 10+ s, so
 * this runs server-side (event-results, sync-events) behind a cache.
 */

const BASE = 'https://api.openf1.org/v1';
const MATCH_WINDOW_MS = 3 * 3_600_000;

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
}

interface OpenF1Position {
  date: string;
  driver_number: number;
  position: number;
}

interface OpenF1Driver {
  driver_number: number;
  first_name: string | null;
  last_name: string | null;
  team_name: string | null;
}

const SESSION_LABEL: Record<string, string> = {
  'Practice 1': 'Free Practice 1',
  'Practice 2': 'Free Practice 2',
  'Practice 3': 'Free Practice 3',
  'Sprint Qualifying': 'Sprint Shootout',
  Sprint: 'Sprint Race',
  Qualifying: 'Qualifying',
  Race: 'Race',
};

/**
 * OpenF1 session name for one of our F1 event titles ("Singapore Grand Prix
 * Sprint Qualifying" -> "Sprint Qualifying"). Titles without "Grand Prix" are
 * support series (F2 "Feature Race 1") and match nothing.
 */
export function openF1SessionName(title: string): string | null {
  if (!/grand prix/i.test(title)) return null;
  if (/sprint (qualifying|shootout)/i.test(title)) return 'Sprint Qualifying';
  if (/sprint/i.test(title)) return 'Sprint';
  const practice = title.match(/practice\s*([123])/i);
  if (practice) return `Practice ${practice[1]}`;
  if (/qualifying/i.test(title)) return 'Qualifying';
  if (/practice/i.test(title)) return null;
  return 'Race';
}

/** The session of the same kind starting closest to `startsAtUtc`. */
export function matchOpenF1Session(
  sessions: OpenF1Session[],
  title: string,
  startsAtUtc: string,
): OpenF1Session | null {
  const name = openF1SessionName(title);
  if (!name) return null;
  const start = Date.parse(startsAtUtc);
  let best: { session: OpenF1Session; gap: number } | null = null;
  for (const s of sessions) {
    if (s.session_name !== name) continue;
    const gap = Math.abs(Date.parse(s.date_start) - start);
    if (gap <= MATCH_WINDOW_MS && (!best || gap < best.gap)) best = { session: s, gap };
  }
  return best?.session ?? null;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(40_000),
    });
    // 404 = "No results found" (session not published yet).
    if (res.status === 404) return null;
    if (!res.ok) return warnHttp('openf1', res, null);
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchOpenF1Sessions(fromUtc: Date, toUtc: Date): Promise<OpenF1Session[]> {
  const iso = (d: Date) => d.toISOString().slice(0, 19);
  const sessions = await getJson<OpenF1Session[]>(
    `sessions?date_start>=${iso(fromUtc)}&date_start<=${iso(toUtc)}`,
  );
  return Array.isArray(sessions) ? sessions : [];
}

export async function fetchOpenF1Session(title: string, startsAtUtc: string): Promise<OpenF1Session | null> {
  if (!openF1SessionName(title)) return null;
  const start = Date.parse(startsAtUtc);
  const sessions = await fetchOpenF1Sessions(
    new Date(start - MATCH_WINDOW_MS),
    new Date(start + MATCH_WINDOW_MS),
  );
  return matchOpenF1Session(sessions, title, startsAtUtc);
}

/** Each driver's last reported position, as a classification. */
export function openF1Classification(
  session: OpenF1Session,
  positions: OpenF1Position[],
  drivers: OpenF1Driver[],
): SessionResults | null {
  const last = new Map<number, OpenF1Position>();
  for (const p of positions) {
    const prev = last.get(p.driver_number);
    if (!prev || p.date >= prev.date) last.set(p.driver_number, p);
  }
  const byNumber = new Map(drivers.map((d) => [d.driver_number, d]));
  const entries: SessionEntry[] = [...last.values()]
    .flatMap((p) => {
      const d = byNumber.get(p.driver_number);
      const name = [d?.first_name, d?.last_name].filter(Boolean).join(' ');
      if (!name) return [];
      const team = d?.team_name ?? null;
      return [{
        position: p.position,
        name,
        team,
        photoUrl: f1DriverPhoto(name),
        teamLogoUrl: f1TeamLogo(team),
      }];
    })
    .sort((a, b) => a.position - b.position);
  if (entries.length === 0) return null;
  return {
    session: SESSION_LABEL[session.session_name] ?? session.session_name,
    entries,
    live: false,
  };
}

/** Final classification of a session that has ended; null before that. */
export async function fetchOpenF1Results(session: OpenF1Session): Promise<SessionResults | null> {
  if (Date.now() < Date.parse(session.date_end)) return null;
  const [positions, drivers] = await Promise.all([
    getJson<OpenF1Position[]>(`position?session_key=${session.session_key}`),
    getJson<OpenF1Driver[]>(`drivers?session_key=${session.session_key}`),
  ]);
  if (!Array.isArray(positions) || !Array.isArray(drivers)) return null;
  return openF1Classification(session, positions, drivers);
}

/**
 * Replaces TheSportsDB's F1 session times with OpenF1's (and fills the end
 * time). Events with no matching OpenF1 session are returned unchanged.
 */
export async function alignF1SessionTimes(events: ProviderEvent[]): Promise<ProviderEvent[]> {
  const starts = events
    .filter((e) => openF1SessionName(e.title))
    .map((e) => Date.parse(e.startsAtUtc))
    .filter(Number.isFinite);
  if (starts.length === 0) return events;
  const sessions = await fetchOpenF1Sessions(
    new Date(Math.min(...starts) - MATCH_WINDOW_MS),
    new Date(Math.max(...starts) + MATCH_WINDOW_MS),
  );
  if (sessions.length === 0) return events;
  return events.map((e) => {
    const s = matchOpenF1Session(sessions, e.title, e.startsAtUtc);
    return s
      ? { ...e, startsAtUtc: new Date(s.date_start).toISOString(), endsAtUtc: new Date(s.date_end).toISOString() }
      : e;
  });
}
