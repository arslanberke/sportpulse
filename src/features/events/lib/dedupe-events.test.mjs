import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dedupeEvents } from './dedupe-events.ts';

const at = '2026-09-13T15:15:00+00:00';
const ev = (id, extra = {}) => ({
  id, sportId: 'football', homeTeamId: 'h', awayTeamId: 'a', startsAt: at,
  status: 'scheduled', externalIds: {}, ...extra,
});

test('same pair within 12h merges, keeps richest row and all ids', () => {
  const out = dedupeEvents([
    ev('tsdb', { externalIds: { thesportsdb: '1' } }),
    ev('bsd', { startsAt: '2026-09-13T16:15:00+00:00', externalIds: { bsd: '2', goal: '3' } }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'bsd');
  assert.deepEqual(out[0].externalIds, { thesportsdb: '1', bsd: '2', goal: '3' });
  assert.deepEqual(out[0].duplicateIds, ['tsdb']);
});

test('one shared side at the same kickoff merges (Lens / RC Lens)', () => {
  const out = dedupeEvents([ev('x', { awayTeamId: 'lens' }), ev('y', { awayTeamId: 'rc-lens', externalIds: { bsd: '1' } })]);
  assert.deepEqual(out.map((e) => e.id), ['y']);
});

test('different matches at the same kickoff stay apart', () => {
  const out = dedupeEvents([ev('x'), ev('y', { homeTeamId: 'h2', awayTeamId: 'a2' })]);
  assert.equal(out.length, 2);
});

test('shared side at a different kickoff stays apart', () => {
  const out = dedupeEvents([ev('x'), ev('y', { awayTeamId: 'b', startsAt: '2026-09-20T15:15:00+00:00' })]);
  assert.equal(out.length, 2);
});

test('score from the loser fills a winner without one', () => {
  const out = dedupeEvents([
    ev('w', { externalIds: { bsd: '1', espn: '2' } }),
    ev('l', { homeScore: 2, awayScore: 1, resultStatus: 'FT' }),
  ]);
  assert.equal(out[0].id, 'w');
  assert.equal(out[0].resultStatus, 'FT');
  assert.equal(out[0].homeScore, 2);
});

test('events without teams are never merged', () => {
  const out = dedupeEvents([ev('x', { homeTeamId: null }), ev('y', { homeTeamId: null })]);
  assert.equal(out.length, 2);
});
