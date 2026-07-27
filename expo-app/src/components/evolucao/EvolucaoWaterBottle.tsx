import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts, radii } from '@/theme/tokens';

type WaterBottleProps = {
  current: number;
  target: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

const FILL_TOP = 34;
const FILL_BOTTOM = 142;
const FILL_RANGE = FILL_BOTTOM - FILL_TOP;

const bottleOuterPath =
  'M 38 14 L 38 32 C 31 36, 26 44, 26 54 L 26 138 L 26 144 Q 26 146 28 146 L 60 146 Q 62 146 62 144 L 62 138 L 62 54 C 62 44, 57 36, 50 32 L 50 14 Z';

const bottleInnerPath =
  'M 39 32 L 39 34 C 32 38, 28 46, 28 56 L 28 134 L 28 140 Q 28 142 30 142 L 58 142 Q 60 142 60 140 L 60 134 L 60 56 C 60 46, 56 38, 51 34 L 51 32 Z';

function formatLiters(value: number) {
  const rounded = Math.round(value * 4) / 4;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',');
  return `${text} L`;
}

export default function EvolucaoWaterBottle({
  current,
  target,
  onIncrement,
  onDecrement,
}: WaterBottleProps) {
  const fillPercent = target ? Math.min(100, (current / target) * 100) : 0;
  const waterHeightPx = Math.max(0, (fillPercent / 100) * FILL_RANGE);
  const waterTop = FILL_BOTTOM - waterHeightPx;

  return (
    <View style={styles.root}>
      <Svg width={88} height={176} viewBox="0 0 88 176">
        <Defs>
          <LinearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6dbde8" />
            <Stop offset="100%" stopColor="#6dbde8" />
          </LinearGradient>
        </Defs>
        <Rect x={35} y={5} width={18} height={6} rx={3} fill="#6eb5e0" />
        <Path d={bottleOuterPath} fill="#f4fbff" stroke="#a8d4ef" strokeWidth={2} />
        <Rect x={28} y={waterTop} width={34} height={waterHeightPx} fill="url(#gradWater)" />
        <Path d={bottleInnerPath} fill="none" stroke="#c5e4f5" strokeWidth={1} opacity={0.6} />
        <SvgText
          x={44}
          y={98}
          textAnchor="middle"
          fill={fillPercent > 45 ? '#fff' : colors.text}
          fontSize={14}
          fontWeight="700"
        >
          {formatLiters(current)}
        </SvgText>
      </Svg>

      <Text style={styles.count}>
        <Text style={styles.countStrong}>{formatLiters(current)}</Text>
        <Text style={styles.countMuted}> / {formatLiters(target)}</Text>
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={onDecrement}>
          <Minus size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onIncrement}>
          <Plus size={16} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.hint}>+250 ml por toque</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 8 },
  count: { fontSize: 14 },
  countStrong: { fontFamily: fonts.extrabold, color: colors.text },
  countMuted: { fontFamily: fonts.regular, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.primaryDark },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
