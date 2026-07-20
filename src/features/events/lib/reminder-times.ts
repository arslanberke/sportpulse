import type { ReminderPrefs } from '@/types';

/**
 * Computes when reminders should fire for an event, applying the user's
 * offsets and quiet hours. A reminder that would fire inside the quiet
 * window is moved to the end of the window (never skipped), and reminders
 * in the past are dropped.
 */
export function reminderTimes(startsAt: Date, prefs: ReminderPrefs, now = new Date()): Date[] {
  const times: Date[] = [];
  for (const offset of prefs.offsetsMinutes) {
    let trigger = new Date(startsAt.getTime() - offset * 60_000);
    trigger = shiftOutOfQuietHours(trigger, prefs);
    if (trigger.getTime() > now.getTime()) times.push(trigger);
  }
  return times.sort((a, b) => a.getTime() - b.getTime());
}

function parseHm(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** If `date` (local time) falls inside quiet hours, return the window end instead. */
export function shiftOutOfQuietHours(date: Date, prefs: ReminderPrefs): Date {
  if (!prefs.quietStart || !prefs.quietEnd) return date;
  const start = parseHm(prefs.quietStart);
  const end = parseHm(prefs.quietEnd);
  if (start === end) return date;

  const minutes = date.getHours() * 60 + date.getMinutes();
  const wrapsMidnight = start > end; // e.g. 23:00 -> 07:00
  const inQuiet = wrapsMidnight ? minutes >= start || minutes < end : minutes >= start && minutes < end;
  if (!inQuiet) return date;

  const shifted = new Date(date);
  shifted.setHours(Math.floor(end / 60), end % 60, 0, 0);
  // For a wrapping window hit before midnight, the window ends the next day.
  if (wrapsMidnight && minutes >= start) shifted.setDate(shifted.getDate() + 1);
  return shifted;
}
