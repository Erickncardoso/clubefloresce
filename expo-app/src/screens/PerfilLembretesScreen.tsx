import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Bell, Plus, Trash2 } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import {
  getPermissionState,
  openSystemNotificationSettings,
  permissionBlockedMessage,
  requestNotificationPermission,
} from '@/notifications/permission';
import { syncLocalNotifications } from '@/notifications/sync-engine';
import {
  createUserReminder,
  loadUserReminders,
  saveUserReminders,
} from '@/notifications/user-reminders';
import type { UserReminder } from '@/notifications/types';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const WEEKDAY_LABELS = [
  { value: 1, label: 'D' },
  { value: 2, label: 'S' },
  { value: 3, label: 'T' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'Q' },
  { value: 6, label: 'S' },
  { value: 7, label: 'S' },
];

const ROUTE_OPTIONS = [
  { label: 'Diário alimentar', value: '/dieta' },
  { label: 'Check-in', value: '/check-in' },
  { label: 'Início', value: '/inicio' },
];

export default function PerfilLembretesScreen() {
  const { request } = usePatientApi();
  const { onboarding } = useAuth();
  const { preferences } = useNotificationPreferences();
  const [reminders, setReminders] = useState<UserReminder[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [route, setRoute] = useState('/dieta');
  const [weekdays, setWeekdays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);

  const refreshPermission = useCallback(async () => {
    setPermission(await getPermissionState());
  }, []);

  useEffect(() => {
    void refreshPermission();
    void loadUserReminders().then(setReminders);
  }, [refreshPermission]);

  async function resync(next: UserReminder[]) {
    const checkinPref = preferences.find((item) => item.key === 'checkin');
    await syncLocalNotifications({
      request,
      onboardingComplete: Boolean(onboarding?.isComplete),
      checkinPreferenceEnabled: checkinPref?.enabled !== false,
    });
    setReminders(next);
  }

  async function ensurePermission() {
    const state = await requestNotificationPermission();
    setPermission(state);
    return state === 'granted';
  }

  async function handleCreate() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;

    setSaving(true);
    try {
      const ok = await ensurePermission();
      if (!ok) return;
      const nextItem = createUserReminder({ label: trimmed, hour, minute, weekdays, route });
      const next = [...reminders, nextItem];
      await saveUserReminders(next);
      await resync(next);
      setLabel('');
      setTime('08:00');
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(item: UserReminder) {
    const next = reminders.map((entry) => (
      entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry
    ));
    await saveUserReminders(next);
    await resync(next);
  }

  async function removeReminder(item: UserReminder) {
    const next = reminders.filter((entry) => entry.id !== item.id);
    await saveUserReminders(next);
    await resync(next);
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort()
    ));
  }

  return (
    <PatientShell>
      <PatientHeader title="Lembretes" showBack backTo="/perfil/configuracoes/preferencias" showBell={false} showMenu={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.permissionCard}>
          <Bell size={18} color={colors.primaryDark} />
          <Text style={styles.permissionText}>{permissionBlockedMessage(permission)}</Text>
          {permission !== 'granted' ? (
            <View style={styles.permissionActions}>
              <CfButton label="Ativar notificações" onPress={() => void ensurePermission()} />
              {permission === 'denied' ? (
                <CfButton variant="ghost" label="Abrir ajustes do celular" onPress={() => void openSystemNotificationSettings()} />
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.compose}>
          <Text style={styles.sectionTitle}>Novo lembrete</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex.: Registrar almoço"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={colors.placeholder}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.weekdays}>
            {WEEKDAY_LABELS.map((day) => {
              const active = weekdays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  style={[styles.weekday, active && styles.weekdayActive]}
                  onPress={() => toggleWeekday(day.value)}
                >
                  <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.routes}>
            {ROUTE_OPTIONS.map((option) => {
              const active = route === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.routeChip, active && styles.routeChipActive]}
                  onPress={() => setRoute(option.value)}
                >
                  <Text style={[styles.routeChipText, active && styles.routeChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <CfButton label={saving ? 'Salvando…' : 'Salvar lembrete'} loading={saving} onPress={() => void handleCreate()} />
        </View>

        <Text style={styles.sectionTitle}>Seus lembretes</Text>
        {!reminders.length ? (
          <Text style={styles.empty}>Você ainda não criou lembretes personalizados.</Text>
        ) : (
          reminders.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.label}</Text>
                <Text style={styles.itemMeta}>
                  {String(item.hour).padStart(2, '0')}:{String(item.minute).padStart(2, '0')} ·{' '}
                  {item.enabled ? 'Ativo' : 'Pausado'}
                </Text>
              </View>
              <Pressable style={styles.itemBtn} onPress={() => void toggleReminder(item)}>
                <Text style={styles.itemBtnText}>{item.enabled ? 'Pausar' : 'Ativar'}</Text>
              </Pressable>
              <Pressable style={styles.itemBtn} onPress={() => void removeReminder(item)}>
                <Trash2 size={16} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  permissionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.surface,
  },
  permissionText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  permissionActions: { gap: spacing[2] },
  compose: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.surface,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  weekdays: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  weekday: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1ee',
  },
  weekdayActive: { backgroundColor: colors.primarySoft },
  weekdayText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  weekdayTextActive: { color: colors.primaryDark },
  routes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  routeChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  routeChipTextActive: { color: colors.primaryDark },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemCopy: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  itemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  itemBtn: { padding: 8 },
  itemBtnText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primaryDark },
});
