import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_SEEN_KEY = 'sportpulse-onboarding-seen';

/** Whether the first-launch intro slides were already shown on this device. */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
  } catch {
    return true; // If storage fails, skip the intro rather than loop.
  }
}
