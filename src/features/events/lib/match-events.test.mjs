import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minuteLabel, toMatchEventRows } from './match-events.ts';

const goal = (overrides = {}) => ({
  minute: 23, extraMinute: null, type: 'goal', detail: 'Normal Goal', isHome: true, player: 'Player A', assistOrSubIn: null, ...overrides,
});

test('stoppage time renders as 45+2\' and sorts after the regular minute', () => {
  assert.equal(minuteLabel(45, 2), "45+2'");
  assert.equal(minuteLabel(45, null), "45'");
  const rows = toMatchEventRows([goal({ minute: 45, extraMinute: 2 }), goal({ minute: 45, extraMinute: null })]);
  assert.deepEqual(rows.map(r => r.minuteLabel), ["45'", "45+2'"]);
});

test('goal, penalty and own goal get distinct icons; assist becomes the subtitle', () => {
  assert.equal(toMatchEventRows([goal()])[0].icon, 'goal');
  assert.equal(toMatchEventRows([goal({ detail: 'Penalty' })])[0].icon, 'penalty');
  assert.equal(toMatchEventRows([goal({ detail: 'Missed Penalty' })])[0].icon, 'goal');
  assert.equal(toMatchEventRows([goal({ detail: 'Own Goal' })])[0].icon, 'own-goal');
  const withAssist = toMatchEventRows([goal({ assistOrSubIn: 'Player B' })])[0];
  assert.equal(withAssist.subtitle, 'Player B');
  assert.equal(withAssist.title, 'Player A');
});

test('yellow and red cards are distinguishable and keep the side they happened on', () => {
  const yellow = toMatchEventRows([goal({ type: 'card', detail: 'Yellow Card', isHome: false })])[0];
  const red = toMatchEventRows([goal({ type: 'card', detail: 'Red Card' })])[0];
  assert.equal(yellow.icon, 'yellow-card');
  assert.equal(yellow.isHome, false);
  assert.equal(red.icon, 'red-card');
});

test('substitutions show who came on as the title and who left as the subtitle', () => {
  const row = toMatchEventRows([goal({ type: 'substitution', detail: 'Substitution 1', player: 'Player In', assistOrSubIn: 'Player Out' })])[0];
  assert.equal(row.icon, 'substitution');
  assert.equal(row.title, 'Player In');
  assert.equal(row.subtitle, 'Player Out');
});

test('an unrecognised provider event type still renders instead of disappearing', () => {
  const row = toMatchEventRows([goal({ type: 'var', detail: 'Goal Cancelled' })])[0];
  assert.equal(row.icon, 'other');
  assert.equal(row.title, 'Player A');
});
