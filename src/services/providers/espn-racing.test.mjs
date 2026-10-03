import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findSession, sessionResults } from './espn-racing.ts';

const comp = (id, date, abbreviation, state, order = []) => ({
  id, date, type: { abbreviation }, status: { type: { state } },
  competitors: order.map((name, i) => ({ id: `d${i}`, order: i + 1, athlete: { displayName: name } })),
});

const events = [{
  id: 'gp',
  competitions: [
    comp('fp1', '2026-10-02T04:30Z', 'FP1', 'post', ['Max Verstappen']),
    comp('fp2', '2026-10-02T08:00Z', 'FP2', 'post', ['Charles Leclerc']),
    comp('q', '2026-10-03T08:00Z', 'Qual', 'in', ['Max Verstappen', 'Lewis Hamilton']),
    comp('race', '2026-10-04T07:00Z', 'Race', 'pre'),
  ],
}];

test('matches the session by start time, not just its type', () => {
  assert.equal(findSession(events, '2026-10-02T08:00:00Z')?.competition.id, 'fp2');
});

test('a Formula 2 slot between F1 sessions matches nothing', () => {
  assert.equal(findSession(events, '2026-10-02T06:00:00Z'), null);
});

test('running session is marked live with its current order', () => {
  const r = sessionResults(findSession(events, '2026-10-03T08:00:00Z').competition, new Map([['d1', 'Ferrari']]));
  assert.equal(r.live, true);
  assert.equal(r.session, 'Qualifying');
  assert.deepEqual(r.entries.map((e) => [e.position, e.name, e.team]), [
    [1, 'Max Verstappen', null], [2, 'Lewis Hamilton', 'Ferrari'],
  ]);
});

test('session without an order yet has no results', () => {
  assert.equal(sessionResults(findSession(events, '2026-10-04T07:00:00Z').competition, new Map()), null);
});
