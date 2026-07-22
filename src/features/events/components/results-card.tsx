import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { MotorsportRow } from "@/features/events/components/motorsport-row";
import { useEventResults } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { SportEvent } from "@/types";

/**
 * Motorsport session classification (F1 / MotoGP). Renders nothing until a
 * session has run and the provider has published its result.
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
          <MotorsportRow
            key={entry.position}
            position={entry.position}
            name={entry.name}
            team={entry.team}
            photoUrl={entry.photoUrl}
            teamLogoUrl={entry.teamLogoUrl}
            highlight={entry.position <= 3}
            fullBody={event.sportId === "motogp"}
          />
        ))}
      </View>
    </Card>
  );
}
