import { useColorScheme } from 'react-native';

/**
 * Design tokens used outside of Tailwind classes (e.g. navigation options).
 * Keep these values in sync with `src/global.css` and `tailwind.config.js`.
 */
export const Colors = {
  primary: '#10B981',
  background: '#EEF7F1',
  surface: '#FAFEFC',
  ink: '#1A2E24',
  inkSecondary: '#607D6C',
  inkTertiary: '#94A89C',
  danger: '#FF3B30',
  success: '#34C759',
} as const;

export type ThemeColors = Record<keyof typeof Colors, string>;

export const DarkColors: ThemeColors = {
  primary: '#10B981',
  background: '#09100C',
  surface: '#16211B',
  ink: '#EBF5EF',
  inkSecondary: '#9CB2A5',
  inkTertiary: '#687A6F',
  danger: '#FF3B30',
  success: '#34C759',
};

/** Theme-aware tokens for places Tailwind classes can't reach (nav bars, spinners). */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
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
