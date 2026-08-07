import { downloadTextFile } from '@/lib/download';
import type { SportEvent } from '@/types';

/**
 * Takvim girdisinin ne kadar sureceği, brans basina.
 *
 * Hepsi 120 dakika sayiliyordu; futbolda makul ama bir UFC gecesi ya da tenis
 * maci takvimde oldugundan cok kisa gorunuyor, sonraki saatler bos sanilıyor.
 * Degerler kesin degil, tipik sureye yakin tahminler: bir macin ne zaman
 * bitecegi onceden bilinemez.
 */
const DURATION_MINUTES: Record<string, number> = {
  football: 120, // 90 dakika + ara ve telafi
  basketball: 130,
  volleyball: 120,
  tennis: 180, // setler uzayabilir
  f1: 150, // yaris + odul toreni
  motogp: 120,
  ufc: 240, // ana karta kadar suren gece
};
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
  const minutes = DURATION_MINUTES[event.sportId] ?? DEFAULT_DURATION_MINUTES;
  const end = new Date(start.getTime() + minutes * 60_000);

  // Yarisma adi da yaziliyor: takvimde "Beşiktaş vs Eyüpspor" satirini gorup
  // hangi kupa oldugunu hatirlamak gerekebiliyor.
  const description = [
    event.leagueName ?? null,
    channelNames.length > 0 ? `📺 ${channelNames.join(', ')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

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
    ...(event.venue ? [`LOCATION:${escapeText(event.venue)}`] : []),
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Dosya adi paylasim sayfasinda kullaniciya gorunuyor, bu yuzden okunur olmali.
 * Turkce harfler dogrudan atilirsa ad taninmaz hale geliyor ("Beşiktaş" ->
 * "be-ikta"); once ASCII karsiliklarina cevrilir.
 */
function fileNameFor(title: string): string {
  const ascii = title
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const slug = ascii
    .replace(/[^\w\d]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'etkinlik'}.ics`;
}

export async function shareEventIcs(event: SportEvent, channelNames: string[]) {
  const content = buildIcs(event, channelNames);
  await downloadTextFile(fileNameFor(event.title), 'text/calendar', content);
}
