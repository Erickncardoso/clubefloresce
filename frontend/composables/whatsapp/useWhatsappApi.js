/**
 * useWhatsappApi
 * Configuração de base URL, token de autenticação e utilitários de API compartilhados.
 * Inclui fetchChatDetailsSafe com cache e deduplicação de inflight.
 */
import { chatDetailsCache, chatDetailsInflight } from './useWhatsappState.js'
import { normalizeJid, parseJsonBodySafe } from './useWhatsappUtils.js'
import {
  authFetchInit,
  authHeaders,
  getAuthToken,
  hasAuthSession,
} from '~/composables/useAuthSession.js'

export { getAuthToken }

/** Sessão válida para chamadas WhatsApp (cookie httpOnly). */
export function whatsappHasAuth() {
  return hasAuthSession()
}

/** Opções de fetch autenticadas — nunca use Bearer com getAuthToken(). */
export function whatsappFetchInit(init = {}) {
  return authFetchInit(init)
}

export function whatsappJsonHeaders(extra = {}) {
  const headers = authHeaders({ 'Content-Type': 'application/json', ...extra })
  const out = {}
  headers.forEach((value, key) => { out[key] = value })
  return out
}

export function whatsappAuthHeaders(extra = {}) {
  const headers = authHeaders(extra)
  const out = {}
  headers.forEach((value, key) => { out[key] = value })
  return out
}

// ─── Configuração de API ──────────────────────────────────────────────────────

const _getConfig = () => {
  if (typeof useRuntimeConfig !== 'undefined') {
    try {
      const config = useRuntimeConfig()
      const base = String(config?.public?.whatsappApiBase || '').replace(/\/+$/, '')
      return { base }
    } catch { }
  }
  return { base: '' }
}

let _cachedBase = null
const DEV_WHATSAPP_API_FALLBACK = '/api/whatsapp'

const getBase = () => {
  const configured = _getConfig().base
  if (configured) {
    _cachedBase = configured
    return configured
  }
  if (_cachedBase) return _cachedBase
  if (typeof window !== 'undefined') return DEV_WHATSAPP_API_FALLBACK
  return ''
}

/** Base HTTP da API WhatsApp (ex.: `.../api/whatsapp`), sem barra final. */
export const getWhatsappApiBase = () => getBase()

/**
 * Mesma regra de `conexao.vue` / `fetchStatus`: considera sessão utilizável para chat
 * apenas quando há indícios claros de conexão e o status não é explicitamente `disconnected`.
 */
export const isWhatsappConnectedFromStatusPayload = (data) => {
  if (!data || typeof data !== 'object') return false

  if (data.connectionStatus) {
    const normalized = String(data.connectionStatus).toLowerCase()
    return normalized === 'connected' || normalized === 'open' || normalized === 'online'
  }

  const inst = data.instance || null

  const resolveStatus = (value) => {
    if (!value) return ''
    if (typeof value === 'object') {
      if (value.connected === true || value.loggedIn === true) return 'connected'
      if (value.connecting === true) return 'connecting'
      return 'disconnected'
    }
    return String(value).toLowerCase()
  }

  const rawStatus = (
    inst?.connectionStatus ||
    inst?.status ||
    inst?.instance?.status ||
    inst?.state ||
    data.status?.status ||
    ''
  )
  const normalizedStatus = resolveStatus(rawStatus)
  const isExplicitlyDisconnected = normalizedStatus === 'disconnected'

  const statusInner = data.status?.instance || data.status || {}
  const hasProviderJid = Boolean(
    data.status?.jid ||
    statusInner?.jid ||
    inst?.jid ||
    inst?.connection?.jid
  )
  const isLoggedIn =
    data.status?.loggedIn === true ||
    statusInner?.loggedIn === true ||
    inst?.loggedIn === true ||
    inst?.connection?.loggedIn === true

  const isConnectedByStatus =
    normalizedStatus === 'connected' ||
    normalizedStatus === 'open' ||
    normalizedStatus === 'online'

  return !isExplicitlyDisconnected && (
    isConnectedByStatus ||
    data.status?.connected === true ||
    statusInner?.connected === true ||
    isLoggedIn ||
    hasProviderJid ||
    inst?.connected === true
  )
}

export const isWhatsappExplicitlyDisconnected = (data) => {
  if (!data || typeof data !== 'object') return false
  if (data.connectionStatus) {
    const normalized = String(data.connectionStatus).toLowerCase()
    return normalized === 'disconnected' || normalized === 'close' || normalized === 'closed'
  }
  const inst = data.instance || null
  const rawStatus = inst?.connectionStatus || inst?.status || data.status?.status || ''
  const normalized = typeof rawStatus === 'object'
    ? (rawStatus.connected === false && rawStatus.loggedIn === false ? 'disconnected' : '')
    : String(rawStatus || '').toLowerCase()
  return normalized === 'disconnected'
}

/** GET `/status` parseado — `{ ok, data }`. */
export const fetchWhatsappStatusPayload = async () => {
  const base = getWhatsappApiBase()
  if (!base || !hasAuthSession()) return { ok: false, data: {} }
  try {
    const res = await fetch(`${base}/status`, authFetchInit())
    const data = await parseJsonBodySafe(res)
    return { ok: res.ok, data: data && typeof data === 'object' ? data : {} }
  } catch {
    return { ok: false, data: {} }
  }
}

const pickSessionJidFromValue = (value) => {
  if (!value) return ''
  if (typeof value === 'object') {
    const user = String(value.user || value.User || '').trim()
    if (!user) return ''
    const server = String(value.server || value.Server || 's.whatsapp.net').trim() || 's.whatsapp.net'
    return normalizeJid(`${user}@${server}`)
  }
  return normalizeJid(String(value))
}

/** JID da sessão conectada — normalizado (sem sufixo multi-device `:NN`). */
export const resolveConnectedSessionJidFromStatus = (data) => {
  if (!data || typeof data !== 'object') return ''
  return (
    pickSessionJidFromValue(data.status?.jid) ||
    pickSessionJidFromValue(data.status?.instance?.jid) ||
    pickSessionJidFromValue(data.instance?.jid) ||
    pickSessionJidFromValue(data.instance?.instance?.jid) ||
    pickSessionJidFromValue(
      data.instance?.owner ? `${String(data.instance.owner).replace(/\D/g, '')}@s.whatsapp.net` : '',
    )
  )
}

/** GET `/status` — retorna false se não autenticado, resposta não-OK ou payload desconectado. */
export const fetchWhatsappSessionConnected = async () => {
  const base = getWhatsappApiBase()
  if (!base) return false
  if (!hasAuthSession()) return false
  try {
    const res = await fetch(`${base}/status`, authFetchInit())
    const data = await parseJsonBodySafe(res)
    if (!res.ok) return false
    return isWhatsappConnectedFromStatusPayload(data)
  } catch {
    return false
  }
}

export const PROXY_BASE = new Proxy({}, {
  get: (_, prop) => prop === 'toString' || prop === Symbol.toPrimitive
    ? () => `${getBase()}/proxy`
    : `${getBase()}/proxy`
})

export const getProxyBase = () => `${getBase()}/proxy`
export const getContactStatesBase = () => `${getBase()}/contact-states`
export const getContactDirectoryApi = () => `${getBase()}/contact-directory`

// ─── Polling intervals ────────────────────────────────────────────────────────
export const CHATS_POLL_INTERVAL_MS = 8000
export const MESSAGES_POLL_INTERVAL_MS = 4000
export const CONTACTS_SYNC_MIN_INTERVAL_MS = 60000
export const UNKNOWN_SENDER_ENRICH_POLL_MIN_MS = 35000

// ─── fetchChatDetailsSafe ─────────────────────────────────────────────────────

export const fetchChatDetailsSafe = async (number, options = {}) => {
  const { preview = true, timeoutMs = 6000, cacheTtlMs = 120000, force = false } = options
  const key = String(number || '').trim()
  if (!key) return null

  if (!force) {
    const cached = chatDetailsCache.value[key]
    if (cached && (Date.now() - cached.at) < cacheTtlMs) return cached.data

    if (chatDetailsInflight.value[key]) return chatDetailsInflight.value[key]
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  const apiBase = getWhatsappApiBase()

  const request = (async () => {
    try {
      const res = await fetch(`${apiBase}/chat/details`, authFetchInit({
        method: 'POST',
        body: JSON.stringify({ number: key, preview, force }),
        signal: controller?.signal,
        headers: { 'Content-Type': 'application/json' },
      }))
      const body = await parseJsonBodySafe(res)
      if (!res.ok) return null
      const data = body?.details && typeof body.details === 'object' ? body.details : body
      chatDetailsCache.value = { ...chatDetailsCache.value, [key]: { at: Date.now(), data } }
      return data
    } catch {
      return null
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      const next = { ...chatDetailsInflight.value }
      delete next[key]
      chatDetailsInflight.value = next
    }
  })()

  chatDetailsInflight.value = { ...chatDetailsInflight.value, [key]: request }
  return request
}

export function useWhatsappApi() {
  return {
    getProxyBase, getWhatsappApiBase, getContactStatesBase, getContactDirectoryApi, getAuthToken,
    fetchChatDetailsSafe, fetchWhatsappSessionConnected, isWhatsappConnectedFromStatusPayload,
    CHATS_POLL_INTERVAL_MS, MESSAGES_POLL_INTERVAL_MS,
    CONTACTS_SYNC_MIN_INTERVAL_MS, UNKNOWN_SENDER_ENRICH_POLL_MIN_MS
  }
}
