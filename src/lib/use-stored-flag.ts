import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Cihazda saklanan acik/kapali tercihi.
 *
 * Sunucuya yazilmiyor: "favoriler bolumu kapali dursun" gibi tercihler o
 * cihazdaki gorunume ait, hesabin bir ozelligi degil.
 *
 * Deger okunana kadar `value` varsayilan kalir; okuma bir kare surdugu icin
 * bolum acik acilip hemen kapanmasin diye `ready` ayrica veriliyor.
 */
export function useStoredFlag(key: string, defaultValue = false) {
  const [value, setValue] = useState(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(key).then((stored) => {
      if (cancelled) return;
      if (stored !== null) setValue(stored === '1');
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current;
      void AsyncStorage.setItem(key, next ? '1' : '0');
      return next;
    });
  }, [key]);

  return { value, ready, toggle };
}
