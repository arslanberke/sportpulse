import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { useEventBriefing } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { SportEvent } from "@/types";

/** Splits the model output into clean bullet lines (drops "-", "*", "•" markers). */
function toBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * AI "what to know" briefing, grounded in real form/head-to-head. Renders
 * nothing when the server has no grounded data to summarize.
 */
export function BriefingCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: briefing, isLoading } = useEventBriefing(event);

  if (!isLoading && !briefing) return null;

  const bullets = briefing ? toBullets(briefing) : [];

  return (
    <Card className="mb-4" index={index}>
      <View className="mb-3 flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colors.primary}1F` }}
        >
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <Text className="text-base font-semibold text-ink">
          {t("event.briefing")}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-sm text-ink-secondary">
            {t("event.briefingLoading")}
          </Text>
        </View>
      ) : (
        <View className="gap-2.5">
          {bullets.map((line, i) => (
            <View key={i} className="flex-row gap-2.5">
              <View
                className="mt-2 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <Text className="flex-1 text-sm leading-5 text-ink">{line}</Text>
            </View>
          ))}
          <Text className="mt-1 text-xs text-ink-secondary">
            {t("event.briefingSource")}
          </Text>
        </View>
      )}
    </Card>
  );
}
