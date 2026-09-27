import type { SportEvent } from '../../../types/index.ts';

export interface CalendarFilters {
  sportId?: string | null;
  leagueId?: string | null;
  channelId?: string | null;
  favoritesOnly?: boolean;
  day?: Date | null;
}

export function calendarDays(now: Date, count = 7): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
}

function overlapsDay(event: SportEvent, day: Date): boolean {
  const [start, end] = calendarDays(day, 2);
  const begins = new Date(event.startsAt).getTime();
  const finishes = event.endsAt ? new Date(event.endsAt).getTime() : begins;
  return begins < end.getTime() && (begins >= start.getTime() || finishes > start.getTime());
}

/**
 * Normal calendar rows: future events plus genuinely multi-day events that
 * haven't ended yet. A single football match whose kickoff passed is kept in
 * the raw query only as a live-score candidate; it must not linger in the
 * ordinary schedule unless the live feed explicitly confirms it.
 */
export function currentCalendarEvents(events: SportEvent[], now: Date): SportEvent[] {
  return events.filter(event => {
    const starts = new Date(event.startsAt).getTime();
    const ends = event.endsAt ? new Date(event.endsAt).getTime() : null;
    return starts >= now.getTime() || (ends !== null && ends > now.getTime());
  });
}

export function filterCalendarEvents(events: SportEvent[], filters: CalendarFilters, isFavorite: (event: SportEvent) => boolean): SportEvent[] {
  return events.filter(event =>
    (!filters.sportId || event.sportId === filters.sportId) &&
    (!filters.leagueId || event.leagueId === filters.leagueId) &&
    (!filters.channelId || event.channels?.some(channel => channel.id === filters.channelId)) &&
    (!filters.favoritesOnly || isFavorite(event)) &&
    (!filters.day || overlapsDay(event, filters.day)),
  );
}

export function groupCalendarEvents(events: SportEvent[], now: Date): { day: Date; events: SportEvent[] }[] {
  const groups = new Map<number, { day: Date; events: SportEvent[] }>();
  for (const event of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const starts = new Date(event.startsAt);
    const ongoing = starts <= now && event.endsAt && new Date(event.endsAt) > now;
    const [day] = calendarDays(ongoing ? now : starts, 1);
    const group = groups.get(day.getTime()) ?? { day, events: [] };
    group.events.push(event);
    groups.set(day.getTime(), group);
  }
  return [...groups.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

export interface BracketFilters {
  category?: string | null;
  round?: string | null;
  qualifying?: boolean;
  time?: 'all' | 'today' | 'upcoming' | 'results';
}

export function filterBracketMatches(events: SportEvent[], filters: BracketFilters, now: Date): SportEvent[] {
  if (filters.time === 'results') return [];
  return events.filter(event =>
    (filters.qualifying || !/qualif/i.test(event.round ?? '')) &&
    (!filters.category || event.bracket === filters.category) &&
    (!filters.round || event.round === filters.round) &&
    (filters.time !== 'today' || overlapsDay(event, now)) &&
    (filters.time !== 'upcoming' || new Date(event.startsAt) >= now),
  );
}
