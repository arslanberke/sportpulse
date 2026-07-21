import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

/**
 * Hero artwork for a two-team fixture: a full-bleed league banner backdrop with
 * the home and away transparent badges laid over it, "VS" between. Badges use
 * `contain` and sit inside a padded safe area so no crest is ever clipped.
 */
export function MatchupArt({
  banner,
  homeLogoUrl,
  awayLogoUrl,
  badgeSize,
}: {
  banner: ImageSourcePropType | null;
  homeLogoUrl: string;
  awayLogoUrl: string;
  /** Rendered width/height of each badge box. */
  badgeSize: number;
}) {
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {banner && (
        <Image
          source={banner}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          contentPosition="center"
          transition={200}
        />
      )}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 40,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Image
          source={{ uri: homeLogoUrl }}
          style={{ width: badgeSize, height: badgeSize }}
          contentFit="contain"
          transition={200}
        />
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: badgeSize * 0.28,
            fontWeight: '800',
            fontStyle: 'italic',
          }}
        >
          VS
        </Text>
        <Image
          source={{ uri: awayLogoUrl }}
          style={{ width: badgeSize, height: badgeSize }}
          contentFit="contain"
          transition={200}
        />
      </View>
    </View>
  );
}
