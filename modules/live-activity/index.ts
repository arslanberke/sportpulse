import { requireOptionalNativeModule } from 'expo-modules-core';

interface LiveActivityModule {
  areActivitiesEnabled(): boolean;
  startEventActivity(
    title: string,
    leagueName: string | null,
    channels: string | null,
    startsAtIso: string,
  ): Promise<string>;
  endAllEventActivities(): Promise<void>;
}

// Null in Expo Go, on web and on Android — only available in iOS dev builds.
const nativeModule = requireOptionalNativeModule<LiveActivityModule>('LiveActivity');

export function areLiveActivitiesEnabled(): boolean {
  return nativeModule?.areActivitiesEnabled() ?? false;
}

export async function startEventActivity(params: {
  title: string;
  leagueName: string | null;
  channels: string | null;
  startsAtIso: string;
}): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.startEventActivity(
    params.title,
    params.leagueName,
    params.channels,
    params.startsAtIso,
  );
}

export async function endAllEventActivities(): Promise<void> {
  await nativeModule?.endAllEventActivities();
}
