import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { showAlert } from '@/lib/alert';
import { useI18n } from '@/lib/i18n';
import { makeSignUpSchema, type SignUpFormValues } from '@/features/auth/schemas';
import { signUp } from '@/services/auth';

export default function SignUpScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();
  const signUpSchema = useMemo(() => makeSignUpSchema(t), [t]);

  const { control, handleSubmit } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setIsSubmitting(true);
    try {
      await signUp(values);
      showAlert(t('auth.checkInbox'), t('auth.checkInboxBody'));
    } catch (error) {
      showAlert(t('auth.signUpFailed'), error instanceof Error ? error.message : t('common.tryAgain'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View className="pt-16">
        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-md">
            <Ionicons name="notifications" size={40} color="#FFFFFF" />
          </View>
          <Text className="mb-1 text-4xl font-bold text-ink">{t('auth.createAccount')}</Text>
          <Text className="text-base text-ink-secondary">{t('auth.joinTagline')}</Text>
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value }, fieldState }) => (
            <TextField
              label={t('auth.fullName')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
              placeholder="Jane Doe"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value }, fieldState }) => (
            <TextField
              label={t('auth.email')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value }, fieldState }) => (
            <TextField
              label={t('auth.password')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
              secureTextEntry
              placeholder={t('auth.passwordPlaceholder')}
            />
          )}
        />

        <View className="mt-4">
          <Button title={t('auth.signUp')} onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-ink-secondary">{t('auth.alreadyHaveAccount')}</Text>
          <Link href="/login" className="font-semibold text-primary">
            {t('auth.logIn')}
          </Link>
        </View>
      </View>
    </Screen>
  );
}
