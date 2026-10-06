import { Text, View } from "react-native";

import { FlatHeader } from "@/components/ui/section-header";
import { useTennisSets } from "@/features/events/hooks/use-events";
import { useI18n } from "@/lib/i18n";
import type { TennisSet } from "@/services/providers/espn-tennis";
import type { SportEvent } from "@/types";

function Games({ set, side, done }: { set: TennisSet; side: "home" | "away"; done: boolean }) {
  const games = side === "home" ? set.home : set.away;
  const other = side === "home" ? set.away : set.home;
  const tiebreak = side === "home" ? set.homeTiebreak : set.awayTiebreak;
  const won = done && games > other;
  return (
    <Text
      className={`w-9 text-right text-[15px] ${won ? "font-extrabold text-ink" : "font-medium text-ink-secondary"}`}
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {games}
      {tiebreak != null ? <Text className="text-[10px] font-semibold text-ink-tertiary">{tiebreak}</Text> : null}
    </Text>
  );
}

/** Tenis macinin set set oyun skoru (ESPN); tie-break puani kucuk yazilir. */
export function TennisSetsCard({ event }: { event: SportEvent }) {
  const { t } = useI18n();
  const { data } = useTennisSets(event);
  if (!data) return null;

  const lastOpen = data.live || data.retired;
  return (
    <View className="mb-4">
      <FlatHeader label={t("event.tennis.sets")} note={data.retired ? t("event.tennis.retired") : null} />
      <View className="flex-row items-center border-b border-line py-2">
        <View className="flex-1" />
        {data.sets.map((_, i) => (
          <Text key={i} className="w-9 text-right text-xs font-bold text-ink-tertiary">
            {i + 1}
          </Text>
        ))}
      </View>
      {(["home", "away"] as const).map((side, row) => {
        const winner = side === "home" ? data.homeWinner : data.awayWinner;
        return (
          <View key={side} className={`flex-row items-center py-2.5 ${row === 0 ? "border-b border-line" : ""}`}>
            <Text
              numberOfLines={1}
              className={`flex-1 text-[14px] text-ink ${winner ? "font-extrabold" : "font-semibold"}`}
            >
              {(side === "home" ? event.homeTeamName : event.awayTeamName) ?? ""}
            </Text>
            {data.sets.map((set, i) => (
              <Games key={i} set={set} side={side} done={!(lastOpen && i === data.sets.length - 1)} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
