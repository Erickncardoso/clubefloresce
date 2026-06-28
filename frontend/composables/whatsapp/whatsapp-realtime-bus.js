/** Multiplexador de eventos SSE/Pusher do WhatsApp para vários consumidores. */

const handlers = new Set()

export function subscribeWhatsappRealtime(handler) {
  if (typeof handler !== 'function') return () => {}
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function hasWhatsappRealtimeSubscribers() {
  return handlers.size > 0
}

export function dispatchWhatsappRealtime(payload = {}) {
  handlers.forEach((handler) => {
    try {
      handler(payload)
    } catch (error) {
      console.warn('[WhatsApp realtime]', error)
    }
  })
}
