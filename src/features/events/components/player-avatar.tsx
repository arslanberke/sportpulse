import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "@/constants/theme";

/** Round player photo (disk-cached) with an initials fallback. */
export function PlayerAvatar({
  name,
  uri,
  size = 30,
}: {
  name: string;
  uri: string | null;
  size?: number;
}) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, backgroundColor: colors.border }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
          recyclingKey={uri}
          transition={120}
        />
      ) : (
        <Text className="text-[10px] font-bold text-ink-secondary">
          {initials}
        </Text>
      )}
    </View>
  );
}
