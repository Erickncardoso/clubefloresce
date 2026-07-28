import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const PREFERENCES_KEY = 'cf-profile-notification-preferences-v1';

export type NotificationPreference = {
  key: string;
  label: string;
  enabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { key: 'checkin', label: 'Check-in semanal', enabled: true },
  { key: 'content', label: 'Novos conteúdos', enabled: true },
  { key: 'bella', label: 'Mensagens da Bella', enabled: false },
  { key: 'community', label: 'Atividade na comunidade', enabled: true },
];

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
        const stored = raw ? JSON.parse(raw) as Record<string, boolean> : {};
        setPreferences(DEFAULT_PREFERENCES.map((item) => ({
          ...item,
          enabled: typeof stored[item.key] === 'boolean' ? stored[item.key] : item.enabled,
        })));
      } catch {
        setPreferences(DEFAULT_PREFERENCES.map((item) => ({ ...item })));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: NotificationPreference[]) => {
    const data = Object.fromEntries(next.map((item) => [item.key, item.enabled]));
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(data));
  }, []);

  const togglePreference = useCallback(async (key: string) => {
    setPreferences((prev) => {
      const next = prev.map((item) => (
        item.key === key ? { ...item, enabled: !item.enabled } : item
      ));
      void persist(next);
      return next;
    });
  }, [persist]);

  return { preferences, ready, togglePreference };
}
