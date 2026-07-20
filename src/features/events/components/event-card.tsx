import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { formatDayTime } from '@/lib/dates';
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

/**
 * One event in the week list: poster (when available), title, local time,
 * channel and countdown.
 */
export function EventCard({ event }: { event: SportEvent }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-3 overflow-hidden rounded-card bg-surface shadow-sm">
        {event.imageUrl && (
          <Image
            source={{ uri: event.imageUrl }}
            style={{ width: '100%', height: 140 }}
            contentFit="cover"
            transition={150}
          />
        )}
        <View className="p-4">
          {event.leagueName && (
            <Text className="mb-1 text-xs font-semibold uppercase text-ink-tertiary">
              {event.leagueName}
            </Text>
          )}
          <Text className="mb-1 text-base font-semibold text-ink">{event.title}</Text>
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={14} color={colors.inkSecondary} />
            <Text className="text-sm text-ink-secondary">{formatDayTime(event.startsAt)}</Text>
            {event.status === 'scheduled' ? (
              <Text className="text-sm font-semibold text-primary">
                {formatCountdown(event.startsAt, t)}
              </Text>
            ) : (
              <Text className="text-sm font-semibold text-danger">
                {t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
              </Text>
            )}
          </View>
          {channelNames.length > 0 && (
            <View className="mt-1 flex-row items-center gap-2">
              <Ionicons name="tv-outline" size={14} color={colors.inkSecondary} />
              <Text className="text-sm text-ink-secondary">{channelNames}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}
