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
import { useFollows } from '@/features/follows/hooks/use-follows';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/use-profile';
import { showAlert } from '@/lib/alert';
import { useI18n, type Translate } from '@/lib/i18n';

function makeProfileSchema(t: Translate) {
  return z.object({ fullName: z.string().trim().min(2, t('profile.nameMin')) });
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>;

export default function ProfileScreen() {
  const { t } = useI18n();
  const { data: profile } = useProfile();
  const { data: follows } = useFollows();
  const updateProfile = useUpdateProfile();
  const profileSchema = useMemo(() => makeProfileSchema(t), [t]);

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

        <Card className="mb-6">
          <View className="flex-row items-center gap-3">
            <Avatar name={profile?.fullName ?? '?'} imageUrl={profile?.avatarUrl} />
            <View>
              <Text className="text-lg font-semibold text-ink">{profile?.fullName || '...'}</Text>
              <Text className="text-sm text-ink-secondary">
                {t('profile.followingCount')}: {(follows ?? []).length}
              </Text>
            </View>
          </View>
        </Card>

        <Card className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-ink">{t('profile.edit')}</Text>
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
