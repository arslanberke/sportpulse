import type { ImageSourcePropType } from 'react-native';

export interface LeagueBanner {
  source: ImageSourcePropType;
  /** `cover` fills the hero (full-bleed art); `contain` shows the whole artwork. */
  fit: 'cover' | 'contain';
  /** Fill shown around a `contain` banner; should match the artwork's edges. */
  backgroundColor?: string;
}

/**
 * Locally-bundled hero background art per league. Used as the backdrop behind
 * the transparent home/away team badges, replacing the cropped collage
 * thumbnail from the fixture provider. The official UEFA fanart is shown with
 * `contain` (+ a matching fill) so the league crest/wordmark is never clipped.
 */
const LEAGUE_BANNER: Record<string, LeagueBanner> = {
  'UEFA Champions League': {
    source: require('../../../../assets/images/cl-hero-banner.jpg'),
    fit: 'cover',
  },
  'UEFA Europa League': {
    source: require('../../../../assets/images/el-hero-banner.jpg'),
    fit: 'cover',
  },
  'UEFA Conference League': {
    source: require('../../../../assets/images/conf-hero-banner.jpg'),
    fit: 'cover',
  },
};

export function leagueBanner(leagueName?: string | null): LeagueBanner | null {
  return (leagueName && LEAGUE_BANNER[leagueName]) || null;
}
