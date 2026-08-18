import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';

const PREFERENCES_KEY = 'cf-profile-notification-preferences-v2';

export type NotificationPreferenceGroup = 'content' | 'diet';

export type NotificationPreference = {
  key: string;
  label: string;
  group: NotificationPreferenceGroup;
  enabled: boolean;
};

export const PREFERENCE_GROUPS: Array<{ id: NotificationPreferenceGroup; title: string }> = [
  { id: 'content', title: 'Conteúdos e Interações' },
  { id: 'diet', title: 'Dieta' },
];

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { key: 'general', label: 'Mensagem da nutricionista', group: 'content', enabled: true },
  { key: 'bella', label: 'Mensagens da Bella', group: 'content', enabled: true },
  { key: 'checkin', label: 'Novo check-in', group: 'content', enabled: true },
  { key: 'content', label: 'Novos conteúdos', group: 'content', enabled: true },
  { key: 'community', label: 'Curtidas e comentários no diário', group: 'content', enabled: true },
  { key: 'meals', label: 'Horário de refeição', group: 'diet', enabled: true },
  { key: 'evolution', label: 'Metas e hidratação', group: 'diet', enabled: true },
];

type PushStatus = {
  mealRemindersEnabled?: boolean;
  diarySocialPushEnabled?: boolean;
  pushCategories?: Record<string, boolean>;
};

function mergePreferences(
  stored: Record<string, boolean>,
  status?: PushStatus | null,
): NotificationPreference[] {
  return DEFAULT_PREFERENCES.map((item) => {
    let enabled = typeof stored[item.key] === 'boolean' ? stored[item.key] : item.enabled;
    if (item.key === 'meals' && typeof status?.mealRemindersEnabled === 'boolean') {
      enabled = status.mealRemindersEnabled;
    }
    if (item.key === 'community' && typeof status?.diarySocialPushEnabled === 'boolean') {
      enabled = status.diarySocialPushEnabled;
    }
    if (typeof status?.pushCategories?.[item.key] === 'boolean') {
      enabled = status.pushCategories[item.key];
    }
    return { ...item, enabled };
  });
}

export function useNotificationPreferences() {
  const { request, token } = usePatientApi();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFERENCES_KEY)
          || await AsyncStorage.getItem('cf-profile-notification-preferences-v1');
        const stored = raw ? JSON.parse(raw) as Record<string, boolean> : {};
        let status: PushStatus | null = null;
        if (token) {
          try {
            status = await request<PushStatus>('/push/status');
          } catch {
            status = null;
          }
        }
        const next = mergePreferences(stored, status);
        setPreferences(next);
        await AsyncStorage.setItem(
          PREFERENCES_KEY,
          JSON.stringify(Object.fromEntries(next.map((item) => [item.key, item.enabled]))),
        );
      } catch {
        setPreferences(DEFAULT_PREFERENCES.map((item) => ({ ...item })));
      } finally {
        setReady(true);
      }
    })();
  }, [request, token]);

  const persist = useCallback(async (next: NotificationPreference[]) => {
    const data = Object.fromEntries(next.map((item) => [item.key, item.enabled]));
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(data));
  }, []);

  const togglePreference = useCallback(async (key: string) => {
    const current = preferences.find((item) => item.key === key);
    const enabled = !(current?.enabled !== false);
    const next = preferences.map((item) => (
      item.key === key ? { ...item, enabled } : item
    ));
    setPreferences(next);
    await persist(next);

    try {
      await request('/push/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          categories: { [key]: enabled },
          ...(key === 'meals' ? { mealRemindersEnabled: enabled } : {}),
          ...(key === 'community' ? { diarySocialPushEnabled: enabled } : {}),
        }),
      });
    } catch {
      /* o estado local já mudou; sincroniza na próxima abertura */
    }
  }, [persist, preferences, request]);

  return { preferences, ready, togglePreference };
}
