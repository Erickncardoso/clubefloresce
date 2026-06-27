/**
 * SSE da UAZAPI (via proxy autenticado) — mensagens em tempo real no painel.
 */
import { getAuthToken, getWhatsappApiBase } from './useWhatsappApi.js'

let sseAbortController = null
let sseReconnectTimer = null
let sseRunning = false

function getApiBase() {
  return getWhatsappApiBase()
}

function parseSsePayload(raw) {
  try {
    const body = JSON.parse(raw)
    const data = body?.data && typeof body.data === 'object' ? body.data : body
    const chat = body?.chat && typeof body.chat === 'object'
      ? body.chat
      : (data?.chat && typeof data.chat === 'object' ? data.chat : undefined)
    const message = body?.message && typeof body.message === 'object'
      ? body.message
      : (data?.message && typeof data.message === 'object' ? data.message : undefined)
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
    const eventType = String(body?.event || body?.EventType || body?.type || 'messages').trim().toLowerCase()
    return {
      eventType,
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
  if (eventType.includes('presence')) return true
  if (eventType === 'connection') return true
  return false
}

async function consumeSseStream(response, onEvent) {
  const reader = response.body?.getReader?.()
  if (!reader) throw new Error('SSE sem body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (sseRunning) {
    const { done, value } = await reader.read()
    if (done) break
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
      if (payload && shouldHandleSseEvent(payload.eventType) && onEvent) {
        onEvent(payload)
      }
    }
  }
}

/**
 * @param {(payload: Record<string, unknown>) => void} onEvent
 */
export function connectWhatsappSse(onEvent) {
  if (typeof window === 'undefined') return
  disconnectWhatsappSse()
  sseRunning = true

  const run = async () => {
    if (!sseRunning) return

    const base = getApiBase()
    const token = getAuthToken()
    if (!base || !token) {
      scheduleReconnect(run)
      return
    }

    sseAbortController = new AbortController()

    try {
      const response = await fetch(`${base}/sse`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: sseAbortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE ${response.status}`)
      }

      await consumeSseStream(response, onEvent)
    } catch (error) {
      if (!sseRunning || sseAbortController?.signal.aborted) return
      console.warn('[WhatsApp SSE] Reconectando…', error?.message || error)
    } finally {
      sseAbortController = null
    }

    scheduleReconnect(run)
  }

  run()
}

function scheduleReconnect(run) {
  if (!sseRunning) return
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer)
  sseReconnectTimer = setTimeout(run, 2500)
}

export function disconnectWhatsappSse() {
  sseRunning = false
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer)
    sseReconnectTimer = null
  }
  if (sseAbortController) {
    sseAbortController.abort()
    sseAbortController = null
  }
}

export function useWhatsappSse() {
  return { connectWhatsappSse, disconnectWhatsappSse }
}
