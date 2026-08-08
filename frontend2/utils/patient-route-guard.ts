import { authFetchInit, isDefinitiveAuthFailure, isTransientAuthFailure, verifyAuthSession } from '~/composables/useAuthSession.js'
import {
  isPatientAppAccessBlocked,
  isPatientCheckoutPath,
  isPatientAccessBlockedError,
  isPatientLimitedAccessActive,
  isPatientLimitedAppPath,
  isPatientSelfServicePath,
} from '~/utils/patient-access'

export const PATIENT_PUBLIC_PATHS = [
  '/',
  '/register',
  '/documento',
  '/esqueci-senha',
  '/redefinir-senha',
  '/abrir',
]

export function isPatientPublicPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0]
  if (PATIENT_PUBLIC_PATHS.includes(normalized)) return true
  // Política/termos acessíveis no cadastro e sem login (exigência App Store).
  if (normalized === '/legal' || normalized.startsWith('/legal/')) return true
  return false
}

/** Rotas que exigem assinatura paga ou liberação manual ativa. */
export function requiresPatientPaidAccess(path?: string | null): boolean {
  const normalized = String(path || '')
  if (isPatientPublicPath(normalized)) return false
  if (isPatientCheckoutPath(normalized)) return false
  return true
}

function syncVerifiedPatientUser(user: Record<string, unknown> | null) {
  if (!user?.id || !user?.role) return
  const verifiedUser = useState<Record<string, unknown> | null>('auth-verified-user', () => null)
  const verifiedAt = useState('auth-verified-at', () => 0)
  verifiedUser.value = { ...(verifiedUser.value || {}), ...user }
  verifiedAt.value = Date.now()
}

/** Busca o paciente no backend sem cache local de acesso. */
export async function fetchFreshPatientUser() {
  const config = useRuntimeConfig()
  const user = await $fetch<Record<string, unknown>>(
    `${config.public.apiBase}/auth/me`,
    authFetchInit(),
  )
  syncVerifiedPatientUser(user)
  return user
}

function openPremiumGateForPath(path: string) {
  if (!import.meta.client) return
  const gate = useState<{ open: boolean; path: string }>('patient-premium-gate', () => ({
    open: false,
    path: '',
  }))
  gate.value = { open: true, path: String(path || '') }
}

/**
 * Valida sessão e bloqueia rotas sem acesso pago/liberado.
 * FREE: só início e conta (demais rotas → /inicio + modal).
 * Erros de rede/5xx NÃO deslogam — só 401/403 definitivos.
 */
export async function resolvePatientRouteAccess(path: string): Promise<string | null> {
  if (!requiresPatientPaidAccess(path)) return null
  if (isPatientSelfServicePath(path)) return null
  if (isPatientCheckoutPath(path)) return null

  try {
    // Usa cache TTL de verifyAuthSession — evita martelar /auth/me a cada navegação.
    const user = await verifyAuthSession({ requiredRole: 'PACIENTE', force: false })
    if (!user?.id) {
      // Sem sessão válida — login. (verifyAuthSession já limpou meta em falha definitiva)
      return '/'
    }

    const plan = user.plan as string | null | undefined
    const accessExpiresAt = user.accessExpiresAt as string | Date | null | undefined
    const approvalEmailSentAt = user.approvalEmailSentAt as string | Date | null | undefined

    if (
      !isPatientSelfServicePath(path)
      && isPatientAppAccessBlocked(plan, accessExpiresAt, approvalEmailSentAt)
    ) {
      return '/assinatura'
    }

    if (
      isPatientLimitedAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
      && !isPatientLimitedAppPath(path)
    ) {
      openPremiumGateForPath(path)
      return '/inicio'
    }

    return null
  } catch (err) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status

    if (isTransientAuthFailure(err) || (status && status >= 500)) {
      // Blip de rede/backend — mantém o usuário na rota atual.
      return null
    }

    if (isPatientAccessBlockedError(err) && !isPatientSelfServicePath(path)) {
      return '/assinatura'
    }

    if (isDefinitiveAuthFailure(err) || status === 401) {
      return '/'
    }

    // Desconhecido sem status definitivo: não desloga.
    return null
  }
}
