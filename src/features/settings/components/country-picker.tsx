import { Text, View } from 'react-native';

import { OptionPill } from '@/features/settings/components/setting-rows';

import { useProfile, useUpdateProfile } from '@/features/profile/hooks/use-profile';

/** Countries with broadcast channel mappings in the database. */
const COUNTRIES = [
  { code: 'TR', flag: '🇹🇷', name: 'Türkiye' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'NL', flag: '🇳🇱', name: 'Nederland' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'ES', flag: '🇪🇸', name: 'España' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
];

/** Country selector: decides which broadcast channels the user sees. */
export function CountryPicker() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {COUNTRIES.map((country) => (
        <OptionPill
          key={country.code}
          label={country.name}
          leading={<Text className="text-xs">{country.flag}</Text>}
          active={profile?.countryCode === country.code}
          onPress={() =>
            profile && updateProfile.mutate({ userId: profile.id, countryCode: country.code })
          }
        />
      ))}
    </View>
  );
}
