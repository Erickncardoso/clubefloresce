import { apiFetch, ApiError } from './api'
import type { AuthUser } from './types'

const SESSION_HINT_KEY = 'cf_session_active'
const USER_ID_KEY = 'user_id'

let cachedUser: AuthUser | null = null
let cachedAt = 0
const VERIFY_TTL_MS = 60_000

function markSessionHint(user: AuthUser) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1')
    localStorage.setItem(USER_ID_KEY, user.id)
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionMeta() {
  cachedUser = null
  cachedAt = 0
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_HINT_KEY)
    localStorage.removeItem(USER_ID_KEY)
  } catch {
    /* ignore */
  }
}

export function getCachedUser() {
  return cachedUser
}

export function applyVerifiedSessionUser(user: AuthUser) {
  cachedUser = user
  cachedAt = Date.now()
  markSessionHint(user)
}

export async function verifyAuthSession(options: {
  requiredRole?: string
  force?: boolean
} = {}): Promise<AuthUser | null> {
  const { requiredRole, force } = options
  if (!force && cachedUser && Date.now() - cachedAt < VERIFY_TTL_MS) {
    if (requiredRole && cachedUser.role !== requiredRole) return null
    return cachedUser
  }

  try {
    const user = await apiFetch<AuthUser>('/auth/me')
    applyVerifiedSessionUser(user)
    if (requiredRole && user.role !== requiredRole) return null
    return user
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      clearAuthSessionMeta()
      return null
    }
    // Erro de rede (backend reiniciando) — usa cache mesmo stale para não deslogar
    if (cachedUser) {
      if (requiredRole && cachedUser.role !== requiredRole) return null
      return cachedUser
    }
    throw err
  }
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ user: AuthUser; mustChangePassword?: boolean }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  )
  applyVerifiedSessionUser(data.user)
  return data
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    /* ignore */
  } finally {
    clearAuthSessionMeta()
  }
}
