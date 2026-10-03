import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

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
    ? {
        position: "absolute" as const,
        top: 0,
        left: -18,
        width: 66,
        height: 99,
      }
    : { position: "absolute" as const, top: 0, width: 30, height: 45 };
  return (
    <View
      className="h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: `${tint}26` }}
    >
      {photoUrl && !failed ? (
        <Image
          source={{ uri: photoUrl }}
          onError={() => setFailed(true)}
          style={imgStyle}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
          recyclingKey={photoUrl}
          transition={120}
        />
      ) : (
        <Text className="text-[10px] font-bold" style={{ color: tint }}>
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
      style={{ width: 20, height: 20 }}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}

/**
 * One borderless row shared by motorsport session results and championship
 * standings: position, a 2px team-colored strip, photo, name + team, and a
 * fixed right column with the team logo or points.
 */
export function MotorsportRow({
  position,
  name,
  team,
  photoUrl,
  teamLogoUrl,
  points,
  highlight,
  last = false,
  fullBody = false,
}: {
  position: number;
  name: string;
  team: string | null;
  photoUrl?: string | null;
  teamLogoUrl?: string | null;
  points?: number;
  highlight: boolean;
  last?: boolean;
  fullBody?: boolean;
}) {
  const colors = useThemeColors();
  const accent = teamAccentColor(team);
  return (
    <View className="h-[46px] flex-row items-center gap-2.5">
      <Text
        className="w-5 text-right text-[13px] font-bold"
        style={{
          color: highlight ? colors.primaryDark : colors.inkTertiary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {position}
      </Text>
      <View
        className="my-[9px] w-0.5 self-stretch rounded-full"
        style={{ backgroundColor: accent ?? "transparent" }}
      />
      <View
        className={`h-full flex-1 flex-row items-center gap-2.5 ${last ? "" : "border-b border-line"}`}
      >
        <Avatar
          photoUrl={photoUrl}
          name={name}
          accent={accent}
          fullBody={fullBody}
        />
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-[13px] font-semibold text-ink"
          >
            {name}
          </Text>
          {team && (
            <Text numberOfLines={1} className="text-[11px] text-ink-secondary">
              {team}
            </Text>
          )}
        </View>
        <View className="w-[46px] flex-row items-center justify-end">
          {points != null ? (
            <Text
              className="text-[13px] font-bold text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {points}
            </Text>
          ) : (
            <TeamLogo url={teamLogoUrl} />
          )}
        </View>
      </View>
    </View>
  );
}
