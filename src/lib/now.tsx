import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { AppState } from 'react-native';

/**
 * Dakikasi tazelenen "su an".
 *
 * Geri sayimlar ("45dk sonra") o anin saatinden hesaplaniyor, ama hicbir sey
 * yeniden cizim tetiklemedigi surece ekranda yazan sure oldugu yerde kaliyordu:
 * ekran acik beklerken bir mac baslayabiliyor ve kart hala "45dk sonra"
 * gosteriyordu.
 *
 * Tek bir zamanlayici tutuluyor ve deger baglam uzerinden paylasiliyor; her kart
 * kendi zamanlayicisini kursa listedeki mac sayisi kadar sayac calisirdi.
 */
const NowContext = createContext<Date | null>(null);

/**
 * Dakika sinirini en fazla yarim dakika gecikmeyle yakalamak icin 30 saniye:
 * tam 60 saniyede, dakika degisimi neredeyse bir dakika sonra gorunebilirdi.
 */
const TICK_MS = 30_000;

export function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);

    // Zamanlayici uygulama arka plandayken islemiyor; on plana donusta deger
    // bayat kalmasin diye hemen tazelenir.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/**
 * Paylasilan "su an". Saglayici yoksa (test, izole bir ekran) o anin saatine
 * duser: sure yine dogru cizilir, yalnizca kendiliginden tazelenmez.
 */
export function useNow(): Date {
  return useContext(NowContext) ?? new Date();
}
