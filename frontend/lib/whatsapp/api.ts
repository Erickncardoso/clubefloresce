import { getCachedUser, verifyAuthSession } from '@/lib/auth'

const DEV_WHATSAPP_API_FALLBACK = '/api/whatsapp'

export function getWhatsappApiBase(): string {
  const configured = String(process.env.NEXT_PUBLIC_WHATSAPP_API_BASE || '')
    .trim()
    .replace(/\/+$/, '')
  if (configured) return configured
  return DEV_WHATSAPP_API_FALLBACK
}

export function getProxyBase(): string {
  return `${getWhatsappApiBase()}/proxy`
}

export function getContactStatesBase(): string {
  return `${getWhatsappApiBase()}/contact-states`
}

export function getContactDirectoryApi(): string {
  return `${getWhatsappApiBase()}/contact-directory`
}

/** Hint rápido — cookie httpOnly é a fonte real. */
export function whatsappHasAuth(): boolean {
  if (getCachedUser()) return true
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('cf_session_active') === '1'
  } catch {
    return false
  }
}

export function whatsappFetchInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers || {})
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !headers.has('Content-Type') && !isFormData && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  return {
    ...init,
    headers,
    credentials: 'include',
  }
}

export async function parseJsonBodySafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function whatsappFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getWhatsappApiBase()
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, whatsappFetchInit(init))
  const data = await parseJsonBodySafe(res)
  if (!res.ok) {
    const message =
      (data as { error?: string; message?: string } | null)?.error ||
      (data as { message?: string } | null)?.message ||
      `Erro HTTP ${res.status}`
    throw new Error(message)
  }
  return data as T
}

export async function whatsappProxyFetch<T = unknown>(
  proxyPath: string,
  init: RequestInit = {},
): Promise<T> {
  const path = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`
  return whatsappFetch<T>(`/proxy${path}`, init)
}

let whatsappProviderKind = ''

export function setWhatsappProviderKind(kind = '') {
  whatsappProviderKind = String(kind || '').trim().toLowerCase()
}

export function isWhatsappWuzapiProvider() {
  return whatsappProviderKind === 'wuzapi'
}

/** Carrega provider uma vez — WuzAPI usa Pusher/polling, não SSE UAZAPI. */
export async function ensureWhatsappProviderKind(): Promise<string> {
  if (whatsappProviderKind) return whatsappProviderKind
  const base = getWhatsappApiBase()
  if (!base) return ''
  try {
    const res = await fetch(`${base}/provider`, whatsappFetchInit())
    if (!res.ok) return ''
    const data = (await parseJsonBodySafe(res)) as { provider?: string } | null
    whatsappProviderKind = String(data?.provider || '').trim().toLowerCase()
  } catch {
    /* ignore */
  }
  return whatsappProviderKind
}

export function isWhatsappConnectedFromStatusPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const payload = data as Record<string, unknown>

  if (payload.connectionStatus) {
    const normalized = String(payload.connectionStatus).toLowerCase()
    return normalized === 'connected' || normalized === 'open' || normalized === 'online'
  }

  const inst = (payload.instance as Record<string, unknown> | null) || null

  const resolveStatus = (value: unknown): string => {
    if (!value) return ''
    if (typeof value === 'object' && value) {
      const obj = value as Record<string, unknown>
      if (obj.connected === true || obj.loggedIn === true) return 'connected'
      if (obj.connecting === true) return 'connecting'
      return 'disconnected'
    }
    return String(value).toLowerCase()
  }

  const rawStatus =
    inst?.connectionStatus ||
    inst?.status ||
    (inst?.instance as Record<string, unknown> | undefined)?.status ||
    inst?.state ||
    (payload.status as Record<string, unknown> | undefined)?.status ||
    ''
  const normalizedStatus = resolveStatus(rawStatus)
  const isExplicitlyDisconnected = normalizedStatus === 'disconnected'

  const statusObj = payload.status as Record<string, unknown> | undefined
  const statusInner =
    (statusObj?.instance as Record<string, unknown> | undefined) || statusObj || {}
  const hasProviderJid = Boolean(
    statusObj?.jid ||
      statusInner?.jid ||
      inst?.jid ||
      (inst?.connection as Record<string, unknown> | undefined)?.jid,
  )
  const isLoggedIn =
    statusObj?.loggedIn === true ||
    statusInner?.loggedIn === true ||
    inst?.loggedIn === true ||
    (inst?.connection as Record<string, unknown> | undefined)?.loggedIn === true

  const isConnectedByStatus =
    normalizedStatus === 'connected' ||
    normalizedStatus === 'open' ||
    normalizedStatus === 'online'

  return (
    !isExplicitlyDisconnected &&
    (isConnectedByStatus ||
      statusObj?.connected === true ||
      statusInner?.connected === true ||
      isLoggedIn ||
      hasProviderJid ||
      inst?.connected === true)
  )
}

export function isWhatsappExplicitlyDisconnected(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const payload = data as Record<string, unknown>
  if (payload.connectionStatus) {
    const normalized = String(payload.connectionStatus).toLowerCase()
    return normalized === 'disconnected' || normalized === 'close' || normalized === 'closed'
  }
  const inst = (payload.instance as Record<string, unknown> | null) || null
  const rawStatus = inst?.connectionStatus || inst?.status || (payload.status as Record<string, unknown>)?.status || ''
  const normalized =
    typeof rawStatus === 'object' && rawStatus
      ? (rawStatus as { connected?: boolean; loggedIn?: boolean }).connected === false &&
        (rawStatus as { loggedIn?: boolean }).loggedIn === false
        ? 'disconnected'
        : ''
      : String(rawStatus || '').toLowerCase()
  return normalized === 'disconnected'
}

export async function fetchWhatsappStatusPayload(): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const base = getWhatsappApiBase()
  if (!base) return { ok: false, data: {} }
  // Garante cache de sessão antes do hint rápido
  if (!whatsappHasAuth()) {
    await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' }).catch(() => null)
  }
  if (!whatsappHasAuth()) return { ok: false, data: {} }
  try {
    const res = await fetch(`${base}/status`, whatsappFetchInit())
    const data = await parseJsonBodySafe(res)
    return {
      ok: res.ok,
      data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
    }
  } catch {
    return { ok: false, data: {} }
  }
}

export async function fetchWhatsappSessionConnected(): Promise<boolean> {
  const { ok, data } = await fetchWhatsappStatusPayload()
  if (!ok) return false
  return isWhatsappConnectedFromStatusPayload(data)
}

function pickSessionJidFromValue(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'object' && value) {
    const obj = value as Record<string, unknown>
    const user = String(obj.user || obj.User || '').trim()
    if (!user) return ''
    const server = String(obj.server || obj.Server || 's.whatsapp.net').trim() || 's.whatsapp.net'
    // normalize via utils would create circular risk — simple form
    return `${user}@${server}`.toLowerCase()
  }
  return String(value).trim().toLowerCase()
}

/** JID da sessão conectada a partir do payload de /status. */
export function resolveConnectedSessionJidFromStatus(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const payload = data as Record<string, unknown>
  const status = payload.status as Record<string, unknown> | undefined
  const inst = payload.instance as Record<string, unknown> | undefined
  return (
    pickSessionJidFromValue(payload.jid) ||
    pickSessionJidFromValue(payload.sessionJid) ||
    pickSessionJidFromValue(status?.jid) ||
    pickSessionJidFromValue(status?.JID) ||
    pickSessionJidFromValue((status?.instance as Record<string, unknown> | undefined)?.jid) ||
    pickSessionJidFromValue(inst?.jid) ||
    pickSessionJidFromValue((inst?.instance as Record<string, unknown> | undefined)?.jid) ||
    ''
  )
}

export const CHATS_POLL_INTERVAL_MS = 8000
export const MESSAGES_POLL_INTERVAL_MS = 4000
export const CHATS_POLL_REALTIME_SAFE_MS = 30000
export const MESSAGES_POLL_REALTIME_SAFE_MS = 15000
export const CONTACTS_SYNC_MIN_INTERVAL_MS = 60000
export const UNKNOWN_SENDER_ENRICH_POLL_MIN_MS = 35000
