import type { ProviderIssue, ReportProviderIssue } from '../../../src/services/providers/log.ts';

export interface StoredProviderIssue extends ProviderIssue {
  job: string;
  runId: string;
  leagueId: string;
  observedAt: string;
}

export function createProviderDiagnostics(
  job: string,
  persist: (issue: StoredProviderIssue) => Promise<void>,
) {
  const runId = crypto.randomUUID();
  const issues: StoredProviderIssue[] = [];
  const pending: Promise<void>[] = [];
  const seen = new Set<string>();
  let persistenceFailed = false;

  const forLeague = (leagueId: string): ReportProviderIssue => (issue) => {
    const key = `${leagueId}:${issue.source}:${issue.kind}:${issue.status}`;
    if (seen.has(key)) return;
    seen.add(key);
    const entry = { ...issue, job, runId, leagueId, observedAt: new Date().toISOString() };
    issues.push(entry);
    console.warn('[provider-health]', JSON.stringify(entry));
    pending.push(Promise.resolve().then(() => persist(entry)).catch(() => {
      persistenceFailed = true;
      console.error('[provider-health] persistence failed', runId);
    }));
  };

  return {
    runId,
    issues,
    forLeague,
    async flush() {
      await Promise.all(pending);
      return { runId, providerIssues: issues, diagnosticsPersisted: !persistenceFailed };
    },
  };
}
