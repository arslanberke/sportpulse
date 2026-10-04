import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBoxScore } from './espn-boxscore.ts';

const keys = ['minutes', 'points', 'rebounds', 'assists', 'steals', 'blocks', 'plusMinus'];
const athlete = (id, shortName, starter, stats, didNotPlay = false) => ({
  athlete: { id, shortName, position: { abbreviation: 'G' } }, starter, didNotPlay, stats,
});
const summary = (state) => ({
  header: { competitions: [{
    status: { type: { state } },
    competitors: [
      { homeAway: 'home', team: { id: '28' }, linescores: [{ displayValue: '23' }, { displayValue: '32' }] },
      { homeAway: 'away', team: { id: '14' }, linescores: [{ displayValue: '41' }, { displayValue: '35' }] },
    ],
  }] },
  boxscore: {
    teams: [
      { team: { id: '14' }, statistics: [{ name: 'fieldGoalsMade-fieldGoalsAttempted', displayValue: '42-86' }, { name: 'leadChanges', displayValue: '3' }] },
      { team: { id: '28' }, statistics: [{ name: 'fieldGoalsMade-fieldGoalsAttempted', displayValue: '37-94' }] },
    ],
    players: [
      { team: { id: '28' }, statistics: [{ keys, athletes: [
        athlete('1', 'B. Bench', false, ['20', '18', '2', '1', '0', '0', '+3']),
        athlete('2', 'S. Starter', true, ['30', '9', '5', '4', '1', '1', '-8']),
        athlete('3', 'D. Np', false, [], true),
      ] }] },
      { team: { id: '14' }, statistics: [{ keys, athletes: [athlete('4', 'A. Away', true, ['34', '25', '10', '3', '2', '0', '+12'])] }] },
    ],
  },
});

test('maps periods, team stats and players to home/away by team id', () => {
  const box = parseBoxScore(summary('post'));
  assert.equal(box.live, false);
  assert.deepEqual(box.periods, { home: [23, 32], away: [41, 35] });
  assert.deepEqual(box.teamStats, [{ key: 'fieldGoalsMade-fieldGoalsAttempted', home: '37-94', away: '42-86' }]);
  assert.deepEqual(box.players.home.map((p) => p.name), ['S. Starter', 'B. Bench']);
  assert.equal(box.players.away[0].rebounds, 10);
});

test('live flag follows the game state; no box score before tip-off', () => {
  assert.equal(parseBoxScore(summary('in')).live, true);
  assert.equal(parseBoxScore({ header: summary('pre').header }), null);
});
