import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

/** Temporary content for screens whose real features arrive in later sprints. */
export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View className="pt-4">
        <Text className="mb-6 text-3xl font-bold text-ink">{title}</Text>
        <Card>
          <Text className="text-base leading-6 text-ink-secondary">{description}</Text>
        </Card>
      </View>
    </Screen>
  );
}
