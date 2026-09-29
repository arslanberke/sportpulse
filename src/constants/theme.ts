import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/lib/theme';

/**
 * Design tokens used outside of Tailwind classes (e.g. navigation options).
 * Keep these values in sync with `src/global.css` and `tailwind.config.js`.
 */
export const Colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  background: '#F4F4F5',
  surface: '#FFFFFF',
  border: '#E4E4E7',
  ink: '#111114',
  inkSecondary: '#63636B',
  inkTertiary: '#93939B',
  danger: '#FF3B30',
  live: '#E5484D',
  success: '#34C759',
} as const;

export type ThemeColors = Record<keyof typeof Colors, string>;

/**
 * Yildizlanan kulubun rengi: yildiz simgesi ve macinin karti.
 *
 * Iki temada da ayni: hem acik hem koyu zeminde okunan bir altin tonu ve
 * arayuzdeki hicbir durumla karismiyor (yesil = birincil eylem, kirmizi =
 * ertelenme/iptal). Amaci listeyi kaydirirken goz kendiliginden yakalasin.
 */
export const FAVORITE_COLOR = '#E6B85C';

export const DarkColors: ThemeColors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  background: '#0A0A0B',
  surface: '#141416',
  border: '#26262A',
  ink: '#F4F4F5',
  inkSecondary: '#A1A1AA',
  inkTertiary: '#77777F',
  danger: '#FF3B30',
  live: '#E5484D',
  success: '#34C759',
};

/** Theme-aware tokens for places Tailwind classes can't reach (nav bars, spinners). */
export function useThemeColors(): ThemeColors {
  return useIsDark() ? DarkColors : Colors;
}

export function useIsDark(): boolean {
  const system = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const scheme = preference === 'system' ? system : preference;
  return scheme === 'dark';
}

/** Dark screens fade from a green-tinted top into near-black for depth. */
export const DarkBackdrop = ['#121214', '#0D0D0F', '#0A0A0B'] as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
