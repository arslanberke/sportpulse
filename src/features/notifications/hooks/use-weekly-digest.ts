import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useDigestPrefs } from '@/features/notifications/digest-prefs';
import { ensureNotificationPermission } from '@/features/notifications/local-notifications';
import { useI18n } from '@/lib/i18n';

const DIGEST_ID = 'weekly-digest';
const DIGEST_HOUR = 9;

/** Next Monday at 09:00 local time (today, if it is Monday before 09:00). */
function nextMondayMorning(now: Date): Date {
  const target = new Date(now);
  target.setHours(DIGEST_HOUR, 0, 0, 0);
  // getDay(): 0 = Sunday, 1 = Monday.
  const daysUntilMonday = (8 - now.getDay()) % 7;
  if (daysUntilMonday > 0 || target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  }
  return target;
}

/**
 * Schedules a Monday morning summary of the week ahead ("5 events this
 * week"). Only the next occurrence is scheduled: the count has to be
 * recomputed from the fixture list, so it is refreshed every time the app
 * opens or the fixtures change rather than using a repeating trigger.
 *
 * Skipped when the week is empty — an empty digest is just noise.
 * No-op on web.
 */
export function useWeeklyDigest() {
  const { t } = useI18n();
  const { events } = useUpcomingEvents(14);
  const enabled = useDigestPrefs((s) => s.weeklyDigest);

  const eventsKey = events.map((e) => e.id + e.startsAt).join(',');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;

    (async () => {
      if (!(await ensureNotificationPermission())) return;

      await Notifications.cancelScheduledNotificationAsync(DIGEST_ID).catch(() => {});
      if (cancelled || !enabled) return;

      const fireAt = nextMondayMorning(new Date());
      const weekEnd = new Date(fireAt.getTime() + 7 * 86_400_000);
      const count = events.filter((event) => {
        if (event.status !== 'scheduled') return false;
        const startsAt = new Date(event.startsAt).getTime();
        return startsAt >= fireAt.getTime() && startsAt < weekEnd.getTime();
      }).length;

      if (count === 0) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('digest.title'),
          body: t('digest.body', { count: String(count) }),
          data: { type: 'weekly_digest' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
        identifier: DIGEST_ID,
      });
    })().catch(() => {
      // A denied permission must not crash the screen.
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey, enabled, t]);
}
