import { useEffect, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Simple rounded card used as the main content container across the app. Fades in softly on mount. */
export function Card({ children, className = '' }: CardProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
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
