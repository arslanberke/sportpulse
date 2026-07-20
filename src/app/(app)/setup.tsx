import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { FollowPicker } from '@/features/follows/components/follow-picker';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { CountryPicker } from '@/features/settings/components/country-picker';
import { showAlert } from '@/lib/alert';
import { useI18n } from '@/lib/i18n';

/** Post-signup setup: pick country + at least one thing to follow. */
export default function SetupScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: follows } = useFollows();

  const finish = () => {
    if ((follows ?? []).length === 0) {
      showAlert(t('setup.title'), t('setup.pickAtLeastOne'));
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <View className="pt-4">
        <Text className="mb-2 text-base leading-6 text-ink-secondary">{t('setup.subtitle')}</Text>

        <Card className="mb-4">
          <Text className="mb-1 text-lg font-semibold text-ink">{t('setup.countryTitle')}</Text>
          <Text className="mb-3 text-sm text-ink-secondary">{t('setup.countrySubtitle')}</Text>
          <CountryPicker />
        </Card>

        <FollowPicker />

        <Button title={t('setup.done')} onPress={finish} />
      </View>
    </Screen>
  );
}
