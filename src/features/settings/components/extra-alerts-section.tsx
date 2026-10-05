import { SettingRow, SettingSwitch } from '@/features/settings/components/setting-rows';
import { useDigestPrefs } from '@/features/notifications/digest-prefs';
import { useI18n } from '@/lib/i18n';

/** Toggles for the locally scheduled full-time and weekly digest alerts. */
export function ExtraAlertsSection() {
  const { t } = useI18n();
  const resultAlerts = useDigestPrefs((s) => s.resultAlerts);
  const weeklyDigest = useDigestPrefs((s) => s.weeklyDigest);
  const setResultAlerts = useDigestPrefs((s) => s.setResultAlerts);
  const setWeeklyDigest = useDigestPrefs((s) => s.setWeeklyDigest);

  return (
    <>
      <SettingRow label={t('settings.resultAlerts')} body={t('settings.resultAlertsBody')}>
        <SettingSwitch label={t('settings.resultAlerts')} value={resultAlerts} onValueChange={setResultAlerts} />
      </SettingRow>
      <SettingRow label={t('settings.weeklyDigest')} body={t('settings.weeklyDigestBody')}>
        <SettingSwitch label={t('settings.weeklyDigest')} value={weeklyDigest} onValueChange={setWeeklyDigest} />
      </SettingRow>
    </>
  );
}
