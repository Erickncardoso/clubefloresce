/** Sessão persistente do app paciente (PWA). */

const TOKEN_KEY = 'auth_token'
const TOKEN_BACKUP_KEY = 'auth_token_backup'

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
    if (!isUnauthorizedError(err)) return false
    const message = String(
      (err as { data?: { message?: string }; message?: string })?.data?.message
      || (err as { message?: string })?.message
      || '',
    ).toLowerCase()
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
        return true
      }
      return false
    } catch (err) {
      if (isSessionExpiredError(err)) {
        clearSession()
      }
      return false
    }
  }

  async function ensureSession(): Promise<boolean> {
    if (!config.public.mobileApp) return true
    bootstrapToken()
    sessionReady.value = true
    if (!getToken()) return false
    return refreshSession()
  }

  return {
    token,
    sessionReady,
    getToken,
    saveToken,
    bootstrapToken,
    clearSession,
    authHeaders,
    isUnauthorizedError,
    isSessionExpiredError,
    refreshSession,
    ensureSession,
  }
}
