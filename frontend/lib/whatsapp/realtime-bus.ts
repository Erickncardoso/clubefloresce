/** Multiplexador de eventos SSE/Pusher do WhatsApp para vários consumidores. */

type RealtimePayload = Record<string, unknown>
type RealtimeHandler = (payload: RealtimePayload) => void

const handlers = new Set<RealtimeHandler>()

export function subscribeWhatsappRealtime(handler: RealtimeHandler): () => void {
  if (typeof handler !== 'function') return () => {}
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function hasWhatsappRealtimeSubscribers(): boolean {
  return handlers.size > 0
}

export function dispatchWhatsappRealtime(payload: RealtimePayload = {}): void {
  handlers.forEach((handler) => {
    try {
      handler(payload)
    } catch (error) {
      console.warn('[WhatsApp realtime]', error)
    }
  })
}
