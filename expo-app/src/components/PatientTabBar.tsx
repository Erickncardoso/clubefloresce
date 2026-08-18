import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BookOpen, Home, LineChart, UtensilsCrossed } from 'lucide-react-native';
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
const BELLA_SIZE = 44;
/** Quanto a bolinha sobe acima da fileira de ícones — igual ao PWA (`translateY(-8px)`). */
const BELLA_LIFT = 8;

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
    key: 'diario',
    label: 'Diário',
    href: '/diario',
    icon: UtensilsCrossed,
    kind: 'route',
    requiresPaidAccess: true,
    match: (p) => p.startsWith('/diario') || p.startsWith('/comunidade'),
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
  const bottomInset = insets.bottom;

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
            <NavBellaIcon size={22} color={locked ? '#f4f4f5' : '#ffffff'} />
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
          <Icon color={tint} size={24} strokeWidth={1.75} />
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <View style={[styles.nav, { height: PATIENT_NAV_HEIGHT + bottomInset }]} pointerEvents="box-none">
        {/* Fundo sólido — BlurView no iOS recorta overflow e ainda desenha um hairline nativo (segunda linha). */}
        <View style={styles.surface} pointerEvents="none" />
        <View style={[styles.inner, { height: PATIENT_NAV_HEIGHT, marginBottom: bottomInset }]}>
          {TAB_ITEMS.map(renderItem)}
        </View>
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
    overflow: 'visible',
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23, 32, 20, 0.08)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6,
    overflow: 'visible',
    zIndex: 1,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  itemLocked: {
    opacity: 0.72,
  },
  iconActiveWrap: {
    transform: [{ scale: 1.04 }],
  },
  bellaIcon: {
    width: BELLA_SIZE,
    height: BELLA_SIZE,
    borderRadius: BELLA_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: -BELLA_LIFT,
    backgroundColor: colors.primary,
    shadowColor: '#6f7863',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
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
