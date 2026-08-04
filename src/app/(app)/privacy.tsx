import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { privacyNoticeFor } from '@/features/legal/privacy-notice';
import { useI18n } from '@/lib/i18n';

/** KVKK aydinlatma metni; Ayarlar > Yasal icinden acilir. */
export default function PrivacyScreen() {
  const { language } = useI18n();
  const notice = privacyNoticeFor(language);

  return (
    <Screen>
      <View className="pt-4">
        <Card className="mb-4" index={0}>
          <Text className="text-sm leading-5 text-ink-secondary">{notice.intro}</Text>
          <Text className="mt-3 text-xs text-ink-tertiary">{notice.updated}</Text>
        </Card>

        {notice.sections.map((section, i) => (
          <Card key={section.heading} className="mb-4" index={i}>
            <Text className="mb-2 text-base font-semibold text-ink">{section.heading}</Text>
            <Text className="text-sm leading-5 text-ink-secondary">{section.body}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
