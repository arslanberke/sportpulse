import { Pressable, Text, View } from 'react-native';

import { useProfile, useUpdateProfile } from '@/features/profile/hooks/use-profile';

/** Countries with broadcast data (only TR is fully mapped for now). */
const COUNTRIES = [
  { code: 'TR', flag: '🇹🇷', name: 'Türkiye' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'NL', flag: '🇳🇱', name: 'Nederland' },
];

/** Country selector: decides which broadcast channels the user sees. */
export function CountryPicker() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  return (
    <View className="flex-row flex-wrap">
      {COUNTRIES.map((country) => {
        const active = profile?.countryCode === country.code;
        return (
          <Pressable
            key={country.code}
            onPress={() =>
              profile && updateProfile.mutate({ userId: profile.id, countryCode: country.code })
            }
            className={`mb-2 mr-2 flex-row items-center gap-1.5 rounded-full px-4 py-2.5 ${
              active ? 'bg-primary' : 'bg-background'
            }`}
          >
            <Text>{country.flag}</Text>
            <Text className={`font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}>
              {country.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
