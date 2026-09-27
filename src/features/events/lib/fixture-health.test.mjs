import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureSyncState, needsFixtureWarning } from './fixture-health.ts';

const now = new Date('2026-09-14T12:00:00Z');
const fresh = { state: 'ok', lastAttemptAt: now.toISOString(), lastCompletedAt: now.toISOString(), lastSuccessAt: now.toISOString() };

test('blocked primary and limited fallback do not imply complete fixtures', () => {
  assert.equal(fixtureSyncState('thesportsdb', 3, 3, 1), 'degraded');
  assert.equal(fixtureSyncState('thesportsdb', 3, 3, 0), 'limited');
  assert.equal(fixtureSyncState('thesportsdb', 0, 0, 0), 'limited');
  assert.equal(fixtureSyncState(null, 0, 0, 1), 'failed');
  assert.equal(fixtureSyncState('espn', 10, 9, 0), 'degraded');
});

test('a successful empty snapshot is distinct from a failure', () => {
  assert.equal(fixtureSyncState('espn', 0, 0, 0), 'empty');
  assert.equal(fixtureSyncState('espn', 5, 5, 0), 'ok');
  assert.equal(fixtureSyncState('espn', 5, 0, 5), 'failed');
  assert.equal(needsFixtureWarning({ ...fresh, state: 'empty' }, now), false);
});

test('failed, old, unknown and stuck syncs are visible', () => {
  for (const state of ['limited', 'failed', 'degraded']) {
    assert.equal(needsFixtureWarning({ ...fresh, state }, now), true);
  }
  assert.equal(needsFixtureWarning({ ...fresh, lastCompletedAt: '2026-09-13T12:00:00Z' }, now), true);
  assert.equal(needsFixtureWarning({ ...fresh, lastCompletedAt: null }, now), true);
  assert.equal(needsFixtureWarning({ ...fresh, state: 'running', lastAttemptAt: '2026-09-14T11:50:00Z' }, now), true);
  assert.equal(needsFixtureWarning({ ...fresh, state: 'running', lastSuccessAt: null }, now), true);
  assert.equal(needsFixtureWarning({ ...fresh, state: 'running' }, now), false);
});
