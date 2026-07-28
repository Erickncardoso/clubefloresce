import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { BookOpen, Home, LineChart, Users } from 'lucide-react-native';
import NavBellaIcon from '@/components/icons/NavBellaIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BellaActionSheet from '@/components/BellaActionSheet';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import { PATIENT_NAV_HEIGHT } from '@/lib/tab-bar';
import { colors } from '@/theme/tokens';

type TabItem = {
  key: string;
  label: string;
  href?: string;
  icon?: typeof Home;
  kind: 'route' | 'bella';
  match: (path: string) => boolean;
  requiresPaidAccess?: boolean;
};

const LOCKED_TINT = '#c7c7cc';
const DEFAULT_TINT = '#7b8377';

const TAB_ITEMS: TabItem[] = [
  {
    key: 'inicio',
    label: 'Início',
    href: '/inicio',
    icon: Home,
    kind: 'route',
    match: (p) => p === '/inicio' || p.startsWith('/inicio/'),
  },
  {
    key: 'evolucao',
    label: 'Evolução',
    href: '/evolucao',
    icon: LineChart,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/evolucao'),
  },
  {
    key: 'bella',
    label: 'Bella IA',
    kind: 'bella',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/bella'),
  },
  {
    key: 'conteudo',
    label: 'Biblioteca',
    href: '/conteudo',
    icon: BookOpen,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/conteudo') || p.startsWith('/cursos') || p.startsWith('/ebooks'),
  },
  {
    key: 'comunidade',
    label: 'Comunidade',
    href: '/comunidade',
    icon: Users,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/comunidade'),
  },
];

/** Espelha `--patient-nav-height` do PWA. */
export { PATIENT_NAV_HEIGHT, PATIENT_NAV_CONTENT_GAP } from '@/lib/tab-bar';

/** Tab bar estilo Spotify: ícones sempre visíveis; premium cinza e sem clique no acesso limitado. */
export default function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bellaOpen, setBellaOpen] = useState(false);
  const { hasPaidAccess } = usePatientPlanAccess();

  const path = useMemo(() => pathname || '/', [pathname]);
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, 0);

  function isLocked(item: TabItem) {
    return Boolean(item.requiresPaidAccess && !hasPaidAccess);
  }

  function renderItem(item: TabItem) {
    const locked = isLocked(item);
    const active = !locked && item.match(path);
    const isBella = item.kind === 'bella';
    const tint = locked ? LOCKED_TINT : (active || (isBella && bellaOpen) ? colors.primaryDark : DEFAULT_TINT);

    if (isBella) {
      return (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          style={[styles.item, locked && styles.itemLocked]}
          onPress={() => {
            if (locked) return;
            setBellaOpen((open) => !open);
          }}
        >
          <View
            style={[
              styles.bellaIcon,
              locked && styles.bellaIconLocked,
              !locked && (bellaOpen || active) && styles.bellaIconActive,
            ]}
          >
            <NavBellaIcon size={24} color={locked ? '#f4f4f5' : '#ffffff'} />
          </View>
        </Pressable>
      );
    }

    const Icon = item.icon!;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: locked }}
        disabled={locked}
        style={[styles.item, locked && styles.itemLocked]}
        onPress={() => {
          if (locked || !item.href) return;
          setBellaOpen(false);
          router.push(item.href as never);
        }}
      >
        <View style={active ? styles.iconActiveWrap : undefined}>
          <Icon color={tint} size={26} strokeWidth={1.75} />
        </View>
      </Pressable>
    );
  }

  const barBody = (
    <View style={[styles.inner, { height: PATIENT_NAV_HEIGHT }]}>
      {TAB_ITEMS.map(renderItem)}
    </View>
  );

  return (
    <>
      <View style={[styles.nav, { paddingBottom: bottomInset }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.blur}>
            {barBody}
          </BlurView>
        ) : (
          <View style={styles.solid}>{barBody}</View>
        )}
      </View>
      {hasPaidAccess ? (
        <BellaActionSheet open={bellaOpen} onClose={() => setBellaOpen(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23, 32, 20, 0.08)',
  },
  blur: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  solid: {
    backgroundColor: '#ffffff',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  itemLocked: {
    opacity: 0.72,
  },
  iconActiveWrap: {
    transform: [{ scale: 1.04 }],
  },
  bellaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    transform: [{ translateY: -8 }],
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#6f7863',
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bellaIconLocked: {
    backgroundColor: '#d1d1d6',
    shadowOpacity: 0,
    elevation: 0,
  },
  bellaIconActive: {
    backgroundColor: colors.primaryDark,
  },
});
