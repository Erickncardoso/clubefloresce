import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Flame } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatStatValue } from '@/lib/format';
import { colors, fonts, radii } from '@/theme/tokens';

type MacroTargets = {
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

type Props = {
  targets: MacroTargets;
  consumed: MacroTargets;
  percent?: number;
  readOnly?: boolean;
};

const LIST_CONFIG = [
  {
    key: 'carbs',
    label: 'Carboidratos',
    unit: 'g',
    color: '#6e9ed8',
    getValue: (c: MacroTargets) => Number(c.carbsG || 0),
    getTarget: (t: MacroTargets) => Number(t.carbsG || 0),
  },
  {
    key: 'protein',
    label: 'Proteínas',
    unit: 'g',
    color: '#64875e',
    getValue: (c: MacroTargets) => Number(c.proteinG || 0),
    getTarget: (t: MacroTargets) => Number(t.proteinG || 0),
  },
  {
    key: 'fat',
    label: 'Gorduras',
    unit: 'g',
    color: '#b08d5b',
    getValue: (c: MacroTargets) => Number(c.fatG || 0),
    getTarget: (t: MacroTargets) => Number(t.fatG || 0),
  },
] as const;

const RADIUS = 48;
const STROKE = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function progressPercent(value: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export default function HomeNutritionPanel({ targets, consumed, percent = 0, readOnly = false }: Props) {
  const calorieValue = Number(consumed.caloriesKcal || 0);
  const calorieTarget = Number(targets.caloriesKcal || 0);
  const centerPercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  const dashOffset = CIRCUMFERENCE - (centerPercent / 100) * CIRCUMFERENCE;
  const remaining = Math.max(0, calorieTarget - calorieValue);

  const remainingLabel = !calorieTarget
    ? 'Meta ainda não definida'
    : remaining === 0
      ? 'Meta alcançada'
      : `Faltam ${formatStatValue(remaining)} kcal`;

  const macroStats = LIST_CONFIG.map((item) => {
    const value = item.getValue(consumed);
    const target = item.getTarget(targets);
    return {
      ...item,
      value,
      target,
      percent: progressPercent(value, target),
    };
  });

  const panelBody = (
    <>
      <View style={styles.overview}>
        <View style={styles.chartWrap}>
          <Svg width={116} height={116} viewBox="0 0 120 120">
            <Circle
              cx={60}
              cy={60}
              r={RADIUS}
              fill="none"
              stroke="#e5e9e1"
              strokeWidth={STROKE}
            />
            <Circle
              cx={60}
              cy={60}
              r={RADIUS}
              fill="none"
              stroke="#76826b"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              rotation={-90}
              origin="60, 60"
            />
          </Svg>
          <View style={styles.chartCenter} pointerEvents="none">
            <Flame color={colors.primaryDark} size={15} strokeWidth={2.2} />
            <Text style={styles.chartValue}>{centerPercent}%</Text>
            <Text style={styles.chartLabel}>da meta</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Consumido hoje</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryStrong}>{formatStatValue(calorieValue)}</Text>
            <Text style={styles.summaryUnit}>kcal</Text>
          </View>
          <Text style={styles.summaryTarget}>
            Meta de {formatStatValue(calorieTarget)} kcal
          </Text>
          <Text style={styles.summaryStatus}>{remainingLabel}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {macroStats.map((stat, index) => (
          <View
            key={stat.key}
            style={[
              styles.stat,
              index === 0 && styles.statFirst,
              index === macroStats.length - 1 && styles.statLast,
            ]}
          >
            <View style={[styles.statDot, { backgroundColor: stat.color }]} />
            <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statNumber}>{formatStatValue(stat.value)}</Text>
              <Text style={styles.statUnit} numberOfLines={1}>
                / {formatStatValue(stat.target)} {stat.unit}
              </Text>
            </View>
            <View style={styles.statTrack}>
              <View
                style={[styles.statFill, { width: `${stat.percent}%`, backgroundColor: stat.color }]}
              />
            </View>
          </View>
        ))}
      </View>
    </>
  );

  if (readOnly) {
    return <View style={styles.card}>{panelBody}</View>;
  }

  return (
    <Link href="/evolucao/nutricao" asChild>
      <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel="Abrir detalhes da nutrição de hoje">
        {panelBody}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.surface,
    backgroundColor: '#fff',
  },
  overview: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  chartWrap: { width: 116, height: 116, position: 'relative' },
  chartCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  chartValue: {
    fontFamily: fonts.semibold,
    fontSize: 23,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  chartLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted },
  summary: { flex: 1, minWidth: 0 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginBottom: 3 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  summaryStrong: { fontFamily: fonts.semibold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
  summaryUnit: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  summaryTarget: { marginTop: 5, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  summaryStatus: { marginTop: 7, fontFamily: fonts.medium, fontSize: 11, color: colors.primaryDark },
  stats: {
    flexDirection: 'row',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eceee9',
  },
  stat: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#eceee9',
  },
  statFirst: { paddingLeft: 0 },
  statLast: { paddingRight: 0, borderRightWidth: 0 },
  statDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 6 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 3 },
  statNumber: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  statUnit: { flex: 1, fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted },
  statTrack: {
    height: 4,
    marginTop: 9,
    borderRadius: 999,
    backgroundColor: '#edf0ea',
    overflow: 'hidden',
  },
  statFill: { height: '100%', borderRadius: 999 },
});
