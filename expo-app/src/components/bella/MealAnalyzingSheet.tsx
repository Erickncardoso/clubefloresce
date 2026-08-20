import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { fonts, radii } from '@/theme/tokens';

const LINES = [
  'Analisando',
  'Detectando ingredientes',
  'Calculando calorias',
  'Preparando resultado',
  'Quase pronto!',
];

const LINE = 46;
const WINDOW = LINE * 3;
const LAST_STEP = LINES.length - 3;

function StatusLine({
  text,
  index,
  shift,
}: {
  text: string;
  index: number;
  shift: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const dist = Math.abs(index * LINE - shift.value - LINE);
    const center = interpolate(dist, [0, LINE], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: interpolate(center, [0, 1], [0.38, 1]),
      transform: [{ scale: interpolate(center, [0, 1], [0.96, 1]) }],
    };
  });

  return (
    <Animated.Text style={[styles.line, style]} numberOfLines={1}>
      {text}
    </Animated.Text>
  );
}

export default function MealAnalyzingSheet() {
  const insets = useSafeAreaInsets();
  const shift = useSharedValue(0);

  useEffect(() => {
    let step = 0;
    let dir = 1;
    shift.value = 0;
    const timer = setInterval(() => {
      if (step + dir > LAST_STEP || step + dir < 0) dir *= -1;
      step += dir;
      shift.value = withTiming(step * LINE, {
        duration: 560,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
    }, 2200);
    return () => clearInterval(timer);
  }, [shift]);

  const stackStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -shift.value }],
  }));

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      <View style={styles.window}>
        <Animated.View style={[styles.stack, stackStyle]}>
          {LINES.map((line, index) => (
            <StatusLine key={line} text={line} index={index} shift={shift} />
          ))}
        </Animated.View>
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Não feche o app nem bloqueie o dispositivo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  window: {
    height: WINDOW,
    overflow: 'hidden',
    width: '100%',
  },
  stack: {
    width: '100%',
  },
  line: {
    height: LINE,
    width: '100%',
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: LINE,
    color: '#1a1a1a',
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: '#f1f1f1',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#6b6b6b',
    textAlign: 'center',
  },
});
