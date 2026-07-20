import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useThemeColors } from '@/constants/theme';
import { formatDayTime, formatTime } from '@/lib/dates';
import { useI18n, type Translate } from '@/lib/i18n';
import type { SportEvent } from '@/types';

/** Compact human countdown like "2d 4h" / "45m". */
export function formatCountdown(startsAt: string, t: Translate, now = new Date()): string {
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  const past = diffMs < 0;
  const totalMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(t('home.days', { count: days }));
  if (hours > 0) parts.push(t('home.hours', { count: hours }));
  if (days === 0 && minutes > 0) parts.push(t('home.minutes', { count: minutes }));
  const time = parts.join(' ');
  return past ? t('home.startedAgo', { time }) : t('home.startsIn', { time });
}

function StatusChip({ event, t }: { event: SportEvent; t: Translate }) {
  if (event.status === 'scheduled') {
    return (
      <Chip
        label={formatCountdown(event.startsAt, t)}
        icon="hourglass-outline"
        iconColor="#FFFFFF"
        className="bg-primary"
        textClassName="text-white"
      />
    );
  }
  return (
    <Chip
      label={t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
      icon="alert-circle-outline"
      iconColor="#FFFFFF"
      className="bg-danger"
      textClassName="text-white"
    />
  );
}

/**
 * Hero card for the next upcoming event: full-width poster with a gradient
 * overlay, big title, countdown pill and channel chips.
 */
export function FeaturedEventCard({ event }: { event: SportEvent }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-4 overflow-hidden rounded-card bg-surface shadow-md active:scale-[0.99] active:opacity-90">
        <View style={{ height: 200 }}>
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(4, 14, 9, 0.55)', 'rgba(4, 14, 9, 0.92)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}
          />
          <View className="absolute inset-x-0 bottom-0 p-4">
            {event.leagueName && (
              <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-white/70">
                {event.leagueName}
              </Text>
            )}
            <Text className="mb-2 text-xl font-bold text-white" numberOfLines={2}>
              {event.title}
            </Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <StatusChip event={event} t={t} />
              <Chip
                label={formatDayTime(event.startsAt)}
                icon="time-outline"
                iconColor="#FFFFFF"
                className="bg-white/20"
                textClassName="text-white"
              />
              {channelNames.length > 0 && (
                <Chip
                  label={channelNames}
                  icon="tv-outline"
                  iconColor="#FFFFFF"
                  className="bg-white/20"
                  textClassName="text-white"
                />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/**
 * One event in the week list: time column, title, channel chips and a
 * countdown pill.
 */
export function EventCard({ event }: { event: SportEvent }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-3 flex-row overflow-hidden rounded-card border border-line bg-surface active:scale-[0.99] active:opacity-90">
        <View className="w-16 items-center justify-center border-r border-line bg-surface-raised py-4">
          <Text className="text-base font-bold text-ink">{formatTime(event.startsAt)}</Text>
        </View>
        <View className="flex-1 p-4">
          {event.leagueName && (
            <Text className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
              {event.leagueName}
            </Text>
          )}
          <Text className="mb-2 text-base font-semibold text-ink" numberOfLines={2}>
            {event.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            {event.status === 'scheduled' ? (
              <Chip
                label={formatCountdown(event.startsAt, t)}
                icon="hourglass-outline"
                iconColor={colors.primary}
                className="bg-primary-light"
                textClassName="text-primary"
              />
            ) : (
              <Chip
                label={t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
                icon="alert-circle-outline"
                iconColor={colors.danger}
                className="bg-danger/10"
                textClassName="text-danger"
              />
            )}
            {channelNames.length > 0 && (
              <Chip
                label={channelNames}
                icon="tv-outline"
                iconColor={colors.inkSecondary}
                className="bg-surface-raised border border-line"
                textClassName="text-ink-secondary"
              />
            )}
          </View>
        </View>
        <View className="justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color={colors.inkTertiary} />
        </View>
      </Pressable>
    </Link>
  );
}
