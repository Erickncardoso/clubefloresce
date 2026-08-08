/** Helpers de acesso e pagamento de pacientes — portados de frontend/utils/patient-access.ts e patient-billing-display.ts */

// ─── Access ────────────────────────────────────────────────────────────────────

export type PatientAccessFields = {
  plan?: string | null
  accessExpiresAt?: Date | string | null
  approvalEmailSentAt?: Date | string | null
}

export function isPatientAccessExpired(accessExpiresAt?: Date | string | null): boolean {
  if (!accessExpiresAt) return false
  const expiresAt =
    accessExpiresAt instanceof Date ? accessExpiresAt : new Date(accessExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return false
  return Date.now() > expiresAt.getTime()
}

function normalizedPlan(plan?: string | null): string {
  return String(plan || 'FREE').toUpperCase()
}

export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false
  if (!fields.accessExpiresAt) return true
  return !isPatientAccessExpired(fields.accessExpiresAt)
}

export function isPatientFullAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (normalizedPlan(plan) === 'FREE') return false
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) return true
  return !isPatientAccessExpired(accessExpiresAt)
}

export function isPatientFreeBasicAccessActive(plan?: string | null): boolean {
  return normalizedPlan(plan) === 'FREE'
}

export function isPatientPaidAccessActive(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return (
    isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt) ||
    isPatientFreeBasicAccessActive(plan)
  )
}

export function patientHadGrantedAccess(fields: PatientAccessFields): boolean {
  if (normalizedPlan(fields.plan) !== 'FREE') return true
  if (fields.approvalEmailSentAt) return true
  if (fields.accessExpiresAt) return true
  return false
}

// ─── Billing display ──────────────────────────────────────────────────────────

export type PatientBillingUser = PatientAccessFields & {
  status?: string | null
  billingPaymentMethod?: string | null
  billingSubscriptionPaymentMethod?: string | null
  billingSubscriptionStatus?: string | null
}

function isActivePatient(user: PatientBillingUser): boolean {
  return (user.status || 'ATIVO').toUpperCase() === 'ATIVO'
}

export function paymentAccessLabel(user: PatientBillingUser): string {
  if (!isActivePatient(user)) return 'N/A'
  const fields: PatientAccessFields = {
    plan: user.plan,
    accessExpiresAt: user.accessExpiresAt,
    approvalEmailSentAt: user.approvalEmailSentAt,
  }
  if (isPatientPaidAccessActive(fields.plan, fields.accessExpiresAt, fields.approvalEmailSentAt)) {
    if (
      isPatientManuallyGrantedAccess(fields) &&
      String(fields.plan || 'FREE').toUpperCase() === 'FREE'
    ) {
      return 'Liberado'
    }
    return 'Pago'
  }
  if (patientHadGrantedAccess(fields) && isPatientAccessExpired(fields.accessExpiresAt)) {
    return 'Expirado'
  }
  return 'Não pago'
}

export function paymentTagClass(user: PatientBillingUser): string {
  const label = paymentAccessLabel(user)
  if (label === 'Pago') return 'user-tag--payment-paid'
  if (label === 'Liberado') return 'user-tag--payment-granted'
  if (label === 'Expirado') return 'user-tag--payment-expired'
  if (label === 'Não pago') return 'user-tag--payment-unpaid'
  return 'user-tag--payment-na'
}

export function resolveBillingPaymentMethod(user: PatientBillingUser): 'pix' | 'card' | null {
  const mpMethod = user.billingSubscriptionPaymentMethod
  const manual = user.billingPaymentMethod
  if (mpMethod === 'pix' || mpMethod === 'card') return mpMethod
  if (manual === 'pix' || manual === 'card') return manual
  return null
}

export function paymentMethodLabel(user: PatientBillingUser): string {
  const method = resolveBillingPaymentMethod(user)
  const subStatus = String(user.billingSubscriptionStatus || '').toLowerCase()
  const payLabel = paymentAccessLabel(user)

  if (!method) {
    if (payLabel === 'Liberado') return 'Manual'
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'Aguardando'
    return '—'
  }

  if (method === 'pix') {
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'Pix (pendente)'
    return 'Pix'
  }

  if (method === 'card') {
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'Cartão (pendente)'
    return 'Cartão'
  }

  return '—'
}
