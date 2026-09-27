import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { BrandMark } from '@/components/ui/brand-mark';
import { Lottie } from '@/components/ui/lottie';
import { BRAND } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { useMotionPreference } from '@/lib/use-motion-preference';

const emptyAnimation = require('../../../assets/lottie/empty.json');

/** Skeleton placeholder: grey bars with a light sweep gliding across them. */
export function LoadingCard({ label }: { label?: string }) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const { enabled: motionEnabled } = useMotionPreference();

  useEffect(() => {
    if (motionEnabled) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [progress, motionEnabled]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + progress.value * (width * 2) }],
  }));

  return (
    <View
      className="overflow-hidden rounded-2xl p-5"
      style={{ backgroundColor: BRAND.navy, borderWidth: 1, borderColor: '#203C4C' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={label ?? t('common.loading')}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View className="mb-4 h-1.5 w-1/3 rounded-full" style={{ backgroundColor: '#294454' }} />
      <View className="mb-4 flex-row items-center justify-between px-4">
        <View className="h-9 w-9 rounded-full" style={{ backgroundColor: '#203C4C' }} />
        <View className="h-2 w-12 rounded-full" style={{ backgroundColor: '#294454' }} />
        <View className="h-9 w-9 rounded-full" style={{ backgroundColor: '#203C4C' }} />
      </View>
      <View className="mb-5 h-1 w-1/2 rounded-full" style={{ backgroundColor: '#203C4C' }} />
      <View className="flex-row items-center gap-3">
        <BrandMark width={32} />
        <Text className="flex-1 text-xs" style={{ color: BRAND.muted }}>{label ?? t('common.loading')}</Text>
      </View>
      {motionEnabled && width > 0 && (
        <Animated.View
          testID="loading-sweep"
          style={[StyleSheet.absoluteFill, sweepStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(77,227,181,0.08)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** Error card with a retry button. */
export function ErrorCard({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View className="items-center rounded-card bg-surface p-8 shadow-sm">
      <Text className="mb-2 text-base font-semibold text-danger">
        {t('common.somethingWentWrong')}
      </Text>
      <Text className="mb-4 text-center text-sm leading-5 text-ink-secondary">
        {message ?? t('common.tryAgain')}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="rounded-button bg-primary px-6 py-3"
        >
          <Text className="font-semibold text-white">{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Empty state card with an optional icon (emoji or Ionicons name) and message. */
export function EmptyCard({
  message,
  icon,
  iconName,
}: {
  message: string;
  icon?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="items-center rounded-card bg-surface p-8 shadow-md">
      {iconName ? (
        <View className="mb-2 h-24 w-24 items-center justify-center">
          <Lottie source={emptyAnimation} size={96} />
        </View>
      ) : (
        icon && <Text className="mb-2 text-4xl">{icon}</Text>
      )}
      <Text className="text-center text-base leading-6 text-ink-secondary">{message}</Text>
    </View>
  );
}
