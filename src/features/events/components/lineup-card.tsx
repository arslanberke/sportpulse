import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { FlatHeader } from "@/components/ui/section-header";
import { useThemeColors } from "@/constants/theme";
import {
  LineupPitch,
  playerProfileId,
} from "@/features/events/components/lineup-pitch";
import { RatingPill } from "@/features/events/components/match-stats-card";
import { PlayerAvatar } from "@/features/events/components/player-avatar";
import {
  useEventLineup,
  useEventStats,
} from "@/features/events/hooks/use-events";
import { useI18n, type Translate } from "@/lib/i18n";
import { logoThumb } from "@/lib/logo-thumb";
import { useNow } from "@/lib/now";
import type { EventLineup, LineupPlayer, SportEvent } from "@/types";

type Side = "home" | "away";

function positionLabel(position: string | null, t: Translate): string {
  switch ((position ?? "").toLowerCase()) {
    case "g":
    case "goalkeeper":
      return t("event.pos.gk");
    case "d":
    case "defender":
      return t("event.pos.def");
    case "m":
    case "midfielder":
      return t("event.pos.mid");
    case "f":
    case "forward":
    case "attacker":
      return t("event.pos.fwd");
    default:
      return position ?? "";
  }
}

/** One 22f roster row: number · photo · name/position · rating. */
function RosterRow({ player, last }: { player: LineupPlayer; last: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const id = playerProfileId(player);
  const pos = positionLabel(player.position, t);
  return (
    <Pressable
      onPress={id ? () => router.push(`/football-player/${id}`) : undefined}
      disabled={!id}
      className="h-[46px] flex-row items-center gap-2.5 active:opacity-60"
    >
      <Text
        className="w-5 text-right text-xs font-bold text-ink-tertiary"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {player.number ?? ""}
      </Text>
      <View
        className={`h-full flex-1 flex-row items-center gap-2.5 ${last ? "" : "border-b border-line"}`}
      >
        <PlayerAvatar name={player.name} uri={player.photoUrl} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[13px] font-semibold text-ink">
            {player.name}
            {player.isCaptain ? ` (${t("event.captainShort")})` : ""}
          </Text>
          {pos ? (
            <Text numberOfLines={1} className="text-[11px] text-ink-secondary">
              {pos}
            </Text>
          ) : null}
        </View>
        {typeof player.rating === "number" && (
          <RatingPill rating={player.rating} />
        )}
      </View>
    </Pressable>
  );
}

function RosterGroup({
  label,
  note,
  players,
}: {
  label: string;
  note?: string | null;
  players: LineupPlayer[];
}) {
  if (players.length === 0) return null;
  return (
    <>
      <FlatHeader label={label} note={note ?? String(players.length)} />
      {players.map((p, i) => (
        <RosterRow key={p.id} player={p} last={i === players.length - 1} />
      ))}
    </>
  );
}

function TeamChip({
  name,
  logoUrl,
  on,
  onPress,
}: {
  name: string;
  logoUrl: string | null;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-pill border px-2.5 py-1 ${on ? "border-ink bg-ink" : "border-line bg-surface"}`}
    >
      {logoUrl && (
        <Image
          source={{ uri: logoThumb(logoUrl) }}
          style={{ width: 14, height: 14 }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      )}
      <Text
        numberOfLines={1}
        className={`text-xs font-semibold ${on ? "text-background" : "text-ink-secondary"}`}
      >
        {name}
      </Text>
    </Pressable>
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
  const [side, setSide] = useState<Side>("home");
  const players = lineup[side];
  const starters = players.filter((p) => !p.isSubstitute);
  const subs = players.filter((p) => p.isSubstitute);
  // A rated substitute is one who actually came on.
  const cameOn = subs.filter((p) => typeof p.rating === "number");
  const bench = subs.filter((p) => typeof p.rating !== "number");
  const formation = side === "home" ? lineup.homeFormation : lineup.awayFormation;

  return (
    <View>
      <LineupPitch
        home={lineup.home}
        away={lineup.away}
        homeLogoUrl={event.homeTeamLogoUrl ?? null}
        awayLogoUrl={event.awayTeamLogoUrl ?? null}
        homeFormation={lineup.homeFormation}
        awayFormation={lineup.awayFormation}
      />
      <View className="mt-3 flex-row gap-1.5">
        <TeamChip
          name={event.homeTeamName ?? ""}
          logoUrl={event.homeTeamLogoUrl ?? null}
          on={side === "home"}
          onPress={() => setSide("home")}
        />
        <TeamChip
          name={event.awayTeamName ?? ""}
          logoUrl={event.awayTeamLogoUrl ?? null}
          on={side === "away"}
          onPress={() => setSide("away")}
        />
      </View>
      <RosterGroup label={t("event.startingXI")} note={formation} players={starters} />
      <RosterGroup label={t("event.cameOn")} players={cameOn} />
      <RosterGroup label={t("event.substitutes")} players={bench} />
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
  flat = false,
}: {
  event: SportEvent;
  index?: number;
  flat?: boolean;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const now = useNow();
  const { data: lineup, isLoading, isError } = useEventLineup(event);
  const { data: stats } = useEventStats(event);

  if (event.sportId !== "football" || event.status !== "scheduled") return null;

  return (
    <Card className="mb-4" index={index} flat={flat}>
      {!flat && (
        <View className="mb-3 flex-row items-center gap-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${colors.primary}1F` }}
          >
            <Ionicons name="people" size={18} color={colors.primaryDark} />
          </View>
          <Text className="text-base font-semibold text-ink">
            {t("event.lineups")}
          </Text>
        </View>
      )}

      {lineup ? (
        <LineupBody lineup={withRatings(lineup, stats)} event={event} />
      ) : isLoading ? (
        <View className="flex-row items-center gap-2 py-3">
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text className="text-[13px] text-ink-secondary">
            {t("event.lineupsLoading")}
          </Text>
        </View>
      ) : (
        <Text className="py-3 text-[13px] text-ink-secondary">
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
