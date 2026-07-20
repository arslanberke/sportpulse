import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
        set({ preference });
      },
    }),
    {
      name: 'sportpulse-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          Appearance.setColorScheme(
            state.preference === 'system' ? 'unspecified' : state.preference,
          );
        }
      },
    },
  ),
);
