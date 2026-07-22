import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { MotorsportRow } from "@/features/events/components/motorsport-row";
import { useEventStandings } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { SportEvent } from "@/types";

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
          <MotorsportRow
            key={entry.position}
            position={entry.position}
            name={entry.name}
            team={entry.team}
            photoUrl={entry.photoUrl}
            teamLogoUrl={entry.teamLogoUrl}
            points={entry.points}
            highlight={entry.position === 1}
            fullBody={event.sportId === "motogp"}
          />
        ))}
      </View>
    </Card>
  );
}
