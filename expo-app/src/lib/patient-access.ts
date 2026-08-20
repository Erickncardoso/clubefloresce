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

function normalizedPlan(plan?: string | null): string {
  return String(plan || 'FREE').toUpperCase();
}

export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false;
  if (!fields.accessExpiresAt) return true;
  return !isPatientAccessExpired(fields.accessExpiresAt);
}

export function isPatientFullAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (normalizedPlan(plan) === 'FREE') return false;
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) {
    return true;
  }
  return !isPatientAccessExpired(accessExpiresAt);
}

export function isPatientFreeBasicAccessActive(plan?: string | null): boolean {
  return normalizedPlan(plan) === 'FREE';
}

export function isPatientLimitedAccessActive(
  plan?: string | null,
  _accessExpiresAt?: Date | string | null,
  _approvalEmailSentAt?: Date | string | null,
): boolean {
  return isPatientFreeBasicAccessActive(plan);
}

export function isPatientPaidAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return (
    isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
    || isPatientFreeBasicAccessActive(plan)
  );
}

export function isPatientAppAccessBlocked(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (isPatientFreeBasicAccessActive(plan)) return false;
  return !isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

export function isPatientPremiumFeatureBlocked(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

/** Conta, legal e recuperação — nunca redirecionar para planos/início. */
export const PATIENT_SELF_SERVICE_PATHS = [
  '/legal',
  '/perfil',
  '/esqueci-senha',
  '/redefinir-senha',
  '/documento',
];

export function isPatientSelfServicePath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  return PATIENT_SELF_SERVICE_PATHS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

/** Rotas liberadas no plano Gratuito (só início + conta/checkout + legal). */
export const PATIENT_LIMITED_APP_PATHS = [
  '/inicio',
  '/menu',
  '/perfil',
  '/onboarding',
  '/assinatura',
  '/legal',
  '/esqueci-senha',
];

export function isPatientLimitedAppPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  return PATIENT_LIMITED_APP_PATHS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

export const PATIENT_ACCESS_EXPIRED_MESSAGE =
  'Seu acesso expirou. Fale com sua nutricionista para continuar usando o app.';

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  'Seu acesso ainda não foi liberado. Aguarde a liberação pela nutricionista.';

export const PATIENT_PREMIUM_REQUIRED_MESSAGE =
  'Este recurso estará disponível quando sua nutricionista liberar seu acesso.';

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
    || normalized.includes('conta desativada')
    || normalized.includes('acesso ainda não foi liberado')
    || normalized.includes('liberação pela nutricionista')
}

export function isPatientAccessBlockedError(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status;
  if (status !== 403) return false;
  return isPatientAccessBlockedMessage(getFetchErrorMessage(err));
}
