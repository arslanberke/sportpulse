/**
 * Provider-agnostic fixture data layer.
 *
 * These modules are pure TypeScript over the global `fetch` — no React
 * Native or Supabase imports — so the same code runs in the app AND in the
 * Deno-based Supabase Edge Function that syncs fixtures on a schedule.
 */

/** A normalized upcoming event as returned by any provider. */
export interface ProviderEvent {
  /** Provider-scoped stable id, used for upserts. */
  externalId: string;
  provider: string; // 'thesportsdb' | 'espn'
  title: string;
  startsAtUtc: string; // ISO timestamp, always UTC
  homeTeam: string | null;
  awayTeam: string | null;
  /** Provider-scoped team ids, used to key the team catalog. */
  homeTeamExternalId: string | null;
  awayTeamExternalId: string | null;
  /** Transparent team badge URLs (PNG with alpha), when the provider has them. */
  homeTeamLogoUrl: string | null;
  awayTeamLogoUrl: string | null;
  imageUrl: string | null;
  venue: string | null;
  venueImageUrl: string | null;
  postponed: boolean;
}

/** A single player in a starting XI or on the bench. */
export interface LineupPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null; // e.g. "Centre-Back"
  isSubstitute: boolean;
  photoUrl: string | null; // transparent cutout when available
  isCaptain: boolean;
  countryCode: string | null; // ISO 3166-1 alpha-2, for a flag
  /** Pitch slot from the provider: row 1 = keeper's line. Null for subs. */
  grid: { row: number; col: number } | null;
}

/** Confirmed lineups for an event, split by side. */
export interface EventLineup {
  home: LineupPlayer[];
  away: LineupPlayer[];
  /** e.g. "4-3-3". Null when the provider has no formation. */
  homeFormation: string | null;
  awayFormation: string | null;
}

/** A league to fetch, with the provider-specific ids we know for it. */
export interface LeagueRef {
  /** Our own league UUID. */
  leagueId: string;
  sportId: string;
  externalIds: Record<string, string>;
}

export interface FixtureProvider {
  readonly name: string;
  /** Whether this provider can serve the given league. */
  supports(league: LeagueRef): boolean;
  /** Upcoming events for a league within the next `days` days. */
  fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]>;
  /**
   * Confirmed lineups for one event, or null when not published yet.
   * Official lineups usually appear ~1h before kickoff, so callers should
   * treat null as "not out yet" and retry closer to the start.
   */
  fetchLineup?(externalId: string): Promise<EventLineup | null>;
}
