import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  euroleagueHeaderOver,
  euroleagueSeasonCode,
  euroleagueStatusDetail,
  parseEuroleagueGames,
  parseEuroleagueHeader,
  selectEuroleagueCandidates,
} from './euroleague-live.ts';

const games = {
  data: [
    { gameCode: 32, utcDate: '2026-10-08T16:00:00Z', played: false, local: { club: { code: 'TEL', name: 'Maccabi' }, score: 0 }, road: { club: { code: 'MIL', name: 'Milan' }, score: 0 } },
    { gameCode: 31, utcDate: '2026-10-07T18:45:00Z', played: true, local: { club: { code: 'PRS' }, score: 96 }, road: { club: { code: 'ASV' }, score: 98 } },
    { gameCode: 33, utcDate: '2026-10-08T18:00:00Z', played: false, local: { club: { code: 'MUN' } }, road: { club: { code: 'VIR' } } },
    { gameCode: 1, utcDate: '2026-09-24T18:00:00Z', played: true, local: { club: { code: 'RED' }, score: 77 }, road: { club: { code: 'ZAL' }, score: 83 } },
  ],
};

test('season code flips in July', () => {
  assert.equal(euroleagueSeasonCode(new Date('2026-10-08T00:00:00Z')), 'E2026');
  assert.equal(euroleagueSeasonCode(new Date('2027-04-16T00:00:00Z')), 'E2026');
  assert.equal(euroleagueSeasonCode(new Date('2027-07-01T00:00:00Z')), 'E2027');
});

test('games parse with codes; scores only once played', () => {
  const parsed = parseEuroleagueGames(games, 'E2026');
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed[0], {
    season: 'E2026', code: 32, utcDate: '2026-10-08T16:00:00Z', played: false,
    homeCode: 'TEL', awayCode: 'MIL', homeName: 'Maccabi', awayName: 'Milan', homeScore: null, awayScore: null,
  });
  assert.equal(parsed[1].homeScore, 96);
  assert.equal(parsed[1].awayScore, 98);
});

test('started unplayed games are probed, recent finished ones become finals, old ones are skipped', () => {
  const now = Date.parse('2026-10-08T17:40:00Z');
  const { probe, finals } = selectEuroleagueCandidates(parseEuroleagueGames(games, 'E2026'), now);
  assert.deepEqual(probe.map((g) => g.code), [32]);
  assert.deepEqual(finals.map((g) => g.code), []);
  const later = selectEuroleagueCandidates(parseEuroleagueGames(games, 'E2026'), Date.parse('2026-10-07T22:00:00Z'));
  assert.deepEqual(later.finals.map((g) => g.code), [31]);
  assert.deepEqual(later.probe, []);
});

const liveHeader = {
  Live: true, ScoreA: '89', ScoreB: '73', GameTime: '36:00', RemainingPartialTime: '04:09', Quarter: '4',
  ScoreQuarter1A: 24, ScoreQuarter2A: 51, ScoreQuarter3A: 74, ScoreQuarter4A: 89, ScoreExtraTimeA: 0,
  ScoreQuarter1B: 20, ScoreQuarter2B: 45, ScoreQuarter3B: 62, ScoreQuarter4B: 73, ScoreExtraTimeB: 0,
};

test('live header: score, per-quarter lines and NBA-style status detail', () => {
  const h = parseEuroleagueHeader(liveHeader);
  assert.equal(h.live, true);
  assert.equal(h.homeScore, 89);
  assert.equal(h.awayScore, 73);
  assert.deepEqual(h.homeLines, [24, 27, 23, 15]);
  assert.deepEqual(h.awayLines, [20, 25, 17, 11]);
  assert.equal(euroleagueStatusDetail(h), '4:09 - 4th');
  assert.equal(euroleagueHeaderOver(h), false);
  assert.equal(euroleagueStatusDetail(parseEuroleagueHeader({ ...liveHeader, Quarter: '2', RemainingPartialTime: '00:00' })), 'Halftime');
  assert.equal(euroleagueStatusDetail(parseEuroleagueHeader({ ...liveHeader, Quarter: '5', RemainingPartialTime: '02:30' })), '2:30 - OT');
});

test('finished header is over; pre-game body is not a header', () => {
  const h = parseEuroleagueHeader({ Live: false, ScoreA: '96', ScoreB: '98', GameTime: '40:00', RemainingPartialTime: '00:00', Quarter: '' });
  assert.equal(euroleagueHeaderOver(h), true);
  assert.equal(euroleagueStatusDetail(h), null);
  assert.equal(parseEuroleagueHeader({}), null);
  assert.equal(parseEuroleagueHeader(''), null);
});
