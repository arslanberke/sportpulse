import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { formatCountdown } from '@/features/events/components/event-card';
import { useEvent } from '@/features/events/hooks/use-events';
import { reminderTimes } from '@/features/events/lib/reminder-times';
import { useReminderPrefs } from '@/features/settings/hooks/use-reminder-prefs';
import { showAlert } from '@/lib/alert';
import { formatDateTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { shareEventIcs } from '@/lib/ics';
import { areLiveActivitiesEnabled, startEventActivity } from '../../../../modules/live-activity';

/** Event detail: when, where to watch, calendar export, reminder times. */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { event, isLoading } = useEvent(id);
  const { data: prefs } = useReminderPrefs();

  if (isLoading) {
    return (
      <Screen>
        <View className="pt-4">
          <LoadingCard />
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <View className="pt-4">
          <EmptyCard iconName="help-circle-outline" message={t('event.notFound')} />
        </View>
      </Screen>
    );
  }

  const channels = event.channels ?? [];
  const triggers = prefs && event.status === 'scheduled' ? reminderTimes(new Date(event.startsAt), prefs) : [];

  const handleShareIcs = async () => {
    try {
      await shareEventIcs(event, channels.map((c) => c.name));
    } catch {
      showAlert(t('event.couldNotShare'), t('common.tryAgain'));
    }
  };

  const showLiveActivity =
    Platform.OS === 'ios' && event.status === 'scheduled' && areLiveActivitiesEnabled();
  const handleLiveActivity = async () => {
    try {
      await startEventActivity({
        title: event.title,
        leagueName: event.leagueName ?? null,
        channels: channels.map((c) => c.name).join(', ') || null,
        startsAtIso: event.startsAt,
      });
      showAlert(t('event.liveActivityStarted'), '');
    } catch {
      showAlert(t('common.somethingWentWrong'), t('common.tryAgain'));
    }
  };

  return (
    <Screen>
      <View className="pt-4">
        {event.imageUrl && (
          <Image
            source={{ uri: event.imageUrl }}
            style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 16 }}
            contentFit="cover"
            transition={150}
          />
        )}

        {event.leagueName && (
          <Text className="mb-1 text-sm font-semibold uppercase text-ink-tertiary">
            {event.leagueName}
          </Text>
        )}
        <Text className="mb-2 text-2xl font-bold text-ink">{event.title}</Text>
        <View className="mb-4 flex-row items-center gap-2">
          <Ionicons name="time-outline" size={16} color={colors.inkSecondary} />
          <Text className="text-base text-ink-secondary">{formatDateTime(event.startsAt)}</Text>
          {event.status === 'scheduled' ? (
            <Text className="text-base font-semibold text-primary">
              {formatCountdown(event.startsAt, t)}
            </Text>
          ) : (
            <Text className="text-base font-semibold text-danger">
              {t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
            </Text>
          )}
        </View>

        <Card className="mb-4">
          <Text className="mb-2 text-lg font-semibold text-ink">{t('event.channel')}</Text>
          {channels.length === 0 && (
            <Text className="text-sm text-ink-secondary">{t('event.noChannel')}</Text>
          )}
          {channels.map((channel) => (
            <View key={channel.id} className="flex-row items-center gap-2 py-1">
              <Ionicons name="tv-outline" size={16} color={colors.inkSecondary} />
              <Text className="text-base text-ink">{channel.name}</Text>
            </View>
          ))}
        </Card>

        <Card className="mb-4">
          <Text className="mb-1 text-lg font-semibold text-ink">{t('event.reminders')}</Text>
          <Text className="mb-2 text-sm text-ink-secondary">{t('event.remindersBody')}</Text>
          {triggers.length === 0 && (
            <Text className="text-sm text-ink-secondary">{t('event.noReminders')}</Text>
          )}
          {triggers.map((trigger) => (
            <View key={trigger.toISOString()} className="flex-row items-center gap-2 py-1">
              <Ionicons name="notifications-outline" size={16} color={colors.inkSecondary} />
              <Text className="text-base text-ink">{formatDateTime(trigger.toISOString())}</Text>
            </View>
          ))}
        </Card>

        <Button title={t('event.addToCalendar')} onPress={handleShareIcs} />
        {showLiveActivity && (
          <View className="mt-3">
            <Button
              title={t('event.startLiveActivity')}
              onPress={handleLiveActivity}
              variant="secondary"
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
