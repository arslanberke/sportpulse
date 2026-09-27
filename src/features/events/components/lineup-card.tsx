import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import {
    countryFlag,
    LineupPitch,
} from "@/features/events/components/lineup-pitch";
import { RatingPill } from "@/features/events/components/match-stats-card";
import {
    useEventLineup,
    useEventStats
} from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import type { EventLineup, LineupPlayer, SportEvent } from "@/types";

function badge(player: LineupPlayer, keeper: string) {
  const marks: string[] = [];
  if (player.isCaptain) marks.push("C");
  if ((player.position ?? "").toLowerCase() === "goalkeeper") marks.push(keeper);
  return marks.length ? ` (${marks.join(", ")})` : "";
}

/** One player as it appears in the textual roster (flag · number · name). */
function RosterCell({
  player,
  align,
}: {
  player: LineupPlayer | undefined;
  align: "left" | "right";
}) {
  const { t } = useI18n();
  const router = useRouter();
  if (!player) return <View className="flex-1" />;
  const keeper = t("event.keeperShort");
  // BSD oyuncu kimligi sayisal; diger kaynaklarda id yerine ad tasiyan
  // satirlar profil sayfasina gidemez.
  const openProfile = /^\d+$/.test(player.id)
    ? () => router.push(`/football-player/${player.id}`)
    : undefined;
  const flag = countryFlag(player.countryCode);
  const num = (
    <Text className="w-6 text-center text-sm font-bold text-ink-secondary">
      {player.number ?? ""}
    </Text>
  );
  const name = (
    <Text
      numberOfLines={1}
      className={`flex-1 text-sm font-medium text-ink ${align === "right" ? "text-right" : ""}`}
    >
      {player.name}
      {badge(player, keeper)}
    </Text>
  );
  const flagText = <Text className="text-sm">{flag}</Text>;
  const rating =
    typeof player.rating === "number" ? (
      <RatingPill rating={player.rating} />
    ) : null;
  return (
    <Pressable
      onPress={openProfile}
      disabled={!openProfile}
      className="flex-1 flex-row items-center gap-1.5 active:opacity-60"
      accessibilityRole={openProfile ? 'button' : undefined}
    >
      {align === "left" ? (
        <>
          {flagText}
          {num}
          {name}
          {rating}
        </>
      ) : (
        <>
          {rating}
          {name}
          {num}
          {flagText}
        </>
      )}
    </Pressable>
  );
}

/** Two-column roster (home left, away right), paired row by row. */
function RosterColumns({
  home,
  away,
}: {
  home: LineupPlayer[];
  away: LineupPlayer[];
}) {
  const rows = Math.max(home.length, away.length);
  return (
    <View className="gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <RosterCell player={home[i]} align="left" />
          <RosterCell player={away[i]} align="right" />
        </View>
      ))}
    </View>
  );
}

function TeamHeader({
  name,
  badgeUrl,
  formation,
  align,
}: {
  name: string | null;
  badgeUrl: string | null;
  formation: string | null;
  align: "left" | "right";
}) {
  const logo = badgeUrl ? (
    <Image
      source={{ uri: badgeUrl }}
      style={{ width: 22, height: 22 }}
      contentFit="contain"
    />
  ) : null;
  return (
    <View
      className={`flex-1 flex-row items-center gap-2 ${align === "right" ? "justify-end" : ""}`}
    >
      {align === "left" && logo}
      <View className={align === "right" ? "items-end" : ""}>
        <Text numberOfLines={1} className="text-sm font-bold text-ink">
          {name ?? ""}
        </Text>
        {formation && (
          <Text className="text-xs font-medium text-ink-secondary">
            {formation}
          </Text>
        )}
      </View>
      {align === "right" && logo}
    </View>
  );
}

function LineupBody({
  lineup,
  event,
}: {
  lineup: EventLineup;
  event: SportEvent;
}) {
  const { t } = useI18n();
  const homeSubs = lineup.home.filter((p) => p.isSubstitute);
  const awaySubs = lineup.away.filter((p) => p.isSubstitute);
  const homeStart = lineup.home.filter((p) => !p.isSubstitute);
  const awayStart = lineup.away.filter((p) => !p.isSubstitute);

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <TeamHeader
          name={event.homeTeamName ?? null}
          badgeUrl={event.homeTeamLogoUrl ?? null}
          formation={lineup.homeFormation}
          align="left"
        />
        <TeamHeader
          name={event.awayTeamName ?? null}
          badgeUrl={event.awayTeamLogoUrl ?? null}
          formation={lineup.awayFormation}
          align="right"
        />
      </View>

      <LineupPitch home={lineup.home} away={lineup.away} />

      <RosterColumns home={homeStart} away={awayStart} />

      {(homeSubs.length > 0 || awaySubs.length > 0) && (
        <View className="gap-1.5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {t("event.substitutes")}
          </Text>
          <RosterColumns home={homeSubs} away={awaySubs} />
        </View>
      )}
    </View>
  );
}

/** Merges post-kickoff player ratings (keyed by provider id) into a lineup. */
function withRatings(
  lineup: EventLineup,
  stats: { ratings: Record<string, { rating: number }> } | null | undefined,
): EventLineup {
  if (!stats) return lineup;
  const merge = (list: LineupPlayer[]) =>
    list.map((p) => ({ ...p, rating: stats.ratings[p.id]?.rating ?? null }));
  return { ...lineup, home: merge(lineup.home), away: merge(lineup.away) };
}

/**
 * Confirmed match lineups for football events. Official lineups drop ~1h
 * before kickoff, so this shows a "not published yet" note until then and
 * fills in automatically once the provider has them.
 */
export function LineupCard({
  event,
  index,
}: {
  event: SportEvent;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const { data: lineup, isLoading, isError } = useEventLineup(event);
  const { data: stats } = useEventStats(event);

  if (event.sportId !== "football" || event.status !== "scheduled") return null;

  return (
    <Card className="mb-4" index={index}>
      <View className="mb-3 flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colors.primary}1F` }}
        >
          <Ionicons name="people" size={18} color={colors.primary} />
        </View>
        <Text className="text-base font-semibold text-ink">
          {t("event.lineups")}
        </Text>
      </View>

      {lineup ? (
        <LineupBody lineup={withRatings(lineup, stats)} event={event} />
      ) : isLoading ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-sm text-ink-secondary">
            {t("event.lineupsLoading")}
          </Text>
        </View>
      ) : (
        <Text className="text-sm text-ink-secondary">
          {isError
            ? t("event.lineupsError")
            : now >= new Date(event.startsAt)
              ? t("event.lineupsUnavailable")
              : t("event.lineupsPending")}
        </Text>
      )}
    </Card>
  );
}
