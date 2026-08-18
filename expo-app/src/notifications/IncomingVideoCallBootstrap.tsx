import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import IncomingCallOverlay from '@/components/chamada/IncomingCallOverlay';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  buildCallPath,
  isVideoCallNotificationData,
  resolveIncomingCallFromNotifications,
  type ActiveVideoCallResponse,
  type PatientNotificationRow,
  type VideoCallPublic,
} from '@/lib/video-call';

const POLL_MS = 1000;

function isRingingCall(call: VideoCallPublic | null | undefined) {
  return Boolean(call?.id && call.status === 'ringing');
}

export default function IncomingVideoCallBootstrap() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const path = pathname.split('?')[0];
  const { hasSession, booting } = useAuth();
  const { request } = usePatientApi();

  const lastRingingIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [incoming, setIncoming] = useState<VideoCallPublic | null>(null);

  const onCallScreen = path.startsWith('/chamada');

  const openCall = useCallback((call: VideoCallPublic) => {
    setIncoming(null);
    lastRingingIdRef.current = null;
    router.push(buildCallPath(call) as never);
  }, [router]);

  const dismissCall = useCallback(async () => {
    const call = incoming;
    if (!call?.id) {
      setIncoming(null);
      return;
    }
    setIncoming(null);
    lastRingingIdRef.current = null;
    try {
      await request(`/patients/me/video-call/${encodeURIComponent(call.id)}/decline`, {
        method: 'POST',
      });
    } catch {
      /* recusa local já esconde; backend sincroniza na próxima tentativa */
    }
  }, [incoming, request]);

  const refreshIncomingCall = useCallback(async () => {
    if (!hasSession || onCallScreen) {
      setIncoming(null);
      return;
    }
    try {
      const data = await request<ActiveVideoCallResponse>('/patients/me/video-call');
      let call = isRingingCall(data?.call) ? data.call! : null;

      if (!call) {
        try {
          const notifications = await request<{ items?: PatientNotificationRow[] }>(
            '/notifications',
          );
          const fromNotification = resolveIncomingCallFromNotifications(notifications?.items);
          if (fromNotification?.id) {
            const peek = await request<ActiveVideoCallResponse>(
              `/patients/me/video-call/${encodeURIComponent(fromNotification.id)}/peek`,
            );
            call = isRingingCall(peek?.call) ? peek.call! : null;
          }
        } catch {
          /* fallback opcional */
        }
      }

      if (!call?.id) {
        lastRingingIdRef.current = null;
        setIncoming(null);
        return;
      }

      if (call.id !== lastRingingIdRef.current) {
        lastRingingIdRef.current = call.id;
      }
      setIncoming(call);
    } catch {
      /* mantém overlay atual se a API falhar um ciclo */
    }
  }, [hasSession, onCallScreen, request]);

  useEffect(() => {
    if (booting || !hasSession) {
      setIncoming(null);
      lastRingingIdRef.current = null;
      return undefined;
    }

    void refreshIncomingCall();
    timerRef.current = setInterval(() => {
      if (AppState.currentState === 'active') void refreshIncomingCall();
    }, POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [booting, hasSession, refreshIncomingCall]);

  useEffect(() => {
    if (onCallScreen) {
      setIncoming(null);
      lastRingingIdRef.current = null;
    } else {
      void refreshIncomingCall();
    }
  }, [onCallScreen, pathname, refreshIncomingCall]);

  useEffect(() => {
    if (!hasSession) return undefined;

    let removeReceived: (() => void) | undefined;

    void import('expo-notifications')
      .then((Notifications) => {
        const received = Notifications.addNotificationReceivedListener((event) => {
          const data = event.request.content.data;
          if (isVideoCallNotificationData(data)) {
            void refreshIncomingCall();
          }
        });

        removeReceived = () => received.remove();
      })
      .catch(() => {});

    const onStateChange = (state: AppStateStatus) => {
      if (state === 'active') void refreshIncomingCall();
    };
    const sub = AppState.addEventListener('change', onStateChange);

    return () => {
      removeReceived?.();
      sub.remove();
    };
  }, [hasSession, refreshIncomingCall]);

  return (
    <IncomingCallOverlay
      key={incoming?.id || 'idle'}
      visible={!onCallScreen && Boolean(incoming?.id)}
      nutriName={incoming?.nutriName}
      nutriAvatar={incoming?.nutriAvatar}
      onAnswer={() => incoming && openCall(incoming)}
      onDismiss={() => void dismissCall()}
    />
  );
}
