import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '@/constants/theme';
import { listEntering } from '@/lib/animations';

interface FollowRowProps {
  label: string;
  /** Ionicons glyph, used when there is no logo. */
  icon?: string;
  imageUrl?: string | null;
  following: boolean;
  onToggleFollow: () => void;
  /** Omit for leaf rows (nothing to drill into). */
  onPress?: () => void;
  /**
   * The parent is followed, so this row is included whether or not it is
   * picked individually. Shown as ticked but muted, and not togglable.
   */
  coveredByParent?: boolean;
  /** Position in the list; staggers the entrance so rows fan in one by one. */
  index?: number;
}

/**
 * One row of the follow hierarchy: a tick box on the left that toggles the
 * follow, and the rest of the row opening the level below. Keeping the two
 * actions on separate targets means a tap is never ambiguous.
 */
export function FollowRow({
  label,
  icon,
  imageUrl,
  following,
  onToggleFollow,
  onPress,
  coveredByParent = false,
  index = 0,
}: FollowRowProps) {
  const colors = useThemeColors();
  const ticked = coveredByParent || following;

  return (
    <Animated.View
      entering={listEntering(index)}
      className="flex-row items-center rounded-2xl"
    >
      <Pressable
        onPress={coveredByParent ? undefined : onToggleFollow}
        disabled={coveredByParent}
        hitSlop={10}
        className="py-3 pl-1 pr-3 active:opacity-60"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ticked, disabled: coveredByParent }}
      >
        <View
          className="h-6 w-6 items-center justify-center rounded-md border-2"
          style={{
            borderColor: ticked ? colors.primary : colors.inkTertiary,
            backgroundColor: ticked ? colors.primary : 'transparent',
            opacity: coveredByParent ? 0.45 : 1,
          }}
        >
          {ticked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </Pressable>

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className="flex-1 flex-row items-center gap-3 py-3 active:opacity-60"
      >
        {imageUrl ? (
          // Crests and league badges are transparent PNGs, so they sit on the
          // row itself — a white puck behind them read as a sticker. The
          // rounding is for the rare crest that ships with a solid backdrop
          // baked in: it then reads as a tile rather than a raw white square.
          <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-md">
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 26, height: 26 }}
              contentFit="contain"
            />
          </View>
        ) : (
          icon && (
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={colors.inkSecondary}
            />
          )
        )}
        <Text className="flex-1 text-base font-medium text-ink" numberOfLines={1}>
          {label}
        </Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={colors.inkTertiary} />
        )}
      </Pressable>
    </Animated.View>
  );
}
