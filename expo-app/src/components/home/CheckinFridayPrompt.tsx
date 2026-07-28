import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalendarCheck } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePatientApi } from '@/hooks/usePatientApi';
import { requestNotificationPermission } from '@/notifications/permission';
import { syncLocalNotifications } from '@/notifications/sync-engine';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  open: boolean;
  deadlineLabel?: string;
  onDismiss: () => void;
  onStart: () => void;
};

export default function CheckinFridayPrompt({
  open,
  deadlineLabel = 'segunda-feira',
  onDismiss,
  onStart,
}: Props) {
  const { request } = usePatientApi();
  const { onboarding } = useAuth();
  const { preferences } = useNotificationPreferences();
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem('cf-checkin-reminder').then((value) => {
      setReminderEnabled(value === '1');
    });
  }, [open]);

  async function activateReminder() {
    if (reminderEnabled) return;
    setReminderLoading(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') return;

      try {
        await request('/checkin/reminders/subscribe', { method: 'POST' });
      } catch {
        /* lembrete local funciona mesmo se API falhar */
      }

      const checkinPref = preferences.find((item) => item.key === 'checkin');
      await syncLocalNotifications({
        request,
        onboardingComplete: Boolean(onboarding?.isComplete),
        checkinPreferenceEnabled: checkinPref?.enabled !== false,
      });

      await AsyncStorage.setItem('cf-checkin-reminder', '1');
      setReminderEnabled(true);
    } finally {
      setReminderLoading(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <CalendarCheck color={colors.primary} size={32} strokeWidth={2} style={styles.icon} />
          <Text style={styles.title}>Check-in da semana</Text>
          <Text style={styles.text}>
            Seu check-in semanal está disponível. Preencha até no máximo{' '}
            <Text style={styles.strong}>{deadlineLabel}</Text> para manter sua evolução em dia.
          </Text>
          <Pressable
            style={styles.reminder}
            disabled={reminderLoading || reminderEnabled}
            onPress={() => void activateReminder()}
          >
            <Text style={styles.reminderText}>
              {reminderEnabled ? 'Lembrete ativado ✓' : 'Ativar lembrete para não esquecer'}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onDismiss}>
              <Text style={styles.secondaryText}>Depois</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={onStart}>
              <Text style={styles.primaryText}>Começar agora</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 352,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  icon: { marginBottom: 10 },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  strong: { fontFamily: fonts.semibold, color: colors.text },
  reminder: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  reminderText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 8, width: '100%' },
  secondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  primary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
});
