import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { useThemeColors } from "@/constants/theme";
import type { LineupPlayer } from "@/types";

/** Turns an ISO 3166-1 alpha-2 code into its flag emoji ("tr" -> 🇹🇷). */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65),
  );
}

const TOKEN = 46; // centered hit box for one player token

/** Groups starters into rows by their provider grid (row 1 = keeper). */
function toRows(players: LineupPlayer[]): LineupPlayer[][] {
  const withGrid = players.filter((p) => p.grid);
  if (withGrid.length === 0) return [];
  const maxRow = Math.max(...withGrid.map((p) => p.grid!.row));
  const rows: LineupPlayer[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    rows.push(
      withGrid
        .filter((p) => p.grid!.row === r)
        .sort((a, b) => a.grid!.col - b.grid!.col),
    );
  }
  return rows.filter((r) => r.length > 0);
}

function PlayerToken({
  player,
  xPct,
  yPct,
}: {
  player: LineupPlayer;
  xPct: number;
  yPct: number;
}) {
  return (
    <View
      style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%` }}
      pointerEvents="none"
    >
      <View
        style={{ width: TOKEN, marginLeft: -TOKEN / 2, marginTop: -TOKEN / 2 }}
        className="items-center"
      >
        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-black/25">
          {player.photoUrl ? (
            <Image
              source={{ uri: player.photoUrl }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={20} color="rgba(255,255,255,0.9)" />
          )}
          <View className="absolute -bottom-0.5 -right-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-white px-1">
            <Text className="text-[9px] font-bold text-neutral-900">
              {player.number ?? ""}
            </Text>
          </View>
        </View>
        <View className="mt-0.5 max-w-[62px] rounded bg-black/55 px-1 py-px">
          <Text numberOfLines={1} className="text-center text-[9px] font-semibold text-white">
            {player.isCaptain ? `${player.name} (C)` : player.name}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Lays out one team's starters on its half of the pitch. */
function HalfLineup({
  players,
  side,
}: {
  players: LineupPlayer[];
  side: "home" | "away";
}) {
  const rows = toRows(players);
  if (rows.length === 0) return null;

  // Each half spans 6%..46% (home, top) or 54%..94% (away, bottom) vertically.
  const bandStart = side === "home" ? 7 : 55;
  const bandEnd = side === "home" ? 45 : 93;
  const span = bandEnd - bandStart;

  return (
    <>
      {rows.map((row, rIdx) => {
        const t = rows.length === 1 ? 0 : rIdx / (rows.length - 1);
        // Home keeper (row 0) sits at the top; away keeper at the bottom.
        const yPct = side === "home" ? bandStart + t * span : bandEnd - t * span;
        return row.map((player, cIdx) => {
          const xPct = ((cIdx + 1) / (row.length + 1)) * 100;
          return (
            <PlayerToken
              key={player.id}
              player={player}
              xPct={xPct}
              yPct={yPct}
            />
          );
        });
      })}
    </>
  );
}

/**
 * FlashScore-style vertical pitch with both teams facing each other:
 * home attacking down from the top, away attacking up from the bottom.
 */
export function LineupPitch({
  home,
  away,
}: {
  home: LineupPlayer[];
  away: LineupPlayer[];
}) {
  const colors = useThemeColors();
  const starters = (list: LineupPlayer[]) => list.filter((p) => !p.isSubstitute);
  const hasGrid = home.concat(away).some((p) => !p.isSubstitute && p.grid);
  if (!hasGrid) return null;

  const line = "rgba(255,255,255,0.28)";

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        aspectRatio: 0.72,
        backgroundColor: colors.primary,
        width: "100%",
        maxWidth: 380,
        alignSelf: "center",
      }}
    >
      <LinearGradient
        colors={["#0f7a3d", "#0c6a35", "#0f7a3d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      {/* pitch markings */}
      <View style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: line }} />
      <View
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 84,
          height: 84,
          marginLeft: -42,
          marginTop: -42,
          borderRadius: 42,
          borderWidth: 1,
          borderColor: line,
        }}
      />
      <View style={{ position: "absolute", top: 0, left: "22%", right: "22%", height: "12%", borderWidth: 1, borderTopWidth: 0, borderColor: line }} />
      <View style={{ position: "absolute", bottom: 0, left: "22%", right: "22%", height: "12%", borderWidth: 1, borderBottomWidth: 0, borderColor: line }} />

      <HalfLineup players={starters(home)} side="home" />
      <HalfLineup players={starters(away)} side="away" />
    </View>
  );
}
