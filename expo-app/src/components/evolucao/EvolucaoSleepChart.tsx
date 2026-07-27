import { Check, Minus, Moon, Plus, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors, fonts, radii } from '@/theme/tokens';

type SleepSchedule = {
  bedMinutes: number;
  wakeMinutes: number;
  durationHours: number;
  durationMinutes: number;
};

type SleepChartProps = {
  target: number;
  schedule: SleepSchedule;
  onShiftBed: (delta: number) => void;
  onShiftWake: (delta: number) => void;
};

const CX = 100;
const CY = 100;
const RING_R = 76;
const RING_CIRC = 2 * Math.PI * RING_R;

function normalizeMinutes(minutes: number) {
  return ((minutes % 1440) + 1440) % 1440;
}

function dialAngle(minutes: number) {
  const total = normalizeMinutes(minutes);
  const h24 = Math.floor(total / 60);
  const mi = total % 60;
  const hourOnDial = (h24 % 12) + mi / 60;
  return (hourOnDial / 12) * 360 - 90;
}

function polar(radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function formatClock(minutes: number) {
  const total = normalizeMinutes(minutes);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function EvolucaoSleepChart({
  target,
  schedule,
  onShiftBed,
  onShiftWake,
}: SleepChartProps) {
  const durationParts = {
    h: String(Math.floor(schedule.durationMinutes / 60)).padStart(2, '0'),
    m: String(schedule.durationMinutes % 60).padStart(2, '0'),
  };
  const durationHoursLabel = Number.isInteger(schedule.durationHours)
    ? String(schedule.durationHours)
    : schedule.durationHours.toFixed(1);
  const metGoal = schedule.durationMinutes / 60 >= target;

  const start = dialAngle(schedule.bedMinutes);
  const end = dialAngle(schedule.wakeMinutes);
  let sweep = end - start;
  if (sweep <= 0) sweep += 360;
  const arcLength = (sweep / 360) * RING_CIRC;

  const moonPos = polar(RING_R, dialAngle(schedule.bedMinutes));
  const sunPos = polar(RING_R, dialAngle(schedule.wakeMinutes));

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.dialWrap}>
          <Svg width="100%" height={200} viewBox="0 0 200 200">
            <Circle cx={CX} cy={CY} r={RING_R} stroke="#ececea" strokeWidth={10} fill="none" />
            <Circle
              cx={CX}
              cy={CY}
              r={RING_R}
              stroke={colors.primary}
              strokeWidth={10}
              fill="none"
              strokeDasharray={`${arcLength} ${RING_CIRC}`}
              transform={`rotate(${start} ${CX} ${CY})`}
              origin={`${CX}, ${CY}`}
            />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = ((index + 1) / 12) * 360 - 90;
              const outer = polar(70, angle);
              const inner = polar(64, angle);
              return (
                <Line
                  key={index}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke="#d8d8d4"
                  strokeWidth={1}
                />
              );
            })}
            {Array.from({ length: 12 }, (_, index) => {
              const n = index + 1;
              const pos = polar(54, (n / 12) * 360 - 90);
              return (
                <SvgText
                  key={n}
                  x={pos.x}
                  y={pos.y + 3.5}
                  textAnchor="middle"
                  fill={colors.textMuted}
                  fontSize={10}
                >
                  {n}
                </SvgText>
              );
            })}
            <Circle cx={CX} cy={CY} r={48} fill="#fff" />
            <SvgText x={CX} y={93} textAnchor="middle" fill={colors.text} fontSize={22} fontWeight="700">
              {durationParts.h}:{durationParts.m}
            </SvgText>
            <SvgText x={CX} y={110} textAnchor="middle" fill={colors.textMuted} fontSize={11}>
              de sono
            </SvgText>
            <Circle cx={moonPos.x} cy={moonPos.y} r={13} fill="#eef0eb" stroke={colors.primaryDark} strokeWidth={1.5} />
            <Circle cx={sunPos.x} cy={sunPos.y} r={13} fill="#fff8eb" stroke="#c4842e" strokeWidth={1.5} />
          </Svg>
        </View>

        <View style={styles.cards}>
          <View style={[styles.card, styles.cardNight]}>
            <View style={styles.cardTop}>
              <View style={styles.cardIcon}>
                <Moon size={16} color={colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.cardLabel}>Dormir</Text>
                <Text style={styles.cardTime}>{formatClock(schedule.bedMinutes)}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable style={styles.stepBtn} onPress={() => onShiftBed(-15)}>
                <Minus size={14} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.stepLabel}>15 min</Text>
              <Pressable style={[styles.stepBtn, styles.stepBtnPrimary]} onPress={() => onShiftBed(15)}>
                <Plus size={14} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={[styles.card, styles.cardDay]}>
            <View style={styles.cardTop}>
              <View style={[styles.cardIcon, styles.cardIconDay]}>
                <Sun size={16} color="#c4842e" />
              </View>
              <View>
                <Text style={styles.cardLabel}>Acordar</Text>
                <Text style={styles.cardTime}>{formatClock(schedule.wakeMinutes)}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable style={styles.stepBtn} onPress={() => onShiftWake(-15)}>
                <Minus size={14} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.stepLabel}>15 min</Text>
              <Pressable style={[styles.stepBtn, styles.stepBtnSun]} onPress={() => onShiftWake(15)}>
                <Plus size={14} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.meta, metGoal && styles.metaOk]}>
          <Text style={styles.metaText}>Meta {target}h</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>
            Hoje <Text style={styles.metaStrong}>{durationHoursLabel}h</Text>
          </Text>
          {metGoal ? (
            <View style={styles.metaBadge}>
              <Check size={12} color={colors.primaryDark} />
              <Text style={styles.metaBadgeText}>Meta atingida</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  panel: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: 12,
    gap: 12,
  },
  dialWrap: { alignItems: 'center' },
  cards: { gap: 10 },
  card: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  cardNight: { backgroundColor: '#f3f4f8' },
  cardDay: { backgroundColor: '#fffaf2' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconDay: { backgroundColor: '#fff' },
  cardLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
  },
  cardTime: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPrimary: { backgroundColor: colors.primaryDark },
  stepBtnSun: { backgroundColor: '#c4842e' },
  stepLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    minWidth: 48,
    textAlign: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#f3f3f1',
  },
  metaOk: { backgroundColor: '#eef5eb' },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: { color: colors.textMuted },
  metaStrong: { fontFamily: fonts.bold, color: colors.text },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  metaBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primaryDark,
  },
});
