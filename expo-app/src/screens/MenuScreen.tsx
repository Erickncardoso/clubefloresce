import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  Repeat,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import { usePatientNotifications } from '@/hooks/usePatientNotifications';
import { getSubscriptionMenuLabel } from '@/lib/platform-billing';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme/tokens';

type MenuItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  badge?: boolean;
};

function chunkItems(items: MenuItem[], size = 3) {
  const rows: MenuItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export default function MenuScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { hasUnread } = usePatientNotifications();

  const gridItems: MenuItem[] = [
    { href: '/perfil', label: 'Perfil', Icon: UserRound },
    { href: '/dieta', label: 'Dieta', Icon: UtensilsCrossed },
    { href: '/check-in', label: 'Check-in', Icon: CalendarCheck },
    { href: '/assinatura', label: getSubscriptionMenuLabel(), Icon: ShieldCheck },
    { href: '/perfil/notificacoes', label: 'Avisos', Icon: Bell, badge: hasUnread },
    { href: '/perfil/configuracoes', label: 'Ajustes', Icon: Settings },
    { href: '/comunidade', label: 'Comunidade', Icon: Users },
    { href: '/conteudo', label: 'Biblioteca', Icon: BookOpen },
    { href: '/substituicao', label: 'Trocas', Icon: Repeat },
  ];

  function openItem(href: string) {
    router.push(href as never);
  }

  function confirmLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void logout().then(() => router.replace('/' as never));
        },
      },
    ]);
  }

  return (
    <PatientShell>
      <PatientHeader />
      <PatientScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Menu</Text>

        <View style={styles.grid} accessibilityRole="list" accessibilityLabel="Atalhos">
          {chunkItems(gridItems).map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((item) => (
                <Pressable
                  key={item.href}
                  style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => openItem(item.href)}
                >
                  <item.Icon color={colors.text} size={24} strokeWidth={1.85} />
                  <Text style={styles.tileLabel}>{item.label}</Text>
                  {item.badge ? <View style={styles.dot} /> : null}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
          onPress={confirmLogout}
        >
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      </PatientScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: spacing[8],
  },
  heading: {
    marginBottom: 20,
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: -0.7,
    color: colors.text,
  },
  grid: {
    gap: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  tile: {
    position: 'relative',
    flex: 1,
    minHeight: 114,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e4e8dc',
    backgroundColor: '#f6f7f4',
    alignItems: 'center',
    gap: 14,
  },
  tilePressed: {
    backgroundColor: '#eef0eb',
    transform: [{ scale: 0.98 }],
  },
  tileLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: colors.text,
  },
  dot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  logout: {
    marginTop: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.error,
  },
});
