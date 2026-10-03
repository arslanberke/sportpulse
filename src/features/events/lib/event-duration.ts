/**
 * Typical wall-clock length of an event per sport, used to guess when a
 * fixture has finished. Providers only give a start time, so the result
 * alert is scheduled from these estimates and deliberately errs late —
 * a nudge that arrives after the final whistle is better than one that
 * lands mid-event.
 */
const SPORT_DURATION_MINUTES: Record<string, number> = {
  football: 130, // 90' + half time + stoppage
  basketball: 140,
  tennis: 190, // best-of-three can run long
  f1: 150, // race plus podium
  motogp: 120,
  ufc: 270, // prelims through the main card
  volleyball: 130,
};

const DEFAULT_DURATION_MINUTES = 140;

/** Estimated end of an event, in local time. */
export function eventEndsAt(startsAt: string | Date, sportId: string): Date {
  const start = new Date(startsAt);
  const minutes = SPORT_DURATION_MINUTES[sportId] ?? DEFAULT_DURATION_MINUTES;
  return new Date(start.getTime() + minutes * 60_000);
}

/** Whether the event is over: a final result arrived or its expected end passed. */
export function isEventOver(
  event: {
    startsAt: string;
    endsAt?: string | null;
    sportId: string;
    resultStatus?: string | null;
  },
  now: Date = new Date(),
): boolean {
  if (event.resultStatus === 'finished') return true;
  const end = event.endsAt
    ? new Date(event.endsAt)
    : eventEndsAt(event.startsAt, event.sportId);
  return now.getTime() > end.getTime();
}
