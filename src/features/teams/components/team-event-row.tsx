import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { formatDateShort, formatTime, formatWeekdayShort } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import type { SportEvent } from '@/types';

const WIN = '#16A34A';
const LOSS = '#DC2626';

/**
 * 22f fixture/result row seen from one club: date column, opponent crest and
 * name, competition · home/away, and a right-aligned time or score with W/D/L.
 */
export function TeamEventRow({
  event,
  teamId,
  live = false,
}: {
  event: SportEvent;
  teamId: string;
  live?: boolean;
}) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const home = event.homeTeamId === teamId || event.awayTeamId !== teamId;
  const opponent = home ? event.awayTeamName : event.homeTeamName;
  const opponentLogo = home ? event.awayTeamLogoUrl : event.homeTeamLogoUrl;
  const my = home ? event.homeScore : event.awayScore;
  const their = home ? event.awayScore : event.homeScore;
  const scored = my != null && their != null;
  const outcome = !scored || live ? null : my > their ? 'W' : my < their ? 'L' : 'D';
  const finished = scored && !live;

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="min-h-[52px] flex-row items-center gap-2.5 border-b border-line py-2 active:opacity-60">
        {live && (
          <View
            pointerEvents="none"
            className="absolute bottom-2 top-2 w-0.5 rounded-sm bg-live"
            style={{ left: -10 }}
          />
        )}
        <View className="w-11">
          <Text
            className="text-[11px] font-semibold"
            style={{ color: live ? colors.live : colors.inkSecondary, fontVariant: ['tabular-nums'] }}
          >
            {live ? t('home.live') : formatDateShort(event.startsAt)}
          </Text>
          {!live && (
            <Text className="text-[11px] text-ink-tertiary" style={{ fontVariant: ['tabular-nums'] }}>
              {finished ? formatWeekdayShort(new Date(event.startsAt)) : formatTime(event.startsAt)}
            </Text>
          )}
        </View>
        {opponentLogo ? (
          <Image
            source={{ uri: logoThumb(opponentLogo) }}
            style={{ width: 22, height: 22 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name="shield-outline" size={20} color={colors.inkTertiary} />
        )}
        <View className="flex-1">
          <Text className="text-[13.5px] font-semibold text-ink" numberOfLines={1}>
            {opponent ?? event.title}
          </Text>
          <Text className="text-[11px] text-ink-tertiary" numberOfLines={1}>
            {[event.leagueName, home ? t('team.home') : t('team.away')].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {scored ? (
          <Text
            className="text-[15px] font-extrabold"
            style={{ color: live ? colors.live : colors.ink, fontVariant: ['tabular-nums'] }}
          >
            {`${my}–${their}`}
          </Text>
        ) : live ? (
          <Text className="text-[15px] font-extrabold" style={{ color: colors.live }}>–</Text>
        ) : null}
        {outcome && (
          <View
            className="h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: outcome === 'W' ? WIN : outcome === 'L' ? LOSS : colors.inkTertiary }}
          >
            <Text className="text-[10.5px] font-extrabold text-white">
              {t(outcome === 'W' ? 'team.win' : outcome === 'L' ? 'team.loss' : 'team.draw')}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}
