import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  FLORESCER_LOGO_COLOR,
  FLORESCER_LOGO_PATH,
  FLORESCER_LOGO_STROKES,
  FLORESCER_LOGO_VIEWBOX,
} from '@/lib/florescer-logo';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Comprimento real de cada subpath (com folga) — o traço some até o offset chegar a 0. */
const STROKE_LENS = [1600, 1020, 320];
const STROKE_MS = [1050, 650, 280];
const STROKE_DELAY = [0, 920, 1500];
const FILL_DELAY = 1780;
const FILL_MS = 420;

type Props = {
  size?: number;
  color?: string;
  reducedMotion?: boolean;
};

export default function FlorescerDrawLogo({
  size = 128,
  color = FLORESCER_LOGO_COLOR,
  reducedMotion = false,
}: Props) {
  const offsets = useRef(STROKE_LENS.map((len) => new Animated.Value(len))).current;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    function showFilled() {
      offsets.forEach((value, index) => value.setValue(0));
      fill.setValue(1);
    }

    function play() {
      offsets.forEach((value, index) => value.setValue(STROKE_LENS[index]));
      fill.setValue(0);
      Animated.parallel([
        ...offsets.map((value, index) =>
          Animated.timing(value, {
            toValue: 0,
            duration: STROKE_MS[index],
            delay: STROKE_DELAY[index],
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ),
        Animated.timing(fill, {
          toValue: 1,
          duration: FILL_MS,
          delay: FILL_DELAY,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }

    if (reducedMotion) {
      showFilled();
      return;
    }

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) showFilled();
    });

    play();

    return () => {
      cancelled = true;
      offsets.forEach((value) => value.stopAnimation());
      fill.stopAnimation();
    };
  }, [fill, offsets, reducedMotion]);

  const height = size;
  const width = Math.round((size * 295) / 415);

  return (
    <Svg
      width={width}
      height={height}
      viewBox={FLORESCER_LOGO_VIEWBOX}
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Clube Florescer"
    >
      {FLORESCER_LOGO_STROKES.map((d, index) => (
        <AnimatedPath
          key={index}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[STROKE_LENS[index], STROKE_LENS[index]]}
          strokeDashoffset={offsets[index]}
        />
      ))}
      <AnimatedPath
        d={FLORESCER_LOGO_PATH}
        fill={color}
        stroke="none"
        opacity={fill}
      />
    </Svg>
  );
}

export const FLORESCER_DRAW_MS = FILL_DELAY + FILL_MS + 200;
