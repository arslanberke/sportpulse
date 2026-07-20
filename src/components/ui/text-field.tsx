import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/constants/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/** Labeled text input with inline validation error, used with React Hook Form. */
export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  const colors = useThemeColors();
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-ink-secondary">{label}</Text>
      <TextInput
        className={`h-14 rounded-button border bg-surface px-4 text-base text-ink ${
          error ? 'border-danger' : 'border-transparent'
        }`}
        placeholderTextColor={colors.inkTertiary}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
