export const BRAND = {
  // Uygulamanin kendi koyu temasiyla ayni deger (bkz. DarkColors.background,
  // src/constants/theme.ts). Farkli olursa acilis ekraniyla uygulama icerigi
  // arasindaki gecis fark edilir bir renk sicramasi olarak goruluyordu.
  navy: '#080E0B',
  green: '#4DE3B5',
  mint: '#A1EDCE',
  muted: '#91ADBC',
  transform: 'translate(15 0) skewX(-11)',
  launchDuration: 650,
} as const;

export type BrandPoint = readonly [number, number];
export const SPRINT_S: readonly BrandPoint[] = [
  [36, 27], [76, 27], [76, 41], [37, 41], [37, 52], [65, 52], [76, 63], [76, 82],
  [65, 93], [16, 93], [16, 79], [61, 79], [61, 65], [32, 65], [23, 56], [23, 40],
];
export const SPRINT_P: readonly (readonly BrandPoint[])[] = [
  [[87, 27], [123, 27], [137, 40], [137, 59], [123, 72], [101, 72], [101, 93], [87, 93]],
  [[101, 41], [101, 58], [118, 58], [123, 54], [123, 45], [118, 41]],
];

export function sprintPath(contours: readonly (readonly BrandPoint[])[]): string {
  return contours.map(points => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('') + 'Z').join('');
}
