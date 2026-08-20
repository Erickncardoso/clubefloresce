import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BellaActionSheet from '@/components/BellaActionSheet';
import NavBellaAiIcon from '@/components/icons/NavBellaAiIcon';
import {
  NavDiarioIcon,
  NavEvolutionIcon,
  NavHomeIcon,
  NavLibraryIcon,
} from '@/components/icons/nav-icons';
import { triggerImpactHaptic, triggerPickerHaptic } from '@/lib/picker-haptics';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import {
  resetPatientTabBarScrollReveal,
  subscribePatientTabBarVisibility,
} from '@/lib/patient-tab-bar-scroll';
import {
  PATIENT_NAV_CONTENT_GAP,
  PATIENT_NAV_FLOAT_MARGIN,
  PATIENT_NAV_HEIGHT,
} from '@/lib/tab-bar';
import { fonts } from '@/theme/tokens';

type NavIconComponent = ComponentType<{ size?: number; color?: string }>;

type TabItem = {
  key: string;
  label: string;
  href?: string;
  icon?: NavIconComponent;
  kind: 'route' | 'bella';
  match: (path: string) => boolean;
  requiresPaidAccess?: boolean;
};

const LOCKED_TINT = '#c7c7cc';
const INACTIVE_TINT = '#aeaeb2';
const ACTIVE_TINT = '#1c1c1e';
const ACTIVE_PILL = '#f0f0f3';
const ICON_ROW = 34;
const ICON_SIZE = 22;
const LABEL_HEIGHT = 13;
const PILL_MARGIN_X = 16;
const INNER_PAD = 4;
const SCROLL_HIDE_EXTRA = 28;
const SPRING = { damping: 26, stiffness: 280, mass: 0.7, overshootClamping: false };

const TAB_ITEMS: TabItem[] = [
  {
    key: 'inicio',
    label: 'Início',
    href: '/inicio',
    icon: NavHomeIcon,
    kind: 'route',
    match: (p) => p === '/inicio' || p.startsWith('/inicio/'),
  },
  {
    key: 'evolucao',
    label: 'Evolução',
    href: '/evolucao',
    icon: NavEvolutionIcon,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/evolucao'),
  },
  {
    key: 'bella',
    label: 'Bella',
    kind: 'bella',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/bella'),
  },
  {
    key: 'conteudo',
    label: 'Biblioteca',
    href: '/conteudo',
    icon: NavLibraryIcon,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/conteudo') || p.startsWith('/cursos') || p.startsWith('/ebooks'),
  },
  {
    key: 'diario',
    label: 'Diário',
    href: '/diario',
    icon: NavDiarioIcon,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/diario') || p.startsWith('/comunidade'),
  },
];

const TAB_COUNT = TAB_ITEMS.length;

export { PATIENT_NAV_HEIGHT, PATIENT_NAV_CONTENT_GAP, PATIENT_NAV_FLOAT_MARGIN } from '@/lib/tab-bar';

function tabSlot(width: number, index: number) {
  'worklet';
  const inner = Math.max(width - INNER_PAD * 2, 0);
  const w = inner / TAB_COUNT;
  return { x: INNER_PAD + index * w, w };
}

function indexFromX(x: number, width: number) {
  'worklet';
  const { w } = tabSlot(width, 0);
  if (w <= 0) return 0;
  return Math.max(0, Math.min(TAB_COUNT - 1, Math.floor((x - INNER_PAD) / w)));
}

export default function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bellaOpen, setBellaOpen] = useState(false);
  const [tabBarInteractive, setTabBarInteractive] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const skipPressRef = useRef(false);
  const hoverChangeRef = useRef((index: number) => {});
  const scrubEndRef = useRef((index: number) => {});
  const { hasPaidAccess } = usePatientPlanAccess();

  const path = useMemo(() => pathname || '/', [pathname]);
  const safeBottom = Math.max(insets.bottom, 0);
  const bottomOffset = safeBottom + PATIENT_NAV_FLOAT_MARGIN;
  const slideOutDistance = PATIENT_NAV_HEIGHT + bottomOffset + SCROLL_HIDE_EXTRA;

  const pillWidth = useSharedValue(0);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const hoverSv = useSharedValue(-1);

  function isLocked(item: TabItem) {
    return Boolean(item.requiresPaidAccess && !hasPaidAccess);
  }

  const activeIndex = useMemo(() => {
    const found = TAB_ITEMS.findIndex((item) => {
      if (isLocked(item)) return false;
      if (item.kind === 'bella') return item.match(path) || bellaOpen;
      return item.match(path);
    });
    return found >= 0 ? found : 0;
  }, [bellaOpen, hasPaidAccess, path]);

  const visualIndex = hoverIndex ?? activeIndex;

  useEffect(() => {
    resetPatientTabBarScrollReveal();
  }, [pathname]);

  useEffect(() => {
    return subscribePatientTabBarVisibility((visible) => {
      setTabBarInteractive(visible);
      Animated.timing(tabBarTranslateY, {
        toValue: visible ? 0 : slideOutDistance,
        duration: 380,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    });
  }, [slideOutDistance, tabBarTranslateY]);

  function snapToIndex(index: number) {
    const width = pillWidth.value;
    if (width <= 0) return;
    const slot = tabSlot(width, index);
    indicatorX.value = withSpring(slot.x, SPRING);
    indicatorW.value = withSpring(slot.w, SPRING);
  }

  useEffect(() => {
    if (hoverIndex != null) return;
    snapToIndex(activeIndex);
  }, [activeIndex, hoverIndex]);

  function hapticSelect() {
    triggerPickerHaptic();
  }

  function commitTab(index: number) {
    skipPressRef.current = true;
    setHoverIndex(null);
    const item = TAB_ITEMS[index];
    if (!item || isLocked(item)) {
      snapToIndex(activeIndex);
      requestAnimationFrame(() => {
        skipPressRef.current = false;
      });
      return;
    }
    snapToIndex(index);
    if (item.kind === 'bella') {
      setBellaOpen(true);
    } else {
      setBellaOpen(false);
      if (item.href) router.push(item.href as never);
    }
    requestAnimationFrame(() => {
      skipPressRef.current = false;
    });
  }

  function onHoverChange(index: number) {
    setHoverIndex(index);
    hapticSelect();
  }

  function onScrubEnd(index: number) {
    commitTab(index);
  }

  hoverChangeRef.current = onHoverChange;
  scrubEndRef.current = onScrubEnd;

  const pan = useMemo(
    () => Gesture.Pan()
      .minDistance(4)
      .onUpdate((event) => {
        const width = pillWidth.value;
        if (width <= 0) return;
        const slot = tabSlot(width, 0);
        const minX = INNER_PAD;
        const maxX = INNER_PAD + (TAB_COUNT - 1) * slot.w;
        const nextX = Math.min(maxX, Math.max(minX, event.x - slot.w / 2));
        indicatorX.value = nextX;
        indicatorW.value = slot.w;
        const idx = indexFromX(event.x, width);
        if (idx !== hoverSv.value) {
          hoverSv.value = idx;
          runOnJS(emitHover)(idx);
        }
      })
      .onEnd((event) => {
        const width = pillWidth.value;
        const idx = width > 0 ? indexFromX(event.x, width) : 0;
        hoverSv.value = -1;
        runOnJS(emitScrubEnd)(idx);
      })
      .onFinalize(() => {
        hoverSv.value = -1;
      }),
    [hoverSv, indicatorW, indicatorX, pillWidth],
  );

  function emitHover(index: number) {
    hoverChangeRef.current(index);
  }

  function emitScrubEnd(index: number) {
    scrubEndRef.current(index);
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  function onPressItem(item: TabItem, index: number) {
    if (skipPressRef.current || isLocked(item)) return;
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (item.kind === 'bella') {
      setBellaOpen((open) => !open);
      return;
    }
    setBellaOpen(false);
    if (item.href) router.push(item.href as never);
    snapToIndex(index);
  }

  function renderItem(item: TabItem, index: number) {
    const locked = isLocked(item);
    const selected = !locked && visualIndex === index;
    const Icon = item.icon;
    const iconColor = locked ? LOCKED_TINT : selected ? ACTIVE_TINT : INACTIVE_TINT;

    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: locked, selected }}
        disabled={locked}
        style={[styles.item, selected && styles.itemSelected, locked && styles.itemLocked]}
        onPress={() => onPressItem(item, index)}
      >
        <View style={styles.iconRow}>
          {item.kind === 'bella' ? (
            <NavBellaAiIcon size={ICON_SIZE} color={iconColor} />
          ) : Icon ? (
            <Icon size={ICON_SIZE} color={iconColor} />
          ) : null}
        </View>
        <Text
          style={[
            styles.label,
            locked && styles.labelLocked,
            selected && styles.labelHidden,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.nav,
            {
              bottom: bottomOffset,
              transform: [{ translateY: tabBarTranslateY }],
            },
          ]}
          pointerEvents={tabBarInteractive ? 'box-none' : 'none'}
        >
          <GestureDetector gesture={pan}>
            <View
              style={styles.pill}
              pointerEvents="auto"
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                pillWidth.value = width;
                const slot = tabSlot(width, activeIndex);
                indicatorX.value = slot.x;
                indicatorW.value = slot.w;
              }}
            >
              <Reanimated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
              {TAB_ITEMS.map((item, index) => renderItem(item, index))}
            </View>
          </GestureDetector>
        </Animated.View>
      </View>
      {hasPaidAccess ? (
        <BellaActionSheet open={bellaOpen} onClose={() => setBellaOpen(false)} />
      ) : null}
    </>
  );
}

const pillShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 6,
  },
  default: {},
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  nav: {
    position: 'absolute',
    left: PILL_MARGIN_X,
    right: PILL_MARGIN_X,
    pointerEvents: 'box-none',
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: PATIENT_NAV_HEIGHT,
    paddingHorizontal: INNER_PAD,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'visible',
    ...pillShadow,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 24,
    backgroundColor: ACTIVE_PILL,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 24,
    zIndex: 1,
  },
  itemSelected: {
    justifyContent: 'center',
    paddingVertical: 0,
  },
  itemLocked: {
    opacity: 0.55,
  },
  iconRow: {
    height: ICON_ROW,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  label: {
    height: LABEL_HEIGHT,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 13,
    color: INACTIVE_TINT,
    textAlign: 'center',
  },
  labelHidden: {
    opacity: 0,
    position: 'absolute',
  },
  labelLocked: {
    color: LOCKED_TINT,
  },
});
