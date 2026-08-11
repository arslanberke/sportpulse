import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/**
 * Card section header: a tinted icon tile next to the section title.
 *
 * Etkinlik detayinda yerel bir bilesendi; kura kartinda da ayni baslik gerekince
 * ortaya alindi.
 */
export function SectionHeader({
  icon,
  label,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}1F` }}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="text-base font-semibold text-ink">{label}</Text>
    </View>
  );
}
