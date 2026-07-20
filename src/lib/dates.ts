import { localeFor, useLanguageStore } from '@/lib/i18n';

/** Small date helpers so we don't need a date library yet. */

/** Formatting locale that follows the app language. */
function locale(): string {
  return localeFor(useLanguageStore.getState().language);
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** First day 00:00 of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

export function formatWeekdayNarrow(date: Date): string {
  return date.toLocaleDateString(locale(), { weekday: 'narrow' });
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString(locale(), { weekday: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(locale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "13 Jul 14:00" / "13 Tem 14:00" — day, short month, time. */
export function formatDayTime(iso: string): string {
  return new Date(iso).toLocaleString(locale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "13 Jul" / "13 Tem" — day and short month. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), {
    day: 'numeric',
    month: 'short',
  });
}
