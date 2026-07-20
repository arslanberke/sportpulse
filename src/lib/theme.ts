import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

const darkQuery =
  Platform.OS === 'web' && typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/**
 * On web the theme is driven by the `dark` class on <html> (see
 * `src/global.css` + `darkMode: 'class'` in tailwind.config.js), because
 * react-native-web's Appearance shim can't override the system scheme.
 * On native, Appearance.setColorScheme does the job.
 */
function applyColorScheme(preference: ThemePreference) {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    const dark = preference === 'dark' || (preference === 'system' && !!darkQuery?.matches);
    document.documentElement.classList.toggle('dark', dark);
    return;
  }
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        applyColorScheme(preference);
        set({ preference });
      },
    }),
    {
      name: 'sportpulse-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyColorScheme(state.preference);
        }
      },
    },
  ),
);

// Track OS scheme changes on web while the preference is "system".
darkQuery?.addEventListener('change', () => {
  applyColorScheme(useThemeStore.getState().preference);
});
