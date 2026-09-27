import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { needsFixtureWarning, type FixtureHealth } from '@/features/events/lib/fixture-health';
import { formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

export function FixtureHealthNotice({ records, error, now }: {
  records: FixtureHealth[] | undefined;
  error: boolean;
  now: Date;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const affected = (records ?? []).filter((row) => needsFixtureWarning(row, now));
  if (!error && affected.length === 0) return null;
  return (
    <View className="mb-4 rounded-xl border border-line bg-surface-raised px-3 py-2.5">
      <Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button"
        accessibilityState={{ expanded }} hitSlop={12} className="min-h-6 flex-row items-center gap-2">
        <Ionicons name="information-circle-outline" size={16} color={colors.inkTertiary} />
        <Text className="flex-1 text-xs font-medium text-ink-secondary">{t('home.fixtureWarning')}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.inkTertiary} />
      </Pressable>
      {(expanded || error) && <Text className="mt-2 text-xs leading-5 text-ink-secondary">
        {t(error ? 'home.fixtureHealthUnavailable' : 'home.fixtureWarningBody')}
      </Text>}
      {expanded && affected.map((row) => (
        <View key={row.leagueId} className="mt-3 border-t border-line pt-2">
          <Text className="text-sm font-medium text-ink">{row.leagueName}</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-secondary">
            {row.lastSuccessAt
              ? t('home.fixtureLastSuccess', { time: formatDayTime(row.lastSuccessAt) })
              : t('home.fixtureNotVerified')}
          </Text>
        </View>
      ))}
    </View>
  );
}
