import {
  isPatientAccessExpired,
  isPatientManuallyGrantedAccess,
  isPatientPaidAccessActive,
  patientHadGrantedAccess,
  type PatientAccessFields,
} from '~/utils/patient-access'

export type PatientBillingUser = PatientAccessFields & {
  status?: string | null
  billingPaymentMethod?: string | null
  billingSubscriptionPaymentMethod?: string | null
  billingSubscriptionStatus?: string | null
}

function patientAccessFields(user: PatientBillingUser): PatientAccessFields {
  return {
    plan: user.plan,
    accessExpiresAt: user.accessExpiresAt,
    approvalEmailSentAt: user.approvalEmailSentAt,
  }
}

function isActivePatient(user: PatientBillingUser): boolean {
  return (user.status || 'ATIVO').toUpperCase() === 'ATIVO'
}

export function paymentAccessLabel(user: PatientBillingUser): string {
  if (!isActivePatient(user)) return 'N/A'

  const fields = patientAccessFields(user)
  if (isPatientPaidAccessActive(fields.plan, fields.accessExpiresAt, fields.approvalEmailSentAt)) {
    if (
      isPatientManuallyGrantedAccess(fields)
      && String(fields.plan || 'FREE').toUpperCase() === 'FREE'
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

export function paymentMethodTagClass(user: PatientBillingUser): string {
  const method = resolveBillingPaymentMethod(user)
  if (method === 'pix') return 'user-tag--paymethod-pix'
  if (method === 'card') return 'user-tag--paymethod-card'
  return 'user-tag--paymethod-na'
}
