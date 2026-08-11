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
      {/* Baslik gizli olsa da tanimli olmali: bir deep link ustune ekran
          actiginda geri dugmesinin etiketi bu baslikten turetilir ve tanimsiz
          kaldiginda kullaniciya "(tabs)" yazisi gorunur. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('tabs.home') }} />
      <Stack.Screen name="settings" options={{ title: t('common.settings') }} />
      <Stack.Screen name="setup" options={{ title: t('setup.title') }} />
      <Stack.Screen name="privacy" options={{ title: t('privacy.title') }} />
      <Stack.Screen name="event/[id]" options={{ title: t('event.title') }} />
      {/* The club's own name is set by the screen once it loads. */}
      <Stack.Screen name="team/[teamId]" options={{ title: '' }} />
      <Stack.Screen name="player/[playerId]" options={{ title: '' }} />
    </Stack>
  );
}
