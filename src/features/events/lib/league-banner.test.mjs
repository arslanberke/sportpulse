import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as theme from './event-theme.ts';

const source = readFileSync(new URL('./league-banner.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exports = {};
vm.runInNewContext(output.outputText, {
  exports,
  require(id) {
    if (id === './event-theme' || id === './event-theme.ts') return theme;
    if (id.endsWith('.jpg')) return id;
    throw new Error(`Unexpected import: ${id}`);
  },
});
const { leagueBanner } = exports;

const approved = [
  ['Serie A', 'https://r2.thesportsdb.com/images/media/league/fanart/spqxtv1425356374.jpg'],
  ['Eredivisie', 'https://r2.thesportsdb.com/images/media/league/fanart/9lc0b71620328005.jpg'],
];
const logo = 'https://example.com/league-badge.png';
const unrelated = 'https://example.com/player-photo.jpg';

test('reviewed Serie A and Eredivisie banners are preserved', () => {
  for (const [name, url] of approved) {
    const banner = leagueBanner(name, url, logo);
    assert.equal(banner.source.uri, url);
    assert.equal(banner.fit, 'cover');
    assert.equal(banner.identity, undefined);
  }
});

test('an unreviewed replacement for an approved league is not trusted', () => {
  const banner = leagueBanner('Serie A', unrelated, logo);
  assert.equal(banner.source.uri, logo);
  assert.ok(banner.identity);
});

test('Premier League and Bundesliga use league identity instead of fanart', () => {
  for (const name of ['Premier League', 'Bundesliga', 'Ligue 1', 'LaLiga', 'Süper Lig', 'FA Cup']) {
    const banner = leagueBanner(name, unrelated, logo);
    assert.equal(banner.source.uri, logo);
    assert.equal(banner.fit, 'contain');
    assert.ok(banner.identity.colors.length >= 2);
    assert.equal(JSON.stringify(banner).includes(unrelated), false);
  }
  assert.notDeepEqual(leagueBanner('Premier League', unrelated, logo).identity.colors,
    leagueBanner('Bundesliga', unrelated, logo).identity.colors);
});

test('all three bundled UEFA banners keep priority', () => {
  for (const [name, filename] of [
    ['UEFA Champions League', 'cl-hero-banner.jpg'],
    ['UEFA Europa League', 'el-hero-banner.jpg'],
    ['UEFA Conference League', 'conf-hero-banner.jpg'],
  ]) {
    assert.ok(leagueBanner(name, unrelated, logo).source.endsWith(filename));
    assert.ok(leagueBanner(name, null).source.endsWith(filename));
  }
});

test('missing logo never falls back to an arbitrary image', () => {
  for (const url of [undefined, null, '', '   ']) {
    assert.equal(leagueBanner('Bundesliga', unrelated, url), null);
  }
  assert.equal(leagueBanner(null, unrelated, null), null);
  assert.equal(leagueBanner(), null);
});

test('leagues without fanart get a clean identity banner from their badge', () => {
  assert.equal(leagueBanner('Carabao Cup', null, logo).source.uri, logo);
  assert.equal(leagueBanner(null, null, logo).source.uri, logo);
});

test('other team sports keep their sport-specific palette', () => {
  const banner = leagueBanner('Sultanlar Ligi', unrelated, logo, 'volleyball');
  assert.deepEqual(Array.from(banner.identity.colors), theme.eventTheme('volleyball', 'Sultanlar Ligi').gradient);
});

test('backdrop clips decorative lines and preserves opaque badge colors', () => {
  const code = readFileSync(new URL('../components/matchup-art.tsx', import.meta.url), 'utf8');
  assert.ok(code.includes("overflow: 'hidden'"));
  assert.equal(code.includes('tintColor='), false);
});

test('event card hero passes artwork, badge and sport', () => {
  for (const file of ['../components/event-card.tsx']) {
    const code = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(/leagueBanner\(\s*event\.leagueName,\s*event\.leagueArtworkUrl,\s*event\.leagueBadgeUrl,\s*event\.sportId,?\s*\)/.test(code), `${file} must supply league identity`);
  }
});
