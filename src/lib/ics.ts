import { downloadTextFile } from '@/lib/download';
import type { SportEvent } from '@/types';

const DEFAULT_DURATION_MINUTES = 120;

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Builds an RFC 5545 calendar entry for an event (times in UTC). */
export function buildIcs(event: SportEvent, channelNames: string[]): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
  const description = channelNames.length > 0 ? `📺 ${channelNames.join(', ')}` : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SportPulse//EN',
    'BEGIN:VEVENT',
    `UID:sportpulse-${event.id}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function shareEventIcs(event: SportEvent, channelNames: string[]) {
  const content = buildIcs(event, channelNames);
  const filename = `${event.title.replace(/[^\w\d]+/g, '-').toLowerCase()}.ics`;
  await downloadTextFile(filename, 'text/calendar', content);
}
