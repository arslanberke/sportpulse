import { PROVIDER_USER_AGENT } from './log.ts';
import { openF1SessionName } from './openf1.ts';

/**
 * Formula 1's own live timing (livetiming.formula1.com). Only SessionInfo.json
 * is public; it describes the current/most recent session and its status
 * ("Inactive", "Started", "Aborted", "Finished", "Finalised", "Ends"). Used to
 * tell when a session is over, since ESPN can leave one "in progress" for hours.
 */

const SESSION_INFO = 'https://livetiming.formula1.com/static/SessionInfo.json';
const MATCH_WINDOW_MS = 90 * 60_000;
// Same session name ("Race"): provider start times can be further off.
const NAMED_MATCH_WINDOW_MS = 3 * 3_600_000;
const ENDED = new Set(['Finished', 'Finalised', 'Ends']);

export interface F1LiveSession {
  startUtc: number;
  endUtc: number;
  status: string;
  name?: string;
}

/** "2026-10-04T15:00:00" local + "08:00:00" offset -> UTC millis. */
function localToUtc(local: unknown, offset: unknown): number {
  if (typeof local !== 'string' || typeof offset !== 'string') return NaN;
  const m = offset.match(/^(-)?(\d{2}):(\d{2})/);
  if (!m) return NaN;
  const ms = (Number(m[2]) * 60 + Number(m[3])) * 60_000 * (m[1] ? -1 : 1);
  return Date.parse(`${local}Z`) - ms;
}

export function parseSessionInfo(body: unknown): F1LiveSession | null {
  if (!body || typeof body !== 'object') return null;
  const info = body as Record<string, unknown>;
  const startUtc = localToUtc(info.StartDate, info.GmtOffset);
  const endUtc = localToUtc(info.EndDate, info.GmtOffset);
  if (!Number.isFinite(startUtc) || typeof info.SessionStatus !== 'string') return null;
  return { startUtc, endUtc, status: info.SessionStatus, name: typeof info.Name === 'string' ? info.Name : undefined };
}

export async function fetchF1LiveSession(): Promise<F1LiveSession | null> {
  try {
    const res = await fetch(SESSION_INFO, {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).replace(/^\uFEFF/, '');
    return parseSessionInfo(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * True when F1 reports the session starting near `startsAtUtc` as over, false
 * when it's still running or upcoming, null when F1's current session is a
 * different one.
 */
export function f1SessionOver(
  info: F1LiveSession,
  startsAtUtc: string,
  now = Date.now(),
  title?: string,
): boolean | null {
  const sameName = !!title && !!info.name && openF1SessionName(title) === info.name;
  const window = sameName ? NAMED_MATCH_WINDOW_MS : MATCH_WINDOW_MS;
  if (Math.abs(info.startUtc - Date.parse(startsAtUtc)) > window) return null;
  if (ENDED.has(info.status)) return true;
  if (info.status === 'Inactive') return Number.isFinite(info.endUtc) && now > info.endUtc;
  return false;
}
