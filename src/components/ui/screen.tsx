import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Platform, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { type AnimatedScrollViewProps } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { DarkBackdrop, useIsDark, useThemeColors } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  /** Set to false for screens that manage their own scrolling (e.g. lists). */
  scrollable?: boolean;
  /** Pull-to-refresh handler. When provided, a RefreshControl is shown. */
  onRefresh?: () => void;
  /** Whether a refresh is currently in progress. */
  refreshing?: boolean;
  /** Reanimated scroll handler (enables e.g. hero parallax on the screen). */
  onScroll?: AnimatedScrollViewProps['onScroll'];
}

/** In dark mode the flat background is replaced with a subtle vertical fade. */
function Backdrop() {
  const isDark = useIsDark();
  if (!isDark) return null;
  return <LinearGradient colors={[...DarkBackdrop]} style={StyleSheet.absoluteFill} />;
}

/**
 * Base wrapper for every screen: safe area + background + consistent padding.
 * Supports optional pull-to-refresh via React Query's refetch.
 */
export function Screen({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  onScroll,
}: ScreenProps) {
  const colors = useThemeColors();

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRefresh?.();
  }, [onRefresh]);

  if (!scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Backdrop />
        <View className="flex-1 px-6">{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Backdrop />
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
