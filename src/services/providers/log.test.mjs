import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProviderDiagnostics } from '../../../supabase/functions/_shared/provider-diagnostics.ts';
import { espnProvider, fetchRankings, fetchTournamentMatches } from './espn.ts';
import { fetchFixtureSnapshot, fetchUpcomingEvents, providers } from './index.ts';
import { fetchProvider, warnHttp } from './log.ts';

const league = { leagueId: 'test-league', sportId: 'tennis', externalIds: { espn: 'atp' } };

test('HTTP failures are reported without exposing request URLs', () => {
  const issues = [];
  const response = new Response(null, { status: 403 });
  Object.defineProperty(response, 'url', { value: 'https://provider.invalid/secret-key?token=secret' });
  const fallback = [];
  assert.equal(warnHttp('espn.scoreboard', response, fallback, (issue) => issues.push(issue)), fallback);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].status, 403);
  assert.equal(issues[0].kind, 'http');
  assert.ok(!JSON.stringify(issues).includes('secret'));
});

test('ESPN fixture, rankings and draw HTTP failures are distinguishable from empty data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }));
  const issues = [];
  const ref = { ...league, onIssue: (issue) => issues.push(issue) };
  assert.deepEqual(await espnProvider.fetchUpcomingEvents(ref, 1), []);
  assert.deepEqual(await fetchRankings(ref), []);
  assert.deepEqual(await fetchTournamentMatches(ref), []);
  assert.deepEqual(issues.map((issue) => issue.source), ['espn.scoreboard', 'espn.rankings', 'espn.bracket']);
  assert.ok(issues.every((issue) => issue.status === 403));
});

test('valid empty ESPN data is not reported as failure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ events: [], rankings: [] }));
  const issues = [];
  const ref = { ...league, onIssue: (issue) => issues.push(issue) };
  assert.deepEqual(await fetchRankings(ref), []);
  assert.deepEqual(await fetchTournamentMatches(ref), []);
  assert.deepEqual(issues, []);
});

test('fallback still returns fixtures while the ESPN outage stays visible', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }));
  const fallback = providers.find((provider) => provider.name === 'thesportsdb');
  t.mock.method(fallback, 'supports', () => true);
  const events = [{ externalId: 'fixture', provider: 'thesportsdb' }];
  t.mock.method(fallback, 'fetchUpcomingEvents', async () => events);
  const issues = [];
  assert.equal(await fetchUpcomingEvents({ ...league, onIssue: (issue) => issues.push(issue) }, 1), events);
  assert.equal(issues[0].status, 403);
});

test('network errors report a safe issue instead of leaking exception contents', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('url-with-secret'); });
  const issues = [];
  await assert.rejects(fetchRankings({ ...league, onIssue: (issue) => issues.push(issue) }), /request failed/);
  assert.deepEqual(issues, [{ source: 'espn.rankings', kind: 'request', status: null }]);
});

test('diagnostics are request scoped, deduplicated and persisted before flush', async () => {
  const stored = [];
  const first = createProviderDiagnostics('sync-events', async (issue) => { stored.push(issue); });
  const second = createProviderDiagnostics('sync-events', async () => {});
  const issue = { source: 'espn.scoreboard', kind: 'http', status: 403 };
  first.forLeague('a')(issue);
  first.forLeague('a')(issue);
  first.forLeague('b')(issue);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stored.length, 2);
  assert.equal(second.issues.length, 0);
  assert.notEqual(first.runId, second.runId);
  assert.equal((await first.flush()).diagnosticsPersisted, true);
});

test('transient errors retry once, while access denials do not', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1 ? new Response(null, { status: 503 }) : Response.json({ ok: true }));
  assert.deepEqual(await (await fetchProvider('test', 'https://example.com', undefined, { retryDelayMs: 0 })).json(), { ok: true });
  assert.equal(calls, 2);
  calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 403 }); });
  assert.equal((await fetchProvider('test', 'https://example.com')).status, 403);
  assert.equal(calls, 1);
});

test('timeouts abort both attempts and report once', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    calls++;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  });
  const issues = [];
  await assert.rejects(fetchProvider('test', 'https://example.com', (issue) => issues.push(issue), { timeoutMs: 5, retryDelayMs: 0 }), /request failed/);
  assert.equal(calls, 2);
  assert.equal(issues.length, 1);
});

test('an HTTP 200 error document is not a successful empty fixture snapshot', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'unavailable' }));
  t.mock.method(providers.find((provider) => provider.name === 'thesportsdb'), 'supports', () => false);
  const snapshot = await fetchFixtureSnapshot(league, 7);
  assert.equal(snapshot.provider, null);
  assert.equal(snapshot.events.length, 0);
  assert.ok(snapshot.issues.length > 0);
});

test('a snapshot retains the failed primary and identifies the fallback', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }));
  const fallback = providers.find((provider) => provider.name === 'thesportsdb');
  t.mock.method(fallback, 'supports', () => true);
  t.mock.method(fallback, 'fetchUpcomingEvents', async () => [{ provider: 'thesportsdb', externalId: 'fixture' }]);
  const snapshot = await fetchFixtureSnapshot(league, 7);
  assert.equal(snapshot.provider, 'thesportsdb');
  assert.equal(snapshot.issues[0].status, 403);
  assert.equal(snapshot.events.length, 1);
});

test('TheSportsDB stops a daily scan after a rate limit instead of returning a complete-looking window', async (t) => {
  const requests = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 429, headers: { 'retry-after': '120' } }));
  const issues = [];
  const result = await providers.find((provider) => provider.name === 'thesportsdb').fetchUpcomingEvents({ ...league, externalIds: { thesportsdb: '4481' }, onIssue: (issue) => issues.push(issue) }, 14);
  assert.deepEqual(result, []);
  assert.equal(requests.mock.callCount(), 1);
  assert.equal(issues[0].status, 429);
});

test('diagnostic persistence failure does not interrupt fallback and is visible', async () => {
  const report = createProviderDiagnostics('sync-events', async () => { throw new Error('storage'); });
  report.forLeague('a')({ source: 'espn.scoreboard', kind: 'http', status: 403 });
  const result = await report.flush();
  assert.equal(result.diagnosticsPersisted, false);
  assert.equal(result.providerIssues.length, 1);
});
