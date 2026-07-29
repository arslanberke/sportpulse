import { Stack } from 'expo-router';

import { useThemeColors } from '@/constants/theme';
import { useLaunchDeepLink } from '@/features/navigation/use-launch-deep-link';
import { useNotificationNavigation } from '@/features/navigation/use-notification-navigation';
import { useI18n } from '@/lib/i18n';

export default function AppLayout() {
  const colors = useThemeColors();
  const { t } = useI18n();

  // Korumali rotalar ancak burada mevcut oldugu icin, bekleyen deep link ve
  // bildirim dokunmalari bu yerlesimde ele alinir.
  useLaunchDeepLink();
  useNotificationNavigation();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink },
        contentStyle: { backgroundColor: colors.background },
        // The platform's own push transition: iOS parallax plus the
        // edge-swipe back gesture users expect. A fixed slide felt abrupt.
        animation: 'default',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: t('common.settings') }} />
      <Stack.Screen name="setup" options={{ title: t('setup.title') }} />
      <Stack.Screen name="event/[id]" options={{ title: t('event.title') }} />
      {/* The club's own name is set by the screen once it loads. */}
      <Stack.Screen name="team/[teamId]" options={{ title: '' }} />
    </Stack>
  );
}
