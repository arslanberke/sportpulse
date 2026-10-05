import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/constants/theme";
import { PlayerAvatar } from "@/features/events/components/player-avatar";
import { RatingPill } from "@/features/events/components/match-stats-card";
import { logoThumb } from "@/lib/logo-thumb";
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

/** BSD player ids are numeric; other sources carry names and have no profile. */
export function playerProfileId(player: LineupPlayer): string | null {
  return /^\d+$/.test(player.id) ? player.id : null;
}

const TOKEN = 62;
const AVATAR = 32;

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

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
  const router = useRouter();
  const colors = useThemeColors();
  const id = playerProfileId(player);
  return (
    <Pressable
      onPress={id ? () => router.push(`/football-player/${id}`) : undefined}
      disabled={!id}
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: TOKEN,
        marginLeft: -TOKEN / 2,
        marginTop: -AVATAR / 2 - 2,
      }}
      className="items-center active:opacity-60"
    >
      <View
        className="rounded-full"
        style={{ padding: 1.5, backgroundColor: colors.background }}
      >
        <PlayerAvatar name={player.name} uri={player.photoUrl} size={AVATAR} />
      </View>
      {typeof player.rating === "number" && (
        <View style={{ position: "absolute", top: -4, right: 6 }}>
          <RatingPill rating={player.rating} />
        </View>
      )}
      <Text
        numberOfLines={1}
        className="mt-0.5 text-center text-[10px] font-semibold text-ink"
        style={{ maxWidth: TOKEN }}
      >
        <Text className="text-ink-tertiary">{player.number ?? ""} </Text>
        {surname(player.name)}
      </Text>
    </Pressable>
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

  // Home keeper at the top, away keeper at the bottom; each half 5%..44%.
  const bandStart = 5;
  const span = 39;

  return (
    <>
      {rows.map((row, rIdx) => {
        const t = rows.length === 1 ? 0 : rIdx / (rows.length - 1);
        const yHalf = bandStart + t * span;
        const yPct = side === "home" ? yHalf : 100 - yHalf;
        return row.map((player, cIdx) => {
          // Away players are mirrored so both teams read left-to-right from
          // their own goal.
          const x = (cIdx + 0.5) / row.length;
          const xPct = (side === "home" ? x : 1 - x) * 100;
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

function FormationTag({
  logoUrl,
  formation,
  top,
}: {
  logoUrl: string | null;
  formation: string | null;
  top: boolean;
}) {
  if (!formation) return null;
  return (
    <View
      className="absolute left-2.5 flex-row items-center gap-1.5"
      style={top ? { top: 8 } : { bottom: 8 }}
    >
      {logoUrl && (
        <Image
          source={{ uri: logoThumb(logoUrl) }}
          style={{ width: 14, height: 14 }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      )}
      <Text className="text-[10.5px] font-bold text-ink-secondary">
        {formation}
      </Text>
    </View>
  );
}

/**
 * Flat vertical pitch in the page's own colors: home attacking down from the
 * top, away attacking up from the bottom.
 */
export function LineupPitch({
  home,
  away,
  homeLogoUrl = null,
  awayLogoUrl = null,
  homeFormation = null,
  awayFormation = null,
}: {
  home: LineupPlayer[];
  away: LineupPlayer[];
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  homeFormation?: string | null;
  awayFormation?: string | null;
}) {
  const colors = useThemeColors();
  const starters = (list: LineupPlayer[]) => list.filter((p) => !p.isSubstitute);
  const hasGrid = home.concat(away).some((p) => !p.isSubstitute && p.grid);
  if (!hasGrid) return null;

  const line = `${colors.primaryDark}33`;

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        aspectRatio: 0.56,
        width: "100%",
        maxWidth: 380,
        alignSelf: "center",
        backgroundColor: `${colors.primary}0F`,
        borderWidth: 1,
        borderColor: line,
      }}
    >
      <View style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: line }} />
      <View
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 76,
          height: 76,
          marginLeft: -38,
          marginTop: -38,
          borderRadius: 38,
          borderWidth: 1,
          borderColor: line,
        }}
      />
      <View style={{ position: "absolute", top: 0, left: "22%", right: "22%", height: "14%", borderWidth: 1, borderTopWidth: 0, borderColor: line }} />
      <View style={{ position: "absolute", bottom: 0, left: "22%", right: "22%", height: "14%", borderWidth: 1, borderBottomWidth: 0, borderColor: line }} />

      <FormationTag logoUrl={homeLogoUrl} formation={homeFormation} top />
      <FormationTag logoUrl={awayLogoUrl} formation={awayFormation} top={false} />

      <HalfLineup players={starters(home)} side="home" />
      <HalfLineup players={starters(away)} side="away" />
    </View>
  );
}
