import type { LeagueBanner } from '@/features/events/lib/league-banner';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

/**
 * Bir armanin yerini tutan daire.
 *
 * Kaynak bazi kuluplerin armasini vermiyor. Once tek arma eksik oldugunda kart
 * bastan asagi lig afisine dusuyordu: afis kartin oranina oturmadigi icin
 * ortada bir serit gibi duruyor ve baslik uzerine biniyordu. Eksik armanin
 * yerini tutmak, duzeni bozmadan durumu goruntuluyor.
 */
function BadgePlaceholder({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
      }}
    >
      <Ionicons name="shield-outline" size={size * 0.42} color="rgba(255,255,255,0.6)" />
    </View>
  );
}

/**
 * Hero artwork for a two-team fixture: a league banner backdrop with the home
 * and away transparent badges laid over it, "VS" between. Badges use `contain`
 * and sit inside a padded safe area so no crest is ever clipped. The backdrop
 * honours the banner's own `fit` (full-bleed `cover` vs. fully-visible
 * `contain` with a matching fill).
 *
 * Arma adresleri bos gelebilir; eksik olanin yerine yer tutucu cizilir.
 */
export function MatchupArt({
  banner,
  homeLogoUrl,
  awayLogoUrl,
  badgeSize,
}: {
  banner: LeagueBanner | null;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
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
          source={banner.source}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: banner.backgroundColor,
          }}
          contentFit={banner.fit}
          contentPosition="center"
          transition={200}
        />
      )}
      {/* Scrim beneath the badges: keeps the overlaid title/label readable
          without dimming the crests (which render above it). */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }}
        pointerEvents="none"
      />
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
        {homeLogoUrl ? (
          <Image
            source={{ uri: homeLogoUrl }}
            style={{ width: badgeSize, height: badgeSize }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <BadgePlaceholder size={badgeSize} />
        )}
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
        {awayLogoUrl ? (
          <Image
            source={{ uri: awayLogoUrl }}
            style={{ width: badgeSize, height: badgeSize }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <BadgePlaceholder size={badgeSize} />
        )}
      </View>
    </View>
  );
}
