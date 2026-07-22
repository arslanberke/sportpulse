import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { useEventResults } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { SessionEntry, SportEvent } from "@/types";

function ResultRow({ entry }: { entry: SessionEntry }) {
  const colors = useThemeColors();
  const podium = entry.position <= 3;
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface-raised px-3 py-2.5">
      <View
        className="h-7 w-7 items-center justify-center rounded-lg"
        style={{
          backgroundColor: podium ? `${colors.primary}1F` : "transparent",
        }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: podium ? colors.primary : colors.inkSecondary }}
        >
          {entry.position}
        </Text>
      </View>
      <Text numberOfLines={1} className="flex-1 text-sm font-medium text-ink">
        {entry.name}
      </Text>
      {entry.team && (
        <Text numberOfLines={1} className="text-xs text-ink-secondary">
          {entry.team}
        </Text>
      )}
    </View>
  );
}

/**
 * Motorsport session classification (F1). Renders nothing until a session has
 * run and ESPN has published its result.
 */
export function ResultsCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: results } = useEventResults(event);

  if (event.sportId !== "f1" && event.sportId !== "motogp") return null;
  if (!results || results.entries.length === 0) return null;

  return (
    <Card className="mb-4" index={index}>
      <View className="mb-3 flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colors.primary}1F` }}
        >
          <Ionicons name="flag" size={18} color={colors.primary} />
        </View>
        <Text className="text-base font-semibold text-ink">
          {t("event.results")}
        </Text>
      </View>
      <View className="gap-2">
        {results.entries.map((entry) => (
          <ResultRow key={entry.position} entry={entry} />
        ))}
      </View>
    </Card>
  );
}
