import type { ApiSportsFixtureEvent } from '@/services/providers/api-sports-fixture';

export interface MatchEventRow {
  key: string;
  minuteLabel: string;
  isHome: boolean;
  icon: 'goal' | 'penalty' | 'own-goal' | 'yellow-card' | 'red-card' | 'substitution' | 'other';
  title: string;
  subtitle: string | null;
  sortMinute: number;
}

/** "45+2'" when there's added time, otherwise plain "45'". */
export function minuteLabel(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

function icon(event: ApiSportsFixtureEvent): MatchEventRow['icon'] {
  const detail = event.detail.toLowerCase();
  if (event.type === 'goal') {
    if (detail.includes('own')) return 'own-goal';
    if (detail.includes('penalty') && !detail.includes('missed')) return 'penalty';
    return 'goal';
  }
  if (event.type === 'card') return detail.includes('red') ? 'red-card' : 'yellow-card';
  if (event.type === 'substitution') return 'substitution';
  return 'other';
}

function title(event: ApiSportsFixtureEvent): string {
  if (event.type === 'substitution') return event.player ?? event.detail;
  return event.player ?? event.detail;
}

function subtitle(event: ApiSportsFixtureEvent): string | null {
  if (event.type === 'goal' && event.assistOrSubIn) return event.assistOrSubIn;
  if (event.type === 'substitution' && event.assistOrSubIn) return event.assistOrSubIn;
  if (event.type === 'goal' && icon(event) !== 'goal') return event.detail;
  if (event.type === 'card') return event.detail;
  return null;
}

/**
 * Provider events into rows ready to render, oldest first, stoppage-time
 * entries ordered after their regular minute. VAR entries and anything we
 * don't recognise still render (as "other") rather than being dropped, so a
 * new provider event type never silently disappears.
 */
export function toMatchEventRows(events: ApiSportsFixtureEvent[]): MatchEventRow[] {
  return events
    .map((event, index) => ({
      key: `${event.minute}-${event.extraMinute ?? 0}-${index}`,
      minuteLabel: minuteLabel(event.minute, event.extraMinute),
      isHome: event.isHome,
      icon: icon(event),
      title: title(event),
      subtitle: subtitle(event),
      sortMinute: event.minute * 100 + (event.extraMinute ?? 0),
    }))
    .sort((a, b) => a.sortMinute - b.sortMinute);
}
