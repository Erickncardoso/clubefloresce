import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/providers/AuthProvider';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { handleNotificationResponse } from '@/notifications/handlers';
import { defaultNotificationHandler } from '@/notifications/permission';
import { syncLocalNotifications } from '@/notifications/sync-engine';

export default function NotificationBootstrap() {
  const { hasSession, onboarding } = useAuth();
  const { request } = usePatientApi();
  const { preferences, ready } = useNotificationPreferences();
  const syncingRef = useRef(false);

  useEffect(() => {
    defaultNotificationHandler();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hasSession || !ready) return;

    async function runSync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const checkinPref = preferences.find((item) => item.key === 'checkin');
        await syncLocalNotifications({
          request,
          onboardingComplete: Boolean(onboarding?.isComplete),
          checkinPreferenceEnabled: checkinPref?.enabled !== false,
        });
      } finally {
        syncingRef.current = false;
      }
    }

    void runSync();

    function onStateChange(state: AppStateStatus) {
      if (state === 'active') void runSync();
    }

    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, [hasSession, ready, onboarding?.isComplete, preferences, request]);

  return null;
}
