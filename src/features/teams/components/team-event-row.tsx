import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { teamEventScore } from '@/features/teams/lib/team-season';
import { formatDateShort, formatTime } from '@/lib/dates';
import type { SportEvent } from '@/types';

function Crest({ uri }: { uri?: string | null }) {
  const colors = useThemeColors();
  return uri ? (
    <Image source={{ uri }} style={{ width: 22, height: 22 }} contentFit="contain" allowDownscaling={false} />
  ) : (
    <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-surface-raised">
      <Ionicons name="shield-outline" size={14} color={colors.inkTertiary} />
    </View>
  );
}

export function TeamEventRow({ event }: { event: SportEvent }) {
  const colors = useThemeColors();
  const score = teamEventScore(event);
  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-2 rounded-xl border border-line bg-surface px-3 py-2.5 active:opacity-75">
        <View className="mb-1.5 flex-row items-center">
          <Text className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary" numberOfLines={1}>
            {event.leagueName ?? ''}
          </Text>
          <Text className="text-[10px] text-ink-tertiary">{formatDateShort(event.startsAt)}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Crest uri={event.homeTeamLogoUrl} />
            <Text className="flex-1 text-sm font-medium text-ink" numberOfLines={1}>{event.homeTeamName}</Text>
          </View>
          <View className="w-14 items-center">
            <Text className="text-base font-bold text-ink">{score ?? formatTime(event.startsAt)}</Text>
            {score && <Text className="text-[9px] font-medium uppercase text-ink-tertiary">MS</Text>}
          </View>
          <View className="flex-1 flex-row items-center justify-end gap-2">
            <Text className="flex-1 text-right text-sm font-medium text-ink" numberOfLines={1}>{event.awayTeamName}</Text>
            <Crest uri={event.awayTeamLogoUrl} />
          </View>
          <Ionicons name="chevron-forward" size={13} color={colors.inkTertiary} />
        </View>
      </Pressable>
    </Link>
  );
}
