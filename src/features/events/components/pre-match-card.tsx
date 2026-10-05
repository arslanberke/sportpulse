import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { FlatHeader } from "@/components/ui/section-header";
import { useThemeColors } from "@/constants/theme";
import { useTeamTables } from "@/features/catalog/hooks/use-catalog";
import { useTeamEvents } from "@/features/events/hooks/use-events";
import { LeagueTableBody } from "@/features/teams/components/league-table";
import { useI18n, type Translate } from "@/lib/i18n";
import type { SportEvent } from "@/types";

type Tab = "form" | "table";
type Outcome = "w" | "d" | "l";

const FORM_SIZE = 5;
const OUTCOME_COLORS: Record<Outcome, string> = {
  w: "#22a06b",
  d: "#8b8f98",
  l: "#e5484d",
};

interface FormGame {
  event: SportEvent;
  outcome: Outcome;
}

/** Son `FORM_SIZE` sonuclanmis mac, eskiden yeniye. */
function recentForm(
  teamId: string,
  events: SportEvent[],
  before: string,
): FormGame[] {
  return events
    .filter(
      (e) =>
        e.startsAt < before &&
        e.homeScore != null &&
        e.awayScore != null &&
        (e.homeTeamId === teamId || e.awayTeamId === teamId),
    )
    .slice(-FORM_SIZE)
    .map((event) => {
      const home = event.homeTeamId === teamId;
      const own = (home ? event.homeScore : event.awayScore) ?? 0;
      const other = (home ? event.awayScore : event.homeScore) ?? 0;
      return {
        event,
        outcome: own > other ? "w" : own < other ? "l" : "d",
      };
    });
}

function lastLine(game: FormGame | undefined, t: Translate): string | null {
  if (!game) return null;
  const e = game.event;
  return t("event.preMatch.last", {
    match: `${e.homeTeamName ?? ""} ${e.homeScore}–${e.awayScore} ${e.awayTeamName ?? ""}`,
  });
}

function TeamForm({
  name,
  logoUrl,
  games,
}: {
  name: string;
  logoUrl: string | null | undefined;
  games: FormGame[];
}) {
  const { t } = useI18n();
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
          />
        ) : (
          <View style={{ width: 20, height: 20 }} />
        )}
        <Text className="flex-1 text-sm font-semibold text-ink" numberOfLines={1}>
          {name}
        </Text>
        <View className="flex-row gap-1">
          {games.map((g) => (
            <View
              key={g.event.id}
              className="h-5 w-5 items-center justify-center rounded-md"
              style={{ backgroundColor: OUTCOME_COLORS[g.outcome] }}
            >
              <Text className="text-[11px] font-bold text-white">
                {t(`table.${g.outcome}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text className="text-xs text-ink-secondary" numberOfLines={2}>
        {lastLine(games[games.length - 1], t) ?? t("event.preMatch.noForm")}
      </Text>
    </View>
  );
}

/**
 * Futbol maci oncesi: iki takimin son bes maci ve ligdeki yerleri. Form
 * veritabanindaki sonuclardan, puan tablosu takim sayfasindaki kaynaktan
 * gelir. Iki veri de yoksa kart cizilmez.
 */
export function PreMatchCard({
  event,
  index,
  flat = false,
}: {
  event: SportEvent;
  index?: number;
  flat?: boolean;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [tab, setTab] = useState<Tab>("form");
  const eligible =
    event.sportId === "football" &&
    event.status === "scheduled" &&
    event.resultStatus !== "finished" &&
    Boolean(event.homeTeamId && event.awayTeamId);

  const home = useTeamEvents(eligible ? event.homeTeamId! : undefined);
  const away = useTeamEvents(eligible ? event.awayTeamId! : undefined);
  const tables = useTeamTables(
    eligible && tab === "table" ? event.homeTeamId! : undefined,
  );

  if (!eligible) return null;

  const homeForm = recentForm(event.homeTeamId!, home.events, event.startsAt);
  const awayForm = recentForm(event.awayTeamId!, away.events, event.startsAt);
  const formLoading = home.isLoading || away.isLoading;
  const table = (tables.data ?? []).find((x) => x.leagueId === event.leagueId);

  const tabs: [Tab, string][] = [
    ["form", t("event.preMatch.form")],
    ["table", t("event.preMatch.table")],
  ];

  return (
    <Card className="mb-4" index={index} flat={flat}>
      {flat ? (
        <FlatHeader label={t("event.preMatch.title")} />
      ) : (
        <View className="mb-3 flex-row items-center gap-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${colors.primary}1F` }}
          >
            <Ionicons name="stats-chart" size={18} color={colors.primaryDark} />
          </View>
          <Text className="text-base font-semibold text-ink">
            {t("event.preMatch.title")}
          </Text>
        </View>
      )}

      <View className="mb-4 flex-row gap-2">
        {tabs.map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center rounded-pill border py-1.5"
              style={{
                backgroundColor: active ? colors.ink : "transparent",
                borderColor: active ? colors.ink : colors.border,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: active ? colors.surface : colors.ink }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "form" ? (
        formLoading ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : (
          <View className="gap-4">
            <TeamForm
              name={event.homeTeamName ?? ""}
              logoUrl={event.homeTeamLogoUrl}
              games={homeForm}
            />
            <TeamForm
              name={event.awayTeamName ?? ""}
              logoUrl={event.awayTeamLogoUrl}
              games={awayForm}
            />
            <Text className="text-xs text-ink-tertiary">
              {t("event.preMatch.legend")}
            </Text>
          </View>
        )
      ) : tables.isLoading ? (
        <ActivityIndicator color={colors.primaryDark} />
      ) : table ? (
        <LeagueTableBody
          table={table}
          highlightTeams={[event.homeTeamName ?? null, event.awayTeamName ?? null]}
        />
      ) : (
        <Text className="text-sm text-ink-secondary">{t("team.noStandings")}</Text>
      )}
    </Card>
  );
}
