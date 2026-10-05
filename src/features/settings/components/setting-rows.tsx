import { type ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

/** 22f settings group title. */
export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-2">
      <Text className="mb-0.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Borderless setting row: label (and optional muted body) left, control right. */
export function SettingRow({
  label,
  body,
  children,
  below,
  danger = false,
  onPress,
}: {
  label: string;
  body?: string;
  children?: ReactNode;
  /** Controls that need the full width (pills), laid under the label. */
  below?: ReactNode;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View className="min-h-[48px] flex-row items-center gap-3 py-2">
        <View className="flex-1">
          <Text className={`text-[13.5px] font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>
            {label}
          </Text>
          {body ? <Text className="mt-0.5 text-xs leading-4 text-ink-secondary">{body}</Text> : null}
        </View>
        {children}
      </View>
      {below ? <View className="pb-2.5">{below}</View> : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} className="border-b border-line active:opacity-60">
      {content}
    </Pressable>
  ) : (
    <View className="border-b border-line">{content}</View>
  );
}

export function SettingSwitch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
}) {
  const colors = useThemeColors();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  );
}

/** Small pill; inked when selected. */
export function OptionPill({
  label,
  active,
  onPress,
  leading,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center gap-1.5 rounded-pill border px-3 py-1.5 active:opacity-60 ${active ? 'border-ink bg-ink' : 'border-line bg-surface'}`}
    >
      {leading}
      <Text className={`text-xs font-semibold ${active ? 'text-background' : 'text-ink-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
