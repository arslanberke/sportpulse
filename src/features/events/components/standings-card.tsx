import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { useEventStandings } from "@/features/events/hooks/use-events";
import { teamAccentColor } from "@/features/events/lib/motorsport-teams";
import { useI18n } from "@/lib/i18n";
import type { SportEvent, StandingEntry } from "@/types";

function StandingRow({ entry }: { entry: StandingEntry }) {
  const colors = useThemeColors();
  const leader = entry.position === 1;
  const accent = teamAccentColor(entry.team);
  return (
    <View className="flex-row items-center gap-3 overflow-hidden rounded-2xl bg-surface-raised py-2.5 pr-3">
      <View
        className="h-9 w-1 rounded-full"
        style={{ backgroundColor: accent ?? "transparent" }}
      />
      <View
        className="h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: leader ? `${colors.primary}1F` : "transparent" }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: leader ? colors.primary : colors.inkSecondary }}
        >
          {entry.position}
        </Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-ink">
          {entry.name}
        </Text>
        {entry.team && (
          <Text numberOfLines={1} className="text-xs text-ink-secondary">
            {entry.team}
          </Text>
        )}
      </View>
      <Text className="text-sm font-bold text-ink">{entry.points}</Text>
    </View>
  );
}

/**
 * Motorsport (F1/MotoGP) drivers'/riders' championship standings for the
 * event's season. Renders nothing for other sports or uncovered series.
 */
export function StandingsCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: standings } = useEventStandings(event);

  if (event.sportId !== "f1" && event.sportId !== "motogp") return null;
  if (!standings || standings.entries.length === 0) return null;

  return (
    <Card className="mb-4" index={index}>
      <View className="mb-3 flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colors.primary}1F` }}
        >
          <Ionicons name="podium" size={18} color={colors.primary} />
        </View>
        <Text className="text-base font-semibold text-ink">
          {t("event.standings")}
        </Text>
        <Text className="ml-auto text-xs text-ink-secondary">
          {standings.season}
        </Text>
      </View>
      <View className="gap-2">
        {standings.entries.map((entry) => (
          <StandingRow key={entry.position} entry={entry} />
        ))}
      </View>
    </Card>
  );
}
