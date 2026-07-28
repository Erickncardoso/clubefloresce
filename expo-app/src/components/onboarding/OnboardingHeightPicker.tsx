import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { tickPickerIndex, triggerPickerHaptic } from '@/lib/picker-haptics';

const ITEM_HEIGHT = 44;

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

function formatHeightDisplay(cm: number) {
  return (cm / 100).toFixed(2);
}

export default function OnboardingHeightPicker({
  value,
  onChange,
  min = 140,
  max = 210,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const programmatic = useRef(false);
  const lastHapticIndex = useRef(-1);

  const values = useMemo(() => {
    const list: number[] = [];
    for (let current = min; current <= max; current += 1) {
      list.push(current);
    }
    return list;
  }, [max, min]);

  const [viewportHeight] = useState(176);
  const spacerHeight = viewportHeight / 2 - ITEM_HEIGHT / 2;

  const scrollToValue = useCallback((next: number, animated = false) => {
    const index = values.indexOf(next);
    if (index < 0) return;
    lastHapticIndex.current = index;
    programmatic.current = true;
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
    setTimeout(() => {
      programmatic.current = false;
    }, animated ? 280 : 16);
  }, [values]);

  useEffect(() => {
    scrollToValue(value);
  }, [scrollToValue, value]);

  function applyIndex(index: number, withHaptic: boolean) {
    const next = values[Math.max(0, Math.min(values.length - 1, index))];
    if (next == null) return next;
    if (withHaptic) tickPickerIndex(lastHapticIndex, index);
    if (next !== value) onChange(next);
    return next;
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmatic.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    applyIndex(index, true);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmatic.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const next = applyIndex(index, false);
    if (next != null) scrollToValue(next);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.viewport, { height: viewportHeight }]}>
        <View style={styles.highlight} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ paddingVertical: spacerHeight }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onScrollEnd}
        >
          {values.map((item) => {
            const active = item === value;
            return (
              <Pressable
                key={item}
                style={styles.item}
                onPress={() => {
                  const index = values.indexOf(item);
                  lastHapticIndex.current = index;
                  triggerPickerHaptic();
                  onChange(item);
                  scrollToValue(item, true);
                }}
              >
                <Text style={[styles.label, active && styles.labelActive]}>
                  {formatHeightDisplay(item)} m
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  viewport: {
    position: 'relative',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -22,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    zIndex: 0,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    minWidth: 76,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: 'rgba(28, 24, 22, 0.42)',
  },
  labelActive: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    color: colors.text,
  },
});
