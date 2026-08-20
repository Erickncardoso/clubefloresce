import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { handleNotificationResponse } from '@/notifications/handlers';
import { registerAdminPushCategories } from '@/notifications/admin-categories';
import { syncPatientLocalNotifications } from '@/notifications/sync-engine';

export default function NotificationBootstrap() {
  const { hasSession, onboarding } = useAuth();
  const { request } = usePatientApi();
  const { preferences, ready } = useNotificationPreferences();
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;

    void import('expo-notifications')
      .then(async (Notifications) => {
        if (cancelled) return;
        try {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
          try {
            await registerAdminPushCategories(Notifications);
          } catch {
            // Categorias opcionais — o toque na notificação já abre o destino.
          }
          const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            handleNotificationResponse(response);
          });
          remove = () => sub.remove();
        } catch {
          // Dev client sem native module — segue o app sem push local.
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  useEffect(() => {
    if (!hasSession || !ready) return;

    async function runSync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const checkinPref = preferences.find((item) => item.key === 'checkin');
        const mealsPref = preferences.find((item) => item.key === 'meals');
        await syncPatientLocalNotifications({
          request,
          onboardingComplete: Boolean(onboarding?.isComplete),
          checkinPreferenceEnabled: checkinPref?.enabled !== false,
          mealRemindersEnabled: mealsPref?.enabled !== false,
        });
      } catch {
        // Native notifications indisponíveis neste binary.
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
