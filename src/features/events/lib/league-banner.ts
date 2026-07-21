import type { ImageSourcePropType } from 'react-native';

/**
 * Locally-bundled hero background art per league. Used as a full-bleed `cover`
 * backdrop behind the transparent home/away team badges, replacing the
 * cropped collage thumbnail from the fixture provider.
 */
const LEAGUE_BANNER: Record<string, ImageSourcePropType> = {
  'UEFA Champions League': require('../../../../assets/images/cl-hero-banner.jpg'),
  'UEFA Europa League': require('../../../../assets/images/el-hero-banner.jpg'),
  'UEFA Conference League': require('../../../../assets/images/conf-hero-banner.jpg'),
};

export function leagueBanner(leagueName?: string | null): ImageSourcePropType | null {
  return (leagueName && LEAGUE_BANNER[leagueName]) || null;
}
