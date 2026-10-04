import { fetchRacingResults } from './espn-racing.ts';
import { f1SessionOver, fetchF1LiveSession } from './f1-livetiming.ts';
import { fetchOpenF1Results, fetchOpenF1Session } from './openf1.ts';
import type { SessionResults } from './types.ts';

/**
 * F1 session results from three sources: ESPN for the live running order,
 * F1's own live timing to stop calling a session live once it's over, and
 * OpenF1 for the final classification (slow, 10+ s, so only once ESPN has no
 * live order to show).
 */
export async function fetchF1Results(params: {
  title: string;
  startsAtUtc: string;
}): Promise<SessionResults | null> {
  const [espn, official] = await Promise.all([
    fetchRacingResults({ sportId: 'f1', title: params.title, startsAtUtc: params.startsAtUtc }),
    fetchF1LiveSession(),
  ]);
  const over = official ? f1SessionOver(official, params.startsAtUtc, Date.now(), params.title) : null;
  if (espn?.live && over !== true) return espn;

  const session = await fetchOpenF1Session(params.title, params.startsAtUtc);
  const final = session ? await fetchOpenF1Results(session) : null;
  if (final) return final;
  return espn ? { ...espn, live: false } : null;
}
