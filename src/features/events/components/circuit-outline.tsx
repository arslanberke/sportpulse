import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import Svg, { Path } from 'react-native-svg';

import {
  F1_CIRCUIT_LOCATIONS,
  F1_CIRCUIT_PATHS,
} from '@/features/events/lib/f1-circuits';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Match an event's venue/title to a known circuit outline path. */
export function findCircuitPath(venue?: string | null, title?: string | null): string | null {
  const haystack = normalize(`${venue ?? ''} ${title ?? ''}`);
  if (!haystack.trim()) return null;
  for (const name of Object.keys(F1_CIRCUIT_PATHS)) {
    if (haystack.includes(normalize(name))) return F1_CIRCUIT_PATHS[name];
  }
  for (const [location, name] of Object.entries(F1_CIRCUIT_LOCATIONS)) {
    if (haystack.includes(normalize(location))) return F1_CIRCUIT_PATHS[name];
  }
  return null;
}

/** One dash cycle in path units; offsetting by exactly one cycle loops seamlessly. */
const DASH = 36;
const GAP = 404;
const CYCLE = DASH + GAP;

/**
 * Track line drawn over the league gradient with a bright light segment
 * travelling along the circuit.
 */
export function CircuitOutline({ path }: { path: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  const lightRef = useRef<Path>(null);
  useEffect(() => {
    // createAnimatedComponent(Path) leaks a `collapsable` DOM prop on web,
    // so drive the dash offset imperatively instead.
    const listener = progress.addListener(({ value }) => {
      lightRef.current?.setNativeProps({ strokeDashoffset: -CYCLE * value });
    });
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.removeListener(listener);
    };
  }, [progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        viewBox="-8 -8 116 116"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <Path
          d={path}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          ref={lightRef}
          d={path}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${DASH} ${GAP}`}
          strokeDashoffset={0}
        />
      </Svg>
    </View>
  );
}
