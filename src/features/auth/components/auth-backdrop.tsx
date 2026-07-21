import { type PropsWithChildren, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useIsDark } from '@/constants/theme';

function useBreath(duration: number, delay = 0) {
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

const BLOBS = [
  { size: 420, top: -160, left: -140, duration: 7000, delay: 0 },
  { size: 360, bottom: -140, right: -120, duration: 9000, delay: 2000 },
] as const;

function Blob({
  size,
  duration,
  delay,
  opacity,
  ...position
}: (typeof BLOBS)[number] & { opacity: number }) {
  const progress = useBreath(duration, delay);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        opacity,
        transform: [{ scale }],
        ...position,
      }}
    >
      <LinearGradient
        colors={['#34D399', 'rgba(16,185,129,0)']}
        start={{ x: 0.5, y: 0.25 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Large soft color washes slowly breathing in the screen corners. */
export function AuthBackdrop() {
  const isDark = useIsDark();
  const opacity = isDark ? 0.14 : 0.18;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BLOBS.map((blob) => (
        <Blob key={blob.size} {...blob} opacity={opacity} />
      ))}
    </View>
  );
}

/** Card-style entrance: fade in while springing up from below. */
export function AuthEntrance({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(progress, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress, delay]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
