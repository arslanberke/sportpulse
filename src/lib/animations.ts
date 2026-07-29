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
 * "Fan" entrance: the item swings in from the left with a slight tilt, like a
 * deck of cards being spread out. Items run one after another, top first.
 *
 * Shared so every stacked list (follows, event cards, ...) opens the same way.
 */
export function listEntering(index = 0): EntryExitAnimationFunction {
  const delay = Math.min(index, MAX_STEPS) * STAGGER_MS;

  return () => {
    'worklet';
    const config = {
      duration: DURATION_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    };
    const step = <T extends number | string>(to: T) =>
      withDelay(delay, withTiming(to, config));

    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: -24 }, { rotate: '-3deg' }, { scale: 0.96 }],
      },
      animations: {
        opacity: step(1),
        transform: [
          { translateX: step(0) },
          { rotate: step('0deg') },
          { scale: step(1) },
        ],
      },
    };
  };
}
