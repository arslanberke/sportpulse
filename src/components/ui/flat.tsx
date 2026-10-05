import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';

/** 22f pill tabs: the selected pill is inked, the rest are outlined. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View className="mb-2.5 flex-row flex-wrap gap-1.5">
      {tabs.map((x) => {
        const on = x.key === value;
        return (
          <Pressable
            key={x.key}
            onPress={() => onChange(x.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`rounded-pill border px-3 py-1.5 ${on ? 'border-ink bg-ink' : 'border-line bg-surface'}`}
          >
            <Text className={`text-xs font-semibold ${on ? 'text-background' : 'text-ink-secondary'}`}>
              {x.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small outlined action: follow (ink when on) or favourite (gold when on). */
export function ActionPill({
  label,
  icon,
  active,
  tone = 'ink',
  onPress,
  disabled = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  tone?: 'ink' | 'favorite';
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const fav = tone === 'favorite';
  const border = active ? (fav ? FAVORITE_COLOR : colors.ink) : colors.border;
  const bg = active ? (fav ? `${FAVORITE_COLOR}1F` : colors.ink) : 'transparent';
  const fg = active && !fav ? colors.background : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className="flex-row items-center gap-1.5 rounded-pill border px-3.5 py-1.5 active:opacity-60"
      style={{ borderColor: border, backgroundColor: bg }}
    >
      <Ionicons name={icon} size={14} color={fav && active ? FAVORITE_COLOR : fg} />
      <Text className="text-[12.5px] font-semibold" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Page identity row: small cached image, name, one muted line, optional trailing node. */
export function IdentityRow({
  imageUrl,
  shape = 'logo',
  placeholder = 'shield-outline',
  title,
  subtitle,
  subtitleImageUrl,
  trailing,
}: {
  imageUrl?: string | null;
  shape?: 'logo' | 'photo';
  placeholder?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | null;
  subtitleImageUrl?: string | null;
  trailing?: ReactNode;
}) {
  const colors = useThemeColors();
  const photo = shape === 'photo';
  return (
    <View className="flex-row items-center gap-3 pb-3 pt-2">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={
            photo
              ? { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border }
              : { width: 48, height: 48 }
          }
          contentFit={photo ? 'cover' : 'contain'}
          contentPosition="top"
          cachePolicy="memory-disk"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
          <Ionicons name={placeholder} size={22} color={colors.inkTertiary} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[20px] font-extrabold tracking-tight text-ink" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <View className="mt-0.5 flex-row items-center gap-1.5">
            {subtitleImageUrl && (
              <Image
                source={{ uri: subtitleImageUrl }}
                style={{ width: 16, height: 12 }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
            <Text className="shrink text-[12.5px] text-ink-secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/** Row of big numbers with small labels, split by hairlines. */
export function StatStrip({ items }: { items: { value: string; label: string; color?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <View className="my-2 flex-row border-y border-line py-2.5">
      {items.map((item, i) => (
        <View key={item.label} className={`flex-1 items-center ${i > 0 ? 'border-l border-line' : ''}`}>
          <Text
            className="text-[17px] font-extrabold text-ink"
            style={{ fontVariant: ['tabular-nums'], color: item.color }}
          >
            {item.value}
          </Text>
          <Text className="mt-0.5 text-[10.5px] text-ink-tertiary" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Label on the left, value on the right, hairline below. */
export function InfoLine({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  if (!value) return null;
  return (
    <View className={`min-h-[44px] flex-row items-center gap-3 py-2 ${last ? '' : 'border-b border-line'}`}>
      <Text className="w-28 text-[12.5px] text-ink-secondary">{label}</Text>
      <Text className="flex-1 text-right text-[13px] font-semibold text-ink">{value}</Text>
    </View>
  );
}

/** Muted one-line message used in place of an empty-state card. */
export function FlatEmpty({ message }: { message: string }) {
  return <Text className="py-4 text-[13px] text-ink-secondary">{message}</Text>;
}
