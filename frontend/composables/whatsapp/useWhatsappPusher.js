/**
 * Pusher Channels — tempo real do WhatsApp no painel admin.
 * Fallback: polling em useWhatsappChats quando Pusher não está configurado.
 */
import { ref, readonly } from 'vue'
import Pusher from 'pusher-js'
import { getAuthToken } from './useWhatsappApi.js'

let pusherClient = null
let pusherChannel = null
let connectPromise = null
/** @type {((payload: Record<string, unknown>) => void) | null} */
let onSyncHandler = null

const pusherConnected = ref(false)
const pusherEnabled = ref(false)

function getApiBase() {
  try {
    const config = useRuntimeConfig()
    return String(config?.public?.apiBase || '').replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function teardownPusher() {
  if (pusherChannel) {
    pusherChannel.unbind('whatsapp-sync')
    pusherChannel = null
  }
  if (pusherClient) {
    pusherClient.disconnect()
    pusherClient = null
  }
  pusherConnected.value = false
  connectPromise = null
}

export function isWhatsappPusherConnected() {
  return pusherConnected.value
}

export function isWhatsappPusherEnabled() {
  return pusherEnabled.value
}

function waitForChannelSubscription(channel, timeoutMs = 8000) {
  if (channel?.subscribed) return Promise.resolve(true)

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs)
    const finish = (ok) => {
      clearTimeout(timer)
      resolve(ok)
    }
    channel.bind('pusher:subscription_succeeded', () => finish(true))
    channel.bind('pusher:subscription_error', () => finish(false))
  })
}

/**
 * Conecta ao canal privado da nutricionista e chama `onSync` a cada evento do webhook UAZAPI.
 * @param {(payload: Record<string, unknown>) => void} onSync
 * @returns {Promise<boolean>} true se inscrito no canal privado
 */
export async function connectWhatsappPusher(onSync) {
  if (typeof window === 'undefined') return false
  onSyncHandler = typeof onSync === 'function' ? onSync : null

  if (pusherConnected.value && pusherClient && pusherChannel?.subscribed) {
    return true
  }

  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    const apiBase = getApiBase()
    const token = getAuthToken()
    if (!apiBase || !token) {
      pusherEnabled.value = false
      return false
    }

    try {
      const config = await $fetch(`${apiBase}/pusher/config`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!config?.enabled || !config?.key || !config?.cluster || !config?.channel) {
        pusherEnabled.value = false
        teardownPusher()
        return false
      }

      pusherEnabled.value = true
      teardownPusher()

      pusherClient = new Pusher(String(config.key), {
        cluster: String(config.cluster),
        authEndpoint: `${apiBase}/pusher/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })

      pusherClient.connection.bind('connected', () => {
        pusherConnected.value = true
      })
      pusherClient.connection.bind('disconnected', () => {
        pusherConnected.value = false
      })
      pusherClient.connection.bind('unavailable', () => {
        pusherConnected.value = false
      })
      pusherClient.connection.bind('failed', () => {
        pusherConnected.value = false
      })

      pusherChannel = pusherClient.subscribe(String(config.channel))
      pusherChannel.bind('whatsapp-sync', (payload) => {
        if (onSyncHandler) onSyncHandler(payload || {})
      })

      pusherChannel.bind('pusher:subscription_succeeded', () => {
        pusherConnected.value = true
      })
      pusherChannel.bind('pusher:subscription_error', () => {
        pusherConnected.value = false
      })

      const subscribed = await waitForChannelSubscription(pusherChannel)
      pusherConnected.value = subscribed
      return subscribed
    } catch (error) {
      console.warn('[WhatsApp Pusher] Não foi possível conectar:', error)
      pusherEnabled.value = false
      teardownPusher()
      return false
    } finally {
      connectPromise = null
    }
  })()

  return connectPromise
}

export function disconnectWhatsappPusher() {
  onSyncHandler = null
  teardownPusher()
  pusherEnabled.value = false
}

export function useWhatsappPusher() {
  return {
    pusherConnected: readonly(pusherConnected),
    pusherEnabled: readonly(pusherEnabled),
    connectWhatsappPusher,
    disconnectWhatsappPusher,
    isWhatsappPusherConnected,
    isWhatsappPusherEnabled,
  }
}
