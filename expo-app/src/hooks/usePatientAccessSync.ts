import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import {
  normalizePatientPath,
  patientAccessFingerprint,
  registerPatientAccessBlockedListener,
  resolvePatientAccessRedirect,
} from '@/lib/patient-access-sync';
import { isPatientAccessBlockedError, isPatientPremiumRequiredError } from '@/lib/patient-access';
import { useAuth } from '@/providers/AuthProvider';

const POLL_MS = 8_000;

/** Mantém plano/acesso alinhado com o painel da nutri enquanto o app está aberto. */
export function usePatientAccessSync() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const path = normalizePatientPath(pathname);
  const { booting, hasSession, user, refreshUser } = useAuth();
  const fingerprintRef = useRef('');
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (user) {
      fingerprintRef.current = patientAccessFingerprint(user);
    }
  }, [user]);

  useEffect(() => {
    if (booting || !hasSession) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    async function syncAccess(force = false) {
      if (cancelled || redirectingRef.current) return;

      try {
        const me = await refreshUser();
        if (cancelled || !me) return;

        const nextFingerprint = patientAccessFingerprint(me);
        const prevFingerprint = fingerprintRef.current;
        const changed = force || (prevFingerprint && prevFingerprint !== nextFingerprint);

        fingerprintRef.current = nextFingerprint;
        if (!changed) return;

        const target = resolvePatientAccessRedirect(path, me);
        if (target && target !== path) {
          redirectingRef.current = true;
          router.replace(target as never);
          setTimeout(() => {
            redirectingRef.current = false;
          }, 400);
        }
      } catch (err) {
        if (isPatientAccessBlockedError(err)) {
          const target = '/assinatura';
          if (target !== path) router.replace(target as never);
          return;
        }
        if (isPatientPremiumRequiredError(err)) {
          const target = '/inicio';
          if (target !== path) router.replace(target as never);
        }
      }
    }

    registerPatientAccessBlockedListener(() => {
      void syncAccess(true);
    });

    void syncAccess(true);

    poll = setInterval(() => {
      if (AppState.currentState === 'active') void syncAccess(false);
    }, POLL_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void syncAccess(true);
    });

    return () => {
      cancelled = true;
      registerPatientAccessBlockedListener(null);
      if (poll) clearInterval(poll);
      sub.remove();
    };
  }, [booting, hasSession, path, refreshUser, router, user]);
}
