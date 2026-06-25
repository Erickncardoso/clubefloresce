/** Sessão persistente do app paciente (PWA). */

import {
  getFetchErrorMessage,
  isPatientAccessBlockedError,
  isPatientAccessBlockedMessage,
} from '~/utils/patient-access'

const TOKEN_KEY = 'auth_token'
const TOKEN_BACKUP_KEY = 'auth_token_backup'
const PATIENT_ROLE = 'PACIENTE'

let sessionValidationFlight: Promise<boolean> | null = null

function readStorageToken(): string | null {
  if (import.meta.server) return null
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_BACKUP_KEY)
}

export function usePatientAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('patient-auth-token', () => null)
  const sessionReady = useState('patient-session-ready', () => false)

  function getToken(): string | null {
    if (import.meta.server) return null
    if (token.value) return token.value
    const stored = readStorageToken()
    if (stored) token.value = stored
    return stored
  }

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

    const stored = readStorageToken()
    if (!stored) {
      token.value = null
      return null
    }

    if (!localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, stored)
    }
    try {
      sessionStorage.setItem(TOKEN_BACKUP_KEY, stored)
    } catch {
      /* ignore */
    }

    token.value = stored
    return stored
  }

  function clearSession() {
    if (import.meta.server) return
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_avatar')
    localStorage.removeItem('user_created_at')
    try {
      sessionStorage.removeItem(TOKEN_BACKUP_KEY)
    } catch {
      /* ignore */
    }
  }

  function authHeaders(): Record<string, string> {
    const current = getToken()
    return current ? { Authorization: `Bearer ${current}` } : {}
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
    return message.includes('token')
      || message.includes('sessão')
      || message.includes('sessao')
      || message.includes('expirad')
      || message.includes('expirou')
      || message.includes('autenticad')
      || message.includes('não autorizado')
      || message.includes('nao autorizado')
      || message.includes('acesso expirado')
  }

  function isPatientAccessRevokedError(err: unknown): boolean {
    return isPatientAccessBlockedError(err)
      || isPatientAccessBlockedMessage(getFetchErrorMessage(err))
  }

  async function refreshSession(): Promise<boolean> {
    if (!config.public.mobileApp) return false

    const current = bootstrapToken()
    if (!current) return false

    try {
      const data = await $fetch<{ token: string; user?: { role?: string } }>(
        `${config.public.apiBase}/auth/refresh`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${current}` },
        },
      )
      if (data?.token) {
        saveToken(data.token)
        if (data.user?.role) {
          localStorage.setItem('user_role', data.user.role)
        }
        if (data.user?.role && data.user.role !== PATIENT_ROLE) {
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
      if (isSessionExpiredError(err) || isPatientAccessRevokedError(err)) {
        clearSession()
      }
      return false
    }
  }

  function assertPatientRole(): boolean {
    if (import.meta.server) return false
    return localStorage.getItem('user_role') === PATIENT_ROLE
  }

  function rejectNonPatientSession(): void {
    clearSession()
  }

  async function runPatientSessionValidation(): Promise<boolean> {
    if (!config.public.mobileApp) return true

    bootstrapToken()
    sessionReady.value = true

    if (!getToken()) return false

    const refreshed = await refreshSession()
    if (!refreshed) return false

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
    saveToken,
    bootstrapToken,
    clearSession,
    authHeaders,
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
