import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { ONBOARDING_SEEN_KEY } from '@/features/auth/onboarding';
import { useI18n } from '@/lib/i18n';

const slides = [
  { icon: 'calendar-outline', title: 'onboarding.slide1Title', body: 'onboarding.slide1Body' },
  { icon: 'notifications-outline', title: 'onboarding.slide2Title', body: 'onboarding.slide2Body' },
  { icon: 'trending-up-outline', title: 'onboarding.slide3Title', body: 'onboarding.slide3Body' },
] as const;

/** First-launch intro: three swipe-free slides ending on the login screen. */
export default function OnboardingScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);

  const finish = () => {
    void AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    router.replace('/login');
  };

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <Screen scrollable={false}>
      <View className="flex-1 justify-between pb-10 pt-16">
        <Pressable onPress={finish} className="items-end">
          <Text className="text-base font-semibold text-ink-secondary">
            {t('onboarding.skip')}
          </Text>
        </Pressable>

        <View className="items-center">
          <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name={slide.icon} size={56} color={colors.primary} />
          </View>
          <Text className="mb-3 text-center text-3xl font-bold text-ink">
            {t(slide.title)}
          </Text>
          <Text className="px-4 text-center text-base leading-7 text-ink-secondary">
            {t(slide.body)}
          </Text>
        </View>

        <View>
          <View className="mb-6 flex-row justify-center gap-2">
            {slides.map((_, i) => (
              <View
                key={i}
                className={`h-2 rounded-full ${i === index ? 'w-6 bg-primary' : 'w-2 bg-ink-tertiary'}`}
              />
            ))}
          </View>
          <Button
            title={isLast ? t('onboarding.getStarted') : t('onboarding.next')}
            onPress={() => (isLast ? finish() : setIndex(index + 1))}
          />
        </View>
      </View>
    </Screen>
  );
}
