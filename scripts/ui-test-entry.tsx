import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { BrandLaunch } from '../src/components/ui/brand-launch';
import { LoadingCard } from '../src/components/ui/states';
import '../src/global.css';

import type { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerRootComponent } from 'expo';
import { ExpoRoot, Stack } from 'expo-router';

import HomeScreen from '../src/app/(app)/(tabs)/index';
import EventScreen from '../src/app/(app)/event/[id]';
import PlayerScreen from '../src/app/(app)/player/[playerId]';
import { NowProvider } from '../src/lib/now';
import { queryClient } from '../src/lib/query-client';
import { useAuthStore } from '../src/store/auth-store';

if (process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://sportpulse-test.invalid') {
  throw new Error('UI tests require an isolated test backend');
}
useAuthStore.getState().setSession({ user: { id: '00000000-0000-0000-0000-000000000001' } } as Session);
useAuthStore.getState().setLoading(false);

function TestLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

function BrandTestScreen() {
  const [done, setDone] = useState(false);
  const complete = useCallback(() => setDone(true), []);
  return <View style={{ flex: 1, backgroundColor: '#0B2230', padding: 24 }}>
    <View style={{ height: 430 }}><BrandLaunch onComplete={complete} /></View>
    <Text testID="brand-phase" style={{ color: '#A1EDCE' }}>{done ? 'ready' : 'opening'}</Text>
    <LoadingCard />
  </View>;
}

const routes: Record<string, { default: typeof HomeScreen }> = {
  './brand.tsx': { default: BrandTestScreen },
  './_layout.tsx': { default: TestLayout },
  './index.tsx': { default: HomeScreen },
  './player/[playerId].tsx': { default: PlayerScreen },
  './event/[id].tsx': { default: EventScreen },
};
const context = Object.assign((key: string) => routes[key], {
  keys: () => Object.keys(routes), resolve: (key: string) => key, id: 'ui-test',
});

function TestApp() {
  return <QueryClientProvider client={queryClient}><NowProvider><ExpoRoot context={context} /></NowProvider></QueryClientProvider>;
}

registerRootComponent(TestApp);
