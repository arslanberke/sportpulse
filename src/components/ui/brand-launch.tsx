import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/brand-mark';
import { BRAND } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { useMotionPreference } from '@/lib/use-motion-preference';

export function BrandLaunch({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  const { ready, enabled } = useMotionPreference();
  const [progress] = useState(() => new Animated.Value(0));
  const completed = useRef(false);
  useEffect(() => {
    if (!ready || completed.current) return;
    if (!enabled) {
      progress.setValue(1);
      completed.current = true;
      onComplete();
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: BRAND.launchDuration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished) { completed.current = true; onComplete(); }
    });
    return () => animation.stop();
  }, [ready, enabled, progress, onComplete]);

  return (
    <View testID="brand-launch" style={styles.screen} accessibilityLabel={`SportPulse. ${t('common.loading')}`} accessibilityState={{ busy: true }}>
      <StatusBar style="light" />
      {/* Native splash uses the same centred 160px mark. Keep this mark fixed:
          moving it on the first JS frame made iOS's splash cross-fade show two
          overlapping logos, perceived as a blue rectangular banner. */}
      <BrandMark />
      <Animated.View style={[styles.caption, { opacity: progress }]}>
        <Text style={styles.name}>sportpulse</Text>
        <Text style={styles.tagline}>{t('brand.tagline')}</Text>
        <Text style={styles.loading}>{t('common.loading')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.navy },
  caption: { position: 'absolute', top: '50%', marginTop: 86, left: 24, right: 24, alignItems: 'center' },
  name: { fontSize: 25, fontWeight: '700', letterSpacing: -1, color: BRAND.mint },
  tagline: { marginTop: 8, fontSize: 12, color: BRAND.muted, textAlign: 'center' },
  loading: { marginTop: 28, fontSize: 11, color: BRAND.muted },
});
