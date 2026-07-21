import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { EmptyCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { formatCountdown } from '@/features/events/components/event-card';
import { CircuitOutline, findCircuitPath } from '@/features/events/components/circuit-outline';
import { EventEffect } from '@/features/events/components/event-effects';
import { useEvent } from '@/features/events/hooks/use-events';
import { artworkStyle, eventTheme, overlayColors } from '@/features/events/lib/event-theme';
import { reminderTimes } from '@/features/events/lib/reminder-times';
import { splitUfcTitle } from '@/features/events/lib/ufc-title';
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
  const allTriggers =
    prefs && event.status === 'scheduled' ? reminderTimes(new Date(event.startsAt), prefs) : [];
  // Quiet hours can collapse several offsets onto the same time; show each once.
  const triggers = [...new Map(allTriggers.map((d) => [d.toISOString(), d])).values()];

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

  const theme = eventTheme(event.sportId, event.leagueName);
  const artwork = event.imageUrl ?? event.leagueArtworkUrl;
  const art = event.imageUrl
    ? { fit: 'cover' as const, position: 'center' as const }
    : artworkStyle(event.leagueName);
  const circuit = event.sportId === 'f1' ? findCircuitPath(event.venue, event.title) : null;
  const ufc = event.sportId === 'ufc' ? splitUfcTitle(event.title) : null;

  return (
    <Screen>
      <View className="pt-4">
        <View className="mb-4 overflow-hidden rounded-card bg-surface shadow-md">
          <View style={{ height: 220 }}>
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
            {circuit ? (
              <View style={{ position: 'absolute', top: 12, left: 16, right: 16, bottom: 80 }}>
                <CircuitOutline path={circuit} />
              </View>
            ) : (
              artwork && (
                <Image
                  source={{ uri: artwork }}
                  style={
                    art.fit === 'contain'
                      ? { position: 'absolute', top: 24, left: 24, right: 24, bottom: 88 }
                      : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
                  }
                  contentFit={art.fit}
                  contentPosition={art.position}
                  transition={200}
                />
              )
            )}
            {!circuit && (
              <EventEffect sportId={event.sportId} leagueName={event.leagueName} theme={theme} />
            )}
            <LinearGradient
              colors={overlayColors(theme)}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 }}
            />
            <View className="absolute inset-x-0 bottom-0 p-5">
              <View className="mb-1 flex-row items-center gap-1.5">
                {event.leagueBadgeUrl && (
                  <Image
                    source={{ uri: event.leagueBadgeUrl }}
                    style={{ width: 18, height: 18 }}
                    contentFit="contain"
                  />
                )}
                {event.leagueName && (
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/70">
                    {event.leagueName}
                  </Text>
                )}
              </View>
              {ufc && (
                <Text
                  className="text-base font-black uppercase tracking-widest"
                  style={{ color: theme.accent }}
                >
                  {ufc.card}
                </Text>
              )}
              <Text className="mb-2 text-2xl font-bold text-white">
                {ufc ? ufc.bout : event.title}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                {event.status === 'scheduled' ? (
                  <Chip
                    label={formatCountdown(event.startsAt, t)}
                    icon="hourglass-outline"
                    iconColor="#FFFFFF"
                    style={{ backgroundColor: theme.accent }}
                    textClassName="text-white"
                  />
                ) : (
                  <Chip
                    label={t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
                    icon="alert-circle-outline"
                    iconColor="#FFFFFF"
                    className="bg-danger"
                    textClassName="text-white"
                  />
                )}
                <Chip
                  label={formatDateTime(event.startsAt)}
                  icon="time-outline"
                  iconColor="#FFFFFF"
                  className="bg-white/20"
                  textClassName="text-white"
                />
              </View>
            </View>
          </View>
        </View>

        {event.venue && (
          <Card className="mb-4">
            <Text className="mb-2 text-lg font-semibold text-ink">{t('event.venue')}</Text>
            {event.venueImageUrl && (
              <View className="mb-2 overflow-hidden rounded-xl">
                <Image
                  source={{ uri: event.venueImageUrl }}
                  style={{ width: '100%', height: 140 }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            )}
            <View className="flex-row items-center gap-2">
              <Ionicons name="location-outline" size={16} color={colors.inkSecondary} />
              <Text className="text-base text-ink">{event.venue}</Text>
            </View>
          </Card>
        )}

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
