import { ExtensionStorage } from '@bacons/apple-targets/build/ExtensionStorage';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useUpcomingEvents } from '@/features/events/hooks/use-events';

const APP_GROUP = 'group.com.sportpulse.app';

/**
 * Mirrors the next upcoming event into the App Group so the iOS home-screen
 * widget (targets/widget) can render its countdown. ExtensionStorage no-ops
 * where the native module is absent (Expo Go, web, Android).
 */
export function useNextEventWidget() {
  const { events } = useUpcomingEvents(14);
  const next = events.find((event) => event.status === 'scheduled');
  const payload = useMemo(
    () =>
      next
        ? JSON.stringify({
            title: next.title,
            leagueName: next.leagueName ?? null,
            channels: (next.channels ?? []).map((c) => c.name).join(', ') || null,
            startsAt: next.startsAt,
          })
        : null,
    [next],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const storage = new ExtensionStorage(APP_GROUP);
    if (payload) storage.set('nextEvent', payload);
    else storage.remove('nextEvent');
    ExtensionStorage.reloadWidget();
  }, [payload]);
}
