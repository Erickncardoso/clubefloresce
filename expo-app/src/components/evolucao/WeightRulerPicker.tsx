import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { tickPickerIndex } from '@/lib/picker-haptics';

const TICK_WIDTH = 10;
const DEFAULT_WEIGHT = 70;

function sidePadFor(viewportWidth: number) {
  return PixelRatio.roundToNearestPixel(viewportWidth / 2 - TICK_WIDTH / 2);
}

function defaultIndexFor(min: number, step: number) {
  return Math.round((DEFAULT_WEIGHT - min) / step);
}

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

function formatDisplayValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '--';
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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(() => defaultIndexFor(min, step));
  const programmatic = useRef(false);
  const isDragging = useRef(false);
  const lastHapticIndex = useRef(-1);
  const lastScrollX = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  const sidePad = viewportWidth > 0 ? sidePadFor(viewportWidth) : 0;

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

  const snapOffsets = useMemo(
    () => ticks.map((_, index) => index * TICK_WIDTH),
    [ticks],
  );

  const displayValue = value != null
    ? (ticks[activeIndex]?.value ?? min)
    : null;

  const findIndexForValue = useCallback((raw: number | null) => {
    if (raw == null || !Number.isFinite(raw)) {
      return defaultIndexFor(min, step);
    }
    const clamped = Math.max(min, Math.min(max, roundValue(raw, step)));
    return Math.round((clamped - min) / step);
  }, [max, min, step]);

  const scrollOffsetForIndex = useCallback((index: number) => index * TICK_WIDTH, []);

  const alignScrollToIndex = useCallback((index: number, animated = false) => {
    const x = scrollOffsetForIndex(index);
    lastScrollX.current = x;
    scrollRef.current?.scrollTo({ x, animated });
    if (!animated) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x, animated: false });
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x, animated: false });
        });
      });
    }
  }, [scrollOffsetForIndex]);

  const scrollToIndex = useCallback((index: number, animated = false) => {
    if (viewportWidth <= 0) return;
    const target = Math.max(0, Math.min(ticks.length - 1, index));
    lastHapticIndex.current = target;
    programmatic.current = true;
    setActiveIndex(target);
    alignScrollToIndex(target, animated);
    setTimeout(() => {
      programmatic.current = false;
    }, animated ? 320 : 48);
  }, [alignScrollToIndex, ticks.length, viewportWidth]);

  const emitIndex = useCallback((index: number) => {
    const tick = ticks[index];
    if (tick && tick.value !== value) onChange(tick.value);
  }, [onChange, ticks, value]);

  useEffect(() => {
    if (viewportWidth <= 0) return;

    const target = findIndexForValue(value);
    scrollToIndex(target, false);

    const task = InteractionManager.runAfterInteractions(() => {
      scrollToIndex(target, false);
      hasInitialized.current = true;
    });

    return () => task.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- layout bootstrap only
  }, [viewportWidth]);

  useEffect(() => {
    if (viewportWidth <= 0 || !hasInitialized.current) return;
    if (isDragging.current || programmatic.current) return;

    const target = findIndexForValue(value);
    if (target !== activeIndex) {
      scrollToIndex(target, false);
    }
  }, [activeIndex, findIndexForValue, scrollToIndex, value, viewportWidth]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  function indexFromOffset(offsetX: number) {
    return Math.max(0, Math.min(ticks.length - 1, Math.round(offsetX / TICK_WIDTH)));
  }

  function setIndexFromScroll(index: number, withHaptic: boolean) {
    const clamped = Math.max(0, Math.min(ticks.length - 1, index));
    if (withHaptic) tickPickerIndex(lastHapticIndex, clamped);
    if (clamped !== activeIndex) setActiveIndex(clamped);
    return clamped;
  }

  function settleAtOffset(offsetX: number) {
    const index = indexFromOffset(offsetX);
    const exactX = scrollOffsetForIndex(index);
    if (Math.abs(offsetX - exactX) > 0.5) {
      programmatic.current = true;
      lastScrollX.current = exactX;
      scrollRef.current?.scrollTo({ x: exactX, animated: false });
      setTimeout(() => {
        programmatic.current = false;
      }, 32);
    }
    setActiveIndex(index);
    return index;
  }

  function settleScroll() {
    if (programmatic.current || isDragging.current) return;
    const settled = settleAtOffset(lastScrollX.current);
    emitIndex(settled);
  }

  function onScrollBeginDrag() {
    isDragging.current = true;
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmatic.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    lastScrollX.current = offsetX;
    const index = indexFromOffset(offsetX);
    setIndexFromScroll(index, true);

    if (isDragging.current) return;

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (programmatic.current || isDragging.current) return;
      settleScroll();
    }, 120);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    isDragging.current = false;
    if (programmatic.current) return;

    lastScrollX.current = event.nativeEvent.contentOffset.x;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleScroll();
  }

  function onViewportLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== viewportWidth) {
      setViewportWidth(nextWidth);
    }
  }

  function onContentSizeChange() {
    if (viewportWidth <= 0 || !hasInitialized.current) return;
    scrollToIndex(activeIndex, false);
  }

  return (
    <View style={styles.root}>
      <View style={styles.shell}>
        <View style={styles.card}>
          <View style={styles.viewport} onLayout={onViewportLayout}>
            <View style={styles.readout} pointerEvents="none">
              <Text style={styles.readoutValue}>{formatDisplayValue(displayValue)}</Text>
              <Text style={styles.readoutUnit}>kg</Text>
            </View>

            <View style={styles.pointer} pointerEvents="none">
              <View style={styles.pointerLine} />
              <View style={styles.pointerTick} />
            </View>

            {viewportWidth > 0 ? (
              <ScrollView
                ref={scrollRef}
                horizontal
                bounces={false}
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToOffsets={snapOffsets}
                snapToAlignment="start"
                disableIntervalMomentum
                style={styles.scroll}
                onContentSizeChange={onContentSizeChange}
                onScrollBeginDrag={onScrollBeginDrag}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={onScrollEnd}
                onScrollEndDrag={onScrollEnd}
              >
                <View style={styles.trackRow}>
                  <View style={{ width: sidePad }} />
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
                  <View style={{ width: sidePad }} />
                </View>
              </ScrollView>
            ) : (
              <View style={styles.trackPlaceholder} />
            )}
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
    left: '50%',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    transform: [{ translateX: '-50%' }],
    zIndex: 3,
  },
  readoutValue: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 34,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  readoutUnit: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  pointer: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    alignItems: 'center',
    transform: [{ translateX: '-50%' }],
    zIndex: 2,
  },
  pointerLine: {
    width: 2,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  pointerTick: {
    width: 0,
    height: 0,
    marginTop: 1,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.text,
  },
  scroll: {
    paddingBottom: 2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
  },
  trackPlaceholder: {
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
    width: TICK_WIDTH,
    minHeight: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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
