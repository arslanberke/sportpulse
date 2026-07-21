import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useIsDark } from '@/constants/theme';

function useDrift(duration: number, delay = 0) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, delay]);
  return value;
}

const ORBS = [
  { size: 260, top: -60, left: -80, drift: 40, duration: 9000, delay: 0 },
  { size: 200, top: 140, right: -70, drift: -30, duration: 11000, delay: 1500 },
  { size: 180, bottom: -40, left: 40, drift: 24, duration: 13000, delay: 3000 },
] as const;

function Orb({
  size,
  drift,
  duration,
  delay,
  opacity,
  ...position
}: (typeof ORBS)[number] & { opacity: number }) {
  const progress = useDrift(duration, delay);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        opacity,
        transform: [{ translateY }],
        ...position,
      }}
    >
      <LinearGradient
        colors={['#34D399', 'rgba(16,185,129,0)']}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Slowly drifting soft green orbs behind the auth forms. */
export function AuthBackdrop() {
  const isDark = useIsDark();
  const opacity = isDark ? 0.16 : 0.22;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORBS.map((orb) => (
        <Orb key={orb.size} {...orb} opacity={opacity} />
      ))}
    </View>
  );
}
