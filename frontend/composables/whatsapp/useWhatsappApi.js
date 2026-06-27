/**
 * useWhatsappApi
 * Configuração de base URL, token de autenticação e utilitários de API compartilhados.
 * Inclui fetchChatDetailsSafe com cache e deduplicação de inflight.
 */
import { chatDetailsCache, chatDetailsInflight } from './useWhatsappState.js'
import { parseJsonBodySafe } from './useWhatsappUtils.js'

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
const getBase = () => {
  if (_cachedBase !== null) return _cachedBase
  _cachedBase = _getConfig().base
  return _cachedBase
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

/** GET `/status` — retorna false se não autenticado, resposta não-OK ou payload desconectado. */
export const fetchWhatsappSessionConnected = async () => {
  const base = getWhatsappApiBase()
  if (!base) return false
  const token = getAuthToken()
  if (!token) return false
  try {
    const res = await fetch(`${base}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
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

export const getAuthToken = () =>
  typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || '') : ''

// ─── Polling intervals ────────────────────────────────────────────────────────
export const CHATS_POLL_INTERVAL_MS = 5000
export const MESSAGES_POLL_INTERVAL_MS = 2000
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
      const res = await fetch(`${apiBase}/chat/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ number: key, preview, force }),
        signal: controller?.signal
      })
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
