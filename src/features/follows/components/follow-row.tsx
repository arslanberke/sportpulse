import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';

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
  /** Listedeki sira; giris animasyonu kaldirildigi icin cizime etki etmiyor. */
  index?: number;
  /**
   * Adin yanina yazilan ikincil bilgi. Aramada ayni ad birden fazla bransta
   * gecebiliyor ("Fenerbahce" futbol, basketbol ve voleybolda), satirlar da
   * yalnizca armayla ayirt edilemiyor.
   */
  meta?: string;
  /**
   * Yildiz dugmesi. Verilmezse cizilmez -- yalnizca kuluplerde anlamli, lig ve
   * brans satirlarinda degil.
   *
   * Takip kutusundan ayri bir eylem: kutu "listede gorunsun mu", yildiz "one
   * ciksin mi" demek. Ligi takip eden kullanici icindeki bir kulubu
   * yildizlayabilir, bunun icin kulubu ayrica takip etmesi gerekmez.
   */
  favorite?: boolean;
  onToggleFavorite?: () => void;
  /** Yildiz dugmesinin yanindaki yazi ("Favori"). */
  favoriteLabel?: string;
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
  meta,
  favorite = false,
  onToggleFavorite,
  favoriteLabel,
}: FollowRowProps) {
  const colors = useThemeColors();
  const ticked = coveredByParent || following;

  return (
    <View className="flex-row items-center rounded-2xl">
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
              // Kod cozucunun gorunum boyutuna indirgedigi bitmap URL ile
              // onbelleklenir; ayni rozet farkli boyutta bir kez cizildiyse
              // eski bitmap olceklenerek kullanilir ve rozet bulanir. Tam
              // boyutta cozup olceklemeyi GPU'ya birakmak tutarli ve keskin
              // sonuc verir; rozetler ~500 piksel oldugu icin bedeli dusuk.
              allowDownscaling={false}
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
        <Text className="shrink text-base font-medium text-ink" numberOfLines={1}>
          {label}
        </Text>
        {/* Ad uzunsa once ad kisalir; bransin tamami okunur kalir. */}
        {meta && (
          <Text className="shrink-0 text-sm text-ink-tertiary" numberOfLines={1}>
            {meta}
          </Text>
        )}
        <View className="flex-1" />
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={colors.inkTertiary} />
        )}
      </Pressable>

      {onToggleFavorite && (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          className="ml-2 flex-row items-center gap-1 rounded-pill border px-2 py-1 active:opacity-60"
          style={{
            borderColor: favorite ? FAVORITE_COLOR : colors.border,
            backgroundColor: favorite ? `${FAVORITE_COLOR}1F` : 'transparent',
          }}
          accessibilityRole="button"
          accessibilityLabel={favoriteLabel}
          accessibilityState={{ selected: favorite }}
        >
          <Ionicons
            name={favorite ? 'star' : 'star-outline'}
            size={14}
            color={favorite ? FAVORITE_COLOR : colors.inkSecondary}
          />
          {favoriteLabel && (
            <Text className="text-xs font-semibold text-ink-secondary">{favoriteLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
