import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Applies a published update as soon as it is downloaded instead of waiting
 * for the next cold start. Users rarely kill the app, so without this they
 * would keep running the old bundle for days.
 */
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let running = false;
    const apply = async () => {
      if (running) return;
      running = true;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) await Updates.reloadAsync();
      } catch {
        // Offline or update server unavailable; next foreground retries.
      } finally {
        running = false;
      }
    };

    void apply();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void apply();
    });
    return () => subscription.remove();
  }, []);
}
