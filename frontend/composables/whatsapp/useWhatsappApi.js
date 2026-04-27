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
  const inst = data.instance || null
  const rawStatus = (
    inst?.status ||
    inst?.instance?.status ||
    inst?.connectionStatus ||
    inst?.instance?.connectionStatus ||
    inst?.state ||
    inst?.instance?.state ||
    data.status?.status ||
    data.status?.connectionStatus ||
    data.status?.state ||
    ''
  )
  const normalizedStatus = String(rawStatus).toLowerCase()
  const isExplicitlyDisconnected = normalizedStatus === 'disconnected'

  const statusInner = data.status?.instance || data.status || {}
  const hasProviderJid = Boolean(
    data.status?.jid || statusInner?.jid || inst?.instance?.jid || inst?.jid
  )
  const isLoggedIn =
    data.status?.loggedIn === true ||
    statusInner?.loggedIn === true ||
    inst?.instance?.loggedIn === true ||
    inst?.loggedIn === true

  const isConnectedByStatus =
    normalizedStatus === 'connected' ||
    normalizedStatus === 'open' ||
    normalizedStatus === 'online'

  const anyInstanceConnected = Array.isArray(data.allInstances) && data.allInstances.some(
    (i) => i.status === 'connected' || i.status === 'open' || i.status === 'online' ||
           i.connected === true || i.loggedIn === true
  )

  return !isExplicitlyDisconnected && (
    isConnectedByStatus ||
    data.status?.connected === true ||
    statusInner?.connected === true ||
    isLoggedIn ||
    data.status?.statusCode === 200 ||
    hasProviderJid ||
    inst?.connected === true ||
    inst?.instance?.connected === true ||
    anyInstanceConnected
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
export const CHATS_POLL_INTERVAL_MS = 6000
export const MESSAGES_POLL_INTERVAL_MS = 4000
export const CONTACTS_SYNC_MIN_INTERVAL_MS = 60000
export const UNKNOWN_SENDER_ENRICH_POLL_MIN_MS = 35000

// ─── fetchChatDetailsSafe ─────────────────────────────────────────────────────

export const fetchChatDetailsSafe = async (number, options = {}) => {
  const { preview = true, timeoutMs = 6000, cacheTtlMs = 120000 } = options
  const key = String(number || '').trim()
  if (!key) return null

  const cached = chatDetailsCache.value[key]
  if (cached && (Date.now() - cached.at) < cacheTtlMs) return cached.data

  if (chatDetailsInflight.value[key]) return chatDetailsInflight.value[key]

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  const proxyBase = getProxyBase()

  const request = (async () => {
    try {
      const res = await fetch(`${proxyBase}/chat/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ number: key, preview }),
        signal: controller?.signal
      })
      const data = await parseJsonBodySafe(res)
      if (!res.ok) return null
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
