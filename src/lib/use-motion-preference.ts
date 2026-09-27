import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useMotionPreference() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    let disposed = false;
    let changed = false;
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduced(value);
    });
    const appState = AppState.addEventListener('change', state => setActive(state === 'active'));
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!disposed && !changed) setReduced(value);
    }).catch(() => { if (!disposed && !changed) setReduced(true); });
    return () => {
      disposed = true;
      preference.remove();
      appState.remove();
    };
  }, []);
  return { ready: reduced !== null, enabled: reduced === false && active };
}
