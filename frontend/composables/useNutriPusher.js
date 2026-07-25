/**
 * Pusher Channels — transcrição de anamnese em tempo real (painel nutri).
 */
import { ref } from 'vue'
import Pusher from 'pusher-js'
import { authFetchInit, authHeaders } from '~/composables/useAuthSession.js'

let pusherClient = null
let pusherChannel = null
let connectPromise = null
let connectionRefs = 0

const pusherConnected = ref(false)
const pusherEnabled = ref(false)

const listeners = new Set()

function getApiBase() {
  try {
    const config = useRuntimeConfig()
    return String(config?.public?.apiBase || '').replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function dispatchTranscriptionEvent(payload) {
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch {
      /* ignore */
    }
  }
}

function teardownPusher() {
  if (pusherChannel) {
    pusherChannel.unbind('anamnese-transcription')
    pusherChannel = null
  }
  if (pusherClient) {
    pusherClient.disconnect()
    pusherClient = null
  }
  pusherConnected.value = false
  connectPromise = null
}

export function subscribeAnamneseTranscription(listener) {
  if (typeof listener === 'function') listeners.add(listener)
  void ensureNutriPusherConnected()
  return () => listeners.delete(listener)
}

export function isNutriPusherConnected() {
  return pusherConnected.value
}

export function isNutriPusherEnabled() {
  return pusherEnabled.value
}

export async function ensureNutriPusherConnected() {
  if (!import.meta.client) return false
  connectionRefs += 1

  if (pusherConnected.value && pusherClient && pusherChannel?.subscribed) {
    return true
  }

  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    const apiBase = getApiBase()
    if (!apiBase) {
      pusherEnabled.value = false
      connectionRefs = Math.max(0, connectionRefs - 1)
      return false
    }

    try {
      const config = await $fetch(`${apiBase}/pusher/config`, authFetchInit())
      if (!config?.enabled || !config?.nutriChannel) {
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
          headers: authHeaders(),
        },
      })

      pusherClient.connection.bind('connected', () => {
        pusherConnected.value = true
      })
      pusherClient.connection.bind('disconnected', () => {
        pusherConnected.value = false
      })

      pusherChannel = pusherClient.subscribe(config.nutriChannel)
      pusherChannel.bind('anamnese-transcription', (payload) => {
        dispatchTranscriptionEvent(payload)
      })

      return true
    } catch {
      pusherEnabled.value = false
      teardownPusher()
      return false
    }
  })()

  return connectPromise
}

export function releaseNutriPusherConnection() {
  connectionRefs = Math.max(0, connectionRefs - 1)
  if (connectionRefs === 0) {
    teardownPusher()
  }
}
