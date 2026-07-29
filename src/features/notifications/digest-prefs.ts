import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DigestPrefsState {
  /** "Match finished — see the result" alert after each followed event. */
  resultAlerts: boolean;
  /** Monday morning summary of the week's fixtures. */
  weeklyDigest: boolean;
  setResultAlerts: (enabled: boolean) => void;
  setWeeklyDigest: (enabled: boolean) => void;
}

/**
 * Device-local notification toggles. Kept out of the Supabase reminder
 * preferences because they only affect locally scheduled notifications and
 * should not require a schema change.
 */
export const useDigestPrefs = create<DigestPrefsState>()(
  persist(
    (set) => ({
      resultAlerts: true,
      weeklyDigest: true,
      setResultAlerts: (resultAlerts) => set({ resultAlerts }),
      setWeeklyDigest: (weeklyDigest) => set({ weeklyDigest }),
    }),
    {
      name: 'sportpulse-digest-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
