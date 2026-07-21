import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { Platform, Text, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyCard, LoadingCard } from "@/components/ui/states";
import { useThemeColors } from "@/constants/theme";
import { formatCountdown } from "@/features/events/components/event-card";
import {
  CircuitOutline,
  findCircuitPath,
} from "@/features/events/components/circuit-outline";
import { EventEffect } from "@/features/events/components/event-effects";
import { MatchupArt } from "@/features/events/components/matchup-art";
import { useEvent } from "@/features/events/hooks/use-events";
import {
  artworkStyle,
  eventTheme,
  overlayColors,
} from "@/features/events/lib/event-theme";
import { leagueBanner } from "@/features/events/lib/league-banner";
import { reminderTimes } from "@/features/events/lib/reminder-times";
import { splitUfcTitle } from "@/features/events/lib/ufc-title";
import { useReminderPrefs } from "@/features/settings/hooks/use-reminder-prefs";
import { showAlert } from "@/lib/alert";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { shareEventIcs } from "@/lib/ics";
import {
  areLiveActivitiesEnabled,
  startEventActivity,
} from "../../../../modules/live-activity";

/** Card section header: a tinted icon tile next to the section title. */
function SectionHeader({
  icon,
  label,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}1F` }}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="text-base font-semibold text-ink">{label}</Text>
    </View>
  );
}

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
          <EmptyCard
            iconName="help-circle-outline"
            message={t("event.notFound")}
          />
        </View>
      </Screen>
    );
  }

  const channels = event.channels ?? [];
  const allTriggers =
    prefs && event.status === "scheduled"
      ? reminderTimes(new Date(event.startsAt), prefs)
      : [];
  // Quiet hours can collapse several offsets onto the same time; show each once.
  const triggers = [
    ...new Map(allTriggers.map((d) => [d.toISOString(), d])).values(),
  ];

  const handleShareIcs = async () => {
    try {
      await shareEventIcs(
        event,
        channels.map((c) => c.name),
      );
    } catch {
      showAlert(t("event.couldNotShare"), t("common.tryAgain"));
    }
  };

  const showLiveActivity =
    Platform.OS === "ios" &&
    event.status === "scheduled" &&
    areLiveActivitiesEnabled();
  const handleLiveActivity = async () => {
    try {
      await startEventActivity({
        title: event.title,
        leagueName: event.leagueName ?? null,
        channels: channels.map((c) => c.name).join(", ") || null,
        startsAtIso: event.startsAt,
      });
      showAlert(t("event.liveActivityStarted"), "");
    } catch {
      showAlert(t("common.somethingWentWrong"), t("common.tryAgain"));
    }
  };

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
  const hasMatchup = Boolean(event.homeTeamLogoUrl && event.awayTeamLogoUrl);
  const banner = leagueBanner(event.leagueName);

  return (
    <Screen>
      <View className="pt-4">
        <View className="mb-4 overflow-hidden rounded-card bg-surface shadow-md">
          <View style={{ height: 220 }}>
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
                    bottom: 64,
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
                badgeSize={116}
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
                      top: art.fit === "contain" ? 22 : 0,
                      left: art.fit === "contain" ? 16 : 0,
                      right: art.fit === "contain" ? 16 : 0,
                      bottom: art.fit === "contain" ? 22 : 0,
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
                  height: 160,
                }}
              />
            )}
            <View className="absolute inset-x-0 bottom-0 px-5 pb-3 pt-5">
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
              <Text className="text-lg font-bold text-white">
                {ufc ? ufc.bout : event.title}
              </Text>
            </View>
          </View>
        </View>

        <Card className="mb-4" index={0}>
          <SectionHeader
            icon="calendar"
            label={t("event.details")}
            tint={colors.primary}
          />
          <View className="gap-2.5">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-surface-raised">
                <Ionicons
                  name={
                    event.status === "scheduled"
                      ? "hourglass-outline"
                      : "alert-circle-outline"
                  }
                  size={16}
                  color={
                    event.status === "scheduled"
                      ? colors.primary
                      : colors.danger
                  }
                />
              </View>
              <Text
                className="text-base font-semibold"
                style={{
                  color:
                    event.status === "scheduled"
                      ? colors.ink
                      : colors.danger,
                }}
              >
                {event.status === "scheduled"
                  ? formatCountdown(event.startsAt, t)
                  : t(
                      event.status === "postponed"
                        ? "home.postponed"
                        : "home.cancelled",
                    )}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-surface-raised">
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.inkSecondary}
                />
              </View>
              <Text className="text-base font-medium text-ink">
                {formatDateTime(event.startsAt)}
              </Text>
            </View>
            {event.venue && (
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-surface-raised">
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.inkSecondary}
                  />
                </View>
                <Text className="flex-1 text-base font-medium text-ink">
                  {event.venue}
                </Text>
              </View>
            )}
          </View>
          {event.venueImageUrl && (
            <View className="mt-3 overflow-hidden rounded-2xl">
              <Image
                source={{ uri: event.venueImageUrl }}
                style={{ width: "100%", height: 150 }}
                contentFit="cover"
                transition={200}
              />
            </View>
          )}
        </Card>

        <Card className="mb-4" index={1}>
          <SectionHeader
            icon="tv"
            label={t("event.channel")}
            tint={colors.primary}
          />
          {channels.length === 0 && (
            <Text className="text-sm text-ink-secondary">
              {t("event.noChannel")}
            </Text>
          )}
          <View className="gap-2">
            {channels.map((channel) => (
              <View
                key={channel.id}
                className="flex-row items-center gap-3 rounded-2xl bg-surface-raised px-3 py-2.5"
              >
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-surface">
                  {channel.logoUrl ? (
                    <Image
                      source={{ uri: channel.logoUrl }}
                      style={{ width: 40, height: 40 }}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons
                      name="tv-outline"
                      size={18}
                      color={colors.inkSecondary}
                    />
                  )}
                </View>
                <Text className="text-base font-medium text-ink">
                  {channel.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card className="mb-4" index={2}>
          <SectionHeader
            icon="notifications"
            label={t("event.reminders")}
            tint={colors.primary}
          />
          <Text className="mb-3 text-sm text-ink-secondary">
            {t("event.remindersBody")}
          </Text>
          {triggers.length === 0 ? (
            <Text className="text-sm text-ink-secondary">
              {t("event.noReminders")}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {triggers.map((trigger) => (
                <View
                  key={trigger.toISOString()}
                  className="flex-row items-center gap-1.5 rounded-pill bg-surface-raised px-3 py-2"
                >
                  <Ionicons
                    name="notifications-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text className="text-sm font-medium text-ink">
                    {formatDateTime(trigger.toISOString())}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Button title={t("event.addToCalendar")} onPress={handleShareIcs} />
        {showLiveActivity && (
          <View className="mt-3">
            <Button
              title={t("event.startLiveActivity")}
              onPress={handleLiveActivity}
              variant="secondary"
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
