import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useLogoTint } from '@/constants/logo-tint';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
import { isFavoriteEvent, useFavorites } from '@/features/follows/hooks/use-favorites';
import { formatDayTime, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { localizeStatus } from '@/lib/localize';
import { logoThumb } from '@/lib/logo-thumb';
import type { FootballLiveScore } from '@/services/providers/api-sports-live';
import type { SportEvent } from '@/types';

/** Yildizli/canli satirin solundaki seridin genisligi ve ayraca birakilan bosluk. */
const ACCENT_WIDTH = 2;
const DIVIDER_INSET = 6;
const LOGO_SIZE = 22;
const LINE_HEIGHT = 22;

export interface TimelineLive {
  /** Ev sahibi / deplasman satirlarinin karsisina yazilan skorlar. */
  home: string | null;
  away: string | null;
  /** "78'", "2. Set", "Q3 4:32" gibi durum; yoksa yalnizca "Canli". */
  detail: string | null;
}

/** Futbol canli akisindan satir skoru. */
export function liveFromScore(score: FootballLiveScore, halfTime: string): TimelineLive {
  return {
    home: score.homeScore === null ? null : String(score.homeScore),
    away: score.awayScore === null ? null : String(score.awayScore),
    detail: score.status === 'HT' ? halfTime : `${score.elapsed ?? 0}'`,
  };
}

/** ESPN metni "98–102" biciminde gelir; iki satira bolunur. */
export function liveFromText(scoreText: string | null, detail: string | null): TimelineLive {
  const [home, away] = scoreText ? scoreText.split('–') : [null, null];
  return { home: home ?? null, away: away ?? null, detail };
}

function TeamLine({ name, logoUrl, player }: { name: string; logoUrl?: string | null; player: boolean }) {
  const colors = useThemeColors();
  const tint = useLogoTint(logoUrl);
  return (
    <View className="flex-row items-center" style={{ minHeight: LINE_HEIGHT, gap: 7 }}>
      {logoUrl ? (
        <Image source={{ uri: logoThumb(logoUrl) }} style={{ width: LOGO_SIZE, height: LOGO_SIZE }} contentFit="contain" allowDownscaling={false} tintColor={tint} />
      ) : (
        <View className="items-center justify-center" style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
          <Ionicons name={player ? 'person-outline' : 'shield-outline'} size={16} color={colors.inkTertiary} />
        </View>
      )}
      <Text className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{name}</Text>
    </View>
  );
}

function ScoreStack({ home, away, muted }: { home: string | null; away: string | null; muted?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      {[home, away].map((value, i) => (
        <Text
          key={i}
          className={`text-right text-[14px] font-extrabold ${muted ? 'text-ink-secondary' : 'text-ink'}`}
          style={{ minHeight: LINE_HEIGHT, lineHeight: LINE_HEIGHT, minWidth: 12, fontVariant: ['tabular-nums'] }}
        >
          {value ?? '–'}
        </Text>
      ))}
    </View>
  );
}

/**
 * Kutusuz etkinlik satiri (22f): iki takim satiri, sagda sabit saat ya da
 * skor, altta lig ve kanal. Kart zemini yok; satirlar ince ayracla ayrilir,
 * ayrac soldaki serit hizasina girmez. Canli satirda kirmizi, yildizli
 * kulubun macinda altin serit.
 */
export function TimelineCard({
  event,
  live,
  dayLabel,
  first = false,
}: {
  event: SportEvent;
  live?: TimelineLive;
  /** Hafta ve favori gorunumunde saatin ustune yazilan gun ("Cmt"). */
  dayLabel?: string;
  /** Ilk satirin ustunde ayrac cizilmez. */
  first?: boolean;
}) {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const badgeTint = useLogoTint(event.leagueBadgeUrl);
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const favorite = isFavoriteEvent(event, favoriteTeamIds, favoritePlayerIds);
  const matchup = Boolean(event.homeTeamName && event.awayTeamName);
  const finished = !live && event.homeScore != null && event.awayScore != null;
  const accent = live ? colors.live : favorite ? FAVORITE_COLOR : null;
  const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');
  const scheduled = event.status === 'scheduled';
  const sub = [event.bracket, event.round].filter(Boolean).join(' · ') || event.venue;

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${formatDayTime(event.startsAt)}`}
        className="active:opacity-70"
        style={{ paddingVertical: 7, paddingRight: 4, paddingLeft: accent ? ACCENT_WIDTH + 8 : 4, opacity: finished ? 0.7 : 1 }}
      >
        {!first && (
          <View pointerEvents="none" className="absolute right-0 top-0 h-px bg-line" style={{ left: DIVIDER_INSET }} />
        )}
        {accent && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, top: 4, bottom: 3, width: ACCENT_WIDTH, borderRadius: 1, backgroundColor: accent }}
          />
        )}

        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className="flex-1" style={{ gap: 3 }}>
            {matchup ? (
              <>
                <TeamLine name={event.homeTeamName!} logoUrl={event.homeTeamLogoUrl} player={Boolean(event.homePlayerId)} />
                <TeamLine name={event.awayTeamName!} logoUrl={event.awayTeamLogoUrl} player={Boolean(event.awayPlayerId)} />
              </>
            ) : (
              <>
                <TeamLine name={event.title} logoUrl={event.homeTeamLogoUrl ?? event.leagueBadgeUrl} player={false} />
                {sub && (
                  <Text className="text-xs font-medium text-ink-secondary" style={{ paddingLeft: LOGO_SIZE + 7, minHeight: LINE_HEIGHT, lineHeight: LINE_HEIGHT }} numberOfLines={1}>
                    {sub}
                  </Text>
                )}
              </>
            )}
          </View>

          <View className="flex-row items-center justify-end" style={{ gap: 10 }}>
            {live ? (
              <>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <View className="h-1.5 w-1.5 rounded-full bg-live" />
                  <Text className="text-[11px] font-bold text-live" numberOfLines={1}>{live.detail ? localizeStatus(live.detail, language) : t('home.live')}</Text>
                </View>
                {matchup && <ScoreStack home={live.home} away={live.away} />}
              </>
            ) : finished ? (
              <>
                <Text className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{t('home.fullTimeShort')}</Text>
                <ScoreStack home={String(event.homeScore)} away={String(event.awayScore)} muted />
              </>
            ) : (
              <View className="items-end">
                {dayLabel && <Text className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{dayLabel}</Text>}
                <Text
                  className={`text-[14px] font-extrabold ${scheduled ? 'text-ink' : 'text-danger'}`}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {scheduled ? formatTime(event.startsAt) : t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="mt-1 flex-row items-center justify-between" style={{ gap: 10 }}>
          <View className="flex-1 flex-row items-center" style={{ gap: 5 }}>
            {event.leagueBadgeUrl && (
              <Image source={{ uri: logoThumb(event.leagueBadgeUrl) }} style={{ width: 12, height: 12 }} contentFit="contain" allowDownscaling={false} tintColor={badgeTint} />
            )}
            <Text className="shrink text-[10px] font-semibold text-ink-tertiary" numberOfLines={1}>{event.leagueName ?? ''}</Text>
          </View>
          <Text className="max-w-[50%] text-right text-[10px] font-semibold text-ink-tertiary" numberOfLines={1}>
            {channelNames || t('home.broadcastUnknown')}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
