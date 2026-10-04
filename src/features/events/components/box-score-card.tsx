import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { useThemeColors } from "@/constants/theme";
import { useEventBoxScore } from "@/features/events/hooks/use-events";
import { useI18n, type Translate } from "@/lib/i18n";
import type { BoxPlayer } from "@/services/providers/espn-boxscore";
import type { SportEvent } from "@/types";

type Tab = "periods" | "team" | "players";

const STAT_LABELS: Record<string, Parameters<Translate>[0]> = {
  "fieldGoalsMade-fieldGoalsAttempted": "event.box.fg",
  fieldGoalPct: "event.box.fgPct",
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted": "event.box.three",
  threePointFieldGoalPct: "event.box.threePct",
  "freeThrowsMade-freeThrowsAttempted": "event.box.ft",
  totalRebounds: "event.box.reb",
  assists: "event.box.ast",
  steals: "event.box.stl",
  blocks: "event.box.blk",
  turnovers: "event.box.to",
  pointsInPaint: "event.box.paint",
  fastBreakPoints: "event.box.fastBreak",
  largestLead: "event.box.largestLead",
};

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-pill border px-3 py-1.5 ${on ? "border-ink bg-ink" : "border-line bg-surface"}`}
    >
      <Text
        numberOfLines={1}
        className={`text-xs font-semibold ${on ? "text-background" : "text-ink-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Cell({ value, bold = false, wide = false }: { value: string | number; bold?: boolean; wide?: boolean }) {
  return (
    <Text
      className={`${wide ? "w-10" : "w-8"} text-right text-[13px] ${bold ? "font-bold text-ink" : "text-ink-secondary"}`}
    >
      {value}
    </Text>
  );
}

function Headshot({ player }: { player: BoxPlayer }) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  const initials = player.name.split(/[\s.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
  return (
    <View
      className="mr-2.5 h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: `${colors.primary}26` }}
    >
      {player.photoUrl && !failed ? (
        <Image
          source={{ uri: player.photoUrl }}
          onError={() => setFailed(true)}
          style={{ position: "absolute", top: 0, width: 41, height: 30 }}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
          recyclingKey={player.photoUrl}
          transition={120}
        />
      ) : (
        <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

function PlayerRow({ player, last }: { player: BoxPlayer; last: boolean }) {
  return (
    <View className={`flex-row items-center py-2 ${last ? "" : "border-b border-line"}`}>
      <Headshot player={player} />
      <View className="flex-1 flex-row items-baseline gap-1.5">
        <Text numberOfLines={1} className="shrink text-[13px] font-semibold text-ink">
          {player.name}
        </Text>
        {player.position && (
          <Text className="text-[11px] text-ink-tertiary">{player.position}</Text>
        )}
      </View>
      <Cell value={player.minutes} />
      <Cell value={player.points} bold />
      <Cell value={player.rebounds} />
      <Cell value={player.assists} />
    </View>
  );
}

/** NBA box score: quarter scores, team stats and per-player lines (ESPN). */
export function BoxScoreCard({ event, index }: { event: SportEvent; index?: number }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: box } = useEventBoxScore(event);
  const [tab, setTab] = useState<Tab>("periods");
  const [side, setSide] = useState<"home" | "away">("home");

  if (!box) return null;

  const homeName = event.homeTeamName ?? "";
  const awayName = event.awayTeamName ?? "";
  const periodCount = Math.max(box.periods.home.length, box.periods.away.length);
  const periodLabel = (i: number) => (i < 4 ? String(i + 1) : `${t("event.box.ot")}${i > 4 ? i - 3 : ""}`);
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const tabs: { key: Tab; label: string }[] = [
    ...(periodCount > 0 ? [{ key: "periods" as const, label: t("event.box.periods") }] : []),
    ...(box.teamStats.length > 0 ? [{ key: "team" as const, label: t("event.box.team") }] : []),
    ...(box.players.home.length + box.players.away.length > 0
      ? [{ key: "players" as const, label: t("event.box.players") }]
      : []),
  ];
  if (tabs.length === 0) return null;
  const active = tabs.some((x) => x.key === tab) ? tab : tabs[0].key;
  const players = box.players[side];

  return (
    <Card className="mb-4" index={index}>
      <SectionHeader icon="stats-chart" label={t("event.stats")} tint={colors.primaryDark} />
      <View className="mb-2.5 flex-row gap-1.5">
        {tabs.map((x) => (
          <Chip key={x.key} label={x.label} on={x.key === active} onPress={() => setTab(x.key)} />
        ))}
      </View>

      {active === "periods" && (
        <View>
          <View className="flex-row items-center border-b border-line py-2">
            <View className="flex-1" />
            {Array.from({ length: periodCount }, (_, i) => (
              <Cell key={i} value={periodLabel(i)} />
            ))}
            <Cell value={t("event.box.total")} wide bold />
          </View>
          {(["home", "away"] as const).map((s, row) => (
            <View
              key={s}
              className={`flex-row items-center py-2.5 ${row === 0 ? "border-b border-line" : ""}`}
            >
              <Text numberOfLines={1} className="flex-1 text-[13px] font-semibold text-ink">
                {s === "home" ? homeName : awayName}
              </Text>
              {Array.from({ length: periodCount }, (_, i) => (
                <Cell key={i} value={box.periods[s][i] ?? "–"} />
              ))}
              <Cell value={total(box.periods[s])} wide bold />
            </View>
          ))}
        </View>
      )}

      {active === "team" && (
        <View>
          <View className="flex-row border-b border-line py-2">
            <Text numberOfLines={1} className="w-24 text-xs font-bold text-ink-secondary">{homeName}</Text>
            <View className="flex-1" />
            <Text numberOfLines={1} className="w-24 text-right text-xs font-bold text-ink-secondary">{awayName}</Text>
          </View>
          {box.teamStats.map((row, i) => (
            <View
              key={row.key}
              className={`flex-row items-center py-2.5 ${i < box.teamStats.length - 1 ? "border-b border-line" : ""}`}
            >
              <Text className="w-16 text-[13px] font-semibold text-ink">{row.home}</Text>
              <Text numberOfLines={1} className="flex-1 text-center text-[12.5px] text-ink-secondary">
                {t(STAT_LABELS[row.key])}
              </Text>
              <Text className="w-16 text-right text-[13px] font-semibold text-ink">{row.away}</Text>
            </View>
          ))}
        </View>
      )}

      {active === "players" && (
        <View>
          <View className="mb-1 flex-row gap-1.5">
            <Chip label={homeName} on={side === "home"} onPress={() => setSide("home")} />
            <Chip label={awayName} on={side === "away"} onPress={() => setSide("away")} />
          </View>
          <View className="flex-row border-b border-line py-2">
            <View className="flex-1" />
            <Cell value={t("event.box.colMin")} />
            <Cell value={t("event.box.colPts")} bold />
            <Cell value={t("event.box.colReb")} />
            <Cell value={t("event.box.colAst")} />
          </View>
          {players.map((p, i) => (
            <PlayerRow key={p.id} player={p} last={i === players.length - 1} />
          ))}
        </View>
      )}
    </Card>
  );
}
