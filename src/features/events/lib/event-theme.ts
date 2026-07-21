/**
 * Per-league / per-sport visual identity for event cards and detail heroes.
 * League fanart (from TheSportsDB, stored in `leagues.artwork_url`) is the
 * primary background; these gradients tint the artwork and act as the
 * fallback when a league has none.
 */

export interface EventTheme {
  /** Background gradient (top-left -> bottom-right). */
  gradient: [string, string, ...string[]];
  /** Overlay gradient bottom color, matching the gradient's darkest tone. */
  overlay: string;
  /** Accent for the countdown chip on top of the artwork. */
  accent: string;
}

const SPORT_THEMES: Record<string, EventTheme> = {
  football: { gradient: ['#14532D', '#052E16'], overlay: '5, 22, 12', accent: '#22C55E' },
  basketball: { gradient: ['#9A3412', '#431407'], overlay: '35, 12, 4', accent: '#F97316' },
  f1: { gradient: ['#B91C1C', '#27272A', '#09090B'], overlay: '12, 10, 10', accent: '#EF4444' },
  motogp: { gradient: ['#C2410C', '#1C1917'], overlay: '20, 14, 10', accent: '#F97316' },
  ufc: { gradient: ['#7F1D1D', '#18181B', '#000000'], overlay: '14, 6, 6', accent: '#DC2626' },
  tennis: { gradient: ['#3F6212', '#1A2E05'], overlay: '15, 22, 5', accent: '#A3E635' },
  volleyball: { gradient: ['#0E7490', '#164E63'], overlay: '6, 25, 32', accent: '#22D3EE' },
};

const LEAGUE_THEMES: Record<string, EventTheme> = {
  'UEFA Champions League': {
    gradient: ['#1E3A8A', '#0B1120'],
    overlay: '5, 10, 26',
    accent: '#3B82F6',
  },
  'UEFA Europa League': { gradient: ['#B45309', '#1C1206'], overlay: '22, 14, 5', accent: '#F59E0B' },
  'UEFA Conference League': {
    gradient: ['#065F46', '#04211A'],
    overlay: '4, 20, 16',
    accent: '#34D399',
  },
  'Premier League': { gradient: ['#4C1D95', '#1E1B4B'], overlay: '18, 14, 40', accent: '#A78BFA' },
  NBA: { gradient: ['#1D4ED8', '#7F1D1D'], overlay: '16, 12, 24', accent: '#60A5FA' },
  'WTA Tour': { gradient: ['#C4B5FD', '#7C3AED'], overlay: '30, 15, 60', accent: '#7C3AED' },
};

const DEFAULT_THEME: EventTheme = {
  gradient: ['#10B981', '#047857'],
  overlay: '4, 14, 9',
  accent: '#10B981',
};

export function eventTheme(sportId: string, leagueName?: string | null): EventTheme {
  if (leagueName && LEAGUE_THEMES[leagueName]) return LEAGUE_THEMES[leagueName];
  return SPORT_THEMES[sportId] ?? DEFAULT_THEME;
}

/** Bottom overlay for text legibility, tinted to the theme. */
export function overlayColors(theme: EventTheme): [string, string, string] {
  return ['transparent', `rgba(${theme.overlay}, 0.55)`, `rgba(${theme.overlay}, 0.92)`];
}

/** How the league artwork should sit inside the hero. */
export interface ArtworkStyle {
  /** 'contain' for wide banner art that must not be cropped. */
  fit: 'cover' | 'contain';
  /** Focal point of the artwork when cropping (expo-image contentPosition). */
  position: 'center' | 'top' | 'bottom' | 'left center' | 'right center' | 'right top';
}

/** Hand-tuned per artwork so the subject (car, logo, trophy) stays visible. */
const LEAGUE_ARTWORK: Record<string, ArtworkStyle> = {
  'UEFA Champions League': { fit: 'contain', position: 'center' },
  'UEFA Europa League': { fit: 'contain', position: 'center' },
  'UEFA Conference League': { fit: 'contain', position: 'center' },
  'Formula 1': { fit: 'cover', position: 'right top' },
  'Ligue 1': { fit: 'cover', position: 'left center' },
  LaLiga: { fit: 'contain', position: 'center' },
  MotoGP: { fit: 'contain', position: 'center' },
  'Primeira Liga': { fit: 'contain', position: 'center' },
  'Süper Lig': { fit: 'contain', position: 'center' },
  'Trendyol 1. Lig': { fit: 'contain', position: 'center' },
  'WTA Tour': { fit: 'contain', position: 'center' },
  'Kadınlar Avrupa Şampiyonası': { fit: 'contain', position: 'center' },
};

const DEFAULT_ARTWORK: ArtworkStyle = { fit: 'cover', position: 'center' };

export function artworkStyle(leagueName?: string | null): ArtworkStyle {
  return (leagueName && LEAGUE_ARTWORK[leagueName]) || DEFAULT_ARTWORK;
}
