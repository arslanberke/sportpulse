import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

const containerStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-primary-light',
  danger: 'bg-danger',
};

const labelStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  danger: 'text-white',
};

/** Lighter top edge over a darker base makes filled buttons read as raised. */
const sheenColors: Record<ButtonVariant, [string, string]> = {
  primary: ['rgba(255,255,255,0.28)', 'rgba(0,0,0,0.16)'],
  secondary: ['rgba(255,255,255,0.45)', 'rgba(16,185,129,0.10)'],
  danger: ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.18)'],
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [scale] = useState(() => new Animated.Value(1));
  const spring = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <AnimatedPressable
      onPressIn={() => spring(0.96)}
      onPressOut={() => spring(1)}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
      }}
      disabled={isDisabled}
      className={`h-14 items-center justify-center overflow-hidden rounded-button shadow-md ${containerStyles[variant]} ${isDisabled ? 'opacity-50' : ''}`}
      style={[
        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
        { transform: [{ scale }] },
      ]}
    >
      <LinearGradient
        colors={sheenColors[variant]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Colors.primary : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-semibold ${labelStyles[variant]}`}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}
