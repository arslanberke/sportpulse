import { useState } from "react";
import { Image, Text, View } from "react-native";

import { useThemeColors } from "@/constants/theme";
import { teamAccentColor } from "@/features/events/lib/motorsport-teams";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Circular driver/rider avatar; falls back to initials on a missing photo. */
function Avatar({
  photoUrl,
  name,
  accent,
}: {
  photoUrl?: string | null;
  name: string;
  accent: string | null;
}) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  const tint = accent ?? colors.primary;
  return (
    <View
      className="h-10 w-10 items-center justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: `${tint}26` }}
    >
      {photoUrl && !failed ? (
        // Taller than the frame + top-anchored, so full-body MotoGP shots and
        // head-and-shoulders F1 shots both land on the face.
        <Image
          source={{ uri: photoUrl }}
          onError={() => setFailed(true)}
          style={{ width: 40, height: 56, marginTop: 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text className="text-xs font-bold" style={{ color: tint }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

function TeamLogo({ url }: { url?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={{ width: 26, height: 26 }}
      resizeMode="contain"
    />
  );
}

/**
 * One row shared by motorsport session results and championship standings:
 * position, driver/rider photo, name + team, optional team logo, and an
 * optional trailing value (points). A team-colored strip runs down the left.
 */
export function MotorsportRow({
  position,
  name,
  team,
  photoUrl,
  teamLogoUrl,
  points,
  highlight,
}: {
  position: number;
  name: string;
  team: string | null;
  photoUrl?: string | null;
  teamLogoUrl?: string | null;
  points?: number;
  highlight: boolean;
}) {
  const colors = useThemeColors();
  const accent = teamAccentColor(team);
  return (
    <View className="flex-row items-center gap-3 overflow-hidden rounded-2xl bg-surface-raised py-2 pr-3">
      <View
        className="h-11 w-1 rounded-full"
        style={{ backgroundColor: accent ?? "transparent" }}
      />
      <View
        className="h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: highlight ? `${colors.primary}1F` : "transparent" }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: highlight ? colors.primary : colors.inkSecondary }}
        >
          {position}
        </Text>
      </View>
      <Avatar photoUrl={photoUrl} name={name} accent={accent} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-ink">
          {name}
        </Text>
        {team && (
          <Text numberOfLines={1} className="text-xs text-ink-secondary">
            {team}
          </Text>
        )}
      </View>
      <TeamLogo url={teamLogoUrl} />
      {points != null && (
        <Text className="ml-1 min-w-[32px] text-right text-sm font-bold text-ink">
          {points}
        </Text>
      )}
    </View>
  );
}
