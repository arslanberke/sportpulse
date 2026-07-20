import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useThemeColors } from '@/constants/theme';
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
      <Card className="mb-6">
        <Text className="mb-1 text-lg font-semibold text-ink">
          {t('settings.reminderOffsets')}
        </Text>
        <Text className="mb-3 text-sm text-ink-secondary">
          {t('settings.reminderOffsetsBody')}
        </Text>
        <View className="flex-row flex-wrap">
          {OFFSET_OPTIONS.map((option) => {
            const active = prefs.offsetsMinutes.includes(option.minutes);
            return (
              <Pressable
                key={option.minutes}
                onPress={() => toggleOffset(option.minutes)}
                className={`mb-2 mr-2 rounded-full px-4 py-2.5 ${
                  active ? 'bg-primary' : 'bg-background'
                }`}
              >
                <Text className={`font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}>
                  {t(option.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card className="mb-6">
        <Text className="mb-1 text-lg font-semibold text-ink">{t('settings.quietHours')}</Text>
        <Text className="mb-3 text-sm text-ink-secondary">{t('settings.quietHoursBody')}</Text>
        <View className="mb-3 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-semibold text-ink-secondary">
              {t('settings.quietFrom')}
            </Text>
            <TextInput
              className="rounded-button bg-background px-4 py-3 text-ink"
              placeholder="23:00"
              placeholderTextColor={colors.inkTertiary}
              value={quietStart}
              onChangeText={setQuietStart}
              autoCapitalize="none"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-semibold text-ink-secondary">
              {t('settings.quietUntil')}
            </Text>
            <TextInput
              className="rounded-button bg-background px-4 py-3 text-ink"
              placeholder="08:00"
              placeholderTextColor={colors.inkTertiary}
              value={quietEnd}
              onChangeText={setQuietEnd}
              autoCapitalize="none"
            />
          </View>
        </View>
        <Pressable onPress={saveQuietHours} className="items-center rounded-button bg-primary py-3">
          <Text className="font-semibold text-white">{t('common.save')}</Text>
        </Pressable>
      </Card>
    </>
  );
}
