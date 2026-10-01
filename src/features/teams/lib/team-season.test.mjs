import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dedupeTeamEvents, splitTeamSeasonEvents, teamEventScore } from './team-season.ts';

const match = (id, startsAt, scores = {}) => ({
  id, startsAt, sportId: 'football', leagueId: 'league', homeTeamId: 'h', awayTeamId: 'a',
  title: 'Home vs Away', status: 'scheduled', imageUrl: null, venue: null, venueImageUrl: null,
  importance: 0, externalIds: {}, ...scores,
});
const now = new Date('2026-09-21T12:00:00Z');

test('team season separates future ascending and results newest first', () => {
  const data = splitTeamSeasonEvents([
    match('old', '2026-08-10T12:00:00Z'),
    match('next', '2026-09-25T12:00:00Z'),
    match('latest', '2026-09-20T12:00:00Z'),
    match('later', '2026-10-01T12:00:00Z'),
  ], now);
  assert.deepEqual(data.upcoming.map(event => event.id), ['next', 'later']);
  assert.deepEqual(data.results.map(event => event.id), ['latest', 'old']);
});

test('duplicate provider rows collapse to the scored BSD event', () => {
  const base = { homeTeamId: 'home', awayTeamId: 'away' };
  const events = dedupeTeamEvents([
    match('espn', '2026-09-20T12:00:00Z', { ...base, externalIds: { espn: '1' } }),
    match('bsd', '2026-09-20T13:00:00Z', { ...base, externalIds: { bsd: '2' }, homeScore: 3, awayScore: 2 }),
  ]);
  assert.deepEqual(events.map(event => event.id), ['bsd']);
});

test('score is shown only when both sides are known and preserves zero', () => {
  assert.equal(teamEventScore(match('score', '', { homeScore: 0, awayScore: 2 })), '0–2');
  assert.equal(teamEventScore(match('unknown', '', { homeScore: null, awayScore: 2 })), null);
});

test('a started match without a final result stays on top of fixtures until it ends', () => {
  const events = [
    match('live', '2026-09-21T11:00:00Z', { awayTeamId: 'a1' }),
    match('next', '2026-09-25T12:00:00Z', { awayTeamId: 'a2' }),
    match('done', '2026-09-21T10:30:00Z', { awayTeamId: 'a3', resultStatus: 'finished', homeScore: 1, awayScore: 0 }),
    match('stale', '2026-09-21T08:00:00Z', { awayTeamId: 'a4' }),
  ];
  const data = splitTeamSeasonEvents(events, now);
  assert.deepEqual(data.upcoming.map(event => event.id), ['live', 'next']);
  assert.deepEqual(data.results.map(event => event.id), ['done', 'stale']);
});
