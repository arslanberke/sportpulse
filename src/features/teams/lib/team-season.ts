import type { SportEvent } from '../../../types/index.ts';

function identity(event: SportEvent): string {
  return [event.sportId, event.homeTeamId ?? event.homeTeamName, event.awayTeamId ?? event.awayTeamName, event.startsAt.slice(0, 10)].join('|');
}

export function dedupeTeamEvents(events: SportEvent[]): SportEvent[] {
  const unique = new Map<string, SportEvent>();
  for (const event of events) {
    const key = identity(event);
    const current = unique.get(key);
    const score = (item: SportEvent) =>
      Number(item.homeScore !== null && item.homeScore !== undefined && item.awayScore !== null && item.awayScore !== undefined) * 2 +
      Number(Boolean(item.externalIds.bsd));
    if (!current || score(event) > score(current)) unique.set(key, event);
  }
  return [...unique.values()];
}

export function splitTeamSeasonEvents(events: SportEvent[], now: Date) {
  const unique = dedupeTeamEvents(events);
  const upcoming = unique
    .filter(event => new Date(event.startsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const results = unique
    .filter(event => new Date(event.startsAt) < now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, results };
}

export function teamEventScore(event: SportEvent): string | null {
  return event.homeScore !== null && event.homeScore !== undefined &&
    event.awayScore !== null && event.awayScore !== undefined
    ? `${event.homeScore}–${event.awayScore}`
    : null;
}
