import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useThemeColors } from "@/constants/theme";
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
import { formatDayTime, formatTime } from "@/lib/dates";
import { useI18n, type Translate } from "@/lib/i18n";
import type { SportEvent } from "@/types";

/** Compact human countdown like "2d 4h" / "45m". */
export function formatCountdown(
  startsAt: string,
  t: Translate,
  now = new Date(),
): string {
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  const past = diffMs < 0;
  const totalMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
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
  if (event.status === "scheduled") {
    return (
      <Chip
        label={formatCountdown(event.startsAt, t)}
        icon="hourglass-outline"
        iconColor="#FFFFFF"
        className={accent ? undefined : "bg-primary"}
        style={accent ? { backgroundColor: accent } : undefined}
        textClassName="text-white"
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
export function FeaturedEventCard({ event }: { event: SportEvent }) {
  const { t } = useI18n();
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
  const hasMatchup = Boolean(
    event.homeTeamLogoUrl && event.awayTeamLogoUrl,
  );
  const banner = leagueBanner(event.leagueName);

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-4 overflow-hidden rounded-card bg-surface shadow-md active:scale-[0.99] active:opacity-90">
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
              homeLogoUrl={event.homeTeamLogoUrl!}
              awayLogoUrl={event.awayTeamLogoUrl!}
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
              className="mb-2 text-xl font-bold text-white"
              numberOfLines={2}
            >
              {ufc ? ufc.bout : event.title}
            </Text>
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
  const channelNames = (event.channels ?? []).map((c) => c.name).join(", ");
  const theme = eventTheme(event.sportId, event.leagueName);

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable className="mb-3 flex-row overflow-hidden rounded-card border border-line bg-surface active:scale-[0.99] active:opacity-90">
        <View
          className="w-16 items-center justify-center py-4"
          style={{ backgroundColor: theme.gradient[theme.gradient.length - 1] }}
        >
          <Text className="text-base font-bold text-white">
            {formatTime(event.startsAt)}
          </Text>
        </View>
        <View className="flex-1 p-4">
          <View className="mb-0.5 flex-row items-center gap-1.5">
            {event.leagueBadgeUrl && (
              <Image
                source={{ uri: event.leagueBadgeUrl }}
                style={{ width: 13, height: 13 }}
                contentFit="contain"
              />
            )}
            {event.leagueName && (
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
                {event.leagueName}
              </Text>
            )}
          </View>
          <Text
            className="mb-2 text-base font-semibold text-ink"
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            {event.status === "scheduled" ? (
              <Chip
                label={formatCountdown(event.startsAt, t)}
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
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.inkTertiary}
          />
        </View>
      </Pressable>
    </Link>
  );
}
