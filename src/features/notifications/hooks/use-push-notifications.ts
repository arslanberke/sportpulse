import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from '@/services/push-notifications';
import { useAuthStore } from '@/store/auth-store';

// Configure how notifications appear while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermission(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'sportpulse',
  });
  return tokenData.data;
}

/**
 * While the user is signed in:
 * - asks for notification permission and registers the Expo push token
 * - shows a local notification when a new in-app notification arrives via
 *   Supabase Realtime (so the user sees it even if the app is in the foreground)
 *
 * Call once from the signed-in layout.
 */
export function usePushNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    (async () => {
      const token = await requestPermission();
      if (!token || !mounted) return;
      tokenRef.current = token;
      try {
        await registerPushToken({
          userId,
          token,
          platform: Platform.OS,
        });
      } catch {
        // Token registration is best-effort; don't block the app.
      }
    })();

    return () => {
      mounted = false;
      if (tokenRef.current) {
        void unregisterPushToken(tokenRef.current).catch(() => {});
        tokenRef.current = null;
      }
    };
  }, [userId]);
}
