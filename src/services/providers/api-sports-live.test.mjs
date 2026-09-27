import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchFootballLiveScores } from './api-sports-live.ts';

const fixture = {
  fixture: { id: 123, date: '2026-09-14T18:00:00Z', status: { short: '2H', elapsed: 67 } },
  league: { id: 203, name: 'Super Lig', country: 'Turkey' },
  teams: { home: { id: 1, name: 'Home' }, away: { id: 2, name: 'Away' } },
  goals: { home: 1, away: 0 },
};

test('one request fetches all live matches and preserves zero goals', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url, 'https://v3.football.api-sports.io/fixtures?live=all');
    assert.equal(options.headers['x-apisports-key'], 'test-key');
    return Response.json({ errors: [], response: [fixture] }, {
      headers: { 'x-ratelimit-requests-remaining': '99' },
    });
  });
  const result = await fetchFootballLiveScores('test-key');
  assert.equal(calls, 1);
  assert.equal(result.remainingRequests, 99);
  assert.equal(result.scores[0].awayScore, 0);
  assert.equal(result.scores[0].elapsed, 67);
  assert.equal(result.scores[0].status, '2H');
  assert.ok(!JSON.stringify(result).includes('test-key'));
});

test('an empty live feed is valid and unknown scores are not zero', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: {}, response: [] }));
  assert.deepEqual((await fetchFootballLiveScores('test-key')).scores, []);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: {}, response: [
    { ...fixture, goals: { home: null, away: null } },
  ] }));
  const score = (await fetchFootballLiveScores('test-key')).scores[0];
  assert.equal(score.homeScore, null);
  assert.equal(score.awayScore, null);
});

test('missing credentials do not consume quota', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not call'); });
  await assert.rejects(fetchFootballLiveScores(''), /missing_key/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('HTTP failures and HTTP 200 API errors are not empty success', async (t) => {
  for (const status of [401, 403, 429, 500]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('private-error-body', { status }));
    await assert.rejects(fetchFootballLiveScores('test-key'), new RegExp(`http_${status}`));
  }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: { requests: 'quota exhausted' }, response: [] }));
  await assert.rejects(fetchFootballLiveScores('test-key'), /provider_error/);
});

test('malformed responses and network errors fail without leaking secrets', async (t) => {
  for (const body of [{}, { response: [null] }, { response: [{ ...fixture, goals: { home: '1', away: 0 } }] }]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(body));
    await assert.rejects(fetchFootballLiveScores('test-key'), /invalid_response/);
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('secret-url-test-key'); });
  await assert.rejects(fetchFootballLiveScores('test-key'), /^Error: API-Sports: network_error$/);
});
