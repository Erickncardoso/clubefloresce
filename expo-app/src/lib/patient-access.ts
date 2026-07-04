/** Espelha `frontend/utils/patient-access.ts` — fonte de verdade: cliente PWA. */

export function isPatientAccessExpired(accessExpiresAt?: Date | string | null): boolean {
  if (!accessExpiresAt) return false;
  const expiresAt = accessExpiresAt instanceof Date ? accessExpiresAt : new Date(accessExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return Date.now() > expiresAt.getTime();
}

export type PatientAccessFields = {
  plan?: string | null;
  accessExpiresAt?: Date | string | null;
  approvalEmailSentAt?: Date | string | null;
};

export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false;
  if (!fields.accessExpiresAt) return true;
  return !isPatientAccessExpired(fields.accessExpiresAt);
}

export function isPatientPaidAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) {
    return true;
  }
  const normalizedPlan = String(plan || 'FREE').toUpperCase();
  if (normalizedPlan === 'FREE') return false;
  return !isPatientAccessExpired(accessExpiresAt);
}

export function isPatientAppAccessBlocked(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientPaidAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

export const PATIENT_ACCESS_EXPIRED_MESSAGE =
  'Sua assinatura expirou. Renove para continuar usando o app.';

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  'Finalize sua assinatura para acessar o Clube Florescer.';

export const PATIENT_CHECKOUT_PATHS = ['/assinatura', '/assinatura/obrigado'];

export function isPatientCheckoutPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  return PATIENT_CHECKOUT_PATHS.some(
    (checkoutPath) => normalized === checkoutPath || normalized.startsWith(`${checkoutPath}/`),
  );
}

export function getFetchErrorMessage(err: unknown): string {
  return String(
    (err as { data?: { message?: string }; message?: string })?.data?.message
    || (err as { message?: string })?.message
    || '',
  );
}

export function isPatientAccessBlockedMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('acesso ao clube florescer expirou')
    || normalized.includes('acesso expirado')
    || normalized.includes('assinatura expirou')
    || normalized.includes('finalize sua assinatura')
    || normalized.includes('conta desativada');
}

export function isPatientAccessBlockedError(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status;
  if (status !== 403) return false;
  return isPatientAccessBlockedMessage(getFetchErrorMessage(err));
}
