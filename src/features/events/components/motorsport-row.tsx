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
  fullBody,
}: {
  photoUrl?: string | null;
  name: string;
  accent: string | null;
  fullBody: boolean;
}) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  const tint = accent ?? colors.primary;
  // Both sources are anchored to the top of the frame so the head lands in the
  // circle. F1 headshots are square (head fills most of it), while MotoGP shots
  // are tall full-body — those get zoomed in horizontally so the top of the
  // frame shows the head/shoulders instead of the whole body down to the waist.
  const imgStyle = fullBody
    ? { position: "absolute" as const, top: 0, left: -26, width: 96, height: 144 }
    : { position: "absolute" as const, top: 0, width: 44, height: 66 };
  return (
    <View
      className="h-11 w-11 items-center justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: `${tint}26` }}
    >
      {photoUrl && !failed ? (
        <Image
          source={{ uri: photoUrl }}
          onError={() => setFailed(true)}
          style={imgStyle}
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
  fullBody = false,
}: {
  position: number;
  name: string;
  team: string | null;
  photoUrl?: string | null;
  teamLogoUrl?: string | null;
  points?: number;
  highlight: boolean;
  fullBody?: boolean;
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
      <Avatar photoUrl={photoUrl} name={name} accent={accent} fullBody={fullBody} />
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
