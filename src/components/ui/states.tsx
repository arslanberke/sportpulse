import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

/** Skeleton placeholder: pulsing grey bars shaped like a typical card. */
export function LoadingCard({ label }: { label?: string }) {
  const { t } = useI18n();
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      className="rounded-card bg-surface p-5 shadow-sm"
      accessibilityLabel={label ?? t('common.loading')}
    >
      <Animated.View style={{ opacity: pulse }}>
        <View className="mb-3 h-4 w-1/3 rounded-full bg-ink-tertiary/30" />
        <View className="mb-2 h-3 w-3/4 rounded-full bg-ink-tertiary/20" />
        <View className="h-3 w-1/2 rounded-full bg-ink-tertiary/20" />
      </Animated.View>
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
  const colors = useThemeColors();
  return (
    <View className="items-center rounded-card bg-surface p-8 shadow-md">
      {iconName && (
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-primary-light">
          <Ionicons name={iconName} size={28} color={colors.primary} />
        </View>
      )}
      {icon && <Text className="mb-2 text-4xl">{icon}</Text>}
      <Text className="text-center text-base leading-6 text-ink-secondary">{message}</Text>
    </View>
  );
}
