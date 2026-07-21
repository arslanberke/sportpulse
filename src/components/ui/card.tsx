import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Position in a list; staggers the entrance so cards cascade in. */
  index?: number;
}

/** Rounded content container. Cascades in on mount (staggered by `index`). */
export function Card({ children, className = '', index = 0 }: CardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70)
        .duration(420)
        .springify()
        .damping(18)}
    >
      <View
        className={`rounded-card border border-line bg-surface p-5 ${className}`}
        style={{
          shadowColor: '#0F1A14',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
