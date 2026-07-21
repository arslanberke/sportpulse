import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/theme';

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

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      disabled={isDisabled}
      className={`h-14 items-center justify-center overflow-hidden rounded-button shadow-md active:scale-[0.97] active:opacity-85 ${containerStyles[variant]} ${isDisabled ? 'opacity-50' : ''}`}
      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
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
    </Pressable>
  );
}
