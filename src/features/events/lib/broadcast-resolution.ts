import type { Channel, SportEvent } from '../../../types/index.ts';

const ISTANBUL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });
const SEASON_LOCKED_LEAGUES = new Set(['Formula 1', 'Formula 2']);

/**
 * Which channels an event should show.
 *
 * F1/F2 rights are season-long in Turkey, so their league-level mapping is
 * authoritative and must not be hidden/overridden by the daily football
 * broadcast scraper. For other sports a verified event-specific record wins;
 * if that scraper covered the day but omitted the event, no speculative
 * league-level channel is shown.
 */
export function resolveEventChannels(
  event: SportEvent,
  eventBroadcasts: Map<string, Channel[]> | undefined,
  leagueChannels: Map<string, Channel[]> | undefined,
  coverage: Map<string, Set<string>> | undefined,
): Channel[] {
  const defaults = event.leagueId ? (leagueChannels?.get(event.leagueId) ?? []) : [];
  if (event.leagueName && SEASON_LOCKED_LEAGUES.has(event.leagueName)) return defaults;
  const confirmed = eventBroadcasts?.get(event.id);
  if (confirmed && confirmed.length > 0) return confirmed;
  const day = ISTANBUL_DAY.format(new Date(event.startsAt));
  // '' = tum sporlari kapsayan gunluk kaynak (sporekrani). 'football' = BSD'nin
  // ileri tarihli akisi; yalnizca BSD kimligi tasiyan maclara uygulanir ki
  // BSD'nin hic izlemedigi liglerde (1. Lig gibi) lig eslemesi korunur.
  const allCovered = coverage?.get('')?.has(day);
  const bsdCovered = event.sportId === 'football'
    && Boolean(event.externalIds?.bsd)
    && Boolean(coverage?.get('football')?.has(day));
  if (allCovered || bsdCovered) return [];
  return defaults;
}
