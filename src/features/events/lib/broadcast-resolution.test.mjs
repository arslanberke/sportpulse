import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveEventChannels } from './broadcast-resolution.ts';

const channel = (id) => ({ id, name: id, countryCode: 'TR', logoUrl: null });
const event = (leagueName, extra = {}) => ({
  id: 'e', sportId: 'f1', leagueId: 'l', title: 'Session', startsAt: '2026-09-20T12:00:00Z',
  status: 'scheduled', imageUrl: null, venue: null, venueImageUrl: null, importance: 0,
  externalIds: {}, leagueName, ...extra,
});
const defaults = new Map([['l', [channel('Bein Sports 4'), channel('TOD')]]]);
const eventSpecific = new Map([['e', [channel('Wrong daily channel')]]]);
// Gunluk tum-sporlar kaynagi (sporekrani): '' anahtari
const coveredDay = new Map([['', new Set(['2026-09-20'])]]);

test('F1 and F2 always keep their season broadcaster mapping', () => {
  assert.deepEqual(resolveEventChannels(event('Formula 1'), eventSpecific, defaults, coveredDay).map(c => c.name), ['Bein Sports 4', 'TOD']);
  assert.deepEqual(resolveEventChannels(event('Formula 2'), undefined, defaults, coveredDay).map(c => c.name), ['Bein Sports 4', 'TOD']);
});

test('other sports still prefer verified event-specific broadcasts', () => {
  assert.deepEqual(resolveEventChannels(event('Süper Lig', { sportId: 'football' }), eventSpecific, defaults, undefined).map(c => c.name), ['Wrong daily channel']);
});

test('covered daily source suppresses speculative defaults outside F1/F2', () => {
  assert.deepEqual(resolveEventChannels(event('UEFA Europa League', { sportId: 'football' }), undefined, defaults, coveredDay), []);
});

test('BSD football coverage only suppresses BSD-indexed events', () => {
  const bsdCoverage = new Map([['football', new Set(['2026-09-20'])]]);
  // BSD kimligi var: listede yoksa TR'de yayinlanmiyor sayilir, varsayim gizlenir.
  const bsdEvent = event('UEFA Nations League', { sportId: 'football', externalIds: { bsd: '212594' } });
  assert.deepEqual(resolveEventChannels(bsdEvent, undefined, defaults, bsdCoverage), []);
  // BSD kimligi olmayan mac (GOAL/ESPN kaynakli): BSD'nin listelememesi bilgi
  // tasimadigi icin lig eslemesi korunur.
  const goalEvent = event('Trendyol 1. Lig', { sportId: 'football', externalIds: { goal: '123' } });
  assert.deepEqual(resolveEventChannels(goalEvent, undefined, defaults, bsdCoverage).map(c => c.name), ['Bein Sports 4', 'TOD']);
  // Futbol disi brans BSD kapsamasindan etkilenmez.
  const basket = event('Basketbol Ligi', { sportId: 'basketball', externalIds: { bsd: '1' } });
  assert.deepEqual(resolveEventChannels(basket, undefined, defaults, bsdCoverage).map(c => c.name), ['Bein Sports 4', 'TOD']);
});

test('merged duplicate rows lend their event-specific broadcasts', () => {
  const merged = event('Süper Lig', { sportId: 'football', id: 'kept', duplicateIds: ['e'] });
  assert.deepEqual(resolveEventChannels(merged, eventSpecific, defaults, undefined).map(c => c.name), ['Wrong daily channel']);
});
