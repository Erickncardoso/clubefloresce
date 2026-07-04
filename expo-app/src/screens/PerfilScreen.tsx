import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  Flower2,
  HelpCircle,
  LogOut,
  Settings,
  Sun,
  Target,
  User,
  UtensilsCrossed,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [checkInWeeks, setCheckInWeeks] = useState(0);
  const flowers = Math.max(12, checkInWeeks * 2);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ history?: unknown[]; current?: unknown }>('/checkin/me');
        setCheckInWeeks((data.history?.length || 0) + (data.current ? 1 : 0));
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const menu = [
    { label: 'Minhas informações', href: '/perfil/configuracoes', Icon: User },
    { label: 'Metas', href: '/evolucao?tab=metas', Icon: Target },
    { label: 'Meu plano', href: '/dieta', Icon: UtensilsCrossed },
    { label: 'Assinatura Clube Florescer', href: '/assinatura', Icon: CreditCard },
    { label: 'Relatórios', href: '/check-in/historico', Icon: BarChart3 },
    { label: 'Notificações', href: '/perfil/notificacoes', Icon: Bell },
    { label: 'Ajuda e suporte', href: '/perfil/configuracoes', Icon: HelpCircle },
  ];

  async function handleLogout() {
    await logout();
    router.replace('/' as never);
  }

  return (
    <PatientShell>
      <PatientHeader
        title="Meu perfil"
        showBack
        backTo="/inicio"
        showBell={false}
        showMenu={false}
        actions={(
          <Pressable onPress={() => router.push('/perfil/configuracoes' as never)} hitSlop={8}>
            <Settings color="#c17b80" size={22} />
          </Pressable>
        )}
      />

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{user?.name || 'Paciente'}</Text>
            {user?.createdAt ? (
              <Text style={styles.since}>
                Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
            ) : null}
          </View>

          <View style={styles.stats}>
            <Stat icon={Flower2} value={String(flowers)} label="Flores" />
            <Stat icon={CalendarCheck} value={String(checkInWeeks)} label="Check-ins" />
            <Stat icon={Sun} value="Girassol" label="Nível" />
          </View>

          <View style={styles.menu}>
            {menu.map((item) => (
              <Pressable
                key={item.label}
                style={styles.menuItem}
                onPress={() => router.push(item.href as never)}
              >
                <item.Icon color={colors.primaryDark} size={20} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight color={colors.textMuted} size={18} />
              </Pressable>
            ))}
            <Pressable style={[styles.menuItem, styles.logout]} onPress={handleLogout}>
              <LogOut color={colors.error} size={20} />
              <Text style={[styles.menuLabel, styles.logoutText]}>Sair</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </PatientShell>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Flower2; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon color={colors.primary} size={20} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[5], paddingBottom: spacing[6] },
  hero: { alignItems: 'center', gap: spacing[2] },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 28, color: colors.primaryDark },
  name: { fontFamily: fonts.bold, fontSize: 22 },
  since: { fontFamily: fonts.regular, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing[2] },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 16 },
  statLabel: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12 },
  menu: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  logout: { borderBottomWidth: 0 },
  logoutText: { color: colors.error },
});
