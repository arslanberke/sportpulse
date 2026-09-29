import { Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { TimelineCard, type TimelineLive } from '@/features/events/components/timeline-card';
import { formatTime } from '@/lib/dates';
import type { SportEvent } from '@/types';

export interface TimelineSlot {
  key: string;
  label: string;
  events: SportEvent[];
  /** "Simdi" dilimi: kirmizi nokta ve etiket. */
  now?: boolean;
}

const RAIL = 18;
const LINE_X = 3;
const DOT = 8;
const LABEL_HEIGHT = 14;

/**
 * Gunun etkinliklerini saat dilimlerine boler. Baslamis olanlar (canli
 * eslesen ya da devam eden cok gunluk etkinlik) tek bir "Simdi" diliminde,
 * kalanlar baslangic saatine gore sirali dilimlerde.
 */
export function timelineSlots(
  events: SportEvent[],
  now: Date,
  nowLabel: string,
  labelFor: (event: SportEvent) => string = (event) => formatTime(event.startsAt),
): TimelineSlot[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const started = sorted.filter((e) => new Date(e.startsAt).getTime() <= now.getTime());
  const upcoming = sorted.filter((e) => new Date(e.startsAt).getTime() > now.getTime());
  const slots: TimelineSlot[] = [];
  if (started.length) {
    slots.push({ key: 'now', label: `${nowLabel} · ${formatTime(now.toISOString())}`, events: started, now: true });
  }
  for (const event of upcoming) {
    const label = labelFor(event);
    const last = slots[slots.length - 1];
    if (last && !last.now && last.label === label) last.events.push(event);
    else slots.push({ key: `${label}-${event.startsAt}`, label, events: [event] });
  }
  return slots;
}

/** Solda dikey cizgi ve saat etiketiyle ortalanmis nokta; dilimlerde kutusuz satirlar. */
export function Timeline({
  slots,
  liveFor,
  dayLabelFor,
}: {
  slots: TimelineSlot[];
  liveFor: (event: SportEvent) => TimelineLive | undefined;
  dayLabelFor?: (event: SportEvent) => string | undefined;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ paddingLeft: RAIL, marginTop: 6 }}>
      <View
        pointerEvents="none"
        className="bg-line"
        style={{ position: 'absolute', left: LINE_X, top: 6, bottom: 6, width: 2, borderRadius: 1 }}
      />
      {slots.map((slot) => (
        <View key={slot.key} style={{ paddingBottom: 8 }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -RAIL + LINE_X + 1 - DOT / 2,
              top: (LABEL_HEIGHT - DOT) / 2,
              width: DOT,
              height: DOT,
              borderRadius: DOT / 2,
              backgroundColor: slot.now ? colors.live : colors.background,
              borderWidth: 2,
              borderColor: slot.now ? colors.live : colors.inkTertiary,
            }}
          />
          <Text
            className={`text-[11px] font-bold ${slot.now ? 'text-live' : 'text-ink-secondary'}`}
            style={{ lineHeight: LABEL_HEIGHT, marginBottom: 1, fontVariant: ['tabular-nums'] }}
          >
            {slot.label}
          </Text>
          {slot.events.map((event, i) => (
            <TimelineCard key={event.id} event={event} live={liveFor(event)} dayLabel={dayLabelFor?.(event)} first={i === 0} />
          ))}
        </View>
      ))}
    </View>
  );
}
