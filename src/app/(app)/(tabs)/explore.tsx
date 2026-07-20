import { Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { FollowPicker } from '@/features/follows/components/follow-picker';
import { useI18n } from '@/lib/i18n';

/** Manage follows: sports, leagues and teams. */
export default function ExploreScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <View className="pt-4">
        <Text className="mb-6 text-3xl font-bold text-ink">{t('explore.title')}</Text>
        <FollowPicker />
      </View>
    </Screen>
  );
}
