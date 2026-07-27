import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import { useAuth } from '@/providers/AuthProvider';
import { getAppVersion } from '@/config/env';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type ToggleItem = { key: string; label: string; on: boolean };

export default function PerfilConfiguracoesScreen() {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const [toggles, setToggles] = useState<ToggleItem[]>([
    { key: 'checkin', label: 'Lembrete de check-in semanal', on: true },
    { key: 'content', label: 'Novos conteúdos disponíveis', on: true },
    { key: 'bella', label: 'Mensagens da BELLA', on: false },
    { key: 'community', label: 'Atividade na comunidade', on: true },
  ]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const initials = useMemo(
    () => (user?.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''),
    [user?.name],
  );

  function toggleItem(key: string) {
    setToggles((prev) => prev.map((item) => (item.key === key ? { ...item, on: !item.on } : item)));
  }

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
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{user?.name || 'Paciente'}</Text>
            <Text style={styles.profileHint}>{user?.email || ''}</Text>
          </View>
        </View>

        <Section title="Preferências">
          {toggles.map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Pressable
                style={[styles.toggle, item.on && styles.toggleOn]}
                onPress={() => toggleItem(item.key)}
                accessibilityRole="switch"
                accessibilityState={{ checked: item.on }}
              >
                <View style={[styles.knob, item.on && styles.knobOn]} />
              </Pressable>
            </View>
          ))}
          <Text style={styles.toggleNote}>
            Preferências de notificação push serão sincronizadas em uma atualização futura.
          </Text>
        </Section>

        <Section title="Conta">
          <LinkRow label="Meu perfil" onPress={() => router.push('/perfil' as never)} />
          <LinkRow
            label="Alterar senha"
            onPress={() => router.push('/esqueci-senha' as never)}
          />
          <LinkRow
            label="Política de privacidade"
            onPress={() => router.push('/legal/privacidade' as never)}
          />
          <LinkRow
            label="Termos de uso"
            onPress={() => router.push('/legal/termos' as never)}
          />
        </Section>

        <Section title="App">
          <Row label="Tema" value="Claro" />
          <Row label="Idioma" value="Português (Brasil)" />
          <Row label="Versão" value={getAppVersion()} />
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="button">
      <Text style={styles.link}>{label}</Text>
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
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.primaryDark },
  profileCopy: { flex: 1 },
  profileName: { fontFamily: fonts.bold, fontSize: 16 },
  profileHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, paddingRight: spacing[3] },
  toggleNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing[1],
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.track,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  linkRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 14 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
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
