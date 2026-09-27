import type { ImageSourcePropType } from 'react-native';
import { artworkStyle, eventTheme } from './event-theme';

export interface LeagueBanner {
  source: ImageSourcePropType;
  position?: ReturnType<typeof artworkStyle>['position'];
  identity?: { colors: ReturnType<typeof eventTheme>['gradient'] };
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

const REVIEWED_ARTWORK: Record<string, string> = {
  'Serie A': 'https://r2.thesportsdb.com/images/media/league/fanart/spqxtv1425356374.jpg',
  Eredivisie: 'https://r2.thesportsdb.com/images/media/league/fanart/9lc0b71620328005.jpg',
};

const IDENTITY_COLORS: Record<string, [string, string]> = {
  'Premier League': ['#4C1765', '#16091F'],
  Bundesliga: ['#B51224', '#360A12'],
  LaLiga: ['#A72B30', '#2C0D14'],
  'Ligue 1': ['#173271', '#080F29'],
  'Süper Lig': ['#971D2C', '#290B13'],
  'Trendyol 1. Lig': ['#873A16', '#230F0A'],
  'Primeira Liga': ['#244F49', '#081E1C'],
  'Serie A': ['#15487C', '#081A33'],
  Eredivisie: ['#202A59', '#0A1027'],
  'FA Cup': ['#A31D39', '#2C0A16'],
  'Carabao Cup': ['#176B43', '#07271A'],
  'Copa del Rey': ['#8D2034', '#250B13'],
  'Coppa Italia': ['#175A79', '#061D2E'],
  'Coupe de France': ['#173D73', '#0A142C'],
  'DFB-Pokal': ['#476736', '#12250E'],
};

export function leagueBanner(
  leagueName?: string | null,
  leagueArtworkUrl?: string | null,
  leagueBadgeUrl?: string | null,
  sportId = 'football',
): LeagueBanner | null {
  const bundled = leagueName ? LEAGUE_BANNER[leagueName] : null;
  if (bundled) return bundled;
  const artworkUri = leagueArtworkUrl?.trim();
  if (leagueName && artworkUri && REVIEWED_ARTWORK[leagueName] === artworkUri) {
    return { source: { uri: artworkUri }, ...artworkStyle(leagueName) };
  }
  const uri = leagueBadgeUrl?.trim();
  if (!uri) return null;
  const colors = (leagueName && IDENTITY_COLORS[leagueName]) || eventTheme(sportId, leagueName).gradient;
  return { source: { uri }, fit: 'contain', identity: { colors } };
}
