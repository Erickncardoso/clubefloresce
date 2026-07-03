import { authFetchInit } from '~/composables/useAuthSession.js'
import {
  isPatientAppAccessBlocked,
  isPatientCheckoutPath,
  isPatientAccessBlockedError,
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
  return PATIENT_PUBLIC_PATHS.includes(String(path || ''))
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

/**
 * Valida sessão no backend e bloqueia rotas sem acesso pago/liberado.
 * Retorna destino de redirect ou null se a rota pode seguir.
 */
export async function resolvePatientRouteAccess(path: string): Promise<string | null> {
  if (!requiresPatientPaidAccess(path)) return null

  try {
    const user = await fetchFreshPatientUser()
    if (!user?.id || user.role !== 'PACIENTE') return '/'

    if (isPatientAppAccessBlocked(
      user.plan as string | null | undefined,
      user.accessExpiresAt as string | Date | null | undefined,
      user.approvalEmailSentAt as string | Date | null | undefined,
    )) {
      return '/assinatura'
    }

    return null
  } catch (err) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    if (status === 401) return '/'
    if (isPatientAccessBlockedError(err)) return '/assinatura'
    return '/assinatura'
  }
}
