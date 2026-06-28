/** Sessão autenticada via cookie httpOnly — role sempre validada no backend. */

import { PROD_API_BASE } from '~/utils/api-env.mjs'
import { isApiConnectionError } from '~/utils/resolve-api-base.mjs'

const LEGACY_TOKEN_KEY = 'auth_token'
const USER_ID_KEY = 'user_id'
const SESSION_HINT_KEY = 'cf_session_active'
const LEGACY_ROLE_KEY = 'user_role'
const VERIFY_TTL_MS = 60_000

let verifyInFlight = null

function verifyGenerationState() {
  return useState('auth-verify-generation', () => 0)
}

function bumpVerifyGeneration() {
  const gen = verifyGenerationState()
  gen.value += 1
  return gen.value
}

function getVerifyGeneration() {
  return verifyGenerationState().value
}

const FRESH_LOGIN_KEY = 'auth_fresh_login'
const FRESH_LOGIN_MS = 15_000

/** Marca login recém-feito — middleware confia até revalidar cookie. */
export function markFreshLogin(user) {
  if (typeof window === 'undefined' || !user?.id || !user?.role) return
  try {
    sessionStorage.setItem(FRESH_LOGIN_KEY, JSON.stringify({
      id: user.id,
      role: user.role,
      at: Date.now(),
    }))
  } catch {
    /* sessionStorage indisponível */
  }
}

export function readFreshLogin() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(FRESH_LOGIN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.id || !parsed?.role || Date.now() - Number(parsed.at || 0) > FRESH_LOGIN_MS) {
      sessionStorage.removeItem(FRESH_LOGIN_KEY)
      return null
    }
    return parsed
  } catch {
    sessionStorage.removeItem(FRESH_LOGIN_KEY)
    return null
  }
}

export function clearFreshLogin() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(FRESH_LOGIN_KEY)
  } catch {
    /* ignore */
  }
}

function mergeHeaders(baseHeaders = {}, extraHeaders = {}) {
  const headers = new Headers(baseHeaders)
  Object.entries(extraHeaders).forEach(([key, value]) => {
    if (value != null && value !== '') headers.set(key, String(value))
  })
  return headers
}

const SESSION_SENTINEL = '__cookie_session__'

function verifiedUserState() {
  return useState('auth-verified-user', () => null)
}

function verifiedAtState() {
  return useState('auth-verified-at', () => 0)
}

export function getLegacyAuthToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(LEGACY_TOKEN_KEY) || ''
}

export function markAuthSessionHint() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1')
  } catch {
    /* storage indisponível */
  }
}

/** Indica possível sessão local (cookie + metadados) — não substitui verifyAuthSession(). */
export function hasAuthSession() {
  if (typeof window === 'undefined') return false
  if (verifiedUserState().value?.id) return true
  return Boolean(localStorage.getItem(USER_ID_KEY) || localStorage.getItem(SESSION_HINT_KEY))
}

export function isTransientAuthFailure(err) {
  const status = err?.statusCode ?? err?.status ?? err?.response?.status
  if (status === 503 || status === 502 || status === 504) return true
  return isApiConnectionError(err)
}

/** Falha que invalida a sessão (401/403 reais) — não inclui rede instável. */
export function isDefinitiveAuthFailure(err) {
  if (isTransientAuthFailure(err)) return false
  const status = err?.statusCode ?? err?.status ?? err?.response?.status
  return status === 401 || status === 403
}

export function getVerifiedUser() {
  return verifiedUserState().value
}

export function getVerifiedRole() {
  return verifiedUserState().value?.role || null
}

export function isVerifiedRole(role) {
  return getVerifiedRole() === role
}

/**
 * Compatível com código legado: truthy quando há sessão.
 * Não use o valor retornado em Authorization — use authFetchInit().
 */
export function getAuthToken() {
  const legacy = getLegacyAuthToken()
  if (legacy) return legacy
  return hasAuthSession() ? SESSION_SENTINEL : ''
}

function resolveBearerToken() {
  const legacy = getLegacyAuthToken()
  if (!legacy) return null
  // Sessão por cookie: JWT legado expirado no header impede o backend de usar cf_session
  if (typeof window !== 'undefined' && localStorage.getItem(USER_ID_KEY)) return null
  return legacy
}

function purgeLegacyRoleStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LEGACY_ROLE_KEY)
  try {
    sessionStorage.removeItem(LEGACY_ROLE_KEY)
  } catch {
    /* ignore */
  }
}

export { purgeLegacyRoleStorage }

function setVerifiedUser(user) {
  verifiedUserState().value = user
  verifiedAtState().value = Date.now()
  persistDisplayMeta(user)
}

export function clearAuthSessionMeta() {
  if (typeof window === 'undefined') return
  bumpVerifyGeneration()
  clearFreshLogin()
  verifiedUserState().value = null
  verifiedAtState().value = 0
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(SESSION_HINT_KEY)
  localStorage.removeItem('user_name')
  localStorage.removeItem('user_avatar')
  localStorage.removeItem('user_created_at')
  purgeLegacyRoleStorage()
  try {
    sessionStorage.removeItem('auth_token_backup')
  } catch {
    /* ignore */
  }
}

/** Metadados de UI — nunca inclui role (role só via servidor). */
export function persistDisplayMeta(user) {
  if (typeof window === 'undefined' || !user) return
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  purgeLegacyRoleStorage()
  if (user.id) localStorage.setItem(USER_ID_KEY, user.id)
  markAuthSessionHint()
  if (user.name) localStorage.setItem('user_name', user.name)
  if (user.avatar) localStorage.setItem('user_avatar', user.avatar)
  if (user.createdAt) localStorage.setItem('user_created_at', user.createdAt)
}

/** Aplica usuário retornado pelo backend (login, /me, refresh). */
export function applyVerifiedSessionUser(user) {
  if (!user?.id || !user?.role) return null
  bumpVerifyGeneration()
  setVerifiedUser(user)
  markFreshLogin(user)
  return user
}

/** @deprecated use persistDisplayMeta / applyVerifiedSessionUser */
export function persistAuthSessionMeta(user) {
  return applyVerifiedSessionUser(user)
}

/**
 * Valida sessão no backend e opcionalmente exige role.
 * @param {{ requiredRole?: string|null, force?: boolean }} [options]
 */
export async function verifyAuthSession(options = {}) {
  const { requiredRole = null, force = false } = options
  if (import.meta.server) return null

  const verifiedUser = verifiedUserState()
  const verifiedAt = verifiedAtState()

  if (!force && verifiedUser.value?.id && Date.now() - verifiedAt.value < VERIFY_TTL_MS) {
    if (requiredRole && verifiedUser.value.role !== requiredRole) return null
    return verifiedUser.value
  }

  if (!hasAuthSession() && !getLegacyAuthToken()) {
    clearAuthSessionMeta()
    return null
  }

  const run = async () => {
    const genAtStart = getVerifyGeneration()
    const config = useRuntimeConfig()
    try {
      const user = await $fetch(`${config.public.apiBase}/auth/me`, authFetchInit())
      if (genAtStart !== getVerifyGeneration()) {
        return verifiedUserState().value
      }
      if (!user?.id || !user?.role) {
        clearAuthSessionMeta()
        return null
      }
      setVerifiedUser(user)
      clearFreshLogin()
      if (requiredRole && user.role !== requiredRole) return null
      return user
    } catch (err) {
      if (genAtStart !== getVerifyGeneration()) {
        return verifiedUserState().value
      }
      if (!isDefinitiveAuthFailure(err)) {
        return verifiedUserState().value
      }
      clearAuthSessionMeta()
      return null
    }
  }

  if (!verifyInFlight) {
    verifyInFlight = run().finally(() => {
      verifyInFlight = null
    })
  }

  const user = await verifyInFlight
  if (!user) return null
  if (requiredRole && user.role !== requiredRole) return null
  return user
}

export function authHeaders(extraHeaders = {}) {
  const headers = mergeHeaders(extraHeaders)
  const bearer = resolveBearerToken()
  if (bearer && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bearer}`)
  }
  return headers
}

export function authFetchInit(init = {}) {
  const headers = authHeaders(init.headers || {})
  return {
    ...init,
    credentials: 'include',
    headers,
  }
}

export function attachAuthToFetchOptions(options = {}) {
  options.credentials = 'include'
  options.headers = authHeaders(options.headers || {})
  return options
}

export function resolveRequestUrl(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (typeof input?.url === 'string') return input.url
  return String(input || '')
}

export function isSameOriginApiRequest(url, apiBase = '') {
  const value = String(url || '')
  if (!value) return false
  if (value.startsWith('/api/') || value === '/api') return true

  const normalizedBase = String(apiBase || '').replace(/\/+$/, '')
  if (normalizedBase && value.startsWith(`${normalizedBase}/`)) return true
  if (normalizedBase && value.startsWith(`${normalizedBase}?`)) return true

  const prodBase = String(PROD_API_BASE || '').replace(/\/+$/, '')
  if (prodBase && value.startsWith(`${prodBase}/`)) return true

  if (typeof window !== 'undefined') {
    if (value.startsWith(`${window.location.origin}/api/`)) return true
    try {
      const parsed = new URL(value, window.location.origin)
      if (parsed.pathname.startsWith('/api/')) return true
    } catch {
      /* ignore */
    }
  }

  return false
}

export async function logoutAuthSession(apiBase) {
  clearAuthSessionMeta()
  if (!apiBase || typeof window === 'undefined') return
  try {
    await fetch(`${String(apiBase).replace(/\/+$/, '')}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    /* cookie será limpo no próximo login ou expirará */
  }
}

export function useAuthSession() {
  const verifiedUser = verifiedUserState()
  const verifiedRole = computed(() => verifiedUser.value?.role || null)

  return {
    verifiedUser,
    verifiedRole,
    getAuthToken,
    getLegacyAuthToken,
    getVerifiedUser,
    getVerifiedRole,
    isVerifiedRole,
    hasAuthSession,
    markAuthSessionHint,
    isTransientAuthFailure,
    isDefinitiveAuthFailure,
    clearAuthSessionMeta,
    persistDisplayMeta,
    persistAuthSessionMeta,
    applyVerifiedSessionUser,
    verifyAuthSession,
    markFreshLogin,
    readFreshLogin,
    clearFreshLogin,
    authHeaders,
    authFetchInit,
    attachAuthToFetchOptions,
    logoutAuthSession,
  }
}
