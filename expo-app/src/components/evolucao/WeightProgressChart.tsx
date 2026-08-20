import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import {
  chartYRange,
  type WeightChartPoint,
  yTicks,
} from '@/lib/weight-progress';
import { fonts } from '@/theme/tokens';

type Props = {
  points: WeightChartPoint[];
  goalKg?: number | null;
};

const CHART_H = 168;
const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const WEIGHT_COLOR = '#7B61FF';
const GOAL_COLOR = '#E85D5D';

export default function WeightProgressChart({ points, goalKg }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, windowWidth - 64);

  const plot = useMemo(() => {
    const innerW = chartWidth - PAD_LEFT - PAD_RIGHT;
    const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
    const { min, max } = chartYRange(points, goalKg);
    const ticks = yTicks(min, max, 5);

    const toY = (weight: number) => {
      if (max === min) return PAD_TOP + innerH / 2;
      return PAD_TOP + ((max - weight) / (max - min)) * innerH;
    };

    const toX = (index: number) => {
      if (points.length <= 1) return PAD_LEFT + innerW / 2;
      return PAD_LEFT + (index / (points.length - 1)) * innerW;
    };

    const polyline = points.map((point, index) => `${toX(index)},${toY(point.weightKg)}`).join(' ');

    return { ticks, toY, toX, polyline, innerW, innerH };
  }, [chartWidth, goalKg, points]);

  if (!points.length) {
    return (
      <View style={[styles.empty, { height: CHART_H }]}>
        <Text style={styles.emptyText}>Registre seu peso para ver o gráfico.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Svg width={chartWidth} height={CHART_H}>
        {plot.ticks.map((tick) => {
          const y = plot.toY(tick);
          return (
            <Line
              key={tick}
              x1={PAD_LEFT}
              y1={y}
              x2={chartWidth - PAD_RIGHT}
              y2={y}
              stroke="#ececee"
              strokeWidth={1}
            />
          );
        })}

        {plot.ticks.map((tick) => (
          <SvgText
            key={`label-${tick}`}
            x={PAD_LEFT - 6}
            y={plot.toY(tick) + 4}
            fontSize={10}
            fill="#aeaeb2"
            textAnchor="end"
          >
            {tick.toFixed(1)}
          </SvgText>
        ))}

        {goalKg != null && Number.isFinite(goalKg) ? (
          <Line
            x1={PAD_LEFT}
            y1={plot.toY(goalKg)}
            x2={chartWidth - PAD_RIGHT}
            y2={plot.toY(goalKg)}
            stroke={GOAL_COLOR}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ) : null}

        {points.length > 1 ? (
          <Polyline
            points={plot.polyline}
            fill="none"
            stroke={WEIGHT_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {points.map((point, index) => (
          <Circle
            key={`${point.label}-${index}`}
            cx={plot.toX(index)}
            cy={plot.toY(point.weightKg)}
            r={points.length === 1 ? 5 : 4}
            fill={WEIGHT_COLOR}
          />
        ))}

        {points.map((point, index) => {
          if (points.length > 6 && index % 2 !== 0 && index !== points.length - 1) return null;
          return (
            <SvgText
              key={`x-${point.label}-${index}`}
              x={plot.toX(index)}
              y={CHART_H - 6}
              fontSize={10}
              fill="#aeaeb2"
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: WEIGHT_COLOR }]} />
          <Text style={styles.legendText}>Seu peso</Text>
        </View>
        {goalKg != null && Number.isFinite(goalKg) ? (
          <View style={styles.legendItem}>
            <View style={styles.legendDash} />
            <Text style={styles.legendText}>Meta de peso</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#fafafa',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#8a8a8e',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: GOAL_COLOR,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#8a8a8e',
  },
});
