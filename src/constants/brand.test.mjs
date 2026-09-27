import Jimp from 'jimp-compact';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { BRAND, SPRINT_P, SPRINT_S, sprintPath } from './brand.ts';

const root = new URL('../../', import.meta.url);

// theme.ts imports react-native, which this plain node:test runner can't
// load, so the expected value is duplicated as a literal here rather than
// imported. Keep it in sync with `DarkColors.background` in theme.ts by hand.
const APP_DARK_BACKGROUND = '#080E0B';

test('Sprint uses the approved mint palette on the app\'s own dark background', () => {
  // Must match the in-app dark background exactly: a different splash colour
  // than the app's own background shows up as a visible flash between the
  // launch screen and the first real screen.
  assert.equal(BRAND.navy, APP_DARK_BACKGROUND);
  assert.equal(BRAND.green, '#4DE3B5');
  assert.equal(BRAND.mint, '#A1EDCE');
  assert.deepEqual(SPRINT_S[0], [36, 27]);
  assert.deepEqual(SPRINT_S.at(-1), [23, 40]);
  assert.match(sprintPath([SPRINT_S]), /^M36 27L76 27/);
  assert.equal(SPRINT_P.length, 2);
});

test('native splash and adaptive icon share the approved background', async () => {
  const { expo } = JSON.parse(await readFile(new URL('app.json', root), 'utf8'));
  const splash = expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
  assert.equal(splash.backgroundColor, BRAND.navy);
  assert.equal(splash.imageWidth, 160);
  assert.equal(expo.android.adaptiveIcon.backgroundColor, BRAND.navy);
});

test('generated icon is full bleed, opaque and contains both approved letter colours', async () => {
  const icon = await Jimp.read(new URL('assets/images/icon.png', root).pathname);
  assert.equal(icon.bitmap.width, 1024);
  assert.equal(icon.bitmap.height, 1024);
  const navy = Jimp.cssColorToHex(BRAND.navy);
  assert.equal(icon.getPixelColor(0, 0), navy);
  assert.equal(icon.getPixelColor(1023, 1023), navy);
  const colors = new Set();
  for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) {
    const pixel = icon.getPixelColor(x, y);
    assert.equal(Jimp.intToRGBA(pixel).a, 255);
    colors.add(pixel);
  }
  assert.ok(colors.has(Jimp.cssColorToHex(BRAND.green)));
  assert.ok(colors.has(Jimp.cssColorToHex(BRAND.mint)));
});

test('splash and adaptive foreground keep transparent padding; favicon is small', async () => {
  for (const name of ['splash-icon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png']) {
    const image = await Jimp.read(new URL(`assets/images/${name}`, root).pathname);
    assert.equal(Jimp.intToRGBA(image.getPixelColor(0, 0)).a, 0, name);
  }
  const favicon = await Jimp.read(new URL('assets/images/favicon.png', root).pathname);
  assert.equal(favicon.bitmap.width, 64);
});
