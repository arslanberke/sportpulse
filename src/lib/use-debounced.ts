import { useEffect, useState } from 'react';

/**
 * Bir degerin durulmus hali: degisim durduktan `delayMs` sonra guncellenir.
 *
 * Yazarken her tusa sunucu sorgusu acmamak icin. Katalog aramasi terimi sorgu
 * anahtarina koyuyor, dolayisiyla her harf yeni bir istek demekti; terim basina
 * birden fazla yazilis sorulduğu icin (Turkce karakter karsiliklari) bu
 * "besiktas" yazarken onlarca istek anlamina geliyor ve arayuz kilitleniyordu.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
