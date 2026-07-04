import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BookOpen, CirclePlus, Home, LineChart, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BellaActionSheet from '@/components/BellaActionSheet';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof Home;
  match: (path: string) => boolean;
};

const LEFT_TABS: TabItem[] = [
  {
    key: 'inicio',
    label: 'Início',
    href: '/inicio',
    icon: Home,
    match: (path) => path === '/inicio' || path.startsWith('/inicio/'),
  },
  {
    key: 'evolucao',
    label: 'Evolução',
    href: '/evolucao',
    icon: LineChart,
    match: (path) => path.startsWith('/evolucao'),
  },
];

const RIGHT_TABS: TabItem[] = [
  {
    key: 'conteudo',
    label: 'Biblioteca',
    href: '/conteudo',
    icon: BookOpen,
    match: (path) => path.startsWith('/conteudo') || path.startsWith('/cursos') || path.startsWith('/ebooks'),
  },
  {
    key: 'comunidade',
    label: 'Comunidade',
    href: '/comunidade',
    icon: Users,
    match: (path) => path.startsWith('/comunidade'),
  },
];

const TAB_FLOAT_MARGIN = 12;

/** Espelha `frontend/components/PatientTabBar.vue`. */
export default function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bellaOpen, setBellaOpen] = useState(false);

  const path = useMemo(() => pathname || '/', [pathname]);

  function renderTab(item: TabItem) {
    const Icon = item.icon;
    const active = item.match(path);
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        style={[styles.tab, active && styles.tabActive]}
        onPress={() => {
          setBellaOpen(false);
          router.push(item.href as never);
        }}
      >
        <View style={[styles.pill, active && styles.pillActive]}>
          <Icon color={active ? colors.primary : '#a3a3a3'} size={23} strokeWidth={1.85} />
          {active ? <Text style={styles.label}>{item.label}</Text> : null}
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <View
        style={[
          styles.wrap,
          { paddingBottom: TAB_FLOAT_MARGIN + Math.max(insets.bottom, 0) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.bar} pointerEvents="auto">
          {LEFT_TABS.map(renderTab)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bellaOpen ? 'Fechar menu da Bella' : 'Abrir menu da Bella'}
            style={styles.fabTab}
            onPress={() => setBellaOpen((open) => !open)}
          >
            <View style={[styles.pill, styles.fabPill, bellaOpen && styles.pillActive]}>
              <View style={bellaOpen ? styles.fabIconOpen : undefined}>
                <CirclePlus
                  color={bellaOpen ? colors.primary : '#a3a3a3'}
                  size={24}
                  strokeWidth={1.75}
                />
              </View>
            </View>
          </Pressable>
          {RIGHT_TABS.map(renderTab)}
        </View>
      </View>
      <BellaActionSheet open={bellaOpen} onClose={() => setBellaOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    maxWidth: 392,
    backgroundColor: '#ffffff',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 20, 20, 0.04)',
    shadowColor: '#141414',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    width: 'auto',
    minWidth: 44,
  },
  fabTab: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    gap: 6,
    paddingHorizontal: 13,
    backgroundColor: colors.primarySoft,
  },
  fabPill: {
    paddingHorizontal: 8,
  },
  fabIconOpen: {
    transform: [{ rotate: '45deg' }],
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.1,
    color: colors.primaryDark,
  },
});
