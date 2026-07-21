import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import type { EventTheme } from '@/features/events/lib/event-theme';

/** Which broadcast-style ambient effect a league/sport gets. */
export type EffectKind = 'stars' | 'speed' | 'glow' | 'none';

export function effectKind(sportId: string, leagueName?: string | null): EffectKind {
  if (leagueName === 'UEFA Champions League') return 'stars';
  if (sportId === 'f1' || sportId === 'motogp') return 'speed';
  if (sportId === 'ufc') return 'glow';
  return 'none';
}

function useLoop(duration: number, delay = 0) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, delay]);
  return value;
}

const STARS = [
  { left: '12%', size: 10, duration: 5200, delay: 0 },
  { left: '30%', size: 6, duration: 6800, delay: 900 },
  { left: '52%', size: 12, duration: 5900, delay: 1800 },
  { left: '68%', size: 7, duration: 7400, delay: 400 },
  { left: '84%', size: 9, duration: 6300, delay: 2400 },
] as const;

/** Five-pointed star built from two overlapping triangles is overkill in RN;
 * a rotated square "sparkle" reads as the UCL starball glint. */
function Star({ left, size, duration, delay }: (typeof STARS)[number]) {
  const progress = useLoop(duration, delay);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [30, -170] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 0.9, 0.5, 0],
  });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: left as `${number}%`,
        width: size,
        height: size,
        backgroundColor: '#FFFFFF',
        transform: [{ translateY }, { rotate: '45deg' }],
        opacity,
      }}
    />
  );
}

/** Glint travelling along the banner's diagonal light streaks (right side). */
function StreakGlint() {
  const progress = useLoop(3600, 800);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-40, 320] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [200, -60] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.88, 1],
    outputRange: [0, 0.85, 0.85, 0],
  });
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '38%', overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 90,
          height: 26,
          transform: [{ translateX }, { translateY }, { rotate: '-40deg' }],
          opacity,
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Rising star sparkles plus a glint on the light streaks, Champions League style. */
function Stars() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <StreakGlint />
      {STARS.map((star) => (
        <Star key={star.left} {...star} />
      ))}
    </View>
  );
}



const LINES = [
  { top: '18%', height: 2, width: 90, duration: 1600, delay: 0 },
  { top: '38%', height: 3, width: 140, duration: 1250, delay: 500 },
  { top: '60%', height: 2, width: 70, duration: 1900, delay: 950 },
] as const;

function SpeedLine({ top, height, width, duration, delay }: (typeof LINES)[number]) {
  const progress = useLoop(duration, delay);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 1000] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 0.75, 0.4, 0],
  });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: top as `${number}%`,
        left: 0,
        width,
        height,
        borderRadius: height,
        backgroundColor: '#FFFFFF',
        transform: [{ translateX }],
        opacity,
      }}
    />
  );
}

/** Streaking light lines, F1/MotoGP broadcast style. */
function SpeedLines() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LINES.map((line) => (
        <SpeedLine key={line.top} {...line} />
      ))}
    </View>
  );
}

/** Slow breathing glow tinted to the theme accent, fight-night style. */
function Glow({ accent }: { accent: string }) {
  const progress = useLoop(3600);
  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.05, 0.3, 0.05] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity }]}
    />
  );
}

/** Ambient per-league animation layered over the hero artwork. */
export function EventEffect({
  sportId,
  leagueName,
  theme,
}: {
  sportId: string;
  leagueName?: string | null;
  theme: EventTheme;
}) {
  const kind = effectKind(sportId, leagueName);
  if (kind === 'stars') return <Stars />;
  if (kind === 'speed') return <SpeedLines />;
  if (kind === 'glow') return <Glow accent={theme.accent} />;
  return null;
}
