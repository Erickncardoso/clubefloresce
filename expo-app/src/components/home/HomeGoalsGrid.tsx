import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import {
  Cookie,
  Droplets,
  Dumbbell,
  Moon,
  Plus,
  type LucideIcon,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';

export type HomeGoalMetric = {
  id: string;
  label: string;
  value: number;
  showPercent?: boolean;
  meta: string;
  barPct: number;
};

type Props = {
  metrics: HomeGoalMetric[];
  onQuickAdd: (goalId: string) => void;
  readOnly?: boolean;
};

/** Tokens espelhados de `frontend/components/home/GoalsGrid.vue` (base 16px). */
const PANEL_RADIUS = 16;
const GOAL_MIN_HEIGHT = 109;
const GOAL_LINK_PAD = { top: 13, right: 56, bottom: 36, left: 16 };
const HEADING_GAP = 8;
const ICON_WRAP = 28;
const ICON_SIZE = 14;
const LABEL_SIZE = 13;
const LABEL_LINE = 17;
const META_TOP = 9;
const META_SIZE = 11;
const META_LINE = 15;
const CHART_SIZE = 112;
const CHART_RIGHT = -56;
const CHART_VALUE_W = 32;
const CHART_VALUE_SIZE = 10;
const CHART_VALUE_TRIPLE = 8.5;
const QUICK_ADD = 30;
const QUICK_ADD_INSET = 9;

const GOAL_ICONS: Record<string, LucideIcon> = {
  water: Droplets,
  food: Cookie,
  exercise: Dumbbell,
  sleep: Moon,
};

const GOAL_ACCENTS: Record<string, { accent: string; soft: string }> = {
  water: { accent: '#4a8fc4', soft: '#edf5fb' },
  food: { accent: '#9d7268', soft: '#f8f1ef' },
  exercise: { accent: '#5f8f58', soft: '#eff5ed' },
  sleep: { accent: '#6b74b8', soft: '#f0f1f8' },
};

const ARC_PATH = 'M 50 8 A 42 42 0 0 0 50 92';
const ARC_LEN = Math.PI * 42;

function progressPct(value: number) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function GoalArc({ percent, color }: { percent: number; color: string }) {
  const p = progressPct(percent);
  const dash = (p / 100) * ARC_LEN;
  return (
    <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox="0 0 100 100" style={styles.arcSvg}>
      <Path
        d={ARC_PATH}
        fill="none"
        stroke="#e5e5ea"
        strokeWidth={10}
      />
      {p > 0 ? (
        <Path
          d={ARC_PATH}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${ARC_LEN}`}
        />
      ) : null}
    </Svg>
  );
}

function GoalCell({
  metric,
  index,
  onQuickAdd,
  readOnly = false,
}: {
  metric: HomeGoalMetric;
  index: number;
  onQuickAdd: (goalId: string) => void;
  readOnly?: boolean;
}) {
  const Icon = GOAL_ICONS[metric.id] || Droplets;
  const palette = GOAL_ACCENTS[metric.id] || { accent: '#8f9a84', soft: '#f1f3ef' };
  const pct = progressPct(metric.barPct);

  return (
    <View
      style={[
        styles.goal,
        index % 2 === 0 && styles.goalLeft,
        index < 2 && styles.goalTop,
      ]}
    >
      {readOnly ? (
        <View style={styles.goalLink} accessibilityLabel={`Meta ${metric.label}`}>
          <View style={styles.heading}>
            <View style={[styles.icon, { backgroundColor: palette.soft }]}>
              <Icon color={palette.accent} size={ICON_SIZE} strokeWidth={1.75} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {metric.label}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {metric.meta}
          </Text>
          <View style={styles.chartWrap} pointerEvents="none">
            <GoalArc percent={pct} color={palette.accent} />
            <Text style={[styles.chartValue, pct === 100 && styles.chartValueTriple]}>
              {pct}%
            </Text>
          </View>
        </View>
      ) : (
        <Link href="/evolucao?tab=metas" asChild>
          <Pressable
            style={styles.goalLink}
            accessibilityRole="button"
            accessibilityLabel={`Ver detalhes de ${metric.label}`}
          >
            <View style={styles.heading}>
              <View style={[styles.icon, { backgroundColor: palette.soft }]}>
                <Icon color={palette.accent} size={ICON_SIZE} strokeWidth={1.75} />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {metric.label}
              </Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {metric.meta}
            </Text>
            <View style={styles.chartWrap} pointerEvents="none">
              <GoalArc percent={pct} color={palette.accent} />
              <Text style={[styles.chartValue, pct === 100 && styles.chartValueTriple]}>
                {pct}%
              </Text>
            </View>
          </Pressable>
        </Link>
      )}

      {!readOnly ? (
        <Pressable
          style={styles.quickAdd}
          accessibilityRole="button"
          accessibilityLabel={`Adicionar ${metric.label}`}
          onPress={() => onQuickAdd(metric.id)}
          hitSlop={7}
        >
          <Plus color={palette.accent} size={ICON_SIZE} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeGoalsGrid({ metrics, onQuickAdd, readOnly = false }: Props) {
  const rows = [metrics.slice(0, 2), metrics.slice(2, 4)];

  return (
    <View style={styles.panel} accessibilityRole="list" accessibilityLabel="Metas diárias">
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((metric, colIndex) => (
            <GoalCell
              key={metric.id}
              metric={metric}
              index={rowIndex * 2 + colIndex}
              onQuickAdd={onQuickAdd}
              readOnly={readOnly}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: PANEL_RADIUS,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  goal: {
    flex: 1,
    minWidth: 0,
    minHeight: GOAL_MIN_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  goalLeft: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(60, 60, 67, 0.1)',
  },
  goalTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.1)',
  },
  goalLink: {
    minHeight: GOAL_MIN_HEIGHT,
    paddingTop: GOAL_LINK_PAD.top,
    paddingLeft: GOAL_LINK_PAD.left,
    paddingRight: GOAL_LINK_PAD.right,
    paddingBottom: GOAL_LINK_PAD.bottom,
    justifyContent: 'center',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADING_GAP,
    minWidth: 0,
  },
  icon: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: ICON_WRAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.medium,
    fontSize: LABEL_SIZE,
    lineHeight: LABEL_LINE,
    color: colors.text,
  },
  meta: {
    marginTop: META_TOP,
    fontFamily: fonts.regular,
    fontSize: META_SIZE,
    lineHeight: META_LINE,
    color: '#6e6e73',
  },
  chartWrap: {
    position: 'absolute',
    top: '50%',
    right: CHART_RIGHT,
    width: CHART_SIZE,
    height: CHART_SIZE,
    transform: [{ translateY: -CHART_SIZE / 2 }],
  },
  arcSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  chartValue: {
    position: 'absolute',
    top: '50%',
    right: 0,
    width: CHART_VALUE_W,
    fontFamily: fonts.medium,
    fontSize: CHART_VALUE_SIZE,
    lineHeight: CHART_VALUE_SIZE + 2,
    textAlign: 'center',
    color: colors.text,
    transform: [{ translateY: -(CHART_VALUE_SIZE + 2) / 2 }],
  },
  chartValueTriple: {
    fontSize: CHART_VALUE_TRIPLE,
    lineHeight: CHART_VALUE_TRIPLE + 2,
    transform: [{ translateY: -(CHART_VALUE_TRIPLE + 2) / 2 }],
  },
  quickAdd: {
    position: 'absolute',
    left: QUICK_ADD_INSET,
    bottom: QUICK_ADD_INSET,
    zIndex: 3,
    width: QUICK_ADD,
    height: QUICK_ADD,
    borderRadius: QUICK_ADD / 2,
    borderWidth: 1,
    borderColor: '#dedee3',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141418',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
