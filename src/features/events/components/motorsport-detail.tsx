import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useLogoTint } from "@/constants/logo-tint";
import { useThemeColors } from "@/constants/theme";
import { formatCountdown } from "@/features/events/components/event-card";
import { MotorsportRow } from "@/features/events/components/motorsport-row";
import {
  useEventResults,
  useEventStandings,
} from "@/features/events/hooks/use-events";
import { channelLogo } from "@/features/events/lib/channel-logo";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { logoThumb } from "@/lib/logo-thumb";
import { useNow } from "@/lib/now";
import type { SportEvent } from "@/types";

type Tab = "results" | "standings" | "info";

const STANDINGS_PREVIEW = 10;

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
 * Flat 22f layout for F1/MotoGP sessions: plain header, one line per channel,
 * then results / standings / info tabs of borderless rows.
 */
export function MotorsportDetail({
  event,
  reminders,
  actions,
}: {
  event: SportEvent;
  reminders: Date[];
  actions: ReactNode;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const { data: results } = useEventResults(event);
  const { data: standings } = useEventStandings(event);
  const badgeTint = useLogoTint(event.leagueBadgeUrl);
  const [picked, setPicked] = useState<Tab | null>(null);
  const [allStandings, setAllStandings] = useState(false);

  const hasResults = Boolean(results && results.entries.length > 0);
  const hasStandings = Boolean(standings && standings.entries.length > 0);
  const tabs: { key: Tab; label: string }[] = [
    ...(hasResults
      ? [
          {
            key: "results" as const,
            label: t(results?.live ? "event.liveOrder" : "event.results"),
          },
        ]
      : []),
    ...(hasStandings
      ? [{ key: "standings" as const, label: t("event.standings") }]
      : []),
    { key: "info", label: t("event.motorsport.info") },
  ];
  const tab =
    picked && tabs.some((x) => x.key === picked) ? picked : tabs[0].key;
  const fullBody = event.sportId === "motogp";
  const channels = event.channels ?? [];

  const state = results?.live ? (
    <Text className="text-[12.5px] font-bold" style={{ color: colors.live }}>
      ● {t("home.live")}
      <Text className="font-medium text-ink-secondary">
        {"  ·  "}
        {t("event.motorsport.refreshing")}
      </Text>
    </Text>
  ) : hasResults ? (
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

  const standingRows = allStandings
    ? (standings?.entries ?? [])
    : (standings?.entries ?? []).slice(0, STANDINGS_PREVIEW);

  return (
    <View className="pt-2">
      <View className="flex-row items-center gap-1.5">
        {event.leagueBadgeUrl && (
          <Image
            source={{ uri: logoThumb(event.leagueBadgeUrl) }}
            style={{ width: 20, height: 20 }}
            tintColor={badgeTint}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        {event.leagueName && (
          <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
            {event.leagueName}
          </Text>
        )}
      </View>
      <Text className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
        {event.title}
      </Text>
      <Text className="mt-0.5 text-[12.5px] text-ink-secondary">
        {formatDateTime(event.startsAt)}
        {event.venue ? ` · ${event.venue}` : ""}
      </Text>
      <View className="mt-3">{state}</View>

      <View className="mb-3.5 mt-3.5 border-y border-line">
        {channels.length === 0 ? (
          <Text className="py-3 text-[13px] text-ink-secondary">
            {t("event.noChannel")}
          </Text>
        ) : (
          channels.map((channel, i) => {
            const logo = channel.logoUrl
              ? { uri: channel.logoUrl }
              : channelLogo(channel.name);
            return (
              <View
                key={channel.id}
                className={`flex-row items-center gap-2.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}
              >
                {logo ? (
                  <View className="h-[22px] w-12 items-center justify-center rounded bg-white">
                    <Image
                      source={logo}
                      style={{ width: 44, height: 20 }}
                      contentFit="contain"
                    />
                  </View>
                ) : (
                  <Ionicons
                    name="tv-outline"
                    size={18}
                    color={colors.inkSecondary}
                  />
                )}
                <Text className="flex-1 text-[13px] font-semibold text-ink">
                  {channel.name}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View className="mb-2.5 flex-row gap-1.5">
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

      {tab === "results" && results && (
        <>
          <View className="mx-0.5 mb-1 mt-2 flex-row justify-between">
            <Text className="text-xs font-bold text-ink-secondary">
              {t(results.live ? "event.liveOrder" : "event.results")}
            </Text>
            <Text className="text-xs text-ink-tertiary">
              {t("event.motorsport.entries", { count: results.entries.length })}
            </Text>
          </View>
          {results.entries.map((entry, i) => (
            <MotorsportRow
              key={entry.position}
              position={entry.position}
              name={entry.name}
              team={entry.team}
              photoUrl={entry.photoUrl}
              teamLogoUrl={entry.teamLogoUrl}
              highlight={entry.position <= 3}
              last={i === results.entries.length - 1}
              fullBody={fullBody}
            />
          ))}
        </>
      )}

      {tab === "standings" && standings && (
        <>
          <View className="mx-0.5 mb-1 mt-2 flex-row justify-between">
            <Text className="text-xs font-bold text-ink-secondary">
              {t("event.standings")} {standings.season}
            </Text>
            <Text className="text-xs text-ink-tertiary">
              {t("event.motorsport.points")}
            </Text>
          </View>
          {standingRows.map((entry, i) => (
            <MotorsportRow
              key={entry.position}
              position={entry.position}
              name={entry.name}
              team={entry.team}
              photoUrl={entry.photoUrl}
              teamLogoUrl={entry.teamLogoUrl}
              points={entry.points}
              highlight={entry.position <= 3}
              last={i === standingRows.length - 1}
              fullBody={fullBody}
            />
          ))}
          {standings.entries.length > STANDINGS_PREVIEW && (
            <Pressable
              onPress={() => setAllStandings((v) => !v)}
              className="items-center py-2.5"
            >
              <Text
                className="text-[12.5px] font-semibold"
                style={{ color: colors.primaryDark }}
              >
                {t(
                  allStandings
                    ? "event.motorsport.showLess"
                    : "event.motorsport.showAll",
                )}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {tab === "info" && (
        <>
          <InfoRow
            label={t("event.motorsport.start")}
            value={formatDateTime(event.startsAt)}
          />
          {event.venue && (
            <InfoRow label={t("event.motorsport.venue")} value={event.venue} />
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
          <View className="mt-4">{actions}</View>
        </>
      )}
    </View>
  );
}
