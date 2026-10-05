import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useLogoTint } from "@/constants/logo-tint";
import { useThemeColors } from "@/constants/theme";
import { BoxScoreCard } from "@/features/events/components/box-score-card";
import { BriefingCard } from "@/features/events/components/briefing-card";
import { formatCountdown } from "@/features/events/components/event-card";
import { LeagueStandingsCard } from "@/features/events/components/league-standings-card";
import { LineupCard } from "@/features/events/components/lineup-card";
import {
  LiveMatchCard,
  useMatchCentre,
} from "@/features/events/components/live-match-card";
import { MatchStatsCard } from "@/features/events/components/match-stats-card";
import { PreMatchCard } from "@/features/events/components/pre-match-card";
import {
  useEventBoxScore,
  useEventLeagueStandings,
  useEventStats,
  useLiveScores,
} from "@/features/events/hooks/use-events";
import { channelLogo } from "@/features/events/lib/channel-logo";
import { isEventOver } from "@/features/events/lib/event-duration";
import { matchEspnLive } from "@/features/events/lib/live-match";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { logoThumb } from "@/lib/logo-thumb";
import { useNow } from "@/lib/now";
import {
  FINAL_STATUSES,
  LIVE_STATUSES,
} from "@/services/providers/api-sports-fixture";
import type { SportEvent } from "@/types";

type Tab =
  | "events"
  | "lineup"
  | "stats"
  | "periods"
  | "team"
  | "players"
  | "standings"
  | "info";

interface Header {
  home: number | null;
  away: number | null;
  live: boolean;
  /** "67'", "Q3 4:32", "Devre arası"; null when there is nothing to add. */
  detail: string | null;
  finished: boolean;
}

/** Score and state line for the header, from the same feeds as the tabs. */
function useHeader(event: SportEvent, now: Date): Header {
  const { t } = useI18n();
  const football = event.sportId === "football";
  const centre = useMatchCentre(event);
  const box = useEventBoxScore(event);
  const started = now >= new Date(event.startsAt);
  const over = isEventOver(event, now);
  const feed = useLiveScores(!football && started && !over);
  const hit = football
    ? undefined
    : matchEspnLive([event], feed.data?.espn ?? []).get(event.id);
  const entry = hit && hit !== "window" ? hit : null;
  const finishedResult =
    event.resultStatus === "finished" ||
    (event.homeScore != null && event.awayScore != null && over);

  if (football && centre.state) {
    const s = centre.state;
    const live = LIVE_STATUSES.has(s.status);
    return {
      home: s.homeScore ?? event.homeScore ?? null,
      away: s.awayScore ?? event.awayScore ?? null,
      live,
      detail: live
        ? s.status === "HT"
          ? t("event.halfTime")
          : s.elapsed !== null
            ? `${s.elapsed}'`
            : null
        : null,
      finished: FINAL_STATUSES.has(s.status) || (!live && finishedResult),
    };
  }

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const periods = box.data?.periods;
  const boxHome = periods && periods.home.length > 0 ? sum(periods.home) : null;
  const boxAway = periods && periods.away.length > 0 ? sum(periods.away) : null;
  const live = Boolean(entry) || Boolean(box.data?.live);
  return {
    home: entry?.homeScore ?? boxHome ?? event.homeScore ?? null,
    away: entry?.awayScore ?? boxAway ?? event.awayScore ?? null,
    live,
    detail: live ? (entry?.statusDetail ?? null) : null,
    finished: !live && (finishedResult || (Boolean(box.data) && over)),
  };
}

function TeamSide({
  name,
  logoUrl,
  teamId,
}: {
  name: string;
  logoUrl: string | null;
  teamId: string | null;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const tint = useLogoTint(logoUrl);
  return (
    <Pressable
      onPress={teamId ? () => router.push(`/team/${teamId}`) : undefined}
      disabled={!teamId}
      accessibilityRole={teamId ? "link" : undefined}
      className="flex-1 items-center gap-1.5 active:opacity-60"
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoThumb(logoUrl) }}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          tintColor={tint}
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center">
          <Ionicons name="shield-outline" size={26} color={colors.inkTertiary} />
        </View>
      )}
      <Text
        numberOfLines={2}
        className="text-center text-[13px] font-bold leading-4 text-ink"
      >
        {name}
      </Text>
    </Pressable>
  );
}

function IconAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      className="h-8 w-8 items-center justify-center rounded-full border border-line active:opacity-60"
    >
      <Ionicons name={icon} size={16} color={colors.inkSecondary} />
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`min-h-[46px] flex-row items-center gap-3 py-2 ${last ? "" : "border-b border-line"}`}
    >
      <Text className="w-24 text-[12.5px] text-ink-secondary">{label}</Text>
      <Text className="flex-1 text-[13px] font-semibold text-ink">{value}</Text>
    </View>
  );
}

/**
 * Flat 22f layout for team matches (football, basketball): plain scoreboard
 * whose teams open the team page, icon actions, one channel line, then tabs
 * of borderless rows. Same language as `MotorsportDetail`.
 */
export function MatchDetail({
  event,
  reminders,
  onCalendar,
  onShare,
  actions,
}: {
  event: SportEvent;
  reminders: Date[];
  onCalendar: () => void;
  onShare: () => void;
  /** Extra buttons at the bottom of the info tab (live activity). */
  actions: ReactNode;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const badgeTint = useLogoTint(event.leagueBadgeUrl);
  const header = useHeader(event, now);
  const centre = useMatchCentre(event);
  const stats = useEventStats(event);
  const box = useEventBoxScore(event);
  const standings = useEventLeagueStandings(event);
  const [picked, setPicked] = useState<Tab | null>(null);

  const football = event.sportId === "football";
  const basketball = event.sportId === "basketball";
  const statRows = stats.data?.rows.length ?? 0;
  const b = box.data;
  const tabs: { key: Tab; label: string }[] = [
    ...(football && centre.state
      ? [{ key: "events" as const, label: t("event.tab.events") }]
      : []),
    ...(football && event.status === "scheduled"
      ? [{ key: "lineup" as const, label: t("event.tab.lineup") }]
      : []),
    ...(football && statRows > 0
      ? [{ key: "stats" as const, label: t("event.tab.stats") }]
      : []),
    ...(basketball && b && Math.max(b.periods.home.length, b.periods.away.length) > 0
      ? [{ key: "periods" as const, label: t("event.box.periods") }]
      : []),
    ...(basketball && b && b.teamStats.length > 0
      ? [{ key: "team" as const, label: t("event.box.team") }]
      : []),
    ...(basketball && b && b.players.home.length + b.players.away.length > 0
      ? [{ key: "players" as const, label: t("event.box.players") }]
      : []),
    ...(basketball && (standings.data?.conferences.length ?? 0) > 0
      ? [{ key: "standings" as const, label: t("event.leagueStandings") }]
      : []),
    { key: "info", label: t("event.motorsport.info") },
  ];
  const tab =
    picked && tabs.some((x) => x.key === picked) ? picked : tabs[0].key;
  const channels = event.channels ?? [];
  const hasScore = header.home !== null && header.away !== null;

  const state = header.live ? (
    <Text className="text-[12.5px] font-bold" style={{ color: colors.live }}>
      ● {header.detail ?? t("home.live")}
    </Text>
  ) : header.finished ? (
    <Text className="text-[12.5px] font-semibold text-ink-secondary">
      {t("home.finished")}
    </Text>
  ) : (
    <Text
      className="text-[12.5px] font-semibold"
      style={{
        color: event.status === "scheduled" ? colors.ink : colors.danger,
      }}
    >
      {event.status === "scheduled"
        ? formatCountdown(event.startsAt, t, now, event.endsAt)
        : t(event.status === "postponed" ? "home.postponed" : "home.cancelled")}
    </Text>
  );

  const hideChannel =
    channels.length === 0 && (header.finished || isEventOver(event, now));

  return (
    <View className="pt-2">
      <View className="flex-row items-center gap-1.5">
        {event.leagueBadgeUrl && (
          <Image
            source={{ uri: logoThumb(event.leagueBadgeUrl) }}
            style={{ width: 18, height: 18 }}
            tintColor={badgeTint}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        <Text
          numberOfLines={1}
          className="flex-1 text-[11px] font-bold uppercase tracking-wider text-ink-secondary"
        >
          {[event.leagueName, event.round].filter(Boolean).join(" · ")}
        </Text>
        <View className="flex-row gap-1.5">
          <IconAction
            icon="calendar-outline"
            label={t("event.addToCalendar")}
            onPress={onCalendar}
          />
          <IconAction
            icon="share-outline"
            label={t("event.share")}
            onPress={onShare}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-start">
        <TeamSide
          name={event.homeTeamName ?? ""}
          logoUrl={event.homeTeamLogoUrl ?? null}
          teamId={event.homeTeamId}
        />
        <View className="min-w-[110px] items-center pt-1.5">
          <Text
            className="text-[30px] font-extrabold tracking-tight text-ink"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {hasScore ? `${header.home} – ${header.away}` : "–"}
          </Text>
          <View className="mt-0.5">{state}</View>
        </View>
        <TeamSide
          name={event.awayTeamName ?? ""}
          logoUrl={event.awayTeamLogoUrl ?? null}
          teamId={event.awayTeamId}
        />
      </View>
      <Text className="mt-2.5 text-center text-[12px] text-ink-secondary">
        {formatDateTime(event.startsAt)}
        {event.venue ? ` · ${event.venue}` : ""}
      </Text>

      {hideChannel ? (
        <View className="h-3.5" />
      ) : (
        <View className="mb-3.5 mt-3.5 flex-row items-center gap-2.5 border-y border-line py-2.5">
          <Text className="text-[12.5px] text-ink-secondary">
            {t("event.broadcast")}
          </Text>
          <View className="flex-1 flex-row flex-wrap items-center justify-end gap-2">
            {channels.length === 0 ? (
              <Text className="text-[13px] font-semibold text-ink">–</Text>
            ) : (
              channels.map((channel) => {
                const logo = channel.logoUrl
                  ? { uri: channel.logoUrl }
                  : channelLogo(channel.name);
                return (
                  <View key={channel.id} className="flex-row items-center gap-1.5">
                    {logo && (
                      <View className="h-[22px] w-12 items-center justify-center rounded bg-white">
                        <Image
                          source={logo}
                          style={{ width: 44, height: 20 }}
                          contentFit="contain"
                        />
                      </View>
                    )}
                    <Text className="text-[13px] font-semibold text-ink">
                      {channel.name}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      <View className="mb-2.5 flex-row flex-wrap gap-1.5">
        {tabs.map((x) => {
          const on = x.key === tab;
          return (
            <Pressable
              key={x.key}
              onPress={() => setPicked(x.key)}
              className={`rounded-pill border px-3 py-1.5 ${on ? "border-ink bg-ink" : "border-line bg-surface"}`}
            >
              <Text
                className={`text-xs font-semibold ${on ? "text-background" : "text-ink-secondary"}`}
              >
                {x.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "events" && <LiveMatchCard event={event} flat />}
      {tab === "lineup" && <LineupCard event={event} flat />}
      {tab === "stats" && <MatchStatsCard event={event} flat />}
      {(tab === "periods" || tab === "team" || tab === "players") && (
        <BoxScoreCard event={event} view={tab} />
      )}
      {tab === "standings" && <LeagueStandingsCard event={event} flat />}

      {tab === "info" && (
        <>
          <InfoRow
            label={t("event.motorsport.start")}
            value={formatDateTime(event.startsAt)}
          />
          {event.venue && (
            <InfoRow label={t("event.venue")} value={event.venue} />
          )}
          <InfoRow
            label={t("event.reminders")}
            value={
              reminders.length === 0
                ? t("event.noReminders")
                : reminders
                    .map((d) => formatDateTime(d.toISOString()))
                    .join("\n")
            }
            last
          />
          <PreMatchCard event={event} flat />
          <BriefingCard event={event} flat />
          <View className="mt-4">{actions}</View>
        </>
      )}
    </View>
  );
}
