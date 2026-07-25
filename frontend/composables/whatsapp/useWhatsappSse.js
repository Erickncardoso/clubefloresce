/**
 * SSE da UAZAPI (via proxy autenticado) — mensagens em tempo real no painel.
 *
 * Saúde do transporte: conexão aberta NÃO basta — o backend manda heartbeat
 * a cada ~15s; sem bytes por SSE_STALE_MS o stream é considerado morto,
 * derrubado e reconectado (e o polling rápido reassume via isWhatsappSseConnected).
 */
import { ref, readonly } from 'vue'
import { getWhatsappApiBase, whatsappHasAuth } from './useWhatsappApi.js'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { dispatchWhatsappRealtime } from './whatsapp-realtime-bus.js'

/** 3 heartbeats de 15s perdidos → stream considerado mudo. */
const SSE_STALE_MS = 45_000
const SSE_WATCHDOG_INTERVAL_MS = 10_000

let sseAbortController = null
let sseReconnectTimer = null
let sseWatchdogTimer = null
let sseRunning = false
let sseConnectionRefs = 0
let lastSseActivityAt = 0
let hadSseSessionBefore = false
const sseConnected = ref(false)

function getApiBase() {
  return getWhatsappApiBase()
}

const looksLikeUazapiMessageRow = (row) => Boolean(
  row && typeof row === 'object' && !Array.isArray(row) &&
  (row.messageid || row.key?.id || row.messageType || ((row.id || row.chatid) && (row.text || row.body || row.mediaType)))
)

const looksLikeUazapiChatRow = (row) => Boolean(
  row && typeof row === 'object' && !Array.isArray(row) &&
  (row.wa_chatid || row.wa_lastMsgTimestamp !== undefined || row.wa_unreadCount !== undefined)
)

function parseSsePayload(raw) {
  try {
    const body = JSON.parse(raw)
    const data = body?.data && typeof body.data === 'object' ? body.data : body
    const eventTypeRaw = String(body?.event || body?.EventType || body?.type || 'messages').trim().toLowerCase()
    let chat = body?.chat && typeof body.chat === 'object'
      ? body.chat
      : (data?.chat && typeof data.chat === 'object' ? data.chat : undefined)
    let message = body?.message && typeof body.message === 'object'
      ? body.message
      : (data?.message && typeof data.message === 'object' ? data.message : undefined)

    // Formato UAZAPI {event, instance, data}: `data` É a entidade do evento.
    if (!message && eventTypeRaw.includes('message') && !eventTypeRaw.includes('update') && looksLikeUazapiMessageRow(data)) {
      message = data
    }
    if (!chat && eventTypeRaw.startsWith('chat') && looksLikeUazapiChatRow(data)) {
      chat = data
    }
    const chatJid = String(
      data?.chatid
      || data?.chatId
      || data?.wa_chatid
      || data?.remoteJid
      || data?.from
      || chat?.wa_chatid
      || chat?.chatid
      || chat?.chatJid
      || message?.chatid
      || message?.chatJid
      || message?.wa_chatid
      || data?.id
      || data?.key?.remoteJid
      || data?.message?.key?.remoteJid
      || '',
    ).trim()
    return {
      eventType: eventTypeRaw,
      chatJid: chatJid || null,
      chat,
      message,
      event: body?.event && typeof body.event === 'object' ? body.event : undefined,
      data: body?.data && typeof body.data === 'object' ? body.data : data,
      at: Date.now()
    }
  } catch {
    return null
  }
}

function shouldHandleSseEvent(eventType) {
  if (!eventType || eventType === 'ping' || eventType === 'heartbeat') return false
  if (eventType.includes('message')) return true
  if (eventType.includes('chat')) return true
  if (eventType.includes('history')) return true
  if (eventType.includes('presence')) return true
  if (eventType === 'connection') return true
  return false
}

async function consumeSseStream(response) {
  const reader = response.body?.getReader?.()
  if (!reader) throw new Error('SSE sem body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (sseRunning) {
    const { done, value } = await reader.read()
    if (done) break
    // Qualquer byte (inclusive heartbeat/comentário) conta como atividade.
    lastSseActivityAt = Date.now()
    if (!sseConnected.value) sseConnected.value = true
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
      if (payload && shouldHandleSseEvent(payload.eventType)) {
        dispatchWhatsappRealtime(payload)
      }
    }
  }
}

function startSseWatchdog() {
  if (sseWatchdogTimer) return
  sseWatchdogTimer = setInterval(() => {
    if (!sseRunning) return
    if (!sseConnected.value) return
    if (Date.now() - lastSseActivityAt <= SSE_STALE_MS) return
    // Stream aberto porém mudo: derruba para reconectar; polling reassume já.
    console.warn('[WhatsApp SSE] Stream sem atividade, reconectando…')
    sseConnected.value = false
    if (sseAbortController) sseAbortController.abort()
  }, SSE_WATCHDOG_INTERVAL_MS)
}

function stopSseWatchdog() {
  if (sseWatchdogTimer) {
    clearInterval(sseWatchdogTimer)
    sseWatchdogTimer = null
  }
}

function startSseLoop() {
  if (typeof window === 'undefined') return
  if (sseRunning) return
  sseRunning = true
  startSseWatchdog()

  const run = async () => {
    if (!sseRunning) return

    const base = getApiBase()
    if (!base || !whatsappHasAuth()) {
      scheduleReconnect(run)
      return
    }

    sseAbortController = new AbortController()
    const wasReconnect = hadSseSessionBefore

    // Sem resposta em 20s (UAZAPI/backend pendurado) → aborta e reconecta.
    // Sem isso, o fetch ficava pendente para sempre e o SSE nunca subia.
    const localController = sseAbortController
    const connectTimer = setTimeout(() => {
      if (!sseConnected.value) localController.abort()
    }, 20_000)

    try {
      const response = await fetch(`${base}/sse`, authFetchInit({
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        signal: sseAbortController.signal,
      }))
      clearTimeout(connectTimer)

      if (!response.ok || !response.body) {
        throw new Error(`SSE ${response.status}`)
      }

      lastSseActivityAt = Date.now()
      sseConnected.value = true
      hadSseSessionBefore = true
      if (wasReconnect) {
        // Reconectou após queda: pode ter perdido eventos — força resync HTTP.
        dispatchWhatsappRealtime({ eventType: 'sse.reconnected', at: Date.now() })
      }
      await consumeSseStream(response)
    } catch (error) {
      if (!sseRunning) return
      if (!sseAbortController?.signal.aborted) {
        console.warn('[WhatsApp SSE] Reconectando…', error?.message || error)
      }
    } finally {
      clearTimeout(connectTimer)
      sseConnected.value = false
      sseAbortController = null
    }

    scheduleReconnect(run)
  }

  run()
}

function scheduleReconnect(run) {
  if (!sseRunning) return
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer)
  sseReconnectTimer = setTimeout(run, 1200)
}

/** Incrementa referência e garante stream SSE ativo. */
export function connectWhatsappSse() {
  sseConnectionRefs += 1
  startSseLoop()
}

/** Decrementa referência; encerra stream quando ninguém consome. */
export function disconnectWhatsappSse() {
  sseConnectionRefs = Math.max(0, sseConnectionRefs - 1)
  if (sseConnectionRefs > 0) return

  sseRunning = false
  sseConnected.value = false
  stopSseWatchdog()
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer)
    sseReconnectTimer = null
  }
  if (sseAbortController) {
    sseAbortController.abort()
    sseAbortController = null
  }
}

/** Conectado E com atividade recente (heartbeat/eventos) — não só socket aberto. */
export function isWhatsappSseConnected() {
  if (!sseConnected.value) return false
  return Date.now() - lastSseActivityAt <= SSE_STALE_MS
}

export function useWhatsappSse() {
  return {
    sseConnected: readonly(sseConnected),
    connectWhatsappSse,
    disconnectWhatsappSse,
    isWhatsappSseConnected,
  }
}
