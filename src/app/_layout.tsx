import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuthListener } from '@/features/auth/hooks/use-auth-listener';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth-store';

export default function RootLayout() {
  useAuthListener();

  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const isLoggedIn = session !== null;

  // Wait for the persisted session before deciding which screens to show,
  // so a logged-in user never flashes the login screen on app start.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Protected routes: expo-router only renders the group that matches. */}
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
