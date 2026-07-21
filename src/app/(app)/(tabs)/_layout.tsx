import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import type { ColorValue } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { useEventReminders } from '@/features/events/hooks/use-event-reminders';
import { useNextEventWidget } from '@/features/events/hooks/use-next-event-widget';
import { usePushNotifications } from '@/features/notifications/hooks/use-push-notifications';
import { useRealtimeUpdates } from '@/features/notifications/hooks/use-realtime-updates';
import { useI18n } from '@/lib/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    const [scale] = useState(() => new Animated.Value(focused ? 1 : 0));
    useEffect(() => {
      Animated.timing(scale, {
        toValue: focused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.back(2.2)),
        useNativeDriver: false,
      }).start();
    }, [scale, focused]);
    const iconScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const translateY = scale.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
    return (
      <Animated.View style={{ transform: [{ scale: iconScale }, { translateY }] }}>
        <Ionicons name={name} color={color} size={size} />
      </Animated.View>
    );
  }
  return TabIcon;
}

export default function TabsLayout() {
  const colors = useThemeColors();
  const { t } = useI18n();
  useRealtimeUpdates();
  usePushNotifications();
  useEventReminders();
  useNextEventWidget();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('calendar') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('add-circle') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person') }}
      />
    </Tabs>
  );
}
