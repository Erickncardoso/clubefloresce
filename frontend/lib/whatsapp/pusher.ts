/**
 * Pusher Channels — tempo real do WhatsApp no painel admin.
 * Fallback: polling em chats.ts quando Pusher não está configurado.
 *
 * Config/auth ficam em /api/pusher/* (não em /api/whatsapp).
 */
import Pusher from 'pusher-js'
import { API_BASE } from '@/lib/api'
import { whatsappHasAuth, whatsappFetchInit } from './api'
import { dispatchWhatsappRealtime } from './realtime-bus'

let pusherClient: Pusher | null = null
let pusherChannel: ReturnType<Pusher['subscribe']> | null = null
let connectPromise: Promise<boolean> | null = null
let pusherConnectionRefs = 0

type StateListener = (connected: boolean) => void
const stateListeners = new Set<StateListener>()
let pusherConnectedState = false
let pusherEnabledState = false

function getPusherApiBase(): string {
  return String(API_BASE || '/api').replace(/\/+$/, '') || '/api'
}

function setConnected(v: boolean) {
  pusherConnectedState = v
  stateListeners.forEach((fn) => fn(v))
}

export function subscribePusherState(fn: StateListener): () => void {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

export function isPusherConnected() { return pusherConnectedState }
export function isPusherEnabled()   { return pusherEnabledState }

function teardownPusher() {
  if (pusherChannel) {
    pusherChannel.unbind('whatsapp-sync')
    pusherChannel = null
  }
  if (pusherClient) {
    pusherClient.disconnect()
    pusherClient = null
  }
  setConnected(false)
  connectPromise = null
}

function waitForChannelSubscription(
  channel: ReturnType<Pusher['subscribe']>,
  timeoutMs = 8000,
): Promise<boolean> {
  if ((channel as unknown as { subscribed: boolean }).subscribed) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs)
    const finish = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok)
    }
    channel.bind('pusher:subscription_succeeded', () => finish(true))
    channel.bind('pusher:subscription_error', () => finish(false))
  })
}

export async function connectWhatsappPusher(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  pusherConnectionRefs += 1

  if (pusherConnectedState && pusherClient && (pusherChannel as unknown as { subscribed: boolean })?.subscribed) {
    return true
  }

  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    const apiBase = getPusherApiBase()
    if (!apiBase || !whatsappHasAuth()) {
      pusherEnabledState = false
      pusherConnectionRefs = Math.max(0, pusherConnectionRefs - 1)
      return false
    }

    try {
      const res = await fetch(`${apiBase}/pusher/config`, whatsappFetchInit())
      if (!res.ok) throw new Error(`pusher/config ${res.status}`)
      const config = await res.json() as Record<string, unknown>

      if (!config?.enabled || !config?.key || !config?.cluster || !config?.channel) {
        pusherEnabledState = false
        teardownPusher()
        return false
      }

      pusherEnabledState = true
      teardownPusher()

      pusherClient = new Pusher(String(config.key), {
        cluster: String(config.cluster),
        authEndpoint: `${apiBase}/pusher/auth`,
        auth: { headers: { 'x-requested-with': 'XMLHttpRequest' } },
      })

      pusherClient.connection.bind('connected',     () => setConnected(true))
      pusherClient.connection.bind('disconnected',  () => setConnected(false))
      pusherClient.connection.bind('unavailable',   () => setConnected(false))
      pusherClient.connection.bind('failed',        () => setConnected(false))

      pusherChannel = pusherClient.subscribe(String(config.channel))
      pusherChannel.bind('whatsapp-sync', (payload: Record<string, unknown>) => {
        dispatchWhatsappRealtime(payload || {})
      })
      pusherChannel.bind('pusher:subscription_succeeded', () => setConnected(true))
      pusherChannel.bind('pusher:subscription_error',     () => setConnected(false))

      const subscribed = await waitForChannelSubscription(pusherChannel)
      setConnected(subscribed)
      return subscribed
    } catch (error) {
      console.warn('[WhatsApp Pusher] Não foi possível conectar:', error)
      pusherEnabledState = false
      teardownPusher()
      return false
    } finally {
      connectPromise = null
    }
  })()

  return connectPromise
}

export function disconnectWhatsappPusher(): void {
  pusherConnectionRefs = Math.max(0, pusherConnectionRefs - 1)
  if (pusherConnectionRefs > 0) return
  teardownPusher()
  pusherEnabledState = false
}
