import assert from 'node:assert/strict';
import { test } from 'node:test';
import { draw, events, filterDraw, filterEvents, isFavorite, searchCatalog } from './model.mjs';

const favorites = new Set(['bjk', 'sinner']);

test('sport, favorites, live, league and channel filters compose', () => {
  const filters = { sport: 'football', favoritesOnly: true, liveOnly: true, day: 14, league: 'Süper Lig', channel: 'beIN SPORTS 1' };
  assert.deepEqual(filterEvents(events, filters, favorites).map((e) => e.id), ['derby']);
  assert.deepEqual(filterEvents(events, { ...filters, channel: 'Eurosport 1' }, favorites), []);
  assert.deepEqual(filterEvents(events, { ...filters, sport: 'tennis' }, favorites), []);
});

test('favorites also remain in the normal chronological feed', () => {
  const normal = filterEvents(events, { day: 14 }, favorites);
  assert.ok(normal.some((e) => e.id === 'derby'));
  assert.ok(normal.some((e) => e.id === 'tennis-evening'));
  assert.equal(normal.filter((e) => isFavorite(e, favorites)).length, 2);
});

test('unfavoriting a player removes emphasis, not the ordinary fixture', () => {
  const remaining = new Set(['bjk']);
  assert.equal(filterEvents(events, { day: 14, favoritesOnly: true }, remaining).length, 1);
  assert.equal(filterEvents(events, { day: 14 }, remaining).length, 3);
});

test('qualifying is opt-in and missing final stays empty', () => {
  assert.ok(filterDraw(draw, { tour: 'WTA', time: 'all', round: 'all' }).every((m) => m.round !== 'qualifying'));
  assert.equal(filterDraw(draw, { tour: 'WTA', time: 'all', round: 'qualifying' }).length, 1);
  assert.equal(filterDraw(draw, { tour: 'ATP', time: 'all', round: 'final' }).length, 0);
});

test('draw category and time filters work independently', () => {
  assert.equal(filterDraw(draw, { tour: 'WTA', time: 'today', round: 'all' }).length, 0);
  assert.equal(filterDraw(draw, { tour: 'WTA', time: 'upcoming', round: 'all' }).length, 1);
  assert.equal(filterDraw(draw, { tour: 'ATP', time: 'finished', round: 'all' }).length, 1);
});

test('search finds teams and athletes and handles Turkish accents', () => {
  assert.equal(searchCatalog('besiktas').teams[0].id, 'bjk');
  assert.equal(searchCatalog('BEŞİKTAŞ').teams[0].id, 'bjk');
  assert.equal(searchCatalog('sinner').players[0].id, 'sinner');
  assert.equal(searchCatalog('Rybakina').players[0].id, 'rybakina');
  assert.deepEqual(searchCatalog('<script>'), { teams: [], players: [] });
});
