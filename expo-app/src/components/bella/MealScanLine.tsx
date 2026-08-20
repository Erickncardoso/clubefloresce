import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  height: number;
};

const GLOW = 72;

export default function MealScanLine({ height }: Props) {
  const y = useSharedValue(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (height <= 0) return;
    y.value = 0;
    y.value = withRepeat(
      withTiming(Math.max(height - 2, 0), {
        duration: 1600,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [height, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  if (height <= 0) return null;

  return (
    <View
      style={[styles.clip, { height }]}
      pointerEvents="none"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.bundle, style]}>
        <View style={styles.glow}>
          {width > 0 ? (
            <Svg width={width} height={GLOW}>
              <Defs>
                <LinearGradient id="scanGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#8FCB4A" stopOpacity="0" />
                  <Stop offset="1" stopColor="#8FCB4A" stopOpacity="0.55" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={width} height={GLOW} fill="url(#scanGlow)" />
            </Svg>
          ) : null}
        </View>
        <View style={styles.line} />
        <View style={styles.glow}>
          {width > 0 ? (
            <Svg width={width} height={GLOW}>
              <Defs>
                <LinearGradient id="scanGlowDown" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#8FCB4A" stopOpacity="0.45" />
                  <Stop offset="1" stopColor="#8FCB4A" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={width} height={GLOW} fill="url(#scanGlowDown)" />
            </Svg>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bundle: {
    marginTop: -GLOW,
  },
  glow: {
    height: GLOW,
    width: '100%',
  },
  line: {
    height: 2.5,
    width: '100%',
    backgroundColor: '#8FCB4A',
  },
});
