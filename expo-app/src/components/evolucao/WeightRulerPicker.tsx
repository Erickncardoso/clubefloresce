import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts } from '@/theme/tokens';

const TICK_WIDTH = 10;

type WeightRulerPickerProps = {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function roundValue(value: number, step: number) {
  const precision = step < 1 ? 1 : 0;
  return Number(value.toFixed(precision));
}

function formatDisplayValue(value: number) {
  if (!Number.isFinite(value)) return '--';
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export default function WeightRulerPicker({
  value,
  onChange,
  min = 40,
  max = 150,
  step = 0.5,
}: WeightRulerPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const sidePad = width / 2 - TICK_WIDTH / 2;
  const [activeIndex, setActiveIndex] = useState(0);
  const programmatic = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ticks = useMemo(() => {
    const list: { value: number; major: boolean; label: number | null }[] = [];
    const steps = Math.round((max - min) / step);
    for (let i = 0; i <= steps; i += 1) {
      const tickValue = roundValue(min + i * step, step);
      const intVal = Math.round(tickValue);
      const isWhole = Math.abs(tickValue - intVal) < 0.001;
      list.push({
        value: tickValue,
        major: isWhole,
        label: isWhole && intVal % 5 === 0 ? intVal : null,
      });
    }
    return list;
  }, [max, min, step]);

  const displayValue = ticks[activeIndex]?.value ?? min;

  const findIndexForValue = useCallback((raw: number | null) => {
    if (raw == null || !Number.isFinite(raw)) {
      return Math.round((70 - min) / step);
    }
    const clamped = Math.max(min, Math.min(max, roundValue(raw, step)));
    return Math.round((clamped - min) / step);
  }, [max, min, step]);

  const scrollToIndex = useCallback((index: number, animated = false) => {
    const target = Math.max(0, Math.min(ticks.length - 1, index));
    programmatic.current = true;
    setActiveIndex(target);
    scrollRef.current?.scrollTo({ x: target * TICK_WIDTH, animated });
    setTimeout(() => {
      programmatic.current = false;
    }, animated ? 320 : 16);
  }, [ticks.length]);

  useEffect(() => {
    const index = findIndexForValue(value);
    scrollToIndex(index);
  }, [findIndexForValue, scrollToIndex, value]);

  useEffect(() => {
    if (value == null && ticks[activeIndex]) {
      onChange(ticks[activeIndex].value);
    }
  }, [activeIndex, onChange, ticks, value]);

  function emitIndex(index: number) {
    const tick = ticks[index];
    if (tick && tick.value !== value) onChange(tick.value);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmatic.current) return;
    const index = Math.max(
      0,
      Math.min(ticks.length - 1, Math.round(event.nativeEvent.contentOffset.x / TICK_WIDTH)),
    );
    if (index !== activeIndex) setActiveIndex(index);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (programmatic.current) return;
      scrollToIndex(index);
      emitIndex(index);
    }, 120);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmatic.current) return;
    const index = Math.max(
      0,
      Math.min(ticks.length - 1, Math.round(event.nativeEvent.contentOffset.x / TICK_WIDTH)),
    );
    scrollToIndex(index);
    emitIndex(index);
  }

  return (
    <View style={styles.root}>
      <View style={styles.shell}>
        <View style={styles.card}>
          <View style={styles.viewport}>
            <View style={styles.readout} pointerEvents="none">
              <Text style={styles.readoutValue}>{formatDisplayValue(displayValue)}</Text>
              <Text style={styles.readoutUnit}>kg</Text>
            </View>

            <View style={styles.pointer} pointerEvents="none">
              <View style={styles.pointerLine} />
              <View style={styles.pointerTick} />
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={TICK_WIDTH}
              snapToAlignment="center"
              contentContainerStyle={{ paddingHorizontal: sidePad }}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onMomentumScrollEnd={onScrollEnd}
            >
              <View style={styles.track}>
                {ticks.map((tick, index) => (
                  <View
                    key={`${tick.value}-${index}`}
                    style={[styles.tickCol, tick.major && styles.tickColMajor]}
                  >
                    {tick.label != null ? (
                      <Text style={styles.tickLabel}>{tick.label}</Text>
                    ) : (
                      <View style={styles.tickLabelSpacer} />
                    )}
                    <View style={[styles.tick, tick.major && styles.tickMajor]} />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  shell: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#ebe8f2',
  },
  card: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  viewport: {
    position: 'relative',
    paddingTop: 38,
  },
  readout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 3,
    zIndex: 3,
  },
  readoutValue: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 34,
    color: colors.text,
  },
  readoutUnit: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  pointer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    marginLeft: -1,
    alignItems: 'center',
    zIndex: 2,
  },
  pointerLine: {
    width: 2,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.text,
    marginBottom: 2,
  },
  pointerTick: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.text,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
  },
  tickCol: {
    width: TICK_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  tickColMajor: {},
  tickLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#b8b8b8',
    minHeight: 14,
  },
  tickLabelSpacer: {
    minHeight: 14,
  },
  tick: {
    width: 1,
    height: 10,
    backgroundColor: '#d4d4d4',
    borderRadius: 1,
  },
  tickMajor: {
    width: 1.5,
    height: 18,
    backgroundColor: '#b8b8b8',
  },
});
