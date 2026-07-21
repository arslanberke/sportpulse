import LottieView from 'lottie-react-native';

interface LottieProps {
  /** Parsed Lottie JSON (via `require`). */
  source: unknown;
  /** Square render size in px. */
  size: number;
  loop?: boolean;
  autoPlay?: boolean;
  onFinish?: () => void;
}

/**
 * Thin cross-platform wrapper around LottieView. On native the animation is
 * sized via `style`; the web player (dotlottie) needs `webStyle` instead.
 */
export function Lottie({
  source,
  size,
  loop = true,
  autoPlay = true,
  onFinish,
}: LottieProps) {
  return (
    <LottieView
      source={source as never}
      autoPlay={autoPlay}
      loop={loop}
      onAnimationFinish={onFinish}
      style={{ width: size, height: size }}
      webStyle={{ width: size, height: size }}
    />
  );
}
