import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useLogoTint } from "@/constants/logo-tint";
import { Colors, FAVORITE_COLOR, useThemeColors } from "@/constants/theme";
import {
    CircuitOutline,
    findCircuitPath,
} from "@/features/events/components/circuit-outline";
import { EventEffect } from "@/features/events/components/event-effects";
import { MatchupArt } from "@/features/events/components/matchup-art";
import {
    artworkStyle,
    eventTheme,
    overlayColors,
} from "@/features/events/lib/event-theme";
import { leagueBanner } from "@/features/events/lib/league-banner";
import { splitUfcTitle } from "@/features/events/lib/ufc-title";
import { isFavoriteEvent, useFavorites } from "@/features/follows/hooks/use-favorites";
import { formatDateShort, formatDayTime, formatTime } from "@/lib/dates";
import { useI18n, type Translate } from "@/lib/i18n";
import { logoThumb } from "@/lib/logo-thumb";
import { useNow } from "@/lib/now";
import type { FootballLiveScore } from "@/services/providers/api-sports-live";
import type { SportEvent } from "@/types";

/**
 * Yildizlanan kulubun macinda kartin cevresi.
 *
 * Renk arayuzdeki hicbir durumla karismiyor: yesil birincil eylem, kirmizi
 * ertelenme/iptal. Cerceve kartin kendi kosesine oturur.
 */
const FAVORITE_BORDER = {
  borderWidth: 1,
  borderColor: `${FAVORITE_COLOR}88`,
} as const;

/** Compact human countdown like "2d 4h" / "45m". */
export function formatCountdown(
  startsAt: string,
  t: Translate,
  now = new Date(),
  endsAt?: string | null,
): string {
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  const past = diffMs < 0;

  // Cok gunlu etkinlikte gecen sureyi yazmak yanlis okunuyordu: bir hafta suren
  // turnuvada "10g 5s once basladi" biteli 10 gun olmus gibi duruyor. Devam
  // ediyorsa sure degil durum yazilir.
  if (past && endsAt && new Date(endsAt).getTime() > now.getTime()) {
    return t('home.ongoing');
  }
  const totalMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  // Son saat ozel ve acik yazilir. "59dk sonra" hizli bakista mac baslamis
  // gibi okunuyordu; "Maca son 59 dk" bunun geri sayim oldugunu netlestirir.
  if (!past && totalMinutes <= 60) {
    return totalMinutes === 60
      ? t('home.lastHour')
      : t('home.lastMinutes', { count: totalMinutes });
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(t("home.days", { count: days }));
  if (hours > 0) parts.push(t("home.hours", { count: hours }));
  if (days === 0 && minutes > 0)
    parts.push(t("home.minutes", { count: minutes }));
  const time = parts.join(" ");
  return past ? t("home.startedAgo", { time }) : t("home.startsIn", { time });
}

function StatusChip({
  event,
  t,
  accent,
}: {
  event: SportEvent;
  t: Translate;
  accent?: string;
}) {
  // Paylasilan saat: dakika ilerledikce sure kendiliginden tazelenir.
  const now = useNow();

  if (event.status === "scheduled") {
    return (
      <Chip
        label={formatCountdown(event.startsAt, t, now, event.endsAt)}
        icon="hourglass-outline"
        iconColor={accent ? "#FFFFFF" : Colors.onPrimary}
        className={accent ? undefined : "bg-primary"}
        style={accent ? { backgroundColor: accent } : undefined}
        textClassName={accent ? "text-white" : "text-on-primary"}
      />
    );
  }
  return (
    <Chip
      label={t(
        event.status === "postponed" ? "home.postponed" : "home.cancelled",
      )}
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
export function FeaturedEventCard({
  event,
  index = 0,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const now = useNow();
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const colors = useThemeColors();
  const channelNames = (event.channels ?? []).map((c) => c.name).join(", ");
  const theme = eventTheme(event.sportId, event.leagueName);
  const artwork = event.imageUrl ?? event.leagueArtworkUrl;
  // Football event thumbs are badge collages: crop chops the crests, so fit them.
  const art = event.imageUrl
    ? {
        fit:
          event.sportId === "football"
            ? ("contain" as const)
            : ("cover" as const),
        position: "center" as const,
      }
    : artworkStyle(event.leagueName);
  const circuit =
    event.sportId === "f1" ? findCircuitPath(event.venue, event.title) : null;
  const ufc = event.sportId === "ufc" ? splitUfcTitle(event.title) : null;
  // Iki takimli bir karsilasma: rozet duzeni kullanilir. Tek armanin eksik
  // olmasi yeterli sayilmiyordu ve kart bastan asagi lig afisine dusuyordu --
  // afis kartin oranina oturmadigi icin ortada bir serit gibi duruyor, baslik da
  // uzerine biniyordu. Eksik arma artik yer tutucuyla gosteriliyor.
  const hasMatchup = Boolean(event.homeTeamName && event.awayTeamName);
  const banner = leagueBanner(event.leagueName, event.leagueArtworkUrl, event.leagueBadgeUrl, event.sportId);
  const favorite = isFavoriteEvent(event, favoriteTeamIds, favoritePlayerIds);

  return (
    <View>
      <Link href={`/event/${event.id}`} asChild>
        <Pressable
          className="mb-4 overflow-hidden rounded-card bg-surface shadow-md active:scale-[0.99] active:opacity-90"
          // Yildizli kulubun maci: liste kaydirilirken goz kendiliginden
          // yakalasin diye kartin cevresi altin renkle cizilir.
          style={favorite ? FAVORITE_BORDER : undefined}
        >
          <View style={{ height: 200 }}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: "100%", height: "100%" }}
          />
          {circuit ? (
            <>
              {event.leagueArtworkUrl && (
                <Image
                  source={{ uri: event.leagueArtworkUrl }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.55,
                  }}
                  contentFit="cover"
                  transition={200}
                />
              )}
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  left: 12,
                  right: 12,
                  bottom: 44,
                }}
              >
                <CircuitOutline path={circuit} />
              </View>
            </>
          ) : hasMatchup ? (
            <MatchupArt
              banner={banner}
              homeLogoUrl={event.homeTeamLogoUrl ?? null}
              awayLogoUrl={event.awayTeamLogoUrl ?? null}
              badgeSize={100}
            />
          ) : (
            artwork && (
              <>
                {art.fit === "contain" && event.imageUrl && (
                  <Image
                    source={{ uri: artwork }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0.6,
                    }}
                    contentFit="cover"
                    blurRadius={24}
                    transition={200}
                  />
                )}
                <Image
                  source={{ uri: artwork }}
                  style={{
                    position: "absolute",
                    top: art.fit === "contain" ? 20 : 0,
                    left: art.fit === "contain" ? 16 : 0,
                    right: art.fit === "contain" ? 16 : 0,
                    bottom: art.fit === "contain" ? 20 : 0,
                  }}
                  contentFit={art.fit}
                  contentPosition={art.position}
                  transition={200}
                />
              </>
            )
          )}
          {!circuit && (
            <EventEffect
              sportId={event.sportId}
              leagueName={event.leagueName}
              theme={theme}
            />
          )}
          {!hasMatchup && (
            <LinearGradient
              colors={overlayColors(theme)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 150,
              }}
            />
          )}
          <View className="absolute inset-x-0 bottom-0 p-4">
            <View className="mb-1 flex-row items-center gap-1.5">
              {event.leagueBadgeUrl && (
                <Image
                  source={{ uri: event.leagueBadgeUrl }}
                  style={{ width: 16, height: 16 }}
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
                className="text-sm font-black uppercase tracking-widest"
                style={{ color: theme.accent }}
              >
                {ufc.card}
              </Text>
            )}
            <Text
              className={`text-xl font-bold text-white ${hasMatchup ? "" : "mb-2"}`}
              numberOfLines={2}
            >
              {ufc ? ufc.bout : event.title}
            </Text>
            {!hasMatchup && (
              <View className="flex-row flex-wrap items-center gap-2">
                <StatusChip event={event} t={t} accent={theme.accent} />
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
            )}
            </View>
          </View>
          {hasMatchup && (
            <View className="flex-row flex-wrap items-center gap-2 px-4 pb-4 pt-3">
              {event.status === "scheduled" ? (
                <Chip
                  label={formatCountdown(event.startsAt, t, now, event.endsAt)}
                  icon="hourglass-outline"
                  iconColor={theme.accent}
                  className="bg-surface-raised border border-line"
                  textStyle={{ color: theme.accent }}
                />
              ) : (
                <Chip
                  label={t(
                    event.status === "postponed"
                      ? "home.postponed"
                      : "home.cancelled",
                  )}
                  icon="alert-circle-outline"
                  iconColor={colors.danger}
                  className="bg-danger/10"
                  textClassName="text-danger"
                />
              )}
              <Chip
                label={formatDayTime(event.startsAt)}
                icon="time-outline"
                iconColor={colors.inkSecondary}
                className="bg-surface-raised border border-line"
                textClassName="text-ink-secondary"
              />
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
          )}
        </Pressable>
      </Link>
    </View>
  );
}

/**
 * One event in the week list: time column, title, channel chips and a
 * countdown pill.
 */
export function EventCard({
  event,
  index = 0,
  compact = false,
  effects = true,
  liveScore,
  liveGeneric,
}: {
  event: SportEvent;
  index?: number;
  compact?: boolean;
  effects?: boolean;
  /** Set only for football matches matched against the aggregated live feed (home screen "Canlı" filter). */
  liveScore?: FootballLiveScore;
  /**
   * Futbol disi canli rozeti (NBA/tenis/F1/UFC ESPN akisi ya da yaris saat
   * penceresi): scoreText varsa gosterilir ("98–102", teniste set sayisi),
   * detail "Q3 4:32" gibi durum; ikisi de yoksa sadece "Canli" isareti.
   */
  liveGeneric?: { scoreText: string | null; detail: string | null };
}) {
  const { t } = useI18n();
  const now = useNow();
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const colors = useThemeColors();
  const badgeTint = useLogoTint(event.leagueBadgeUrl);
  const channelNames = (event.channels ?? []).map((c) => c.name).join(', ');
  const favorite = isFavoriteEvent(event, favoriteTeamIds, favoritePlayerIds);
  const matchup = Boolean(event.homeTeamName && event.awayTeamName);
  const status = event.status === 'scheduled'
    ? formatCountdown(event.startsAt, t, now, event.endsAt)
    : t(event.status === 'postponed' ? 'home.postponed' : 'home.cancelled');

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${formatDayTime(event.startsAt)}, ${status}`}
        className="mb-3 overflow-hidden rounded-2xl border border-line bg-surface active:opacity-80"
        style={favorite ? { borderWidth: 1, borderColor: `${FAVORITE_COLOR}88` } : undefined}
      >
        {effects && <LinearGradient pointerEvents="none" colors={[favorite ? `${FAVORITE_COLOR}0F` : `${colors.primary}0B`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />}
        <View className="flex-row items-center gap-2 px-4 pt-3">
          {event.leagueBadgeUrl ? <Image source={{ uri: logoThumb(event.leagueBadgeUrl) }} style={{ width: 16, height: 16 }} contentFit="contain" allowDownscaling={false} tintColor={badgeTint} /> : <Ionicons name="trophy-outline" size={14} color={colors.inkTertiary} />}
          <Text className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-ink-secondary" numberOfLines={1}>{[event.leagueName, event.round].filter(Boolean).join(' · ')}</Text>
          {favorite && <Ionicons name="star" size={13} color={FAVORITE_COLOR} />}
        </View>
        {matchup && !compact ? (
          <View className="flex-row items-center gap-2 px-4 py-5">
            <MatchSide name={event.homeTeamName!} logoUrl={event.homeTeamLogoUrl} player={Boolean(event.homePlayerId)} />
            <View className="w-20 items-center">
              {liveScore ? (
                <>
                  <Text className="text-2xl font-semibold tracking-tight text-ink">{liveScore.homeScore ?? '–'}–{liveScore.awayScore ?? '–'}</Text>
                  <View className="mt-1 flex-row items-center gap-1">
                    <View className="h-1.5 w-1.5 rounded-full bg-danger" />
                    <Text className="text-center text-[10px] font-semibold text-danger">
                      {liveScore.status === 'HT' ? t('event.halfTime') : `${liveScore.elapsed ?? 0}'`}
                    </Text>
                  </View>
                </>
              ) : liveGeneric ? (
                <>
                  {liveGeneric.scoreText && (
                    <Text className="text-2xl font-semibold tracking-tight text-ink">{liveGeneric.scoreText}</Text>
                  )}
                  <View className="mt-1 flex-row items-center gap-1">
                    <View className="h-1.5 w-1.5 rounded-full bg-danger" />
                    <Text className="text-center text-[10px] font-semibold text-danger" numberOfLines={1}>
                      {liveGeneric.detail ?? t('home.live')}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-2xl font-semibold tracking-tight text-ink">{formatTime(event.startsAt)}</Text>
                  <Text className="mt-1 text-center text-[10px] text-ink-tertiary">{formatDateShort(event.startsAt)}</Text>
                </>
              )}
            </View>
            <MatchSide name={event.awayTeamName!} logoUrl={event.awayTeamLogoUrl} player={Boolean(event.awayPlayerId)} />
          </View>
        ) : (
          <View className="flex-row items-center gap-3 px-4 py-4">
            {liveGeneric ? (
              <View className="items-center">
                <View className="h-2 w-2 rounded-full bg-danger" />
                <Text className="mt-0.5 text-[9px] font-bold uppercase text-danger">{t('home.live')}</Text>
              </View>
            ) : (
              <Text className="text-xl font-semibold text-ink">{formatTime(event.startsAt)}</Text>
            )}
            {event.homeTeamLogoUrl && <Image source={{ uri: logoThumb(event.homeTeamLogoUrl) }} style={{ width: 24, height: 24 }} contentFit="contain" allowDownscaling={false} />}
            <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={2}>{event.title}</Text>
            {event.awayTeamLogoUrl && <Image source={{ uri: logoThumb(event.awayTeamLogoUrl) }} style={{ width: 24, height: 24 }} contentFit="contain" allowDownscaling={false} />}
          </View>
        )}
        <View className="mx-4 flex-row items-center gap-2 border-t border-line py-3">
          <Ionicons name="tv-outline" size={13} color={colors.inkTertiary} />
          <Text className="flex-1 text-[11px] text-ink-secondary" numberOfLines={2}>{channelNames || t('home.broadcastUnknown')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.inkTertiary} />
        </View>
        {!compact && <Text className={`px-4 pb-3 text-[11px] ${event.status === 'scheduled' ? 'text-primary' : 'text-danger'}`}>{status}</Text>}
        {compact && event.status !== 'scheduled' && <Text className="px-4 pb-3 text-xs text-danger">{status}</Text>}
      </Pressable>
    </Link>
  );
}

function MatchSide({ name, logoUrl, player }: { name: string; logoUrl?: string | null; player: boolean }) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center gap-2">
      {logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: 42, height: 42 }} contentFit="contain" allowDownscaling={false} /> : <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-raised"><Ionicons name={player ? 'person-outline' : 'shield-outline'} size={24} color={colors.inkSecondary} /></View>}
      <Text className="text-center text-sm font-semibold text-ink" numberOfLines={2}>{name}</Text>
    </View>
  );
}
