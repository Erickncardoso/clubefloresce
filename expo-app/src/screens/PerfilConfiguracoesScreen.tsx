import { useEffect } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Headset,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react-native';
import PatientShell from '@/components/PatientShell';
import PatientAvatar from '@/components/ui/PatientAvatar';
import PatientHeader from '@/components/ui/PatientHeader';
import {
  PATIENT_CLINIC_NAME,
  PATIENT_NUTRITIONIST_NAME,
  PATIENT_NUTRITIONIST_TITLE,
} from '@/config/patient-brand';
import { getAppVersion } from '@/config/env';
import { LEGAL_CONTACT_EMAIL } from '@/config/legal';
import { resolveMediaUrl } from '@/lib/media-url';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type MenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  external?: boolean;
  danger?: boolean;
};

export default function PerfilConfiguracoesScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const avatarUrl = resolveMediaUrl(user?.avatar);
  const profileSubtitle = PATIENT_NUTRITIONIST_TITLE;

  function openNutritionistInfo() {
    Alert.alert(
      PATIENT_NUTRITIONIST_NAME,
      `Nutricionista responsável pelo ${PATIENT_CLINIC_NAME} — Clube Florescer.\n\nConsultas, plano alimentar e liberação de acesso são feitos pela nutricionista.`,
      [
        { text: 'Fechar', style: 'cancel' },
        {
          text: 'Falar com suporte',
          onPress: openSupport,
        },
      ],
    );
  }

  function openSupport() {
    const mail = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent('Suporte — Clube Florescer')}`;
    void Linking.openURL(mail).catch(() => {
      Alert.alert('Suporte', `Envie um e-mail para ${LEGAL_CONTACT_EMAIL}.`);
    });
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

  const menuItems: MenuItem[] = [
    {
      key: 'nutritionist',
      label: 'Minha nutricionista',
      icon: UserRoundPlus,
      onPress: openNutritionistInfo,
    },
    {
      key: 'access',
      label: 'Meu acesso',
      icon: KeyRound,
      onPress: () => router.push('/assinatura' as never),
    },
    {
      key: 'notifications',
      label: 'Notificações',
      icon: Bell,
      onPress: () => router.push('/perfil/configuracoes/preferencias' as never),
    },
    {
      key: 'sources',
      label: 'Fontes e avisos de saúde',
      icon: BookOpen,
      onPress: () => router.push('/legal/fontes' as never),
    },
    {
      key: 'support',
      label: 'Suporte',
      icon: Headset,
      onPress: openSupport,
      external: true,
    },
    {
      key: 'terms',
      label: 'Termos e Condições',
      icon: FileText,
      onPress: () => router.push('/legal/termos' as never),
    },
    {
      key: 'privacy',
      label: 'Política de Privacidade',
      icon: ShieldCheck,
      onPress: () => router.push('/legal/privacidade' as never),
    },
    {
      key: 'logout',
      label: 'Sair',
      icon: LogOut,
      onPress: confirmLogout,
      danger: true,
    },
  ];

  return (
    <PatientShell>
      <PatientHeader
        title="Configurações"
        showBack
        backTo="/inicio"
        showBell={false}
        showMenu={false}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.profileCard}
          accessibilityRole="button"
          accessibilityLabel="Editar perfil"
          onPress={() => router.push('/perfil' as never)}
        >
          <PatientAvatar src={avatarUrl} name={user?.name} size="md" />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name?.trim() || 'Paciente'}
            </Text>
            <Text style={styles.profileSubtitle} numberOfLines={1}>
              {profileSubtitle}
            </Text>
            {user?.email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
          <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} />
        </Pressable>

        <View style={styles.menu}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menuItems.length - 1;
            return (
              <Pressable
                key={item.key}
                style={[styles.menuRow, !isLast && styles.menuRowBorder]}
                accessibilityRole="button"
                onPress={item.onPress}
              >
                <View style={styles.menuIcon}>
                  <Icon
                    color="#6e6e73"
                    size={16}
                    strokeWidth={1.9}
                  />
                </View>
                <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                  {item.label}
                </Text>
                {!item.danger ? (
                  item.external ? (
                    <ExternalLink color="#aeaeb2" size={15} strokeWidth={2} />
                  ) : (
                    <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} />
                  )
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionEyebrow}>Sobre o app</Text>
        <View style={styles.menu}>
          <View style={[styles.aboutRow, styles.menuRowBorder]}>
            <Text style={styles.menuLabel}>Tema</Text>
            <Text style={styles.menuValue}>Claro</Text>
          </View>
          <View style={[styles.aboutRow, styles.menuRowBorder]}>
            <Text style={styles.menuLabel}>Idioma</Text>
            <Text style={styles.menuValue}>Português</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.menuLabel}>Versão</Text>
            <Text style={styles.menuValue}>{getAppVersion()}</Text>
          </View>
        </View>

        <Text style={styles.supportHint}>
          Suporte: {LEGAL_CONTACT_EMAIL}
        </Text>
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.surface,
    backgroundColor: '#f2f2f7',
    marginBottom: spacing[3],
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: -0.2,
  },
  profileSubtitle: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#8e8e93',
  },
  profileEmail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#aeaeb2',
  },
  menu: {
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  menuLabelDanger: {
    color: '#e5484d',
    fontFamily: fonts.medium,
  },
  sectionEyebrow: {
    marginTop: spacing[5],
    marginBottom: spacing[2],
    marginLeft: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#aeaeb2',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  menuValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#8e8e93',
  },
  supportHint: {
    marginTop: spacing[6],
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#c7c7cc',
  },
});
