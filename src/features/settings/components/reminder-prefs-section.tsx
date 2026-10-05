import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { OptionPill, SettingRow } from '@/features/settings/components/setting-rows';
import {
  useReminderPrefs,
  useSaveReminderPrefs,
} from '@/features/settings/hooks/use-reminder-prefs';
import { showAlert } from '@/lib/alert';
import { useI18n } from '@/lib/i18n';
import type { ReminderPrefs } from '@/types';

const OFFSET_OPTIONS = [
  { minutes: 15, key: 'settings.offset.15m' },
  { minutes: 60, key: 'settings.offset.1h' },
  { minutes: 180, key: 'settings.offset.3h' },
  { minutes: 1440, key: 'settings.offset.1d' },
] as const;

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Reminder offsets (multi-select) and quiet hours. Saved to Supabase. */
export function ReminderPrefsSection() {
  const { data: prefs } = useReminderPrefs();
  if (!prefs) return null;
  // Keyed so the quiet-hours inputs re-initialize when saved prefs change.
  return <LoadedSection key={`${prefs.quietStart}-${prefs.quietEnd}`} prefs={prefs} />;
}

function LoadedSection({ prefs }: { prefs: ReminderPrefs }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const savePrefs = useSaveReminderPrefs();

  const [quietStart, setQuietStart] = useState(prefs.quietStart ?? '');
  const [quietEnd, setQuietEnd] = useState(prefs.quietEnd ?? '');

  const toggleOffset = (minutes: number) => {
    const has = prefs.offsetsMinutes.includes(minutes);
    const offsets = has
      ? prefs.offsetsMinutes.filter((m) => m !== minutes)
      : [...prefs.offsetsMinutes, minutes].sort((a, b) => a - b);
    savePrefs.mutate({ ...prefs, offsetsMinutes: offsets });
  };

  const saveQuietHours = () => {
    const start = quietStart.trim();
    const end = quietEnd.trim();
    if ((start === '') !== (end === '')) {
      showAlert(t('settings.quietHours'), t('settings.timeFormat'));
      return;
    }
    if (start && (!TIME_RE.test(start) || !TIME_RE.test(end))) {
      showAlert(t('settings.quietHours'), t('settings.timeFormat'));
      return;
    }
    savePrefs.mutate(
      { ...prefs, quietStart: start || null, quietEnd: end || null },
      { onSuccess: () => showAlert(t('settings.saved'), '') },
    );
  };

  return (
    <>
      <SettingRow
        label={t('settings.reminderOffsets')}
        body={t('settings.reminderOffsetsBody')}
        below={
          <View className="flex-row flex-wrap gap-1.5">
            {OFFSET_OPTIONS.map((option) => (
              <OptionPill
                key={option.minutes}
                label={t(option.key)}
                active={prefs.offsetsMinutes.includes(option.minutes)}
                onPress={() => toggleOffset(option.minutes)}
              />
            ))}
          </View>
        }
      />

      <SettingRow
        label={t('settings.quietHours')}
        body={t('settings.quietHoursBody')}
        below={
          <View className="flex-row items-center gap-2">
            <TextInput
              accessibilityLabel={t('settings.quietFrom')}
              className="w-20 rounded-pill border border-line bg-surface px-3 py-1.5 text-center text-[13px] text-ink"
              placeholder="23:00"
              placeholderTextColor={colors.inkTertiary}
              value={quietStart}
              onChangeText={setQuietStart}
              autoCapitalize="none"
            />
            <Text className="text-ink-tertiary">–</Text>
            <TextInput
              accessibilityLabel={t('settings.quietUntil')}
              className="w-20 rounded-pill border border-line bg-surface px-3 py-1.5 text-center text-[13px] text-ink"
              placeholder="08:00"
              placeholderTextColor={colors.inkTertiary}
              value={quietEnd}
              onChangeText={setQuietEnd}
              autoCapitalize="none"
            />
            <View className="flex-1" />
            <Pressable onPress={saveQuietHours} className="rounded-pill bg-ink px-3.5 py-1.5 active:opacity-70">
              <Text className="text-xs font-semibold text-background">{t('common.save')}</Text>
            </Pressable>
          </View>
        }
      />
    </>
  );
}
