import { useEffect, useMemo, useState } from 'react';

import {

  ActivityIndicator,

  Image,

  Linking,

  Modal,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  View,

} from 'react-native';

import { useRouter } from 'expo-router';

import {

  BadgeCheck,

  BarChart3,

  Bell,

  CalendarCheck,

  Camera,

  ChevronRight,

  CircleHelp,

  CreditCard,

  Flower2,

  LogOut,

  Settings,

  ShieldCheck,

  ScrollText,

  Sun,

  Target,

  UserRound,

  UtensilsCrossed,

  X,

} from 'lucide-react-native';

import PatientHeader from '@/components/ui/PatientHeader';

import PatientShell from '@/components/PatientShell';

import LoadingScreen from '@/components/ui/LoadingScreen';

import { useProfileAvatar } from '@/hooks/useProfileAvatar';

import { usePatientGoals } from '@/hooks/usePatientGoals';

import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';

import { usePatientApi } from '@/hooks/usePatientApi';

import { resolveMediaUrl } from '@/lib/media-url';

import { getAccessStatusLabel, getSubscriptionMenuLabel, getSubscriptionMenuSubtitle } from '@/lib/platform-billing';

import { useAuth } from '@/providers/AuthProvider';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



function memberSinceLabel(createdAt?: string | null) {

  if (!createdAt) return '';

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

}



function levelFromFlowers(flowers: number) {

  if (flowers >= 40) return 'Jardim';

  if (flowers >= 15) return 'Girassol';

  if (flowers >= 5) return 'Broto';

  return 'Semente';

}



type RowItem = {

  title: string;

  subtitle: string;

  href?: string;

  mailto?: string;

  action?: 'subscription';

  icon: typeof Target;

  iconBg: string;

  iconColor: string;

};



export default function PerfilScreen() {

  const router = useRouter();

  const { user, logout, refreshUser } = useAuth();

  const { hasPaidAccess } = usePatientPlanAccess();

  const { request } = usePatientApi();

  const { todaySummary, hydrate } = usePatientGoals();

  const { uploading, message: avatarMessage, error: avatarError, pickAndUpload } = useProfileAvatar();

  const [loading, setLoading] = useState(true);

  const [checkInWeeks, setCheckInWeeks] = useState(0);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);



  useEffect(() => {

    (async () => {

      hydrate();

      await refreshUser();

      try {

        const data = await request<{ history?: unknown[]; current?: unknown }>('/checkin/me');

        setCheckInWeeks((data.history?.length || 0) + (data.current ? 1 : 0));

      } catch { /* ignore */ } finally {

        setLoading(false);

      }

    })();

  }, [hydrate, refreshUser, request]);



  const completedGoals = todaySummary.filter((item) => item.percent >= 100).length;

  const flowers = checkInWeeks * 5 + completedGoals;

  const level = levelFromFlowers(flowers);



  const subscriptionDescription = useMemo(() => {
    return getSubscriptionMenuSubtitle(Boolean(hasPaidAccess), user?.accessExpiresAt);
  }, [hasPaidAccess, user?.accessExpiresAt]);



  const initials = (user?.name || '?')

    .split(' ')

    .filter(Boolean)

    .slice(0, 2)

    .map((p) => p[0]?.toUpperCase())

    .join('');



  const avatarUri = resolveMediaUrl(user?.avatar || '');

  const subscriptionLabel = getSubscriptionMenuLabel();

  const sections: Array<{ title: string; items: RowItem[] }> = useMemo(() => {
    const list: Array<{ title: string; items: RowItem[] }> = [];

    if (hasPaidAccess) {
      list.push({
        title: 'Acompanhamento',
        items: [
          {
            title: 'Minhas metas',
            subtitle: 'Água, sono, exercícios e rotina',
            href: '/evolucao?tab=metas',
            icon: Target,
            iconBg: '#f0f2eb',
            iconColor: '#6f7f61',
          },
          {
            title: 'Meu plano alimentar',
            subtitle: 'Refeições e orientações da nutricionista',
            href: '/dieta',
            icon: UtensilsCrossed,
            iconBg: '#f6f1ec',
            iconColor: '#9a7560',
          },
          {
            title: 'Relatórios e check-ins',
            subtitle: 'Acompanhe sua evolução semanal',
            href: '/check-in/historico',
            icon: BarChart3,
            iconBg: '#edf3f5',
            iconColor: '#66838c',
          },
        ],
      });
    }

    list.push(
      {
        title: 'Conta',
        items: [
          {
            title: 'Informações e preferências',
            subtitle: 'Foto, notificações e dados da conta',
            href: '/perfil/configuracoes',
            icon: UserRound,
            iconBg: '#f2f3f1',
            iconColor: '#75806c',
          },
          {
            title: subscriptionLabel,
            subtitle: subscriptionDescription,
            action: 'subscription',
            icon: CreditCard,
            iconBg: '#f4f1ec',
            iconColor: '#927a5e',
          },
          {
            title: 'Notificações',
            subtitle: 'Avisos, lembretes e novidades',
            href: '/perfil/notificacoes',
            icon: Bell,
            iconBg: '#f1f2f7',
            iconColor: '#6f75a1',
          },
        ],
      },
      {
        title: 'Suporte e privacidade',
        items: [
          {
            title: 'Ajuda e suporte',
            subtitle: 'Fale com a equipe do Clube Florescer',
            mailto: 'mailto:contato@nutrisabellajardim.com.br?subject=Ajuda%20no%20Clube%20Florescer',
            icon: CircleHelp,
            iconBg: '#f2f3f1',
            iconColor: '#75806c',
          },
          {
            title: 'Privacidade',
            subtitle: 'Como seus dados são protegidos',
            href: '/legal/privacidade',
            icon: ShieldCheck,
            iconBg: '#f2f3f1',
            iconColor: '#75806c',
          },
          {
            title: 'Termos de uso',
            subtitle: 'Condições do Clube Florescer',
            href: '/legal/termos',
            icon: ScrollText,
            iconBg: '#f2f3f1',
            iconColor: '#75806c',
          },
        ],
      },
    );

    return list;
  }, [hasPaidAccess, subscriptionDescription, subscriptionLabel]);



  async function handleLogout() {

    setLoggingOut(true);

    try {

      await logout();

      setLogoutOpen(false);

      router.replace('/' as never);

    } finally {

      setLoggingOut(false);

    }

  }



  function openRow(item: RowItem) {

    if (item.mailto) {

      void Linking.openURL(item.mailto);

      return;

    }

    if (item.action === 'subscription') {
      router.push('/assinatura' as never);
      return;
    }

    if (item.href) router.push(item.href as never);

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

            <Settings color="#6f7863" size={22} />

          </Pressable>

        )}

      />



      {loading ? (

        <LoadingScreen />

      ) : (

        <ScrollView contentContainerStyle={styles.scroll}>

          <View style={styles.identity}>

            <Pressable style={styles.avatarControl} onPress={() => void pickAndUpload()} disabled={uploading}>

              {avatarUri ? (

                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />

              ) : (

                <View style={styles.avatarFallback}>

                  <Text style={styles.avatarText}>{initials}</Text>

                </View>

              )}

              <View style={styles.avatarEdit}>

                {uploading ? (

                  <ActivityIndicator color="#fff" size="small" />

                ) : (

                  <Camera color="#fff" size={14} />

                )}

              </View>

            </Pressable>



            <Text style={styles.name}>{user?.name || 'Paciente'}</Text>

            {memberSinceLabel(user?.createdAt) ? (

              <Text style={styles.member}>Membro desde {memberSinceLabel(user?.createdAt)}</Text>

            ) : null}

            <View style={styles.planBadge}>

              <BadgeCheck color="#65705c" size={14} />

              <Text style={styles.planText}>
                {getAccessStatusLabel(user?.plan, user?.accessExpiresAt, user?.approvalEmailSentAt)}
              </Text>

            </View>

            {avatarMessage ? (

              <Text style={[styles.feedback, avatarError && styles.feedbackError]}>{avatarMessage}</Text>

            ) : null}

          </View>



          <View style={styles.stats}>

            <Stat icon={Flower2} value={String(flowers)} label="Flores" />

            <Stat icon={CalendarCheck} value={String(checkInWeeks)} label="Check-ins" />

            <Stat icon={Sun} value={level} label="Nível" />

          </View>



          {sections.map((section) => (

            <View key={section.title} style={styles.section}>

              <Text style={styles.sectionTitle}>{section.title}</Text>

              <View style={styles.list}>

                {section.items.map((item) => (

                  <Pressable key={item.title} style={styles.row} onPress={() => openRow(item)}>

                    <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>

                      <item.icon color={item.iconColor} size={18} />

                    </View>

                    <View style={styles.rowCopy}>

                      <Text style={styles.rowTitle}>{item.title}</Text>

                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>

                    </View>

                    <ChevronRight color="#b0b0b5" size={18} />

                  </Pressable>

                ))}

              </View>

            </View>

          ))}



          <Pressable style={styles.logoutBtn} onPress={() => setLogoutOpen(true)}>

            <LogOut color="#a84848" size={18} />

            <Text style={styles.logoutText}>Sair da conta</Text>

          </Pressable>

        </ScrollView>

      )}



      <Modal visible={logoutOpen} transparent animationType="slide" onRequestClose={() => setLogoutOpen(false)}>

        <Pressable style={styles.sheetOverlay} onPress={() => setLogoutOpen(false)}>

          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>

            <View style={styles.sheetHandle} />

            <Pressable style={styles.sheetClose} onPress={() => setLogoutOpen(false)}>

              <X color="#5f5f65" size={18} />

            </Pressable>

            <View style={styles.sheetIcon}>

              <LogOut color="#ad4e4e" size={22} />

            </View>

            <Text style={styles.sheetTitle}>Sair do Clube Florescer?</Text>

            <Text style={styles.sheetText}>

              Você precisará entrar novamente para acessar seu plano e acompanhamento.

            </Text>

            <Pressable

              style={[styles.sheetConfirm, loggingOut && styles.sheetDisabled]}

              disabled={loggingOut}

              onPress={() => void handleLogout()}

            >

              {loggingOut ? (

                <ActivityIndicator color="#fff" />

              ) : (

                <Text style={styles.sheetConfirmText}>Sair da conta</Text>

              )}

            </Pressable>

            <Pressable style={styles.sheetCancel} disabled={loggingOut} onPress={() => setLogoutOpen(false)}>

              <Text style={styles.sheetCancelText}>Continuar no app</Text>

            </Pressable>

          </Pressable>

        </Pressable>

      </Modal>

    </PatientShell>

  );

}



function Stat({ icon: Icon, value, label }: { icon: typeof Flower2; value: string; label: string }) {

  return (

    <View style={styles.stat}>

      <Icon color="#85917b" size={18} />

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>

    </View>

  );

}



const styles = StyleSheet.create({

  scroll: { padding: spacing[4], gap: spacing[5], paddingBottom: spacing[8] },

  identity: { alignItems: 'center', gap: spacing[2] },

  avatarControl: { position: 'relative', marginBottom: spacing[1] },

  avatarImage: { width: 88, height: 88, borderRadius: 44 },

  avatarFallback: {

    width: 88,

    height: 88,

    borderRadius: 44,

    backgroundColor: colors.primarySoft,

    alignItems: 'center',

    justifyContent: 'center',

  },

  avatarText: { fontFamily: fonts.bold, fontSize: 28, color: colors.primaryDark },

  avatarEdit: {

    position: 'absolute',

    right: -2,

    bottom: -2,

    width: 32,

    height: 32,

    borderRadius: 16,

    backgroundColor: '#88977c',

    borderWidth: 2,

    borderColor: '#fff',

    alignItems: 'center',

    justifyContent: 'center',

  },

  name: { fontFamily: fonts.medium, fontSize: 19, color: '#1d1d1f' },

  member: { fontFamily: fonts.regular, fontSize: 12, color: '#6e6e73' },

  planBadge: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    marginTop: spacing[1],

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: radii.pill,

    backgroundColor: '#f1f3ef',

  },

  planText: { fontFamily: fonts.medium, fontSize: 11, color: '#65705c' },

  feedback: { fontFamily: fonts.regular, fontSize: 11, color: '#5d7555', marginTop: 4 },

  feedbackError: { color: '#b34242' },

  stats: {

    flexDirection: 'row',

    borderWidth: 1,

    borderColor: '#e5e5ea',

    borderRadius: radii.surface,

    overflow: 'hidden',

    backgroundColor: colors.surface,

  },

  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], gap: 4 },

  statValue: { fontFamily: fonts.medium, fontSize: 14, color: '#242426' },

  statLabel: { fontFamily: fonts.regular, fontSize: 10, color: '#7a7a80' },

  section: { gap: spacing[2] },

  sectionTitle: {

    marginLeft: 4,

    fontFamily: fonts.medium,

    fontSize: 12,

    color: '#6e6e73',

  },

  list: {

    borderWidth: 1,

    borderColor: '#e5e5ea',

    borderRadius: radii.surface,

    overflow: 'hidden',

    backgroundColor: colors.surface,

  },

  row: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing[3],

    minHeight: 64,

    paddingHorizontal: spacing[3],

    paddingVertical: spacing[3],

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: '#ececf0',

  },

  rowIcon: {

    width: 36,

    height: 36,

    borderRadius: 18,

    alignItems: 'center',

    justifyContent: 'center',

  },

  rowCopy: { flex: 1, minWidth: 0 },

  rowTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#242426' },

  rowSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: '#77777d', marginTop: 2 },

  logoutBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: spacing[2],

    minHeight: 46,

    borderWidth: 1,

    borderColor: '#eadada',

    borderRadius: radii.control,

    backgroundColor: colors.surface,

  },

  logoutText: { fontFamily: fonts.medium, fontSize: 13, color: '#a84848' },

  sheetOverlay: {

    flex: 1,

    justifyContent: 'flex-end',

    backgroundColor: 'rgba(20,24,28,0.38)',

  },

  sheet: {

    backgroundColor: '#fff',

    borderTopLeftRadius: 20,

    borderTopRightRadius: 20,

    paddingHorizontal: spacing[4],

    paddingBottom: spacing[6],

    paddingTop: spacing[2],

    alignItems: 'center',

  },

  sheetHandle: {

    width: 36,

    height: 4,

    borderRadius: 2,

    backgroundColor: '#d2d2d7',

    marginBottom: spacing[4],

  },

  sheetClose: {

    position: 'absolute',

    top: spacing[3],

    right: spacing[4],

    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: '#f2f2f4',

    alignItems: 'center',

    justifyContent: 'center',

  },

  sheetIcon: {

    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: '#f8eeee',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: spacing[3],

  },

  sheetTitle: { fontFamily: fonts.medium, fontSize: 17, color: '#242426', textAlign: 'center' },

  sheetText: {

    fontFamily: fonts.regular,

    fontSize: 12,

    color: '#6e6e73',

    textAlign: 'center',

    lineHeight: 18,

    marginBottom: spacing[4],

    maxWidth: 280,

  },

  sheetConfirm: {

    width: '100%',

    minHeight: 46,

    borderRadius: radii.control,

    backgroundColor: '#ad4e4e',

    alignItems: 'center',

    justifyContent: 'center',

  },

  sheetConfirmText: { color: '#fff', fontFamily: fonts.medium, fontSize: 13 },

  sheetDisabled: { opacity: 0.55 },

  sheetCancel: { marginTop: spacing[2], padding: spacing[3] },

  sheetCancelText: { fontFamily: fonts.medium, fontSize: 13, color: '#4f5550' },

});

