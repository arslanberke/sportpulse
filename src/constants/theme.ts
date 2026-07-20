import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/lib/theme';

/**
 * Design tokens used outside of Tailwind classes (e.g. navigation options).
 * Keep these values in sync with `src/global.css` and `tailwind.config.js`.
 */
export const Colors = {
  primary: '#10B981',
  primaryDark: '#047857',
  background: '#F3F6F4',
  surface: '#FFFFFF',
  ink: '#0F1A14',
  inkSecondary: '#5A7064',
  inkTertiary: '#8FA197',
  danger: '#FF3B30',
  success: '#34C759',
} as const;

export type ThemeColors = Record<keyof typeof Colors, string>;

export const DarkColors: ThemeColors = {
  primary: '#10B981',
  primaryDark: '#047857',
  background: '#080C0A',
  surface: '#121A16',
  ink: '#F0F7F3',
  inkSecondary: '#9EB3A7',
  inkTertiary: '#6A7C71',
  danger: '#FF3B30',
  success: '#34C759',
};

/** Theme-aware tokens for places Tailwind classes can't reach (nav bars, spinners). */
export function useThemeColors(): ThemeColors {
  const system = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const scheme = preference === 'system' ? system : preference;
  return scheme === 'dark' ? DarkColors : Colors;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
