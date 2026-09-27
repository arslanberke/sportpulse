export type FixtureSyncState = 'running' | 'ok' | 'empty' | 'limited' | 'degraded' | 'failed';

export interface FixtureHealth {
  leagueId: string;
  leagueName: string;
  sportId: string;
  state: FixtureSyncState | 'unknown';
  lastAttemptAt: string;
  lastCompletedAt: string | null;
  lastSuccessAt: string | null;
  source: string | null;
}

export function fixtureSyncState(
  source: string | null,
  fetched: number,
  written: number,
  issueCount: number,
): FixtureSyncState {
  if (!source || issueCount > 0 || written < fetched) return written > 0 ? 'degraded' : 'failed';
  if (source === 'thesportsdb') return 'limited';
  return fetched > 0 ? 'ok' : 'empty';
}

export function needsFixtureWarning(health: FixtureHealth, now: Date): boolean {
  if (['failed', 'degraded', 'limited', 'unknown'].includes(health.state)) return true;
  if (health.state === 'running') {
    const attempt = Date.parse(health.lastAttemptAt);
    return !health.lastSuccessAt || !Number.isFinite(attempt) || now.getTime() - attempt > 180_000 ||
      now.getTime() - Date.parse(health.lastSuccessAt) > 8 * 3_600_000;
  }
  const completed = health.lastCompletedAt ? Date.parse(health.lastCompletedAt) : NaN;
  return !Number.isFinite(completed) || now.getTime() - completed > 8 * 3_600_000;
}
