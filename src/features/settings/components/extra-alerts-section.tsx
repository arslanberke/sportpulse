import { Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useThemeColors } from '@/constants/theme';
import { useDigestPrefs } from '@/features/notifications/digest-prefs';
import { useI18n } from '@/lib/i18n';

function ToggleRow({
  label,
  body,
  value,
  onValueChange,
}: {
  label: string;
  body: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-4 py-2">
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{label}</Text>
        <Text className="mt-0.5 text-sm text-ink-secondary">{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.inkTertiary, true: colors.primary }}
      />
    </View>
  );
}

/** Toggles for the locally scheduled full-time and weekly digest alerts. */
export function ExtraAlertsSection() {
  const { t } = useI18n();
  const resultAlerts = useDigestPrefs((s) => s.resultAlerts);
  const weeklyDigest = useDigestPrefs((s) => s.weeklyDigest);
  const setResultAlerts = useDigestPrefs((s) => s.setResultAlerts);
  const setWeeklyDigest = useDigestPrefs((s) => s.setWeeklyDigest);

  return (
    <Card className="mb-6">
      <Text className="mb-2 text-lg font-semibold text-ink">{t('settings.extraAlerts')}</Text>
      <ToggleRow
        label={t('settings.resultAlerts')}
        body={t('settings.resultAlertsBody')}
        value={resultAlerts}
        onValueChange={setResultAlerts}
      />
      <ToggleRow
        label={t('settings.weeklyDigest')}
        body={t('settings.weeklyDigestBody')}
        value={weeklyDigest}
        onValueChange={setWeeklyDigest}
      />
    </Card>
  );
}
