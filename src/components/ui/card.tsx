import { type ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * Listedeki sira.
   *
   * Giris animasyonu kaldirildigi icin su an cizime etki etmiyor; cagiran
   * ekranlar sirayi bildirmeye devam ediyor ki animasyon guvenilir bir bicimde
   * geri getirilebilsin (bkz. `src/lib/animations.ts` gecmisi).
   */
  index?: number;
  /** 22f: no surface, border or padding; content sits on the page. */
  flat?: boolean;
}

/** Rounded content container. */
export function Card({ children, className = '', flat = false }: CardProps) {
  if (flat) return <View className={className}>{children}</View>;
  return (
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
  );
}
