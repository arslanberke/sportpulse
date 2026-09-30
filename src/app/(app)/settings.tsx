import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { CountryPicker } from '@/features/settings/components/country-picker';
import { ExtraAlertsSection } from '@/features/settings/components/extra-alerts-section';
import { ReminderPrefsSection } from '@/features/settings/components/reminder-prefs-section';
import { confirmAsync, showAlert } from '@/lib/alert';
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
function LanguageSection() {
  const { t, language } = useI18n();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <Card className="mb-6">
      <Text className="mb-3 text-lg font-semibold text-ink">{t('settings.language')}</Text>
      <View className="flex-row gap-3">
        {languages.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setLanguage(option.value)}
            className={`h-12 flex-1 items-center justify-center rounded-button ${
              language === option.value ? 'bg-primary' : 'bg-background'
            }`}
          >
            <Text
              className={`font-semibold ${
                language === option.value ? 'text-on-primary' : 'text-ink-secondary'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

/** Switch the app theme; the choice is saved on the device. */
function ThemeSection() {
  const { t } = useI18n();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Card className="mb-6">
      <Text className="mb-3 text-lg font-semibold text-ink">{t('settings.theme')}</Text>
      <View className="flex-row gap-3">
        {themes.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            className={`h-12 flex-1 items-center justify-center rounded-button ${
              preference === option.value ? 'bg-primary' : 'bg-background'
            }`}
          >
            <Text
              className={`font-semibold ${
                preference === option.value ? 'text-on-primary' : 'text-ink-secondary'
              }`}
            >
              {t(option.key)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useI18n();

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
      <View className="pt-4">
        <ReminderPrefsSection />

        <ExtraAlertsSection />

        <Card className="mb-6">
          <Text className="mb-1 text-lg font-semibold text-ink">{t('settings.country')}</Text>
          <Text className="mb-3 text-sm text-ink-secondary">{t('settings.countryBody')}</Text>
          <CountryPicker />
        </Card>

        <LanguageSection />
        <ThemeSection />

        <Card className="mb-6">
          <Text className="mb-2 text-lg font-semibold text-ink">{t('settings.legal')}</Text>
          <Text className="text-sm leading-5 text-ink-secondary">
            {t('settings.legalMarks')}
          </Text>
          <Text className="mt-3 text-sm leading-5 text-ink-tertiary">
            {t('settings.legalSources')}
          </Text>
          <Link href="/privacy" className="mt-3 text-sm font-semibold text-primary">
            {t('settings.privacy')}
          </Link>
        </Card>

        <Button
          title={t('settings.logOut')}
          onPress={handleSignOut}
          variant="danger"
          loading={isSigningOut}
        />

        <Card className="mb-6 mt-6">
          <Text className="mb-1 text-lg font-semibold text-ink">
            {t('settings.deleteAccount')}
          </Text>
          <Text className="mb-3 text-sm leading-5 text-ink-secondary">
            {t('settings.deleteAccountBody')}
          </Text>
          <Button
            title={t('settings.deleteAccount')}
            onPress={handleDeleteAccount}
            variant="danger"
            loading={isDeleting}
          />
        </Card>
      </View>
    </Screen>
  );
}
