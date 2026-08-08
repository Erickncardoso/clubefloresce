export function isPatientAccessExpired(accessExpiresAt?: string | null) {
  if (!accessExpiresAt) return false
  const date = new Date(accessExpiresAt)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

export function paymentAccessLabel(user: {
  paymentStatus?: string | null
  accessGranted?: boolean | null
  accessExpiresAt?: string | null
  plan?: string | null
} = {}) {
  const status = String(user.paymentStatus || '').toUpperCase()
  if (status === 'PAID' || status === 'PAGO') return 'Pago'
  if (status === 'GRANTED' || status === 'LIBERADO' || user.accessGranted) return 'Liberado'
  if (isPatientAccessExpired(user.accessExpiresAt)) return 'Expirado'
  if (status === 'UNPAID' || status === 'PENDING') return 'Não pago'
  if (!user.plan || String(user.plan).toUpperCase() === 'FREE') return '—'
  return '—'
}

export function resolveBillingPaymentMethod(user: {
  paymentMethod?: string | null
  billingPaymentMethod?: string | null
} = {}) {
  return user.paymentMethod || user.billingPaymentMethod || null
}
