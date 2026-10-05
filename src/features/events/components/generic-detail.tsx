import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { InfoLine, PillTabs } from "@/components/ui/flat";
import { useThemeColors } from "@/constants/theme";
import { BracketCard } from "@/features/events/components/bracket-card";
import { BriefingCard } from "@/features/events/components/briefing-card";
import { formatCountdown } from "@/features/events/components/event-card";
import { LeagueStandingsCard } from "@/features/events/components/league-standings-card";
import { LiveMatchCard } from "@/features/events/components/live-match-card";
import { MatchStatsCard } from "@/features/events/components/match-stats-card";
import { channelLogo } from "@/features/events/lib/channel-logo";
import { isEventOver } from "@/features/events/lib/event-duration";
import { splitUfcTitle } from "@/features/events/lib/ufc-title";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { logoThumb } from "@/lib/logo-thumb";
import { useNow } from "@/lib/now";
import type { SportEvent } from "@/types";

type Tab = "overview" | "info";

function Competitor({
  name,
  logoUrl,
  rank,
  score,
  leading,
  live,
  href,
}: {
  name: string;
  logoUrl: string | null | undefined;
  rank: number | null | undefined;
  score: number | null | undefined;
  leading: boolean;
  live: boolean;
  href: string | null;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={href ? () => router.push(href as never) : undefined}
      disabled={!href}
      className="min-h-[48px] flex-row items-center gap-2.5 border-b border-line py-2 active:opacity-60"
    >
      {leading && live && (
        <View
          pointerEvents="none"
          className="absolute bottom-2 top-2 w-0.5 rounded-sm bg-live"
          style={{ left: -10 }}
        />
      )}
      {logoUrl ? (
        <Image
          source={{ uri: logoThumb(logoUrl) }}
          style={{ width: 26, height: 26, borderRadius: 13 }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : (
        <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-line">
          <Ionicons name="person" size={14} color={colors.inkTertiary} />
        </View>
      )}
      <Text
        className={`flex-1 text-[15px] text-ink ${leading ? "font-extrabold" : "font-semibold"}`}
        numberOfLines={1}
      >
        {name}
        {rank != null ? (
          <Text className="text-[11px] font-medium text-ink-tertiary">{`  #${rank}`}</Text>
        ) : null}
      </Text>
      {score != null && (
        <Text
          className="text-[20px] font-extrabold"
          style={{
            color: live ? colors.live : leading ? colors.ink : colors.inkSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {score}
        </Text>
      )}
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

/**
 * Flat 22f layout for every other event (tennis, UFC, volleyball, …): league
 * line with icon actions, competitors or title, one channel line, then
 * overview / info tabs of borderless rows. Same language as `MatchDetail`.
 */
export function GenericDetail({
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
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("overview");

  const channels = event.channels ?? [];
  const over = isEventOver(event, now);
  const started = new Date(event.startsAt).getTime() <= now.getTime();
  const live = event.status === "scheduled" && started && !over;
  const ufc = event.sportId === "ufc" ? splitUfcTitle(event.title) : null;
  const hasScore = event.homeScore != null && event.awayScore != null;
  const duel = Boolean(event.homeTeamName && event.awayTeamName);
  const homeLeads = hasScore && (event.homeScore ?? 0) > (event.awayScore ?? 0);
  const awayLeads = hasScore && (event.awayScore ?? 0) > (event.homeScore ?? 0);
  const sideHref = (playerId?: string | null, teamId?: string | null) =>
    playerId ? `/player/${playerId}` : teamId ? `/team/${teamId}` : null;

  const state = live ? (
    <Text className="text-[12.5px] font-bold" style={{ color: colors.live }}>
      ● {t("home.live")}
    </Text>
  ) : event.status !== "scheduled" ? (
    <Text className="text-[12.5px] font-semibold" style={{ color: colors.danger }}>
      {t(event.status === "postponed" ? "home.postponed" : "home.cancelled")}
    </Text>
  ) : over ? (
    <Text className="text-[12.5px] font-semibold text-ink-secondary">{t("home.finished")}</Text>
  ) : (
    <Text className="text-[12.5px] font-semibold text-ink">
      {formatCountdown(event.startsAt, t, now, event.endsAt)}
    </Text>
  );

  return (
    <View className="pt-2">
      <View className="flex-row items-center gap-1.5">
        {event.leagueBadgeUrl && (
          <Image
            source={{ uri: logoThumb(event.leagueBadgeUrl) }}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        <Text
          className="flex-1 text-[11px] font-bold uppercase tracking-wider text-ink-secondary"
          numberOfLines={1}
        >
          {[event.leagueName, event.round].filter(Boolean).join(" · ")}
        </Text>
        <IconAction icon="calendar-outline" label={t("event.addToCalendar")} onPress={onCalendar} />
        <IconAction icon="share-outline" label={t("event.share")} onPress={onShare} />
      </View>

      {duel ? (
        <View className="mt-2 border-t border-line">
          <Competitor
            name={event.homeTeamName ?? ""}
            logoUrl={event.homeTeamLogoUrl}
            rank={event.homePlayerRank}
            score={event.homeScore}
            leading={homeLeads}
            live={live}
            href={sideHref(event.homePlayerId, event.homeTeamId)}
          />
          <Competitor
            name={event.awayTeamName ?? ""}
            logoUrl={event.awayTeamLogoUrl}
            rank={event.awayPlayerRank}
            score={event.awayScore}
            leading={awayLeads}
            live={live}
            href={sideHref(event.awayPlayerId, event.awayTeamId)}
          />
        </View>
      ) : (
        <>
          {ufc && (
            <Text className="mt-2 text-[12.5px] font-black uppercase tracking-widest text-ink-secondary">
              {ufc.card}
            </Text>
          )}
          <Text className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
            {ufc ? ufc.bout : event.title}
          </Text>
        </>
      )}
      <Text className="mt-2 text-[12.5px] text-ink-secondary">
        {formatDateTime(event.startsAt)}
        {event.venue ? ` · ${event.venue}` : ""}
      </Text>
      <View className="mt-2">{state}</View>

      {channels.length === 0 && over ? (
        <View className="h-3.5" />
      ) : (
        <View className="mb-3.5 mt-3.5 border-y border-line">
          {channels.length === 0 ? (
            <Text className="py-3 text-[13px] text-ink-secondary">{t("event.noChannel")}</Text>
          ) : (
            channels.map((channel, i) => {
              const logo = channel.logoUrl ? { uri: channel.logoUrl } : channelLogo(channel.name);
              return (
                <View
                  key={channel.id}
                  className={`flex-row items-center gap-2.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  {logo ? (
                    <View className="h-[22px] w-12 items-center justify-center rounded bg-white">
                      <Image source={logo} style={{ width: 44, height: 20 }} contentFit="contain" />
                    </View>
                  ) : (
                    <Ionicons name="tv-outline" size={18} color={colors.inkSecondary} />
                  )}
                  <Text className="flex-1 text-[13px] font-semibold text-ink">{channel.name}</Text>
                </View>
              );
            })
          )}
        </View>
      )}

      <PillTabs
        tabs={[
          { key: "overview", label: t("event.details") },
          { key: "info", label: t("event.motorsport.info") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <>
          <LiveMatchCard event={event} flat />
          <MatchStatsCard event={event} flat />
          <BriefingCard event={event} flat />
          <LeagueStandingsCard event={event} flat />
          <BracketCard event={event} flat />
        </>
      )}

      {tab === "info" && (
        <>
          <InfoLine label={t("event.motorsport.start")} value={formatDateTime(event.startsAt)} />
          <InfoLine label={t("event.motorsport.venue")} value={event.venue} />
          <InfoLine label={t("event.channel")} value={channels.map((c) => c.name).join(", ") || "–"} />
          <InfoLine
            label={t("event.reminders")}
            value={
              reminders.length === 0
                ? t("event.noReminders")
                : reminders.map((d) => formatDateTime(d.toISOString())).join("\n")
            }
            last
          />
          {actions ? <View className="mt-4">{actions}</View> : null}
        </>
      )}
    </View>
  );
}
