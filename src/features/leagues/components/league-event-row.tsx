import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import type { SportEvent } from '@/types';

function Side({
  name,
  logoUrl,
  muted,
}: {
  name: string | null | undefined;
  logoUrl: string | null | undefined;
  muted: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-2">
      {logoUrl ? (
        <Image
          source={{ uri: logoThumb(logoUrl) }}
          style={{ width: 18, height: 18 }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : (
        <Ionicons name="shield-outline" size={16} color={colors.inkTertiary} />
      )}
      <Text
        className={`shrink text-[13px] ${muted ? 'font-medium text-ink-secondary' : 'font-semibold text-ink'}`}
        numberOfLines={1}
      >
        {name ?? ''}
      </Text>
    </View>
  );
}

/**
 * 22f lig sayfasi satiri: solda saat / MS / Canli, ortada iki takim alt alta,
 * sagda skor alt alta. Kazanan koyu, kaybeden soluk.
 */
export function LeagueEventRow({ event, live = false }: { event: SportEvent; live?: boolean }) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const scored = event.homeScore != null && event.awayScore != null;
  const finished = scored && !live;
  const homeLost = finished && event.homeScore! < event.awayScore!;
  const awayLost = finished && event.awayScore! < event.homeScore!;
  const scoreColor = live ? colors.live : colors.ink;

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="min-h-[56px] flex-row items-center gap-2.5 border-b border-line py-2 active:opacity-60">
        {live && (
          <View
            pointerEvents="none"
            className="absolute bottom-2 top-2 w-0.5 rounded-sm bg-live"
            style={{ left: -10 }}
          />
        )}
        <Text
          className="w-11 text-[11px] font-semibold"
          style={{
            color: live ? colors.live : finished ? colors.inkTertiary : colors.inkSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {live ? t('home.live') : finished ? t('home.fullTimeShort') : formatTime(event.startsAt)}
        </Text>
        <View className="flex-1 gap-1.5">
          <Side name={event.homeTeamName ?? event.title} logoUrl={event.homeTeamLogoUrl} muted={homeLost} />
          <Side name={event.awayTeamName} logoUrl={event.awayTeamLogoUrl} muted={awayLost} />
        </View>
        {scored && (
          <View className="items-end gap-1.5">
            <Text
              className={`text-[13px] ${homeLost ? 'font-medium' : 'font-extrabold'}`}
              style={{ color: homeLost ? colors.inkSecondary : scoreColor, fontVariant: ['tabular-nums'] }}
            >
              {event.homeScore}
            </Text>
            <Text
              className={`text-[13px] ${awayLost ? 'font-medium' : 'font-extrabold'}`}
              style={{ color: awayLost ? colors.inkSecondary : scoreColor, fontVariant: ['tabular-nums'] }}
            >
              {event.awayScore}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.inkTertiary} />
      </Pressable>
    </Link>
  );
}
