import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useUpcomingEvents } from '@/features/events/hooks/use-events';
import { reminderTimes } from '@/features/events/lib/reminder-times';
import { useReminderPrefs } from '@/features/settings/hooks/use-reminder-prefs';
import { formatDateTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

const REMINDER_ID_PREFIX = 'event-reminder-';

/**
 * Schedules local notifications before each upcoming followed event, one per
 * reminder offset the user picked (1h / 1 day / custom), respecting quiet
 * hours. Re-schedules whenever the fixture list changes — Supabase Realtime
 * updates the events query on postponements/time changes, so reminders
 * follow automatically. No-op on web.
 */
export function useEventReminders() {
  const { t } = useI18n();
  const { events } = useUpcomingEvents(14);
  const { data: prefs } = useReminderPrefs();

  const scheduled = events.filter((e) => e.status === 'scheduled');
  const eventsKey = scheduled.map((e) => e.id + e.startsAt).join(',');
  const prefsKey = prefs
    ? `${prefs.offsetsMinutes.join('/')}-${prefs.quietStart}-${prefs.quietEnd}`
    : '';

  useEffect(() => {
    if (Platform.OS === 'web' || !prefs) return;
    let cancelled = false;

    (async () => {
      // Clear our own reminders only, then re-schedule from scratch.
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existing) {
        if (notification.identifier.startsWith(REMINDER_ID_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      if (cancelled) return;

      for (const event of scheduled) {
        const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');
        const triggers = reminderTimes(new Date(event.startsAt), prefs);
        for (const trigger of triggers) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: event.title,
              body: channelNames
                ? t('reminders.bodyWithChannel', {
                    time: formatDateTime(event.startsAt),
                    channel: channelNames,
                  })
                : t('reminders.body', { time: formatDateTime(event.startsAt) }),
              data: { eventId: event.id, type: 'event_reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: trigger,
            },
            identifier: `${REMINDER_ID_PREFIX}${event.id}-${trigger.getTime()}`,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey, prefsKey, t]);
}
