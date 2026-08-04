import {
    Easing,
    withDelay,
    withTiming,
    type EntryExitAnimationFunction,
} from 'react-native-reanimated';

/** One step of the cascade, in ms. Long enough that the order reads. */
const STAGGER_MS = 70;
/** How long a single item takes once it starts moving. */
const DURATION_MS = 120;
/** Beyond this the wait would be longer than anyone looks at the screen. */
const MAX_STEPS = 8;

/**
 * Adim basina tek bir animasyon fonksiyonu tutulur: her cagride yeni bir
 * fonksiyon dondurmek, bileseni yeniden render eden her seyde reanimated icin
 * farkli bir `entering` demek oluyor ve animasyon bastan kuruluyordu.
 */
const byStep = new Map<number, EntryExitAnimationFunction>();

/**
 * "Fan" entrance: the item slides in from the left. Items run one after
 * another, top first.
 *
 * Shared so every stacked list (follows, event cards, ...) opens the same way.
 *
 * Bilerek yalnizca oteleme:
 *
 * - `rotate`/`scale`, ilk acilista yuklenen gorsellerin kalici olarak bulanik
 *   cizilmesine yol aciyordu (ayni gorsel ikinci aciliste netti).
 * - `opacity` ise animasyon tamamlanmadiginda kartlari kalici olarak gorunmez
 *   birakiyordu. Giris animasyonu birden fazla nedenle yarida kalabiliyor
 *   (verinin sonradan gelmesi, ekranin deep link ile acilmasi) ve 0'dan
 *   baslayan bir opacity'de bunun bedeli "icerik hic gorunmuyor" oluyor.
 *   Oteleme yarida kalirsa kart en fazla 24 piksel kaymis durur, yani okunur
 *   kalir. Efekt kaybi bu guvenligin yaninda kucuk bir bedel.
 */
export function listEntering(index = 0): EntryExitAnimationFunction {
  const stepIndex = Math.min(index, MAX_STEPS);
  const cached = byStep.get(stepIndex);
  if (cached) return cached;

  const delay = stepIndex * STAGGER_MS;

  const entering: EntryExitAnimationFunction = () => {
    'worklet';
    const config = {
      duration: DURATION_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    };

    return {
      initialValues: {
        transform: [{ translateX: -24 }],
      },
      animations: {
        transform: [{ translateX: withDelay(delay, withTiming(0, config)) }],
      },
    };
  };

  byStep.set(stepIndex, entering);
  return entering;
}
