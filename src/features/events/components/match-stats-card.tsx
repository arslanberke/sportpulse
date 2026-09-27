import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { useThemeColors } from "@/constants/theme";
import { useEventStats } from "@/features/events/hooks/use-events";
import { useI18n, type Translate } from "@/lib/i18n";
import type { MatchStatRow, SportEvent } from "@/types";

/** BSD stat key -> i18n label key. Unlisted keys are skipped. */
const STAT_LABELS: Record<string, Parameters<Translate>[0]> = {
  ball_possession: "event.stat.possession",
  expected_goals: "event.stat.xg",
  expected_goals_on_target: "event.stat.xgot",
  total_shots: "event.stat.shots",
  shots_on_target: "event.stat.shotsOnTarget",
  big_chances: "event.stat.bigChances",
  corner_kicks: "event.stat.corners",
  fouls: "event.stat.fouls",
  passes: "event.stat.passes",
  pass_accuracy_pct: "event.stat.passAccuracy",
  offsides: "event.stat.offsides",
  yellow_cards: "event.stat.yellowCards",
  red_cards: "event.stat.redCards",
  goalkeeper_saves: "event.stat.saves",
};

const PCT_KEYS = new Set(["ball_possession", "pass_accuracy_pct"]);

/** Rating pill color: green >= 7, amber >= 6, red below. */
export function ratingColor(rating: number): string {
  if (rating >= 7) return "#16a34a";
  if (rating >= 6) return "#ca8a04";
  return "#dc2626";
}

function formatStat(key: string, value: number | null): string {
  if (value === null) return "–";
  if (PCT_KEYS.has(key)) return `${Math.round(value)}%`;
  if (key.startsWith("expected_goals")) return value.toFixed(2);
  return String(Math.round(value));
}

function StatRow({ row }: { row: MatchStatRow }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const home = row.home ?? 0;
  const away = row.away ?? 0;
  const total = home + away;
  const homeFlex = total > 0 ? home / total : 0.5;
  return (
    <View className="gap-1">
      <View className="flex-row items-center">
        <Text className="w-12 text-sm font-semibold text-ink">
          {formatStat(row.key, row.home)}
        </Text>
        <Text
          numberOfLines={1}
          className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
        >
          {t(STAT_LABELS[row.key])}
        </Text>
        <Text className="w-12 text-right text-sm font-semibold text-ink">
          {formatStat(row.key, row.away)}
        </Text>
      </View>
      <View className="flex-row gap-1">
        <View className="h-1 flex-1 flex-row justify-end overflow-hidden rounded-full bg-surface-raised">
          <View
            style={{
              flex: homeFlex,
              backgroundColor: colors.primary,
              borderRadius: 4,
            }}
          />
        </View>
        <View className="h-1 flex-1 flex-row overflow-hidden rounded-full bg-surface-raised">
          <View
            style={{
              flex: total > 0 ? away / total : 0.5,
              backgroundColor: "#D4AF37",
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Team statistics for BSD-backed football matches once the game has kicked
 * off (possession, xG, shots, ...). Hidden entirely when the provider has
 * no stats for the match.
 */
export function MatchStatsCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: stats, isLoading } = useEventStats(event);

  if (event.sportId !== "football" || !event.externalIds.bsd) return null;
  if (new Date(event.startsAt).getTime() > new Date().getTime()) return null;
  if (!stats || stats.rows.length === 0) {
    if (isLoading) {
      return (
        <Card className="mb-4" index={index}>
          <SectionHeader
            icon="stats-chart"
            label={t("event.stats")}
            tint={colors.primary}
          />
          <Text className="text-sm text-ink-secondary">
            {t("event.statsLoading")}
          </Text>
        </Card>
      );
    }
    return null;
  }

  const rows = stats.rows.filter((row) => STAT_LABELS[row.key]);
  return (
    <Card className="mb-4" index={index}>
      <SectionHeader
        icon="stats-chart"
        label={t("event.stats")}
        tint={colors.primary}
      />
      <View className="gap-3">
        {rows.map((row) => (
          <StatRow key={row.key} row={row} />
        ))}
      </View>
      <View className="mt-3 flex-row items-center gap-1.5">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
        <Text className="mr-3 text-[11px] font-medium text-ink-secondary">
          {event.homeTeamName ?? ""}
        </Text>
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#D4AF37" }}
        />
        <Text className="text-[11px] font-medium text-ink-secondary">
          {event.awayTeamName ?? ""}
        </Text>
      </View>
    </Card>
  );
}

/** Small colored pill showing a player's match rating. */
export function RatingPill({ rating }: { rating: number }) {
  return (
    <View
      className="min-w-5 items-center justify-center rounded px-1 py-px"
      style={{ backgroundColor: ratingColor(rating) }}
    >
      <Text className="text-[9px] font-bold text-white">
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}
