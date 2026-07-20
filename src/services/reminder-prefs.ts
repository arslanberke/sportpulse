import { supabase } from '@/services/supabase';
import type { ReminderPrefs } from '@/types';

const DEFAULT_PREFS: ReminderPrefs = {
  offsetsMinutes: [60],
  quietStart: null,
  quietEnd: null,
};

interface PrefsRow {
  offsets_minutes: number[];
  quiet_start: string | null;
  quiet_end: string | null;
}

export async function fetchReminderPrefs(): Promise<ReminderPrefs> {
  const { data, error } = await supabase
    .from('user_reminder_prefs')
    .select('offsets_minutes, quiet_start, quiet_end')
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PREFS;
  const row = data as PrefsRow;
  return {
    offsetsMinutes: row.offsets_minutes,
    quietStart: row.quiet_start?.slice(0, 5) ?? null,
    quietEnd: row.quiet_end?.slice(0, 5) ?? null,
  };
}

export async function saveReminderPrefs(params: { userId: string; prefs: ReminderPrefs }) {
  const { error } = await supabase.from('user_reminder_prefs').upsert({
    user_id: params.userId,
    offsets_minutes: params.prefs.offsetsMinutes,
    quiet_start: params.prefs.quietStart,
    quiet_end: params.prefs.quietEnd,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
