import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ensureNotificationPermission } from '@/features/notifications/local-notifications';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth-store';

const EVENTS_REFRESH_DELAY_MS = 2_000;

interface NotificationRow {
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * Subscribes to Supabase Realtime while the user is signed in, so the app
 * updates instantly without pull-to-refresh:
 * - a new row in `notifications` for this user refreshes the notification feed
 *   and fires a local push notification (banner + sound)
 * - any change in `events` (postponement, new kick-off time from the sync
 *   job) refreshes the fixture queries, which in turn reschedules local
 *   reminders via useEventReminders
 * Mount once, inside the signed-in layout.
 */
export function useRealtimeUpdates() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let eventsTimer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`live-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          if (payload.eventType === 'INSERT') {
            const row = payload.new as unknown as NotificationRow;
            if (row?.title && Platform.OS !== 'web') {
              void ensureNotificationPermission()
                .then((granted) => {
                  if (!granted) return;
                  return Notifications.scheduleNotificationAsync({
                    content: {
                      title: row.title,
                      body: row.body,
                      data: row.data,
                    },
                    trigger: null,
                  });
                })
                .catch(() => {
                  // Surfacing the update in-app is enough if the OS refuses.
                });
            }
          }
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        // A sync run writes many rows at once; refetch once per burst.
        if (eventsTimer) return;
        eventsTimer = setTimeout(() => {
          eventsTimer = undefined;
          void queryClient.invalidateQueries({ queryKey: ['events'] });
          void queryClient.invalidateQueries({ queryKey: ['event'] });
        }, EVENTS_REFRESH_DELAY_MS);
      })
      .subscribe();

    return () => {
      if (eventsTimer) clearTimeout(eventsTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
