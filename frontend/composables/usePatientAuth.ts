/** Sessão persistente do app paciente (PWA). */

import {
  getFetchErrorMessage,
  isPatientAccessBlockedError,
  isPatientAccessBlockedMessage,
} from '~/utils/patient-access'
import {
  applyVerifiedSessionUser,
  authFetchInit,
  authHeaders,
  clearAuthSessionMeta,
  getAuthToken,
  getLegacyAuthToken,
  getVerifiedRole,
  hasAuthSession,
  persistDisplayMeta,
  readFreshLogin,
} from '~/composables/useAuthSession.js'

const TOKEN_KEY = 'auth_token'
const TOKEN_BACKUP_KEY = 'auth_token_backup'
const PATIENT_ROLE = 'PACIENTE'

let sessionValidationFlight: Promise<boolean> | null = null

function readStorageToken(): string | null {
  if (import.meta.server) return null
  return getLegacyAuthToken() || null
}

export function usePatientAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('patient-auth-token', () => null)
  const sessionReady = useState('patient-session-ready', () => false)

  function getToken(): string | null {
    if (import.meta.server) return null
    if (token.value) return token.value
    const resolved = getAuthToken()
    if (resolved) {
      token.value = resolved
      return resolved
    }
    const stored = readStorageToken()
    if (stored) token.value = stored
    return stored
  }

  function hasPatientSession(): boolean {
    if (import.meta.server) return false
    return Boolean(getToken())
  }

  function markSessionActive() {
    if (import.meta.server) return
    token.value = readStorageToken()
  }

  /** @deprecated Cookie httpOnly — use markSessionActive após login. */
  function saveToken(nextToken: string) {
    if (import.meta.server) return
    token.value = nextToken
    localStorage.setItem(TOKEN_KEY, nextToken)
    try {
      sessionStorage.setItem(TOKEN_BACKUP_KEY, nextToken)
    } catch {
      /* sessionStorage indisponível */
    }
  }

  function bootstrapToken() {
    if (import.meta.server) return null
    const resolved = getToken()
    return resolved || null
  }

  function clearSession() {
    if (import.meta.server) return
    token.value = null
    clearAuthSessionMeta()
  }

  function authHeadersForRequest(): Record<string, string> {
    const headers = authHeaders()
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  function isUnauthorizedError(err: unknown): boolean {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    return status === 401
  }

  function isSessionExpiredError(err: unknown): boolean {
    if (isPatientAccessBlockedError(err)) return true

    if (!isUnauthorizedError(err)) return false
    const message = getFetchErrorMessage(err).toLowerCase()
    return message.includes('sessão expirada')
      || message.includes('sessao expirada')
      || message.includes('token inválido')
      || message.includes('token invalido')
      || message.includes('acesso expirado')
      || message.includes('faça login novamente')
      || message.includes('faca login novamente')
      || message.includes('usuário inválido')
      || message.includes('usuario invalido')
  }

  function isTransientAuthError(err: unknown): boolean {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    if (status === 503 || status === 502 || status === 504) return true
    const message = getFetchErrorMessage(err).toLowerCase()
    return message.includes('network')
      || message.includes('fetch')
      || message.includes('timeout')
      || message.includes('ocupado')
  }

  function isPatientAccessRevokedError(err: unknown): boolean {
    return isPatientAccessBlockedError(err)
      || isPatientAccessBlockedMessage(getFetchErrorMessage(err))
  }

  async function refreshSession(): Promise<boolean> {
    if (!config.public.mobileApp) return false

    bootstrapToken()
    if (!hasAuthSession()) return false

    const legacy = getLegacyAuthToken()

    try {
      const data = await $fetch<{ user?: { role?: string; name?: string; avatar?: string; createdAt?: string } }>(
        `${config.public.apiBase}/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          ...(legacy ? { headers: { Authorization: `Bearer ${legacy}` } } : {}),
        },
      )
      if (data?.user?.role) {
        applyVerifiedSessionUser(data.user)
        markSessionActive()
        if (data.user.role !== PATIENT_ROLE) {
          clearSession()
          return false
        }
        if (data.user) {
          const { persistSession } = usePatientApp()
          persistSession({
            name: data.user.name,
            avatar: data.user.avatar,
            createdAt: data.user.createdAt,
          })
        }
        return true
      }
      return false
    } catch (err) {
      if (isTransientAuthError(err)) return false
      if (isSessionExpiredError(err) || isPatientAccessRevokedError(err)) {
        clearSession()
      }
      return false
    }
  }

  function assertPatientRole(): boolean {
    if (import.meta.server) return false
    return getVerifiedRole() === PATIENT_ROLE
  }

  function rejectNonPatientSession(): void {
    clearSession()
  }

  async function runPatientSessionValidation(): Promise<boolean> {
    if (!config.public.mobileApp) return true

    bootstrapToken()
    sessionReady.value = true

    if (!hasAuthSession()) return false

    if (readFreshLogin() && assertPatientRole()) {
      return true
    }

    const refreshed = await refreshSession()
    if (!refreshed) {
      if (readFreshLogin() && assertPatientRole()) return true
      return false
    }

    if (!assertPatientRole()) {
      rejectNonPatientSession()
      return false
    }

    return true
  }

  async function ensurePatientSession(): Promise<boolean> {
    if (!config.public.mobileApp) return true

    if (!sessionValidationFlight) {
      sessionValidationFlight = runPatientSessionValidation().finally(() => {
        sessionValidationFlight = null
      })
    }

    return sessionValidationFlight
  }

  async function ensureSession(): Promise<boolean> {
    return ensurePatientSession()
  }

  return {
    token,
    sessionReady,
    getToken,
    hasPatientSession,
    saveToken,
    markSessionActive,
    bootstrapToken,
    clearSession,
    authHeaders: authHeadersForRequest,
    authFetchInit,
    isTransientAuthError,
    assertPatientRole,
    rejectNonPatientSession,
    isUnauthorizedError,
    isSessionExpiredError,
    isPatientAccessRevokedError,
    refreshSession,
    ensurePatientSession,
    ensureSession,
  }
}
