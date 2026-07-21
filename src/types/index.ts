/**
 * Core domain types shared across the app.
 *
 * SportPulse is a sports event reminder: it shows what event happens when,
 * on which channel, plus local reminders. All timestamps are stored in UTC
 * and rendered in the user's device timezone.
 */

export interface Profile {
  id: string;
  fullName: string;
  countryCode: string; // ISO 3166-1 alpha-2, decides broadcast channels shown
  avatarUrl: string | null;
  createdAt: string;
}

/** A sport discipline, e.g. football, basketball, f1. */
export interface Sport {
  id: string; // stable slug: 'football', 'basketball', 'f1', ...
  nameEn: string;
  nameTr: string;
  icon: string; // Ionicons glyph name
  sortOrder: number;
}

export interface League {
  id: string;
  sportId: string;
  name: string;
  countryCode: string | null; // null = international
  logoUrl: string | null;
  externalIds: Record<string, string>; // per-provider ids, e.g. { thesportsdb: '4339' }
}

export interface Team {
  id: string;
  sportId: string;
  leagueId: string | null;
  name: string;
  logoUrl: string | null;
  externalIds: Record<string, string>;
}

/** A TV / streaming broadcaster, scoped to a country. */
export interface Channel {
  id: string;
  name: string;
  countryCode: string;
  logoUrl: string | null;
}

export type EventStatus = 'scheduled' | 'postponed' | 'cancelled';

/** A single sports event (match, race, fight card, tournament session). */
export interface SportEvent {
  id: string;
  sportId: string;
  leagueId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  title: string; // e.g. "Beşiktaş vs Eyüpspor", "Hungarian Grand Prix"
  startsAt: string; // UTC ISO timestamp
  status: EventStatus;
  imageUrl: string | null;
  venue: string | null; // circuit/arena name, when known
  venueImageUrl: string | null;
  importance: number; // 0 = normal, higher = more prominent
  externalIds: Record<string, string>;
  // Joined data (present when fetched via the events service):
  leagueName?: string | null;
  leagueArtworkUrl?: string | null;
  leagueBadgeUrl?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeTeamLogoUrl?: string | null; // transparent badge (PNG with alpha)
  awayTeamLogoUrl?: string | null;
  sport?: Sport | null;
  channels?: Channel[];
}

export type FollowKind = 'sport' | 'league' | 'team';

/** Something the user follows; drives which events they see and get reminded about. */
export interface UserFollow {
  id: string;
  kind: FollowKind;
  sportId: string | null;
  leagueId: string | null;
  teamId: string | null;
  createdAt: string;
}

/** Reminder preferences: multiple offsets plus an optional quiet-hours window. */
export interface ReminderPrefs {
  offsetsMinutes: number[]; // e.g. [60, 1440] = 1h and 1 day before
  quietStart: string | null; // 'HH:MM' local time, start of do-not-disturb
  quietEnd: string | null; // 'HH:MM' local time, end of do-not-disturb
}

/** In-app notification (push delivery via Expo Notifications). */
export interface AppNotification {
  id: string;
  type: string; // 'event_time_changed' | 'event_postponed' | ...
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
