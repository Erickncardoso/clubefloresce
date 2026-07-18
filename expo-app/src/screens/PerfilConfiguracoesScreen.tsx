import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/providers/AuthProvider';
import { getAppVersion } from '@/config/env';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type ToggleItem = { key: string; label: string; on: boolean };

export default function PerfilConfiguracoesScreen() {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<ToggleItem[]>([
    { key: 'checkin', label: 'Lembrete de check-in semanal', on: true },
    { key: 'content', label: 'Novos conteúdos disponíveis', on: true },
    { key: 'bella', label: 'Mensagens da BELLA', on: false },
    { key: 'community', label: 'Atividade na comunidade', on: true },
  ]);

  const initials = useMemo(
    () => (user?.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''),
    [user?.name],
  );

  function toggleItem(key: string) {
    setToggles((prev) => prev.map((item) => (item.key === key ? { ...item, on: !item.on } : item)));
  }

  return (
    <PatientShell>
      <PatientHeader title="Configurações" showBack backTo="/perfil" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{user?.name || 'Paciente'}</Text>
            <Text style={styles.profileHint}>Foto e dados pessoais em breve.</Text>
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
        </Section>

        <Section title="Conta">
          <Text style={styles.link}>Editar perfil</Text>
          <Text style={styles.link}>Alterar senha</Text>
          <Text style={styles.link}>Privacidade</Text>
        </Section>

        <Section title="App">
          <Row label="Tema" value="Claro" />
          <Row label="Idioma" value="Português" />
          <Row label="Versão" value={getAppVersion()} />
        </Section>

        <Text style={styles.danger}>Excluir minha conta</Text>
      </ScrollView>
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
  link: { fontFamily: fonts.semibold, fontSize: 14, paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 14 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  danger: { textAlign: 'center', color: colors.error, fontFamily: fonts.bold, marginTop: spacing[2] },
});
