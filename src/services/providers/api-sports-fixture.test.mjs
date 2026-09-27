import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { fetchApiSportsLineup, isCompleteLineup } from './api-sports-fixture.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function side(prefix, starters = 11) {
  const player = (i, substitute) => ({ player: {
    id: i, name: `${prefix} ${i}`, number: i, pos: i === 1 ? 'G' : 'D',
    grid: substitute ? null : `${i === 1 ? 1 : 2}:${i}`, captain: i === 2,
  } });
  return {
    formation: '4-3-3',
    startXI: Array.from({ length: starters }, (_, i) => player(i + 1, false)),
    substitutes: Array.from({ length: 5 }, (_, i) => player(i + 20, true)),
  };
}

function mockResponse(response) {
  globalThis.fetch = async () => new Response(JSON.stringify({ response, errors: [] }), { status: 200 });
}

test('normalizes 11 starters plus substitutes for both teams', async () => {
  mockResponse([side('Home'), side('Away')]);
  const lineup = await fetchApiSportsLineup(123, 'secret');
  assert.ok(lineup);
  assert.equal(lineup.home.length, 16);
  assert.equal(lineup.away.length, 16);
  assert.equal(lineup.home.filter(p => !p.isSubstitute).length, 11);
  assert.equal(lineup.home[0].grid.row, 1);
  assert.equal(lineup.home[1].isCaptain, true);
  assert.equal(lineup.homeFormation, '4-3-3');
  assert.equal(isCompleteLineup(lineup), true);
});

test('rejects partial provider payloads instead of presenting them as a full lineup', async () => {
  mockResponse([side('Home', 3), side('Away', 2)]);
  assert.equal(await fetchApiSportsLineup(123, 'secret'), null);
  assert.equal(isCompleteLineup({
    home: side('Home', 3).startXI.map((r) => ({ id: String(r.player.id), name: r.player.name, number: r.player.number, position: r.player.pos, isSubstitute: false, photoUrl: null, isCaptain: false, countryCode: null, grid: null })),
    away: side('Away', 2).startXI.map((r) => ({ id: String(r.player.id), name: r.player.name, number: r.player.number, position: r.player.pos, isSubstitute: false, photoUrl: null, isCaptain: false, countryCode: null, grid: null })),
    homeFormation: null, awayFormation: null,
  }), false);
});

test('returns null while provider has not published two team lineups', async () => {
  mockResponse([]);
  assert.equal(await fetchApiSportsLineup(123, 'secret'), null);
});
