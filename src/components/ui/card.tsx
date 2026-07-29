import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { listEntering } from '@/lib/animations';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Position in a list; staggers the entrance so cards cascade in. */
  index?: number;
}

/** Rounded content container. Fans in from the left (staggered by `index`). */
export function Card({ children, className = '', index = 0 }: CardProps) {
  return (
    <Animated.View entering={listEntering(index)}>
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
