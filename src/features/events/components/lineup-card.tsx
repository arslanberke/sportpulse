import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/constants/theme";
import { useEventLineup } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { LineupPlayer, SportEvent } from "@/types";

function PlayerRow({ player }: { player: LineupPlayer }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-2.5 py-1.5">
      <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-raised">
        {player.photoUrl ? (
          <Image
            source={{ uri: player.photoUrl }}
            style={{ width: 36, height: 36 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Ionicons name="person" size={16} color={colors.inkSecondary} />
        )}
      </View>
      <Text className="w-6 text-right text-sm font-bold text-ink-secondary">
        {player.number ?? ""}
      </Text>
      <Text numberOfLines={1} className="flex-1 text-sm font-medium text-ink">
        {player.name}
      </Text>
      {player.position && (
        <Text className="text-xs font-medium text-ink-secondary">
          {player.position}
        </Text>
      )}
    </View>
  );
}

function TeamBlock({
  name,
  badgeUrl,
  players,
}: {
  name: string | null;
  badgeUrl: string | null;
  players: LineupPlayer[];
}) {
  const { t } = useI18n();
  const starters = players.filter((p) => !p.isSubstitute);
  const subs = players.filter((p) => p.isSubstitute);
  return (
    <View>
      <View className="mb-1 flex-row items-center gap-2">
        {badgeUrl && (
          <Image
            source={{ uri: badgeUrl }}
            style={{ width: 22, height: 22 }}
            contentFit="contain"
          />
        )}
        <Text className="text-sm font-bold text-ink">{name ?? ""}</Text>
      </View>
      {starters.map((p) => (
        <PlayerRow key={p.id} player={p} />
      ))}
      {subs.length > 0 && (
        <>
          <Text className="mb-0.5 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {t("event.substitutes")}
          </Text>
          {subs.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </>
      )}
    </View>
  );
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
  const { data: lineup, isLoading, isError } = useEventLineup(event);

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
        <View className="gap-4">
          <TeamBlock
            name={event.homeTeamName ?? null}
            badgeUrl={event.homeTeamLogoUrl ?? null}
            players={lineup.home}
          />
          <View className="h-px bg-line" />
          <TeamBlock
            name={event.awayTeamName ?? null}
            badgeUrl={event.awayTeamLogoUrl ?? null}
            players={lineup.away}
          />
        </View>
      ) : isLoading ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-sm text-ink-secondary">
            {t("event.lineupsLoading")}
          </Text>
        </View>
      ) : (
        <Text className="text-sm text-ink-secondary">
          {isError ? t("event.lineupsError") : t("event.lineupsPending")}
        </Text>
      )}
    </Card>
  );
}
