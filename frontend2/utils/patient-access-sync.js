import {
  isPatientAppAccessBlocked,
  isPatientCheckoutPath,
  isPatientFullAccessActive,
  isPatientLimitedAccessActive,
  isPatientLimitedAppPath,
  isPatientSelfServicePath,
} from '~/utils/patient-access'
import { isPatientPublicPath } from '~/utils/patient-route-guard'

export function normalizePatientPath(path = '') {
  const raw = String(path || '/').split('?')[0]
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1)
  return raw || '/'
}

export function patientAccessFingerprint(user) {
  if (!user) return ''
  return [
    String(user.plan || 'FREE').toUpperCase(),
    user.accessExpiresAt ? String(user.accessExpiresAt) : '',
    user.approvalEmailSentAt ? String(user.approvalEmailSentAt) : '',
  ].join('|')
}

export function resolvePatientAccessRedirect(path, user) {
  if (!user?.id) return null

  const normalized = normalizePatientPath(path)
  if (isPatientPublicPath(normalized)) return null
  if (isPatientCheckoutPath(normalized)) return null
  if (isPatientSelfServicePath(normalized)) return null

  if (
    isPatientAppAccessBlocked(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
  ) {
    return '/assinatura'
  }

  if (
    isPatientLimitedAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
    && !isPatientLimitedAppPath(normalized)
  ) {
    return '/inicio'
  }

  return null
}

export function didGainFullAccess(before, after, user) {
  if (!user) return false
  if (before === after) return false
  return isPatientFullAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
}

let accessBlockedListener = null

export function registerPatientAccessBlockedListener(listener) {
  accessBlockedListener = listener
}

export function notifyPatientAccessBlocked() {
  accessBlockedListener?.()
}
