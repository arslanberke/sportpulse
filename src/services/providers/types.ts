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
  /**
   * Cok gunlu etkinliklerin bitisi (turnuva, yaris hafta sonu).
   *
   * Yalnizca baslangica bakildiginda devam eden bir turnuva listeden dusuyordu:
   * Cincinnati Open sabah basliyor, bir hafta suruyor ama ogleden sonra artik
   * gorunmuyordu. Bilinmiyorsa null; o zaman davranis eskisi gibi.
   */
  endsAtUtc?: string | null;
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
  /**
   * Sonuc, kaynak veriyorsa (ESPN scoreboard). Baslamamis macta null.
   * resultStatus: 'notstarted' | 'inprogress' | 'finished' | 'postponed'.
   */
  homeScore?: number | null;
  awayScore?: number | null;
  resultStatus?: string | null;
}

/** A club/constructor taking part in a league, independent of any fixture. */
export interface ProviderTeam {
  /**
   * Every provider id known for this club, keyed by provider name. Providers
   * often report each other's ids, and matching on any of them is what keeps
   * "Amed SFK" and "Amed" from becoming two clubs.
   */
  externalIds: Record<string, string>;
  name: string;
  /** Transparent badge (PNG with alpha) when the provider has one. */
  logoUrl: string | null;
  /**
   * Other names the source itself gives for the club — its short name, or the
   * name without the city it tacks on. Used only to recognise a club we
   * already have under a different competition's spelling.
   */
  aliases?: string[];
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

/** One row of a motorsport session classification. */
export interface SessionEntry {
  position: number;
  name: string; // driver / rider
  team: string | null; // constructor / manufacturer
  photoUrl?: string | null; // driver/rider headshot
  teamLogoUrl?: string | null; // constructor/team logo
}

/** Results for a single motorsport session (Qualifying, Race, ...). */
export interface SessionResults {
  /** Normalized session label, e.g. "Qualifying" | "Race" | "Practice". */
  session: string;
  entries: SessionEntry[];
  /** True while the session is running; entries are the live order. */
  live?: boolean;
}

/** One row of a motorsport championship standing. */
export interface StandingEntry {
  position: number;
  name: string; // driver / rider
  team: string | null; // constructor / manufacturer
  points: number;
  photoUrl?: string | null; // driver/rider headshot
  teamLogoUrl?: string | null; // constructor/team logo
}

/** One row of a team-league standings table (e.g. NBA). */
export interface TeamStandingEntry {
  seed: number;
  team: string;
  teamLogoUrl: string | null;
  wins: number;
  losses: number;
  winPct: string; // e.g. ".732"
  gamesBehind: string; // "-" for the leader, else e.g. "14"
}

/**
 * One row of a league table. Football fills draws/goalDiff/points; basketball
 * fills winPct/gamesBehind, so a single shape serves both.
 */
export interface LeagueTableRow {
  rank: number;
  team: string;
  teamLogoUrl: string | null;
  played: number;
  wins: number;
  draws: number | null;
  losses: number;
  points: number | null;
  goalDiff: string | null;
  winPct: string | null;
  gamesBehind: string | null;
}

/** A group inside a table: a conference, or a cup's league phase. */
export interface LeagueTableGroup {
  name: string;
  rows: LeagueTableRow[];
}

/** A single conference/division group within a league standings table. */
export interface ConferenceStandings {
  name: string;
  entries: TeamStandingEntry[];
}

/** Team-league (basketball) standings grouped by conference. */
export interface LeagueStandings {
  season: string;
  conferences: ConferenceStandings[];
}

/** A motorsport championship (drivers/riders) standing for a season. */
export interface Standings {
  /** Season label, e.g. "2025". */
  season: string;
  entries: StandingEntry[];
}

/**
 * Bir yarismanin sezon araligi.
 *
 * `startsAtUtc` sezonun ilk maci, `endsAtUtc` sezonun bittigi tarihtir. Ikisi
 * de bagimsizca eksik olabilir: saglayicilar takvimi her lig icin ayni
 * duzgunlukte yayinlamiyor.
 */
export interface ProviderSeason {
  startsAtUtc: string | null;
  endsAtUtc: string | null;
}

/** A league to fetch, with the provider-specific ids we know for it. */
export interface LeagueRef {
  onIssue?: import('./log.ts').ReportProviderIssue;
  /** Our own league UUID. */
  leagueId: string;
  /** Stable catalog name; required by providers whose ids are configured in code/secrets. */
  leagueName?: string;
  sportId: string;
  externalIds: Record<string, string>;
  /** Request-scoped server secrets. Never populated by the mobile client. */
  providerKeys?: { bsd?: string; goal?: string };
}

/**
 * A source that only knows who plays in a league, not when. Some leagues
 * (EuroLeague, the Turkish basketball and volleyball ones) have no fixture
 * feed we can use but do publish their entry list, and that alone is enough
 * to fill the follow screens.
 */
export interface TeamListProvider {
  readonly name: string;
  supports(league: LeagueRef): boolean;
  fetchLeagueTeams(league: LeagueRef): Promise<ProviderTeam[]>;
}

export interface FixtureProvider {
  readonly name: string;
  /** Whether this provider can serve the given league. */
  supports(league: LeagueRef): boolean;
  /**
   * Events for a league within the next `days` days. `lookbackDays` also
   * returns the last few days so finished matches get their result; providers
   * without results may ignore it.
   */
  fetchUpcomingEvents(league: LeagueRef, days: number, lookbackDays?: number): Promise<ProviderEvent[]>;
  /**
   * Confirmed lineups for one event, or null when not published yet.
   * Official lineups usually appear ~1h before kickoff, so callers should
   * treat null as "not out yet" and retry closer to the start.
   */
  fetchLineup?(externalId: string): Promise<EventLineup | null>;
  /**
   * Every team taking part in the league this season. Independent of the
   * fixture list, so it works between seasons too.
   */
  fetchLeagueTeams?(league: LeagueRef): Promise<ProviderTeam[]>;
  /**
   * Sezonun ilk maci ve bitis tarihi. Fikstur listesi yalnizca yakin gunleri
   * kapsadigi icin, ligin ne zaman basladigi ancak buradan bilinebilir.
   */
  fetchSeason?(league: LeagueRef): Promise<ProviderSeason | null>;
}
