import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {

  ActivityIndicator,

  Alert,

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

import { useFocusEffect } from '@react-navigation/native';

import {

  Bell,

  Camera,

  ChevronRight,

  ShieldCheck,

  SlidersHorizontal,

  Smartphone,

} from 'lucide-react-native';

import PatientHeader from '@/components/ui/PatientHeader';

import PatientShell from '@/components/PatientShell';

import CfButton from '@/components/ui/CfButton';

import FormField from '@/components/ui/FormField';

import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

import { useProfileAvatar } from '@/hooks/useProfileAvatar';

import { getAppVersion } from '@/config/env';

import { resolveMediaUrl } from '@/lib/media-url';

import { useAuth } from '@/providers/AuthProvider';

import { usePatientApi } from '@/hooks/usePatientApi';

import {

  getPermissionState,

  openSystemNotificationSettings,

  permissionBlockedMessage,

  requestNotificationPermission,

} from '@/notifications/permission';

import { sendLocalTestNotification } from '@/notifications/test-notification';

import { syncLocalNotifications } from '@/notifications/sync-engine';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



export default function PerfilConfiguracoesScreen() {

  const router = useRouter();

  const { user, deleteAccount, refreshUser } = useAuth();

  const { preferences, togglePreference } = useNotificationPreferences();

  const { onboarding } = useAuth();

  const { request } = usePatientApi();

  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const [pushLoading, setPushLoading] = useState(false);

  const [testPushLoading, setTestPushLoading] = useState(false);

  const [testPushMessage, setTestPushMessage] = useState('');

  const { uploading, message: avatarMessage, error: avatarError, pickAndUpload } = useProfileAvatar();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteError, setDeleteError] = useState('');



  useEffect(() => {

    void refreshUser();

  }, [refreshUser]);



  const refreshPushPermission = useCallback(() => {

    void getPermissionState().then(setPushPermission);

  }, []);



  useFocusEffect(

    useCallback(() => {

      refreshPushPermission();

    }, [refreshPushPermission]),

  );



  async function activatePushPermission() {

    setPushLoading(true);

    try {

      const state = await requestNotificationPermission();

      setPushPermission(state);

      if (state === 'granted') {

        const checkinPref = preferences.find((item) => item.key === 'checkin');

        await syncLocalNotifications({

          request,

          onboardingComplete: Boolean(onboarding?.isComplete),

          checkinPreferenceEnabled: checkinPref?.enabled !== false,

        });

      }

    } finally {

      setPushLoading(false);

    }

  }



  async function togglePushPermission() {

    if (pushLoading) return;

    if (pushPermission === 'granted') {

      await openSystemNotificationSettings();

      refreshPushPermission();

      return;

    }

    if (pushPermission === 'denied') {

      await openSystemNotificationSettings();

      return;

    }

    await activatePushPermission();

  }



  async function handleTestNotification() {

    setTestPushMessage('');

    setTestPushLoading(true);

    try {

      let permission = await getPermissionState();

      if (permission !== 'granted') {

        permission = await requestNotificationPermission();

        setPushPermission(permission);

      }

      if (permission !== 'granted') {

        setTestPushMessage(permissionBlockedMessage(permission));

        return;

      }

      const sent = await sendLocalTestNotification({ immediate: true, logicalKey: 'manual:test' });

      setTestPushMessage(

        sent

          ? 'Aviso de teste enviado. Se não aparecer, confira se o app não está em modo Não perturbe.'

          : 'Não foi possível agendar o aviso de teste.',

      );

    } finally {

      setTestPushLoading(false);

    }

  }



  const initials = useMemo(

    () => (user?.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''),

    [user?.name],

  );



  const avatarUri = resolveMediaUrl(user?.avatar || '');



  function confirmDeletePrompt() {

    Alert.alert(

      'Excluir conta',

      'Esta ação é permanente. Seus dados de acesso serão removidos e você precisará de um novo cadastro para voltar.',

      [

        { text: 'Cancelar', style: 'cancel' },

        { text: 'Continuar', style: 'destructive', onPress: () => setDeleteOpen(true) },

      ],

    );

  }



  async function handleDeleteAccount() {

    setDeleteError('');

    if (!deletePassword.trim()) {

      setDeleteError('Informe sua senha para confirmar.');

      return;

    }

    setDeleteLoading(true);

    try {

      await deleteAccount(deletePassword);

      setDeleteOpen(false);

      router.replace('/' as never);

    } catch (err) {

      setDeleteError(

        (err as { data?: { message?: string }; message?: string })?.data?.message

          || (err as Error).message

          || 'Não foi possível excluir a conta.',

      );

    } finally {

      setDeleteLoading(false);

    }

  }



  return (

    <PatientShell>

      <PatientHeader title="Configurações" showBack backTo="/perfil" showBell={false} showMenu={false} />

      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.profile}>

          <Pressable style={styles.avatarControl} onPress={() => void pickAndUpload()} disabled={uploading}>

            {avatarUri ? (

              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />

            ) : (

              <View style={styles.avatar}>

                <Text style={styles.avatarText}>{initials}</Text>

              </View>

            )}

            <View style={styles.avatarEdit}>

              {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Camera color="#fff" size={12} />}

            </View>

          </Pressable>

          <View style={styles.profileCopy}>

            <Text style={styles.profileName}>{user?.name || 'Paciente'}</Text>

            <Text style={styles.profileHint}>{user?.email || 'Conta do Clube Florescer'}</Text>

            {avatarMessage ? (

              <Text style={[styles.avatarFeedback, avatarError && styles.avatarFeedbackError]}>{avatarMessage}</Text>

            ) : null}

          </View>

        </View>



        <Section

          icon={Bell}

          title="Notificações no celular"

          subtitle="Controle a permissão deste dispositivo."

        >

          <View style={styles.surface}>

            <Text style={styles.pushHint}>

              {permissionBlockedMessage(pushPermission)}

            </Text>

            <PreferenceToggleRow

              label="Notificações neste aparelho"

              enabled={pushPermission === 'granted'}

              disabled={pushLoading}

              onPress={() => void togglePushPermission()}

            />

            {pushPermission === 'granted' ? (

              <Text style={styles.pushOk}>Notificações ativas neste aparelho.</Text>

            ) : pushPermission === 'denied' ? (

              <Pressable

                style={styles.settingsLink}

                onPress={() => void openSystemNotificationSettings()}

                accessibilityRole="button"

              >

                <Text style={styles.settingsLinkText}>Abrir ajustes do celular</Text>

              </Pressable>

            ) : null}

            <Pressable

              style={styles.settingsLink}

              onPress={() => void handleTestNotification()}

              disabled={testPushLoading}

              accessibilityRole="button"

            >

              <Text style={styles.settingsLinkText}>

                {testPushLoading ? 'Enviando teste…' : 'Enviar aviso de teste agora'}

              </Text>

            </Pressable>

            {testPushMessage ? (

              <Text style={styles.testPushFeedback}>{testPushMessage}</Text>

            ) : null}

          </View>

        </Section>



        <Section

          icon={SlidersHorizontal}

          title="Lembretes"

          subtitle="Horários personalizados e avisos automáticos."

        >

          <View style={styles.surface}>

            <LinkRow

              title="Gerenciar lembretes"

              subtitle="Crie horários e escolha para onde o aviso leva"

              onPress={() => router.push('/perfil/lembretes' as never)}

            />

          </View>

        </Section>



        <Section

          icon={Bell}

          title="Tipos de aviso"

          subtitle="Escolha quais lembretes automáticos deseja receber."

        >

          <View style={styles.surface}>

            {preferences.map((item) => (

              <PreferenceToggleRow

                key={item.key}

                label={item.label}

                enabled={item.enabled}

                onPress={() => void togglePreference(item.key)}

              />

            ))}

          </View>

        </Section>



        <Section

          icon={ShieldCheck}

          title="Conta e segurança"

          subtitle="Acesso, privacidade e documentos."

        >

          <View style={styles.surface}>

            <LinkRow

              title="Alterar senha"

              subtitle="Receba um link seguro por e-mail"

              onPress={() => router.push('/esqueci-senha' as never)}

            />

            <LinkRow

              title="Política de privacidade"

              subtitle="Veja como seus dados são tratados"

              onPress={() => router.push('/legal/privacidade' as never)}

            />

            <LinkRow

              title="Termos de uso"

              subtitle="Condições do Clube Florescer"

              onPress={() => router.push('/legal/termos' as never)}

            />

          </View>

        </Section>



        <Section icon={Smartphone} title="Sobre o app" subtitle="Informações desta instalação.">

          <View style={styles.surface}>

            <Row label="Tema" value="Claro" />

            <Row label="Idioma" value="Português" />

            <Row label="Versão" value={getAppVersion()} />

          </View>

        </Section>



        <Pressable onPress={confirmDeletePrompt} accessibilityRole="button">

          <Text style={styles.danger}>Excluir minha conta</Text>

        </Pressable>

      </ScrollView>



      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Confirmar exclusão</Text>

            <Text style={styles.modalText}>

              Digite sua senha para excluir permanentemente sua conta do Clube Florescer.

            </Text>

            <FormField

              label="Senha"

              value={deletePassword}

              onChangeText={setDeletePassword}

              secureTextEntry

              autoCapitalize="none"

            />

            {deleteError ? <Text style={styles.modalError}>{deleteError}</Text> : null}

            <View style={styles.modalActions}>

              <CfButton

                variant="ghost"

                label="Cancelar"

                onPress={() => {

                  setDeleteOpen(false);

                  setDeletePassword('');

                  setDeleteError('');

                }}

              />

              <CfButton

                label={deleteLoading ? 'Excluindo…' : 'Excluir conta'}

                loading={deleteLoading}

                onPress={handleDeleteAccount}

              />

            </View>

          </View>

        </View>

      </Modal>

    </PatientShell>

  );

}



function Section({

  icon: Icon,

  title,

  subtitle,

  children,

}: {

  icon: typeof Bell;

  title: string;

  subtitle: string;

  children: ReactNode;

}) {

  return (

    <View style={styles.section}>

      <View style={styles.sectionHead}>

        <View style={styles.sectionIcon}>

          <Icon color="#75806c" size={14} />

        </View>

        <View style={styles.sectionCopy}>

          <Text style={styles.sectionTitle}>{title}</Text>

          <Text style={styles.sectionSubtitle}>{subtitle}</Text>

        </View>

      </View>

      {children}

    </View>

  );

}



function PreferenceToggleRow({

  label,

  enabled,

  onPress,

  disabled = false,

}: {

  label: string;

  enabled: boolean;

  onPress: () => void;

  disabled?: boolean;

}) {

  return (

    <View style={styles.toggleRow}>

      <Text style={styles.toggleLabel}>{label}</Text>

      <Pressable

        style={[styles.toggle, enabled && styles.toggleOn, disabled && styles.toggleDisabled]}

        onPress={onPress}

        disabled={disabled}

        accessibilityRole="switch"

        accessibilityState={{ checked: enabled, disabled }}

      >

        <View style={[styles.knob, enabled && styles.knobOn]} />

      </Pressable>

    </View>

  );

}



function LinkRow({

  title,

  subtitle,

  onPress,

}: {

  title: string;

  subtitle: string;

  onPress: () => void;

}) {

  return (

    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="button">

      <View style={styles.linkCopy}>

        <Text style={styles.linkTitle}>{title}</Text>

        <Text style={styles.linkSubtitle}>{subtitle}</Text>

      </View>

      <ChevronRight color="#b0b0b5" size={18} />

    </Pressable>

  );

}



function Row({ label, value }: { label: string; value: string }) {

  return (

    <View style={styles.row}>

      <Text style={styles.rowLabel}>{label}</Text>

      <Text style={styles.rowValue}>{value}</Text>

    </View>

  );

}



const styles = StyleSheet.create({

  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[5] },

  profile: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing[3],

    padding: spacing[4],

    borderRadius: radii.surface,

    borderWidth: 1,

    borderColor: '#e5e5ea',

    backgroundColor: colors.surface,

  },

  avatarControl: { position: 'relative' },

  avatarImage: { width: 56, height: 56, borderRadius: 28 },

  avatar: {

    width: 56,

    height: 56,

    borderRadius: 28,

    backgroundColor: colors.primarySoft,

    alignItems: 'center',

    justifyContent: 'center',

  },

  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.primaryDark },

  avatarEdit: {

    position: 'absolute',

    right: -2,

    bottom: -2,

    width: 24,

    height: 24,

    borderRadius: 12,

    backgroundColor: '#88977c',

    borderWidth: 2,

    borderColor: '#fff',

    alignItems: 'center',

    justifyContent: 'center',

  },

  profileCopy: { flex: 1, minWidth: 0 },

  profileName: { fontFamily: fonts.medium, fontSize: 15, color: '#242426' },

  profileHint: { fontFamily: fonts.regular, fontSize: 12, color: '#6e6e73', marginTop: 2 },

  avatarFeedback: { fontFamily: fonts.regular, fontSize: 11, color: '#5d7555', marginTop: 4 },

  avatarFeedbackError: { color: '#b34242' },

  section: { gap: spacing[2] },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginLeft: 2 },

  sectionIcon: {

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: '#f1f3ef',

    alignItems: 'center',

    justifyContent: 'center',

  },

  sectionCopy: { flex: 1 },

  sectionTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#242426' },

  sectionSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: '#77777d', marginTop: 1 },

  surface: {

    borderWidth: 1,

    borderColor: '#e5e5ea',

    borderRadius: radii.surface,

    overflow: 'hidden',

    backgroundColor: colors.surface,

  },

  pushHint: {

    paddingHorizontal: spacing[4],

    paddingTop: spacing[4],

    fontFamily: fonts.regular,

    fontSize: 12,

    lineHeight: 18,

    color: colors.textMuted,

  },

  pushActions: { padding: spacing[4], gap: spacing[2] },

  pushOk: {

    paddingHorizontal: spacing[4],

    paddingBottom: spacing[4],

    paddingTop: spacing[1],

    fontFamily: fonts.semibold,

    fontSize: 12,

    color: colors.primaryDark,

  },

  settingsLink: {

    paddingHorizontal: spacing[4],

    paddingBottom: spacing[4],

  },

  settingsLinkText: {

    fontFamily: fonts.medium,

    fontSize: 12,

    color: colors.primaryDark,

    textDecorationLine: 'underline',

  },

  testPushFeedback: {

    paddingHorizontal: spacing[4],

    paddingBottom: spacing[4],

    fontFamily: fonts.regular,

    fontSize: 11,

    lineHeight: 16,

    color: colors.textMuted,

  },

  toggleRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: spacing[3],

    minHeight: 52,

    paddingHorizontal: spacing[4],

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: '#ececf0',

  },

  toggleLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: '#2b2b2e' },

  toggle: {

    width: 48,

    height: 28,

    borderRadius: 14,

    backgroundColor: '#d9d9de',

    padding: 3,

    justifyContent: 'center',

  },

  toggleOn: { backgroundColor: '#7e8c72' },

  toggleDisabled: { opacity: 0.55 },

  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },

  knobOn: { alignSelf: 'flex-end' },

  linkRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: spacing[3],

    minHeight: 60,

    paddingHorizontal: spacing[4],

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: '#ececf0',

  },

  linkCopy: { flex: 1, minWidth: 0 },

  linkTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#242426' },

  linkSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: '#77777d', marginTop: 2 },

  row: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    gap: spacing[3],

    paddingHorizontal: spacing[4],

    paddingVertical: spacing[3],

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: '#ececf0',

  },

  rowLabel: { fontFamily: fonts.regular, fontSize: 13, color: '#343438' },

  rowValue: { fontFamily: fonts.regular, fontSize: 13, color: '#77777d' },

  danger: { textAlign: 'center', color: colors.error, fontFamily: fonts.bold, marginTop: spacing[2] },

  modalOverlay: {

    flex: 1,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'center',

    padding: spacing[4],

  },

  modalCard: {

    backgroundColor: colors.surface,

    borderRadius: radii.surface,

    padding: spacing[4],

    gap: spacing[3],

  },

  modalTitle: { fontFamily: fonts.bold, fontSize: 18 },

  modalText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },

  modalError: { color: colors.error, fontFamily: fonts.medium, fontSize: 13 },

  modalActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },

});

