import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts } from '@/theme/tokens';

type Props = {
  direction: 'left' | 'right';
  color: string;
  label: string;
  hint: string;
  icon: ReactNode;
  onActivate: () => void;
};

const TRAVEL = 92;
const THRESHOLD = 58;
const VELOCITY = 650;
const SPRING = { damping: 20, stiffness: 260, mass: 0.8 };

export default function IncomingCallSwipeKnob({
  direction,
  color,
  label,
  hint,
  icon,
  onActivate,
}: Props) {
  const x = useSharedValue(0);
  const toLeft = direction === 'left';

  const activate = () => {
    onActivate();
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      x.value = toLeft
        ? Math.min(0, Math.max(event.translationX, -TRAVEL))
        : Math.max(0, Math.min(event.translationX, TRAVEL));
    })
    .onEnd((event) => {
      const tapped =
        Math.abs(event.translationX) < 12
        && Math.abs(event.translationY) < 12
        && Math.abs(event.velocityX) < 280;
      const passed = toLeft
        ? event.translationX < -THRESHOLD || event.velocityX < -VELOCITY
        : event.translationX > THRESHOLD || event.velocityX > VELOCITY;
      if (tapped || passed) {
        x.value = withTiming(toLeft ? -TRAVEL : TRAVEL, { duration: tapped ? 90 : 140 }, (finished) => {
          if (finished) runOnJS(activate)();
        });
        return;
      }
      x.value = withSpring(0, SPRING);
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.col}>
      <View style={styles.track}>
        <Text style={[styles.chevrons, toLeft ? styles.chevronsLeft : styles.chevronsRight]}>
          {toLeft ? '‹ ‹ ‹' : '› › ›'}
        </Text>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[styles.knob, { backgroundColor: color }, knobStyle]}
          >
            {icon}
          </Animated.View>
        </GestureDetector>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    alignItems: 'center',
    width: 128,
  },
  track: {
    width: 128,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevrons: {
    position: 'absolute',
    fontFamily: fonts.bold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 2,
  },
  chevronsLeft: {
    left: 6,
  },
  chevronsRight: {
    right: 6,
  },
  knob: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    willChange: 'transform',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  label: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: '#fff',
  },
  hint: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
});
