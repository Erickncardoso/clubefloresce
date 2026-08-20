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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BellaActionSheet from '@/components/BellaActionSheet';
import NavBellaAiIcon from '@/components/icons/NavBellaAiIcon';
import {
  NavDiarioIcon,
  NavEvolutionIcon,
  NavHomeIcon,
  NavLibraryIcon,
} from '@/components/icons/nav-icons';
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
import { colors, fonts } from '@/theme/tokens';

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
const SCROLL_HIDE_EXTRA = 28;

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

export { PATIENT_NAV_HEIGHT, PATIENT_NAV_CONTENT_GAP, PATIENT_NAV_FLOAT_MARGIN } from '@/lib/tab-bar';

export default function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bellaOpen, setBellaOpen] = useState(false);
  const [tabBarInteractive, setTabBarInteractive] = useState(true);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const { hasPaidAccess } = usePatientPlanAccess();

  const path = useMemo(() => pathname || '/', [pathname]);
  const safeBottom = Math.max(insets.bottom, 0);
  const bottomOffset = safeBottom + PATIENT_NAV_FLOAT_MARGIN;
  const slideOutDistance = PATIENT_NAV_HEIGHT + bottomOffset + SCROLL_HIDE_EXTRA;

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

  function isLocked(item: TabItem) {
    return Boolean(item.requiresPaidAccess && !hasPaidAccess);
  }

  function renderRouteItem(item: TabItem) {
    const locked = isLocked(item);
    const active = !locked && item.match(path);
    const Icon = item.icon!;
    const iconColor = locked ? LOCKED_TINT : active ? ACTIVE_TINT : INACTIVE_TINT;

    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: locked, selected: active }}
        disabled={locked}
        style={[styles.item, active && styles.itemActive, locked && styles.itemLocked]}
        onPress={() => {
          if (locked || !item.href) return;
          setBellaOpen(false);
          router.push(item.href as never);
        }}
      >
        <View style={styles.iconRow}>
          <Icon size={ICON_SIZE} color={iconColor} />
        </View>
        <Text style={[styles.label, active && styles.labelActive, locked && styles.labelLocked]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }

  function renderBellaItem(item: TabItem) {
    const locked = isLocked(item);
    const active = !locked && (item.match(path) || bellaOpen);
    const iconColor = locked ? LOCKED_TINT : active ? ACTIVE_TINT : INACTIVE_TINT;

    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: locked, selected: active }}
        disabled={locked}
        style={[styles.item, active && styles.itemActive, locked && styles.itemLocked]}
        onPress={() => {
          if (locked) return;
          setBellaOpen((open) => !open);
        }}
      >
        <View style={styles.iconRow}>
          <NavBellaAiIcon size={ICON_SIZE} color={iconColor} />
        </View>
        <Text style={[styles.label, active && styles.labelActive, locked && styles.labelLocked]}>
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
          <View style={styles.pill} pointerEvents="auto">
            {TAB_ITEMS.map((item) => (
              item.kind === 'bella' ? renderBellaItem(item) : renderRouteItem(item)
            ))}
          </View>
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
    alignItems: 'flex-start',
    minHeight: PATIENT_NAV_HEIGHT,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'visible',
    ...pillShadow,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 20,
  },
  itemActive: {
    backgroundColor: ACTIVE_PILL,
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
  labelActive: {
    color: colors.text,
    fontFamily: fonts.semibold,
  },
  labelLocked: {
    color: LOCKED_TINT,
  },
});
