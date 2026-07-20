import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';

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
      className={`h-14 items-center justify-center rounded-button shadow-sm active:scale-[0.98] active:opacity-80 ${containerStyles[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Colors.primary : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-semibold ${labelStyles[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
