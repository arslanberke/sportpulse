import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Text, View } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

interface ChipProps {
  label: string;
  icon?: IconName;
  iconColor?: ColorValue;
  className?: string;
  textClassName?: string;
}

/** Small pill badge: channel names, countdowns, statuses. */
export function Chip({ label, icon, iconColor, className = '', textClassName = '' }: ChipProps) {
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-pill px-3 py-1.5 ${className}`}
    >
      {icon && <Ionicons name={icon} size={13} color={iconColor} />}
      <Text className={`text-xs font-semibold ${textClassName}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
