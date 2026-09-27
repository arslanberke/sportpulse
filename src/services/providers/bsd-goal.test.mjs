import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bsdProvider } from './bsd.ts';
import { goalProvider } from './goal.ts';

const league = (name, keys = {}) => ({ leagueId: 'league', leagueName: name, sportId: 'football', externalIds: {}, providerKeys: keys });

test('BSD normalizes upcoming Süper Lig fixtures and keeps server key in headers only', async (t) => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url: String(url), options };
    return Response.json({ results: [{
      id: 216022, event_date: '2026-10-19T17:00:00Z', status: 'notstarted',
      home_team_id: 197, home_team: 'Trabzonspor', away_team_id: 196, away_team: 'Beşiktaş JK',
      match_stadium: 'Papara Park',
    }] });
  });
  const events = await bsdProvider.fetchUpcomingEvents(league('Süper Lig', { bsd: 'secret-bsd' }), 30);
  assert.equal(events[0].provider, 'bsd');
  assert.equal(events[0].title, 'Trabzonspor vs Beşiktaş JK');
  assert.equal(events[0].venue, 'Papara Park');
  assert.match(request.url, /league_id=11/);
  assert.equal(request.options.headers.Authorization, 'Token secret-bsd');
  assert.ok(!JSON.stringify(events).includes('secret-bsd'));
});

test('GOAL normalizes UEL fixtures with team badges', async (t) => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url: String(url), options };
    return Response.json({ data: [{
      id: 'goal-event', kickoffUtc: '2026-10-15T19:00:00Z', matchStatus: 'SCHEDULED',
      homeTeamId: 'home', homeTeamName: 'TSG Hoffenheim', awayTeamId: 'away', awayTeamName: 'Beşiktaş',
      teamHomeBadge: 'https://img/home.png', teamAwayBadge: 'https://img/away.png', matchStadium: 'Arena',
    }] });
  });
  const events = await goalProvider.fetchUpcomingEvents(league('UEFA Europa League', { goal: 'secret-goal' }), 30);
  assert.equal(events[0].provider, 'goal');
  assert.equal(events[0].awayTeamLogoUrl, 'https://img/away.png');
  assert.match(request.url, /leagueId=cmr77dw3900f6rx06tuqwft2d/);
  assert.equal(request.options.headers.Authorization, 'Bearer secret-goal');
});

test('providers only support configured leagues when their key is present', () => {
  assert.equal(bsdProvider.supports(league('Süper Lig', { bsd: 'x' })), true);
  assert.equal(bsdProvider.supports(league('NBA', { bsd: 'x' })), false);
  assert.equal(goalProvider.supports(league('Süper Lig')), false);
});

test('provider failures are reported without leaking response bodies', async (t) => {
  const issues = [];
  t.mock.method(globalThis, 'fetch', async () => new Response('private', { status: 401 }));
  const events = await bsdProvider.fetchUpcomingEvents({ ...league('Süper Lig', { bsd: 'secret' }), onIssue: issue => issues.push(issue) }, 14);
  assert.deepEqual(events, []);
  assert.deepEqual(issues, [{ source: 'bsd.events', kind: 'http', status: 401 }]);
});
