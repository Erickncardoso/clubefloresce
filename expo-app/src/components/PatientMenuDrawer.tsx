import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Home,
  LogOut,
  Settings,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/BrandLogo';
import { usePatientNotifications } from '@/hooks/usePatientNotifications';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import { isPatientAppAccessBlocked } from '@/lib/patient-access';
import { getSubscriptionMenuLabel } from '@/lib/platform-billing';
import { getAppVersion } from '@/config/env';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  badge?: string | null;
};

type PatientMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function PatientMenuDrawer({ open, onClose }: PatientMenuDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { hasPaidAccess } = usePatientPlanAccess();
  const { hasUnread, fetchNotifications } = usePatientNotifications();
  const slide = useRef(new Animated.Value(-320)).current;

  const canUseApp = useMemo(() => {
    if (!user) return false;
    return !isPatientAppAccessBlocked(user.plan, user.accessExpiresAt, user.approvalEmailSentAt);
  }, [user]);

  const navItems: NavItem[] = useMemo(() => {
    const subscriptionLabel = getSubscriptionMenuLabel();

    if (!canUseApp) {
      return [
        { href: '/assinatura', label: subscriptionLabel, Icon: ShieldCheck },
        { href: '/perfil/configuracoes', label: 'Configurações', Icon: Settings },
      ];
    }

    const items: NavItem[] = [
      { href: '/inicio', label: 'Início', Icon: Home },
    ];

    if (hasPaidAccess) {
      items.push(
        { href: '/bella', label: 'Bella IA', Icon: Sparkles },
        { href: '/dieta', label: 'Minha dieta', Icon: UtensilsCrossed },
        { href: '/diario', label: 'Diário alimentar', Icon: Camera },
        { href: '/evolucao', label: 'Evolução', Icon: TrendingUp },
        { href: '/conteudo', label: 'Conteúdo', Icon: BookOpen },
      );
    }

    items.push(
      { href: '/assinatura', label: subscriptionLabel, Icon: ShieldCheck },
      {
        href: '/perfil/notificacoes',
        label: 'Notificações',
        Icon: Bell,
        badge: hasUnread ? 'Novo' : null,
      },
      { href: '/perfil/configuracoes', label: 'Configurações', Icon: Settings },
    );

    return items;
  }, [canUseApp, hasPaidAccess, hasUnread]);

  const fullName = user?.name?.trim() || 'Paciente';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (open) {
      void fetchNotifications();
      Animated.timing(slide, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(slide, {
      toValue: -320,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fetchNotifications, open, slide]);

  function isActive(path: string) {
    if (path === '/inicio') {
      return pathname === '/inicio' || pathname === '/(tabs)/inicio';
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function navigate(item: NavItem) {
    onClose();
    router.push(item.href as never);
  }

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/' as never);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar menu" />
        <Animated.View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top + spacing[4],
              transform: [{ translateX: slide }],
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
            <View style={styles.head}>
              <View style={styles.brandRow}>
                <BrandLogo size="md" />
                <Text style={styles.brandText} numberOfLines={1}>Clube Florescer</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fechar menu">
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            {canUseApp ? (
              <Pressable style={styles.userCard} onPress={() => navigate({ href: '/perfil', label: 'Perfil', Icon: Settings })}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials || '?'}</Text>
                  </View>
                )}
                <View style={styles.userCopy}>
                  <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
                  <Text style={styles.userPlan}>Clube Florescer</Text>
                </View>
                <ChevronRight size={16} color={colors.primaryDark} />
              </Pressable>
            ) : null}

            <View style={styles.nav}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Pressable
                    key={item.href}
                    style={[styles.link, active && styles.linkActive]}
                    onPress={() => navigate(item)}
                  >
                    <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                      <item.Icon size={17} color={active ? '#fff' : colors.primaryDark} />
                    </View>
                    <Text style={[styles.linkLabel, active && styles.linkLabelActive]}>{item.label}</Text>
                    {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <View style={styles.divider} />
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <View style={[styles.iconWrap, styles.iconWrapDanger]}>
                  <LogOut size={17} color={colors.error} />
                </View>
                <Text style={styles.logoutLabel}>Sair da conta</Text>
              </Pressable>
              <Text style={styles.version}>Clube Florescer v{getAppVersion()}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '84%',
    maxWidth: 300,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  inner: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
    flexGrow: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
  },
  brandText: {
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[5],
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(111, 120, 99, 0.12)',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    color: '#fff',
    fontSize: 14,
  },
  userCopy: { flex: 1, minWidth: 0 },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  userPlan: {
    marginTop: 2,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  nav: { gap: 4, flex: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  linkActive: {
    backgroundColor: colors.primarySoft,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#fdf2f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryDark,
  },
  iconWrapDanger: {
    backgroundColor: '#fff0f0',
  },
  linkLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  linkLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    color: '#fff',
    overflow: 'hidden',
  },
  footer: {
    marginTop: spacing[4],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing[2],
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  logoutLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.error,
  },
  version: {
    marginTop: spacing[3],
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    opacity: 0.6,
  },
});
