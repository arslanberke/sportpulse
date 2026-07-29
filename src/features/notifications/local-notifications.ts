import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * How locally scheduled reminders appear while the app is open. This used
 * to live in the push-notification hook, which is disabled until a paid
 * Apple Developer account is available — local reminders must not depend
 * on it.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionRequest: Promise<boolean> | null = null;

/**
 * Asks once per app run for permission to post notifications, and caches
 * the answer. Scheduling without it throws "Source is not authorized",
 * which silently breaks every reminder.
 *
 * Local notifications need only this permission — no push token, no paid
 * developer account.
 */
export function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);

  permissionRequest ??= (async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
  })();

  return permissionRequest;
}
