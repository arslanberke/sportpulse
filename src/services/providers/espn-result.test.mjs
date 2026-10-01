import assert from 'node:assert/strict';
import { test } from 'node:test';
import { espnResult } from './espn.ts';

const event = (type, home, away) => ({
  id: '1', name: 'A at B', date: '2026-09-20T19:00Z',
  status: { type },
  competitions: [{ competitors: [
    { homeAway: 'home', score: home, team: { id: '10' } },
    { homeAway: 'away', score: away, team: { id: '20' } },
  ] }],
});

test('finished match yields the final score', () => {
  assert.deepEqual(
    espnResult(event({ name: 'STATUS_FULL_TIME', state: 'post', completed: true }, '2', '1')),
    { homeScore: 2, awayScore: 1, resultStatus: 'finished' },
  );
});

test('not-started match never reports ESPN placeholder 0-0', () => {
  assert.deepEqual(
    espnResult(event({ name: 'STATUS_SCHEDULED', state: 'pre', completed: false }, '0', '0')),
    { homeScore: null, awayScore: null, resultStatus: 'notstarted' },
  );
});

test('live match keeps its running score', () => {
  assert.deepEqual(
    espnResult(event({ name: 'STATUS_SECOND_HALF', state: 'in', completed: false }, 1, 1)),
    { homeScore: 1, awayScore: 1, resultStatus: 'inprogress' },
  );
});

test('postponed match has no score', () => {
  assert.equal(espnResult(event({ name: 'STATUS_POSTPONED', state: 'post' }, '0', '0')).resultStatus, 'postponed');
  assert.equal(espnResult(event({ name: 'STATUS_POSTPONED', state: 'post' }, '0', '0')).homeScore, null);
});

test('half-readable score is dropped rather than written as a wrong result', () => {
  assert.deepEqual(
    espnResult(event({ state: 'post', completed: true }, '3', '')),
    { homeScore: null, awayScore: null, resultStatus: 'finished' },
  );
});
