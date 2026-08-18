import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import {
  PREFERENCE_GROUPS,
  useNotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import { useAuth } from '@/providers/AuthProvider';
import { usePatientApi } from '@/hooks/usePatientApi';
import {
  getPermissionState,
  openSystemNotificationSettings,
  requestNotificationPermission,
} from '@/notifications/permission';
import { registerExpoPushToken } from '@/notifications/register-expo-push';
import { syncLocalNotifications } from '@/notifications/sync-engine';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function PerfilConfiguracoesPreferenciasScreen() {
  const router = useRouter();
  const { onboarding } = useAuth();
  const { preferences, togglePreference } = useNotificationPreferences();
  const { request } = usePatientApi();
  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const refreshPushPermission = useCallback(() => {
    void getPermissionState().then(setPushPermission);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPushPermission();
    }, [refreshPushPermission]),
  );

  async function resyncLocal() {
    const checkinPref = preferences.find((item) => item.key === 'checkin');
    const mealsPref = preferences.find((item) => item.key === 'meals');
    await syncLocalNotifications({
      request,
      onboardingComplete: Boolean(onboarding?.isComplete),
      checkinPreferenceEnabled: checkinPref?.enabled !== false,
      mealRemindersEnabled: mealsPref?.enabled !== false,
    });
  }

  async function handleVerify() {
    const current = await getPermissionState();
    if (current === 'undetermined') {
      const next = await requestNotificationPermission();
      setPushPermission(next);
      if (next === 'granted') {
        await registerExpoPushToken(request);
        await resyncLocal();
      }
    } else {
      setPushPermission(current);
    }
    await openSystemNotificationSettings();
    refreshPushPermission();
  }

  async function handleToggle(key: string) {
    await togglePreference(key);
    if (key === 'checkin' || key === 'meals') {
      try {
        await resyncLocal();
      } catch {
        /* o toggle já gravou */
      }
    }
  }

  return (
    <PatientShell>
      <PatientHeader
        title="Notificações"
        showBack
        backTo="/perfil/configuracoes"
        showBell={false}
        showMenu={false}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupTitle}>Permissão do Sistema</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Receber notificações</Text>
          <Pressable
            style={styles.verifyBtn}
            onPress={() => void handleVerify()}
            accessibilityRole="button"
            accessibilityLabel="Verificar permissão de notificações"
          >
            <Text style={styles.verifyText}>Verificar</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {pushPermission === 'granted'
            ? 'Ativas neste aparelho. Toque em Verificar para conferir nos Ajustes.'
            : 'Abre os Ajustes do celular já na notificação deste app.'}
        </Text>

        {PREFERENCE_GROUPS.map((group) => {
          const items = preferences.filter((item) => item.group === group.id);
          if (!items.length) return null;
          return (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {items.map((item, index) => (
                <View
                  key={item.key}
                  style={[styles.row, index === items.length - 1 && styles.rowLast]}
                >
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Switch
                    value={item.enabled}
                    onValueChange={() => void handleToggle(item.key)}
                    trackColor={{ false: '#e5e5ea', true: colors.primary }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="#e5e5ea"
                    style={styles.switch}
                  />
                </View>
              ))}
            </View>
          );
        })}

        <Pressable
          style={styles.remindersRow}
          onPress={() => router.push('/perfil/lembretes' as never)}
          accessibilityRole="button"
        >
          <Text style={styles.rowLabel}>Lembretes personalizados</Text>
          <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: 4,
    paddingBottom: spacing[8],
  },
  group: {
    marginTop: 18,
  },
  groupTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececf0',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    paddingRight: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#1c1c1e',
  },
  switch: {
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
  },
  verifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
  },
  verifyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#3a3a3c',
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: '#8e8e93',
  },
  remindersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginTop: 22,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf0',
  },
});
