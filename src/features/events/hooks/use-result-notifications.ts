import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { eventEndsAt } from '@/features/events/lib/event-duration';
import { shiftOutOfQuietHours } from '@/features/events/lib/reminder-times';
import { useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useDigestPrefs } from '@/features/notifications/digest-prefs';
import { ensureNotificationPermission } from '@/features/notifications/local-notifications';
import { useReminderPrefs } from '@/features/settings/hooks/use-reminder-prefs';
import { useI18n } from '@/lib/i18n';

const RESULT_ID_PREFIX = 'event-result-';

/**
 * Schedules a "the match is over — see the result" nudge shortly after each
 * followed event is expected to finish. The score itself is not known when
 * the notification is scheduled, so the alert links back into the event
 * screen where the result is fetched live.
 *
 * Quiet hours are honoured the same way pre-match reminders honour them.
 * No-op on web.
 */
export function useResultNotifications() {
  const { t } = useI18n();
  const { events } = useUpcomingEvents(14);
  const { data: prefs } = useReminderPrefs();
  const enabled = useDigestPrefs((s) => s.resultAlerts);

  const scheduled = events.filter((e) => e.status === 'scheduled');
  const eventsKey = scheduled.map((e) => e.id + e.startsAt).join(',');
  const quietKey = prefs ? `${prefs.quietStart}-${prefs.quietEnd}` : '';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;

    (async () => {
      if (!(await ensureNotificationPermission())) return;

      // Clear our own alerts only, then re-schedule from scratch.
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existing) {
        if (notification.identifier.startsWith(RESULT_ID_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      if (cancelled || !enabled) return;

      const now = Date.now();
      for (const event of scheduled) {
        let trigger = eventEndsAt(event.startsAt, event.sportId);
        if (prefs) trigger = shiftOutOfQuietHours(trigger, prefs);
        if (trigger.getTime() <= now) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: event.title,
            body: t('results.body'),
            data: { eventId: event.id, type: 'event_result' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
          identifier: `${RESULT_ID_PREFIX}${event.id}`,
        });
      }
    })().catch(() => {
      // A denied permission must not crash the screen.
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey, quietKey, enabled, t]);
}
