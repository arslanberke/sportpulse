import { writeFile } from 'node:fs/promises';
import Jimp from 'jimp-compact';
import { BRAND, SPRINT_S, SPRINT_P } from '../src/constants/brand.ts';

const output = new URL('../assets/images/', import.meta.url);
const supersampling = 4;

function fillContours(image, contours, color, logoWidth) {
  const scale = logoWidth / 160;
  const offsetX = (image.bitmap.width - logoWidth) / 2;
  const offsetY = (image.bitmap.height - 120 * scale) / 2;
  const skew = Math.tan(-11 * Math.PI / 180);
  const polygons = contours.map(points => points.map(([x, y]) => [offsetX + (x + 15 + y * skew) * scale, offsetY + y * scale]));
  const rgba = Jimp.intToRGBA(Jimp.cssColorToHex(color));
  for (let y = 0; y < image.bitmap.height; y++) {
    const scanY = y + 0.5;
    const intersections = [];
    for (const polygon of polygons) {
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        if ((a[1] <= scanY && b[1] > scanY) || (b[1] <= scanY && a[1] > scanY)) {
          intersections.push(a[0] + (scanY - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const start = Math.max(0, Math.ceil(intersections[i] - 0.5));
      const end = Math.min(image.bitmap.width, Math.ceil(intersections[i + 1] - 0.5));
      for (let x = start; x < end; x++) {
        const offset = (y * image.bitmap.width + x) * 4;
        image.bitmap.data[offset] = rgba.r;
        image.bitmap.data[offset + 1] = rgba.g;
        image.bitmap.data[offset + 2] = rgba.b;
        image.bitmap.data[offset + 3] = rgba.a;
      }
    }
  }
}

const assets = [
  { name: 'icon.png', width: 1024, height: 1024, background: BRAND.navy, fraction: 0.78 },
  { name: 'splash-icon.png', width: 640, height: 480, background: '#00000000', fraction: 1 },
  { name: 'android-icon-foreground.png', width: 1024, height: 1024, background: '#00000000', fraction: 0.66 },
  { name: 'android-icon-monochrome.png', width: 1024, height: 1024, background: '#00000000', fraction: 0.66, monochrome: true },
  { name: 'favicon.png', width: 64, height: 64, background: BRAND.navy, fraction: 0.9 },
];
for (const asset of assets) {
  const image = new Jimp(asset.width * supersampling, asset.height * supersampling, asset.background);
  const logoWidth = asset.width * supersampling * asset.fraction;
  fillContours(image, [SPRINT_S], asset.monochrome ? '#FFFFFF' : BRAND.green, logoWidth);
  fillContours(image, SPRINT_P, asset.monochrome ? '#FFFFFF' : BRAND.mint, logoWidth);
  image.resize(asset.width, asset.height, Jimp.RESIZE_BICUBIC);
  await writeFile(new URL(asset.name, output), await image.getBufferAsync(Jimp.MIME_PNG));
  console.log(`${asset.name}: ${asset.width}×${asset.height}`);
}
