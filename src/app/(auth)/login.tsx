import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import {
  AuthBackdrop,
  AuthEntrance,
} from "@/features/auth/components/auth-backdrop";
import { showAlert } from "@/lib/alert";
import { useI18n } from "@/lib/i18n";
import { hasSeenOnboarding } from "@/features/auth/onboarding";
import { makeLoginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { signIn } from "@/services/auth";

export default function LoginScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();
  const router = useRouter();
  const loginSchema = useMemo(() => makeLoginSchema(t), [t]);

  useEffect(() => {
    void hasSeenOnboarding().then((seen) => {
      if (!seen) router.replace("/onboarding");
    });
  }, [router]);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      // On success the auth listener updates the store and
      // the root layout automatically switches to the app screens.
      await signIn(values.email, values.password);
    } catch (error) {
      showAlert(
        t("auth.loginFailed"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <AuthBackdrop />
      <View className="pt-20">
        <AuthEntrance>
          <View className="mb-8 items-center">
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 88,
                height: 88,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="notifications" size={44} color="#FFFFFF" />
            </LinearGradient>
            <Text className="mb-1 text-4xl font-bold text-ink">SportPulse</Text>
            <Text className="text-base text-ink-secondary">
              {t("auth.tagline")}
            </Text>
          </View>
        </AuthEntrance>

        <AuthEntrance delay={120}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t("auth.email")}
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
                label={t("auth.password")}
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                secureTextEntry
                placeholder="••••••••"
              />
            )}
          />

          <View className="mt-4">
            <Button
              title={t("auth.logIn")}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
            />
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-ink-secondary">{t("auth.noAccount")}</Text>
            <Link href="/sign-up" className="font-semibold text-primary">
              {t("auth.signUp")}
            </Link>
          </View>
        </AuthEntrance>
      </View>
    </Screen>
  );
}
