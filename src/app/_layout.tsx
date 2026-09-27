import { BrandLaunch } from '@/components/ui/brand-launch';
import '@/global.css';
import { useCallback, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { useAuthDeepLink } from '@/features/auth/hooks/use-auth-deep-link';
import { useAuthListener } from '@/features/auth/hooks/use-auth-listener';
import { NowProvider } from '@/lib/now';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth-store';

export default function RootLayout() {
  useAuthListener();
  useAuthDeepLink();

  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const isLoggedIn = session !== null;
  const [introComplete, setIntroComplete] = useState(false);
  const finishIntro = useCallback(() => setIntroComplete(true), []);

  // Wait for the persisted session before deciding which screens to show,
  // so a logged-in user never flashes the login screen on app start.
  if (isLoading || !introComplete) {
    return <BrandLaunch onComplete={finishIntro} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NowProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Protected routes: expo-router only renders the group that matches. */}
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </NowProvider>
    </QueryClientProvider>
  );
}
