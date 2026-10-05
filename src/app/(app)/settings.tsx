import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { CountryPicker } from '@/features/settings/components/country-picker';
import { ExtraAlertsSection } from '@/features/settings/components/extra-alerts-section';
import { ReminderPrefsSection } from '@/features/settings/components/reminder-prefs-section';
import {
  OptionPill,
  SettingRow,
  SettingsGroup,
} from '@/features/settings/components/setting-rows';
import { useThemeColors } from '@/constants/theme';
import { confirmAsync, showAlert } from '@/lib/alert';
import { formatDateTime } from '@/lib/dates';
import { useI18n, useLanguageStore, type Language } from '@/lib/i18n';
import { useThemeStore, type ThemePreference } from '@/lib/theme';
import { deleteAccount, signOut } from '@/services/auth';

const languages: { value: Language; label: string }[] = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

const themes: { value: ThemePreference; key: 'settings.themeSystem' | 'settings.themeLight' | 'settings.themeDark' }[] = [
  { value: 'system', key: 'settings.themeSystem' },
  { value: 'light', key: 'settings.themeLight' },
  { value: 'dark', key: 'settings.themeDark' },
];

/** Switch the app language; the choice is saved on the device. */
function LanguageRow() {
  const { t, language } = useI18n();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <SettingRow label={t('settings.language')}>
      <View className="flex-row gap-1.5">
        {languages.map((option) => (
          <OptionPill
            key={option.value}
            label={option.label}
            active={language === option.value}
            onPress={() => setLanguage(option.value)}
          />
        ))}
      </View>
    </SettingRow>
  );
}

/** Switch the app theme; the choice is saved on the device. */
function ThemeRow() {
  const { t } = useI18n();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <SettingRow label={t('settings.theme')}>
      <View className="flex-row gap-1.5">
        {themes.map((option) => (
          <OptionPill
            key={option.value}
            label={t(option.key)}
            active={preference === option.value}
            onPress={() => setPreference(option.value)}
          />
        ))}
      </View>
    </SettingRow>
  );
}

/** App version plus, when running an OTA update, its publish date and id. */
function BuildInfo() {
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? '';
  const update =
    !Updates.isEmbeddedLaunch && Updates.createdAt && Updates.updateId
      ? `${t('settings.update')} ${formatDateTime(Updates.createdAt.toISOString())} · ${Updates.updateId.slice(0, 8)}`
      : t('settings.embeddedBuild');

  return (
    <Text className="mb-6 mt-5 text-center text-[11px] text-ink-tertiary">
      SportPulse {version} · {update}
    </Text>
  );
}

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useI18n();
  const colors = useThemeColors();

  // Hesap silme uygulama icinden sunulmak zorunda (App Store 5.1.1(v), ayrica
  // KVKK m.11 silme hakki). Geri alinamadigi icin once onay istenir.
  const handleDeleteAccount = async () => {
    const confirmed = await confirmAsync(
      t('settings.deleteAccountConfirm'),
      t('settings.deleteAccountConfirmBody'),
      {
        confirmLabel: t('settings.deleteAccount'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      },
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (error) {
      showAlert(
        t('settings.deleteAccountFailed'),
        error instanceof Error ? error.message : t('common.tryAgain'),
      );
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // The auth listener clears the session and the root layout
      // automatically navigates back to the login screen.
      await signOut();
    } catch (error) {
      showAlert(
        t('settings.signOutFailed'),
        error instanceof Error ? error.message : t('common.tryAgain'),
      );
      setIsSigningOut(false);
    }
  };

  return (
    <Screen>
      <View className="pt-1">
        <SettingsGroup label={t('settings.groupNotifications')}>
          <ReminderPrefsSection />
          <ExtraAlertsSection />
        </SettingsGroup>

        <SettingsGroup label={t('settings.groupApp')}>
          <SettingRow label={t('settings.country')} body={t('settings.countryBody')} below={<CountryPicker />} />
          <LanguageRow />
          <ThemeRow />
        </SettingsGroup>

        <SettingsGroup label={t('settings.legal')}>
          <View className="border-b border-line py-2.5">
            <Text className="text-xs leading-5 text-ink-secondary">{t('settings.legalMarks')}</Text>
            <Text className="mt-2 text-xs leading-5 text-ink-tertiary">{t('settings.legalSources')}</Text>
          </View>
          <SettingRow label={t('settings.privacy')} onPress={() => router.push('/privacy')}>
              <Ionicons name="chevron-forward" size={16} color={colors.inkTertiary} />
            </SettingRow>
        </SettingsGroup>

        <SettingsGroup label={t('settings.groupAccount')}>
          <SettingRow label={t('settings.logOut')} danger onPress={isSigningOut ? undefined : handleSignOut}>
            {isSigningOut && <ActivityIndicator size="small" color={colors.danger} />}
          </SettingRow>
          <SettingRow
            label={t('settings.deleteAccount')}
            body={t('settings.deleteAccountBody')}
            danger
            onPress={isDeleting ? undefined : handleDeleteAccount}
          >
            {isDeleting && <ActivityIndicator size="small" color={colors.danger} />}
          </SettingRow>
        </SettingsGroup>

        <BuildInfo />
      </View>
    </Screen>
  );
}
