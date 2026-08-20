import {
  isPatientAppAccessBlocked,
  isPatientCheckoutPath,
  isPatientFullAccessActive,
  isPatientLimitedAccessActive,
  isPatientLimitedAppPath,
  isPatientSelfServicePath,
  type PatientAccessFields,
} from '@/lib/patient-access';
import { isPatientPublicPath } from '@/lib/patient-routes';
import type { PatientUser } from '@/types/patient';

export function normalizePatientPath(path?: string | null): string {
  const raw = String(path || '/').split('?')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

export function patientAccessFingerprint(user?: PatientAccessFields | null): string {
  if (!user) return '';
  return [
    String(user.plan || 'FREE').toUpperCase(),
    user.accessExpiresAt ? String(user.accessExpiresAt) : '',
    user.approvalEmailSentAt ? String(user.approvalEmailSentAt) : '',
  ].join('|');
}

/** Para onde mandar o paciente quando o acesso mudou (null = pode ficar na rota). */
export function resolvePatientAccessRedirect(
  path: string,
  user: PatientUser | null,
): string | null {
  if (!user) return null;

  const normalized = normalizePatientPath(path);
  if (isPatientPublicPath(normalized)) return null;
  if (isPatientCheckoutPath(normalized)) return null;
  if (isPatientSelfServicePath(normalized)) return null;

  if (
    isPatientAppAccessBlocked(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
  ) {
    return '/assinatura';
  }

  if (
    isPatientLimitedAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
    && !isPatientLimitedAppPath(normalized)
  ) {
    return '/inicio';
  }

  return null;
}

export function didGainFullAccess(before: string, after: string, user: PatientUser | null): boolean {
  if (!user) return false;
  if (before === after) return false;
  return isPatientFullAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt);
}

type AccessBlockedListener = () => void;

let accessBlockedListener: AccessBlockedListener | null = null;

export function registerPatientAccessBlockedListener(listener: AccessBlockedListener | null) {
  accessBlockedListener = listener;
}

export function notifyPatientAccessBlocked() {
  accessBlockedListener?.();
}
