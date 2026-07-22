import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Fragment } from "react";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { useEventLeagueStandings } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { ConferenceStandings, SportEvent } from "@/types";

function ConferenceTable({ conference }: { conference: ConferenceStandings }) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        {conference.name}
      </Text>
      {/* Column header */}
      <View className="mb-1 flex-row items-center px-1">
        <Text className="w-5 text-[11px] font-medium text-ink-secondary">#</Text>
        <View className="flex-1" />
        <Text className="w-8 text-center text-[11px] font-medium text-ink-secondary">
          {t("event.standings.w")}
        </Text>
        <Text className="w-8 text-center text-[11px] font-medium text-ink-secondary">
          {t("event.standings.l")}
        </Text>
        <Text className="w-12 text-right text-[11px] font-medium text-ink-secondary">
          {t("event.standings.pct")}
        </Text>
        <Text className="w-10 text-right text-[11px] font-medium text-ink-secondary">
          {t("event.standings.gb")}
        </Text>
      </View>
      <View className="gap-1.5">
        {conference.entries.map((e, i) => {
          // Top 8 seeds make the playoffs/play-in; give them a subtle emphasis.
          const inPlayoffs = e.seed >= 1 && e.seed <= 8;
          return (
            <View
              key={`${e.team}-${i}`}
              className="flex-row items-center rounded-lg px-1 py-1"
              style={
                inPlayoffs
                  ? { backgroundColor: `${colors.primary}12` }
                  : undefined
              }
            >
              <Text className="w-5 text-xs font-semibold text-ink-secondary">
                {e.seed || i + 1}
              </Text>
              {e.teamLogoUrl ? (
                <Image
                  source={{ uri: e.teamLogoUrl }}
                  style={{ width: 22, height: 22, marginRight: 8 }}
                  contentFit="contain"
                />
              ) : (
                <View style={{ width: 22, height: 22, marginRight: 8 }} />
              )}
              <Text
                className="flex-1 text-sm text-ink"
                numberOfLines={1}
                style={{ fontWeight: inPlayoffs ? "600" : "400" }}
              >
                {e.team}
              </Text>
              <Text className="w-8 text-center text-sm text-ink">{e.wins}</Text>
              <Text className="w-8 text-center text-sm text-ink-secondary">
                {e.losses}
              </Text>
              <Text className="w-12 text-right text-sm text-ink">{e.winPct}</Text>
              <Text className="w-10 text-right text-xs text-ink-secondary">
                {e.gamesBehind}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Team-league (basketball) conference standings for the event's league.
 * Renders nothing for other sports or uncovered leagues.
 */
export function LeagueStandingsCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data: standings } = useEventLeagueStandings(event);

  if (event.sportId !== "basketball") return null;
  if (!standings || standings.conferences.length === 0) return null;

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
          {t("event.leagueStandings")}
        </Text>
        <Text className="ml-auto text-xs text-ink-secondary">
          {standings.season}
        </Text>
      </View>
      <View className="gap-4">
        {standings.conferences.map((conference, i) => (
          <Fragment key={conference.name}>
            <ConferenceTable conference={conference} />
            {i < standings.conferences.length - 1 ? (
              <View className="h-px bg-line" />
            ) : null}
          </Fragment>
        ))}
      </View>
    </Card>
  );
}
