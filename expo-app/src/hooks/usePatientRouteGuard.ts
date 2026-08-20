import { useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

import {
  isPatientAppAccessBlocked,
  isPatientAccessBlockedError,
  isPatientCheckoutPath,
  isPatientLimitedAccessActive,
  isPatientLimitedAppPath,
  isPatientSelfServicePath,
} from '@/lib/patient-access';

import { isPatientPublicPath } from '@/lib/patient-routes';

function normalizePath(path?: string | null): string {
  const raw = String(path || '/').split('?')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

function shouldReplace(current: string, target: string): boolean {
  if (current === target) return false;
  if (target !== '/' && current.startsWith(`${target}/`)) return false;
  return true;
}

/** Espelha middlewares `patient-auth`, `patient-guest`, `patient-onboarding`. */
export function usePatientRouteGuard() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const path = normalizePath(pathname);
  const {
    booting,
    hasSession,
    user,
    onboarding,
    refreshUser,
    fetchOnboarding,
  } = useAuth();
  const guardRunRef = useRef(0);
  const lastRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    if (booting) return;

    lastRedirectRef.current = null;

    const runId = guardRunRef.current + 1;
    guardRunRef.current = runId;
    let cancelled = false;

    function replaceIfNeeded(target: string) {
      if (cancelled || guardRunRef.current !== runId) return;
      if (!shouldReplace(path, target)) return;
      if (lastRedirectRef.current === target) return;
      lastRedirectRef.current = target;
      router.replace(target as never);
    }

    (async () => {
      if (isPatientPublicPath(path)) {
        if ((path === '/' || path === '/abrir') && hasSession) {
          try {
            const me = user ?? (await refreshUser());
            if (!me || cancelled || guardRunRef.current !== runId) return;

            if (isPatientAppAccessBlocked(me.plan, me.accessExpiresAt, me.approvalEmailSentAt)) {
              replaceIfNeeded('/assinatura');
              return;
            }

            const status = onboarding ?? (await fetchOnboarding());
            if (cancelled || guardRunRef.current !== runId) return;
            if (!status) {
              replaceIfNeeded('/inicio');
              return;
            }

            replaceIfNeeded(status.isComplete ? '/inicio' : '/onboarding');
          } catch {
            /* mantém login */
          }
        }
        return;
      }

      if (!hasSession) {
        replaceIfNeeded('/');
        return;
      }

      if (path.startsWith('/onboarding')) {
        try {
          const status = onboarding ?? (await fetchOnboarding());
          if (cancelled || guardRunRef.current !== runId) return;
          if (status?.isComplete) {
            replaceIfNeeded('/inicio');
          }
        } catch {
          /* permanece no onboarding */
        }
        return;
      }

      if (isPatientCheckoutPath(path)) {
        return;
      }

      const me = user ?? (await refreshUser());
      if (cancelled || guardRunRef.current !== runId) return;

      if (!me) {
        if (hasSession) return;
        replaceIfNeeded('/');
        return;
      }

      if (
        !isPatientCheckoutPath(path)
        && !isPatientSelfServicePath(path)
        && isPatientAppAccessBlocked(me.plan, me.accessExpiresAt, me.approvalEmailSentAt)
      ) {
        replaceIfNeeded('/assinatura');
        return;
      }

      if (
        isPatientLimitedAccessActive(me.plan, me.accessExpiresAt, me.approvalEmailSentAt)
        && !isPatientLimitedAppPath(path)
        && !isPatientSelfServicePath(path)
        && !isPatientCheckoutPath(path)
      ) {
        replaceIfNeeded('/inicio');
        return;
      }

      try {
        const status = onboarding ?? (await fetchOnboarding());
        if (cancelled || guardRunRef.current !== runId) return;
        if (status && !status.isComplete) {
          replaceIfNeeded('/onboarding');
        }
      } catch (err) {
        if (isPatientAccessBlockedError(err) && !isPatientSelfServicePath(path)) {
          replaceIfNeeded('/assinatura');
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
    onboarding,
    path,
    refreshUser,
    router,
    user,
  ]);
}
