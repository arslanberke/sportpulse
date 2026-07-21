import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import type { EventTheme } from '@/features/events/lib/event-theme';

/** Which broadcast-style ambient effect a league/sport gets. */
export type EffectKind = 'stars' | 'shimmer' | 'speed' | 'glow' | 'none';

export function effectKind(
  sportId: string,
  leagueName?: string | null,
  hasEventImage?: boolean,
): EffectKind {
  if (leagueName === 'UEFA Champions League') return 'stars';
  if (sportId === 'f1' || sportId === 'motogp') return hasEventImage ? 'shimmer' : 'speed';
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

/** Slow pulsing beam of light on the banner's left side. */
function BeamPulse() {
  const progress = useLoop(4200);
  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.28, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.45, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Rising star sparkles plus a breathing light beam, Champions League style. */
function Stars() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BeamPulse />
      {STARS.map((star) => (
        <Star key={star.left} {...star} />
      ))}
    </View>
  );
}

/** A bright band of light sweeping across the artwork (track shimmer). */
function Shimmer() {
  const progress = useLoop(3400, 900);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-260, 1100] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.45, 0.45, 0],
  });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -40,
          bottom: -40,
          width: 160,
          transform: [{ translateX }, { rotate: '18deg' }],
          opacity,
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
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
  hasEventImage,
}: {
  sportId: string;
  leagueName?: string | null;
  theme: EventTheme;
  hasEventImage?: boolean;
}) {
  const kind = effectKind(sportId, leagueName, hasEventImage);
  if (kind === 'stars') return <Stars />;
  if (kind === 'shimmer') return <Shimmer />;
  if (kind === 'speed') return <SpeedLines />;
  if (kind === 'glow') return <Glow accent={theme.accent} />;
  return null;
}
