import { Stack } from 'expo-router';

import { useThemeColors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

export default function AppLayout() {
  const colors = useThemeColors();
  const { t } = useI18n();
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
