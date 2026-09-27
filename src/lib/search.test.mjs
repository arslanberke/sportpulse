import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fold, matchesAny, searchNeedles } from './search.ts';

test('Turkish competition aliases resolve to English catalog names', () => {
  // "uluslar ligi" yazinca katalogdaki "UEFA Nations League" bulunmali.
  const needles = searchNeedles('uluslar ligi');
  assert.ok(needles.includes('nations league'));
  assert.ok(matchesAny(['UEFA Nations League'], needles));
  // Kismi yazim da alias'a duser.
  assert.ok(matchesAny(['UEFA Nations League'], searchNeedles('uluslar')));
  assert.ok(matchesAny(['UEFA Nations League'], searchNeedles('Uluslar')));
});

test('fold strips Turkish and accented characters', () => {
  assert.equal(fold('Şampiyonlar Ligi'), 'sampiyonlar ligi');
  assert.equal(fold('Beşiktaş'), 'besiktas');
  assert.equal(fold('Vlahović'), 'vlahovic');
  assert.ok(matchesAny(['Beşiktaş'], searchNeedles('besiktas')));
});

test('alias does not hijack unrelated terms', () => {
  // "lig" tek basina hicbir alias'i tetiklememeli.
  assert.deepEqual(searchNeedles('lig'), ['lig']);
  assert.ok(!matchesAny(['UEFA Nations League'], searchNeedles('besiktas')));
});
