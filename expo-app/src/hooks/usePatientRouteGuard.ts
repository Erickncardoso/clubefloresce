import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import {
  isPatientAppAccessBlocked,
  isPatientAccessBlockedError,
  isPatientCheckoutPath,
} from '@/lib/patient-access';
import { isPatientPublicPath } from '@/lib/patient-routes';

/** Espelha middlewares `patient-auth`, `patient-guest`, `patient-onboarding`. */
export function usePatientRouteGuard() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const path = pathname.split('?')[0];
  const {
    booting,
    hasSession,
    user,
    refreshUser,
    fetchOnboarding,
  } = useAuth();

  useEffect(() => {
    if (booting) return;

    let cancelled = false;

    (async () => {
      if (isPatientPublicPath(path)) {
        if ((path === '/' || path === '/abrir') && hasSession) {
          try {
            const me = await refreshUser();
            if (!me || cancelled) return;
            if (
              isPatientAppAccessBlocked(me.plan, me.accessExpiresAt, me.approvalEmailSentAt)
            ) {
              router.replace('/assinatura' as never);
              return;
            }
            const onboarding = await fetchOnboarding(true);
            if (cancelled) return;
            router.replace((onboarding?.isComplete ? '/inicio' : '/onboarding') as never);
          } catch {
            /* guest permanece na tela */
          }
        }
        return;
      }

      if (!hasSession) {
        router.replace('/' as never);
        return;
      }

      const me = await refreshUser();
      if (!me || cancelled) {
        router.replace('/' as never);
        return;
      }

      if (
        !isPatientCheckoutPath(path)
        && isPatientAppAccessBlocked(me.plan, me.accessExpiresAt, me.approvalEmailSentAt)
      ) {
        router.replace('/assinatura' as never);
        return;
      }

      if (isPatientCheckoutPath(path) || path.startsWith('/onboarding')) {
        return;
      }

      try {
        const onboarding = await fetchOnboarding();
        if (cancelled) return;
        if (!onboarding?.isComplete) {
          router.replace('/onboarding' as never);
        }
      } catch (err) {
        if (isPatientAccessBlockedError(err)) {
          router.replace('/assinatura' as never);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    booting,
    fetchOnboarding,
    hasSession,
    path,
    refreshUser,
    router,
    user?.id,
  ]);
}
