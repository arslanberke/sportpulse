import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useThemeColors } from '@/constants/theme';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/use-profile';
import { showAlert } from '@/lib/alert';
import { useI18n, type Translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import type { FollowKind } from '@/types';

function makeProfileSchema(t: Translate) {
  return z.object({ fullName: z.string().trim().min(2, t('profile.nameMin')) });
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>;

function StatTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-surface-raised px-2 py-3">
      <View
        className="mb-1.5 h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}1F` }}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="text-xl font-bold text-ink">{value}</Text>
      <Text className="text-xs text-ink-secondary">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: profile } = useProfile();
  const { data: follows } = useFollows();
  const email = useAuthStore((s) => s.session?.user.email);
  const updateProfile = useUpdateProfile();
  const profileSchema = useMemo(() => makeProfileSchema(t), [t]);

  const counts = useMemo(() => {
    const base: Record<FollowKind, number> = { team: 0, league: 0, sport: 0 };
    for (const follow of follows ?? []) base[follow.kind] += 1;
    return base;
  }, [follows]);

  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '' },
  });

  useEffect(() => {
    if (profile) reset({ fullName: profile.fullName });
  }, [profile, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    if (!profile) return;
    updateProfile.mutate(
      { userId: profile.id, fullName: values.fullName },
      {
        onSuccess: () => showAlert(t('profile.saved'), t('profile.savedBody')),
        onError: (error) =>
          showAlert(t('common.couldNotSave'), error instanceof Error ? error.message : t('common.tryAgain')),
      },
    );
  };

  return (
    <Screen>
      <View className="pt-4">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-ink">{t('profile.title')}</Text>
          <Link href="/settings" className="text-base font-semibold text-primary">
            {t('common.settings')}
          </Link>
        </View>

        <Card className="mb-4" index={0}>
          <View className="flex-row items-center gap-4">
            <Avatar name={profile?.fullName ?? '?'} imageUrl={profile?.avatarUrl} size="lg" />
            <View className="flex-1">
              <Text className="text-xl font-bold text-ink" numberOfLines={1}>
                {profile?.fullName || '...'}
              </Text>
              {email && (
                <Text className="text-sm text-ink-secondary" numberOfLines={1}>
                  {email}
                </Text>
              )}
            </View>
          </View>
          <View className="mt-4 flex-row gap-2">
            <StatTile
              icon="shirt"
              value={counts.team}
              label={t('explore.teams')}
              tint={colors.primary}
            />
            <StatTile
              icon="trophy"
              value={counts.league}
              label={t('explore.leagues')}
              tint={colors.primary}
            />
            <StatTile
              icon="football"
              value={counts.sport}
              label={t('explore.sports')}
              tint={colors.primary}
            />
          </View>
        </Card>

        <Card className="mb-6" index={1}>
          <View className="mb-3 flex-row items-center gap-3">
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${colors.primary}1F` }}
            >
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
            <Text className="text-base font-semibold text-ink">{t('profile.edit')}</Text>
          </View>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t('profile.yourName')}
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            title={t('profile.save')}
            onPress={handleSubmit(onSubmit)}
            loading={updateProfile.isPending}
          />
        </Card>
      </View>
    </Screen>
  );
}
