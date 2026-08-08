/**
 * SSE da UAZAPI (via proxy autenticado) — mensagens em tempo real no painel.
 *
 * Saúde do transporte: conexão aberta NÃO basta — o backend manda heartbeat
 * a cada ~15s; sem bytes por SSE_STALE_MS o stream é considerado morto,
 * derrubado e reconectado.
 */
import { getWhatsappApiBase, whatsappHasAuth, whatsappFetchInit, ensureWhatsappProviderKind, isWhatsappWuzapiProvider } from './api'
import { dispatchWhatsappRealtime } from './realtime-bus'

const SSE_STALE_MS = 45_000
const SSE_WATCHDOG_INTERVAL_MS = 10_000

let sseAbortController: AbortController | null = null
let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null
let sseWatchdogTimer: ReturnType<typeof setInterval> | null = null
let sseRunning = false
let sseConnectionRefs = 0
let lastSseActivityAt = 0
let hadSseSessionBefore = false
let sseConnectedState = false

type SseStateListener = (connected: boolean) => void
const sseStateListeners = new Set<SseStateListener>()

function setSseConnected(v: boolean) {
  sseConnectedState = v
  sseStateListeners.forEach((fn) => fn(v))
}

export function subscribeSseState(fn: SseStateListener): () => void {
  sseStateListeners.add(fn)
  return () => sseStateListeners.delete(fn)
}

export function isSseConnected(): boolean {
  if (!sseConnectedState) return false
  return Date.now() - lastSseActivityAt <= SSE_STALE_MS
}

// ─── Payload parsing ──────────────────────────────────────────────────────────

type SseRow = Record<string, unknown>

const looksLikeUazapiMessageRow = (row: unknown): boolean => Boolean(
  row && typeof row === 'object' && !Array.isArray(row) &&
  ((row as SseRow).messageid || (row as SseRow).messageType ||
   (((row as SseRow).id || (row as SseRow).chatid) && ((row as SseRow).text || (row as SseRow).body || (row as SseRow).mediaType)))
)

const looksLikeUazapiChatRow = (row: unknown): boolean => Boolean(
  row && typeof row === 'object' && !Array.isArray(row) &&
  ((row as SseRow).wa_chatid || (row as SseRow).wa_lastMsgTimestamp !== undefined || (row as SseRow).wa_unreadCount !== undefined)
)

function parseSsePayload(raw: string): Record<string, unknown> | null {
  try {
    const body = JSON.parse(raw) as SseRow
    const data = body?.data && typeof body.data === 'object' ? body.data as SseRow : body
    const eventTypeRaw = String(body?.event || body?.EventType || body?.type || 'messages').trim().toLowerCase()
    let chat = body?.chat && typeof body.chat === 'object' ? body.chat as SseRow
      : (data?.chat && typeof data.chat === 'object' ? data.chat as SseRow : undefined)
    let message = body?.message && typeof body.message === 'object' ? body.message as SseRow
      : (data?.message && typeof data.message === 'object' ? data.message as SseRow : undefined)

    if (!message && eventTypeRaw.includes('message') && !eventTypeRaw.includes('update') && looksLikeUazapiMessageRow(data)) {
      message = data
    }
    if (!chat && eventTypeRaw.startsWith('chat') && looksLikeUazapiChatRow(data)) {
      chat = data
    }

    const chatJid = String(
      data?.chatid ?? data?.chatId ?? data?.wa_chatid ?? data?.remoteJid ?? data?.from ??
      (chat as SseRow | undefined)?.wa_chatid ?? (chat as SseRow | undefined)?.chatid ??
      (message as SseRow | undefined)?.chatid ?? (message as SseRow | undefined)?.wa_chatid ??
      data?.id ?? (data?.key as SseRow | undefined)?.remoteJid ?? ''
    ).trim()

    return {
      eventType: eventTypeRaw,
      chatJid: chatJid || null,
      chat,
      message,
      data: body?.data && typeof body.data === 'object' ? body.data : data,
      at: Date.now(),
    }
  } catch {
    return null
  }
}

function shouldHandleSseEvent(eventType: string): boolean {
  if (!eventType || eventType === 'ping' || eventType === 'heartbeat') return false
  if (eventType.includes('message')) return true
  if (eventType.includes('chat')) return true
  if (eventType.includes('history')) return true
  if (eventType.includes('presence')) return true
  if (eventType === 'connection') return true
  return false
}

// ─── Stream consumer ──────────────────────────────────────────────────────────

async function consumeSseStream(response: Response): Promise<void> {
  const reader = response.body?.getReader?.()
  if (!reader) throw new Error('SSE sem body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (sseRunning) {
    const { done, value } = await reader.read()
    if (done) break
    lastSseActivityAt = Date.now()
    if (!sseConnectedState) setSseConnected(true)
    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const chunk = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      const dataLine = chunk
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'))
      if (!dataLine) continue

      const raw = dataLine.slice(5).trim()
      if (!raw || raw === '[DONE]') continue

      const payload = parseSsePayload(raw)
      if (payload && shouldHandleSseEvent(String(payload.eventType || ''))) {
        dispatchWhatsappRealtime(payload)
      }
    }
  }
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

function startSseWatchdog(): void {
  if (sseWatchdogTimer) return
  sseWatchdogTimer = setInterval(() => {
    if (!sseRunning || !sseConnectedState) return
    if (Date.now() - lastSseActivityAt <= SSE_STALE_MS) return
    console.warn('[WhatsApp SSE] Stream sem atividade, reconectando…')
    setSseConnected(false)
    sseAbortController?.abort()
  }, SSE_WATCHDOG_INTERVAL_MS)
}

function stopSseWatchdog(): void {
  if (sseWatchdogTimer) {
    clearInterval(sseWatchdogTimer)
    sseWatchdogTimer = null
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

function scheduleReconnect(run: () => void): void {
  if (!sseRunning) return
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer)
  sseReconnectTimer = setTimeout(run, 1200)
}

function startSseLoop(): void {
  if (typeof window === 'undefined') return
  if (sseRunning) return
  sseRunning = true
  startSseWatchdog()

  const run = async (): Promise<void> => {
    if (!sseRunning) return

    // SSE é exclusivo da UAZAPI. No WuzAPI o tempo real vem por webhook + Pusher.
    await ensureWhatsappProviderKind()
    if (isWhatsappWuzapiProvider()) {
      sseRunning = false
      setSseConnected(false)
      stopSseWatchdog()
      return
    }

    const base = getWhatsappApiBase()
    if (!base || !whatsappHasAuth()) {
      scheduleReconnect(run)
      return
    }

    sseAbortController = new AbortController()
    const wasReconnect = hadSseSessionBefore

    const localController = sseAbortController
    const connectTimer = setTimeout(() => {
      if (!sseConnectedState) localController.abort()
    }, 20_000)

    try {
      const response = await fetch(`${base}/sse`, whatsappFetchInit({
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: sseAbortController.signal,
      }))
      clearTimeout(connectTimer)

      // Endpoint inexistente / não suportado — não spammar reconexão
      if (response.status === 404 || response.status === 501) {
        console.warn(`[WhatsApp SSE] Desabilitado (HTTP ${response.status})`)
        sseRunning = false
        setSseConnected(false)
        stopSseWatchdog()
        return
      }

      if (!response.ok || !response.body) throw new Error(`SSE ${response.status}`)

      lastSseActivityAt = Date.now()
      setSseConnected(true)
      hadSseSessionBefore = true

      if (wasReconnect) {
        dispatchWhatsappRealtime({ eventType: 'sse.reconnected', at: Date.now() })
      }

      await consumeSseStream(response)
    } catch (error) {
      if (!sseRunning) return
      if (!sseAbortController?.signal.aborted) {
        console.warn('[WhatsApp SSE] Reconectando…', (error as Error)?.message || error)
      }
    } finally {
      clearTimeout(connectTimer)
      setSseConnected(false)
      sseAbortController = null
    }

    scheduleReconnect(run)
  }

  run()
}

export function connectWhatsappSse(): void {
  sseConnectionRefs += 1
  startSseLoop()
}

export function disconnectWhatsappSse(): void {
  sseConnectionRefs = Math.max(0, sseConnectionRefs - 1)
  if (sseConnectionRefs > 0) return

  sseRunning = false
  setSseConnected(false)
  stopSseWatchdog()
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer)
    sseReconnectTimer = null
  }
  sseAbortController?.abort()
  sseAbortController = null
}
