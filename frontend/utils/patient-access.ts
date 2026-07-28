/** Espelha a regra do backend para exibir status de acesso no painel. */
export function isPatientAccessExpired(accessExpiresAt?: Date | string | null): boolean {
  if (!accessExpiresAt) return false
  const expiresAt = accessExpiresAt instanceof Date
    ? accessExpiresAt
    : new Date(accessExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return false
  return Date.now() > expiresAt.getTime()
}

export type PatientAccessFields = {
  plan?: string | null
  accessExpiresAt?: Date | string | null
  approvalEmailSentAt?: Date | string | null
}

function normalizedPlan(plan?: string | null): string {
  return String(plan || 'FREE').toUpperCase()
}

/** Acesso liberado manualmente pela nutricionista (fora do checkout automático). */
export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false
  if (!fields.accessExpiresAt) return true
  return !isPatientAccessExpired(fields.accessExpiresAt)
}

/** Plano pago (Essencial/Completo) ainda válido. FREE nunca é full. */
export function isPatientFullAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (normalizedPlan(plan) === 'FREE') return false
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) {
    return true
  }
  return !isPatientAccessExpired(accessExpiresAt)
}

/** Plano FREE ativo — vista básica sem assinatura paga. */
export function isPatientFreeBasicAccessActive(plan?: string | null): boolean {
  return normalizedPlan(plan) === 'FREE'
}

/** FREE: vista básica — só início e conta. */
export function isPatientLimitedAccessActive(
  plan?: string | null,
  _accessExpiresAt?: Date | string | null,
  _approvalEmailSentAt?: Date | string | null,
): boolean {
  return isPatientFreeBasicAccessActive(plan)
}

export function isPatientPaidAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return (
    isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
    || isPatientFreeBasicAccessActive(plan)
  )
}

/** Bloqueia só plano pago expirado. FREE sempre entra no app. */
export function isPatientAppAccessBlocked(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (isPatientFreeBasicAccessActive(plan)) return false
  return !isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
}

export function isPatientPremiumFeatureBlocked(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
}

/** Conta, legal e recuperação — nunca redirecionar para planos/início. */
export const PATIENT_SELF_SERVICE_PATHS = [
  '/legal',
  '/perfil',
  '/esqueci-senha',
  '/redefinir-senha',
  '/documento',
]

export function isPatientSelfServicePath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0]
  return PATIENT_SELF_SERVICE_PATHS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  )
}

/** Rotas liberadas no plano Gratuito (só início + conta/checkout + legal). */
export const PATIENT_LIMITED_APP_PATHS = [
  '/inicio',
  '/perfil',
  '/onboarding',
  '/assinatura',
  '/legal',
  '/esqueci-senha',
]

export function isPatientLimitedAppPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0]
  return PATIENT_LIMITED_APP_PATHS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  )
}

export function patientHadGrantedAccess(fields: PatientAccessFields): boolean {
  if (normalizedPlan(fields.plan) !== 'FREE') return true
  if (fields.approvalEmailSentAt) return true
  if (fields.accessExpiresAt) return true
  return false
}

export const PATIENT_ACCESS_EXPIRED_MESSAGE =
  'Sua assinatura expirou. Renove para continuar usando o app.'

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  'Finalize sua assinatura para acessar o Clube Florescer.'

export const PATIENT_PREMIUM_REQUIRED_MESSAGE =
  'Este recurso faz parte do plano Essencial ou Completo. Faça upgrade para liberar.'

/** Rotas em que o paciente pode estar sem plano pago (checkout / obrigado). */
export const PATIENT_CHECKOUT_PATHS = ['/assinatura', '/assinatura/obrigado']

export function isPatientCheckoutPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0]
  return PATIENT_CHECKOUT_PATHS.some(
    (checkoutPath) => normalized === checkoutPath || normalized.startsWith(`${checkoutPath}/`),
  )
}

export function getFetchErrorMessage(err: unknown): string {
  return String(
    (err as { data?: { message?: string }; message?: string })?.data?.message
    || (err as { message?: string })?.message
    || '',
  )
}

export function isPatientAccessBlockedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('acesso ao clube florescer expirou')
    || normalized.includes('acesso expirado')
    || normalized.includes('assinatura expirou')
    || normalized.includes('finalize sua assinatura')
    || normalized.includes('conta desativada')
    || normalized.includes('plano essencial ou completo')
}

export function isPatientAccessBlockedError(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status
  if (status !== 403) return false
  return isPatientAccessBlockedMessage(getFetchErrorMessage(err))
}

export function isPatientPremiumRequiredError(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status
  if (status !== 403) return false
  const code = (err as { data?: { code?: string } })?.data?.code
  if (code === 'PATIENT_PREMIUM_REQUIRED') return true
  return getFetchErrorMessage(err).toLowerCase().includes('plano essencial ou completo')
}
