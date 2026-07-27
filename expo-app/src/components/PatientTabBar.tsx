import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BookOpen, CirclePlus, Home, LineChart, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BellaActionSheet from '@/components/BellaActionSheet';
import { colors, fonts } from '@/theme/tokens';

type TabItem = {
  key: string;
  label: string;
  href?: string;
  icon: typeof Home;
  kind: 'route' | 'bella';
  match: (path: string) => boolean;
};

const NAV_INNER_H = 49;

/** Espelha `frontend/components/PatientTabBar.vue`. */
export default function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bellaOpen, setBellaOpen] = useState(false);

  const path = useMemo(() => pathname || '/', [pathname]);
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : 0;

  const navItems: TabItem[] = useMemo(
    () => [
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
        match: (p) => p.startsWith('/evolucao'),
      },
      {
        key: 'bella',
        label: 'Bella',
        icon: CirclePlus,
        kind: 'bella',
        match: () => false,
      },
      {
        key: 'conteudo',
        label: 'Biblioteca',
        href: '/conteudo',
        icon: BookOpen,
        kind: 'route',
        match: (p) => p.startsWith('/conteudo') || p.startsWith('/cursos') || p.startsWith('/ebooks'),
      },
      {
        key: 'comunidade',
        label: 'Comunidade',
        href: '/comunidade',
        icon: Users,
        kind: 'route',
        match: (p) => p.startsWith('/comunidade'),
      },
    ],
    [],
  );

  function renderItem(item: TabItem) {
    const Icon = item.icon;
    const active = item.match(path);
    const isBella = item.kind === 'bella';

    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        style={styles.item}
        onPress={() => {
          if (isBella) {
            setBellaOpen((open) => !open);
            return;
          }
          setBellaOpen(false);
          if (item.href) router.push(item.href as never);
        }}
      >
        <View style={isBella && bellaOpen ? styles.fabIconOpen : undefined}>
          <Icon
            color={active || (isBella && bellaOpen) ? colors.primary : '#8e8e93'}
            size={22}
            strokeWidth={1.75}
          />
        </View>
        <Text
          style={[styles.label, (active || (isBella && bellaOpen)) && styles.labelActive]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <>
      <View style={[styles.nav, { paddingBottom: bottomInset }]}>
        <View style={styles.inner}>{navItems.map(renderItem)}</View>
      </View>
      <BellaActionSheet open={bellaOpen} onClose={() => setBellaOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    height: NAV_INNER_H,
  },
  item: {
    flex: 1,
    minWidth: 0,
    maxWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 3,
    paddingHorizontal: 2,
  },
  fabIconOpen: {
    transform: [{ rotate: '45deg' }],
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.1,
    color: '#8e8e93',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
