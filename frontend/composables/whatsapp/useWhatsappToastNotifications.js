/**
 * Toasts empilhados de mensagens WhatsApp (canto inferior direito).
 * Estado via useState — compartilhado entre plugin SSE e componente UI.
 */
import { computed } from 'vue'
import { resolveChatDisplayName } from './useWhatsappBlockContact.js'
import { normalizeJid, strTrim, isGroupJid } from './useWhatsappUtils.js'
import { subscribeWhatsappRealtime } from './whatsapp-realtime-bus.js'
import { connectWhatsappSse, disconnectWhatsappSse } from './useWhatsappSse.js'
import { connectWhatsappPusher, disconnectWhatsappPusher } from './useWhatsappPusher.js'

const MAX_STACK = 5
const recentMessageKeys = new Map()
const DEDUPE_MS = 4000
const WHATSAPP_CHAT_PATH = '/whatsapp/chat'

const AVATAR_COLORS = ['#3b5bdb', '#7048e8', '#e64980', '#f76707', '#099268', '#1098ad', '#862e9c']

let audioContext = null
let toastUnsub = null
let toastListenerActive = false

export function notificationsState() {
  return useState('wa-toast-notifications', () => [])
}

export function expandedState() {
  return useState('wa-toast-expanded', () => false)
}

/** @deprecated use notificationsState() */
export const whatsappToastNotifications = { get value() { return notificationsState().value } }
/** @deprecated use expandedState() */
export const whatsappToastExpanded = { get value() { return expandedState().value } }

function isOnWhatsappChatPage() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === WHATSAPP_CHAT_PATH
}

function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function avatarInitial(name = '') {
  const trimmed = String(name || '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

export function formatWhatsappToastRelativeTime(timestamp = Date.now()) {
  const deltaSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (deltaSec < 5) return 'agora'
  if (deltaSec < 60) return `${deltaSec}s`
  const minutes = Math.floor(deltaSec / 60)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function buildMessagePreview(message = {}, chat = {}) {
  const text = strTrim(
    message.text
    || message.body
    || chat.wa_lastMessageTextVote
    || chat.lastMessage
    || '',
  )
  if (text) return text

  const type = String(message.type || message.messageType || chat.wa_lastMessageType || '').toLowerCase()
  if (type.includes('image') || type.includes('sticker')) return 'Foto'
  if (type.includes('video') || type.includes('gif')) return 'Vídeo'
  if (type.includes('audio') || type.includes('ptt')) return 'Áudio'
  if (type.includes('document')) return 'Documento'
  if (type.includes('contact')) return 'Contato'
  if (type.includes('location')) return 'Localização'
  if (type.includes('poll')) return 'Enquete'
  if (type.includes('list')) return 'Lista'
  return 'Nova mensagem'
}

function shouldNotifyFromPayload(payload = {}) {
  const eventType = String(payload?.eventType || '').trim().toLowerCase()
  if (!eventType.includes('message')) return false
  if (eventType.includes('reaction') || eventType.includes('ack') || eventType.includes('status')) return false

  const message = payload?.message
  if (!message || typeof message !== 'object') return false
  if (Boolean(message.fromMe)) return false

  return true
}

function buildToastFromPayload(payload = {}) {
  if (!shouldNotifyFromPayload(payload)) return null

  const chat = payload?.chat && typeof payload.chat === 'object' ? payload.chat : {}
  const message = payload.message
  const chatJid = normalizeJid(
    payload?.chatJid
    || chat?.wa_chatid
    || chat?.chatid
    || chat?.chatJid
    || message?.chatid
    || message?.chatJid
    || '',
  )
  if (!chatJid) return null

  const messageId = String(message?.id || message?.messageid || message?.key?.id || '').trim()
  const dedupeKey = `${chatJid}:${messageId || buildMessagePreview(message, chat)}`
  const now = Date.now()
  const lastSeen = recentMessageKeys.get(dedupeKey)
  if (lastSeen && now - lastSeen < DEDUPE_MS) return null
  recentMessageKeys.set(dedupeKey, now)

  const displayName = resolveChatDisplayName(chat)
  const preview = buildMessagePreview(message, chat)
  const avatarUrl = String(chat.imagePreview || chat.image || chat.avatarUrl || '').trim()
  const isGroup = isGroupJid(chatJid)
  const senderName = strTrim(message.pushName || message.senderName || message.notifyName || '')

  return {
    id: `${chatJid}-${now}-${Math.random().toString(36).slice(2, 7)}`,
    chatJid,
    displayName,
    preview,
    avatarUrl,
    avatarColor: avatarColor(displayName),
    avatarInitial: avatarInitial(displayName),
    metaLabel: isGroup && senderName ? senderName : displayName,
    createdAt: now,
  }
}

export function playWhatsappIncomingSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!audioContext) audioContext = new AudioCtx()
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const start = audioContext.currentTime
    const oscA = audioContext.createOscillator()
    const oscB = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscA.type = 'sine'
    oscB.type = 'sine'
    oscA.frequency.setValueAtTime(880, start)
    oscB.frequency.setValueAtTime(1174, start + 0.08)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42)

    oscA.connect(gain)
    oscB.connect(gain)
    gain.connect(audioContext.destination)

    oscA.start(start)
    oscB.start(start + 0.08)
    oscA.stop(start + 0.24)
    oscB.stop(start + 0.42)
  } catch {
    /* áudio opcional */
  }
}

export function pushWhatsappToast(item) {
  if (!item) return

  const notifications = notificationsState()
  notifications.value = [item, ...notifications.value].slice(0, MAX_STACK)
  playWhatsappIncomingSound()
}

export function dismissWhatsappToast(id) {
  const notifications = notificationsState()
  notifications.value = notifications.value.filter((row) => row.id !== id)
}

export function clearWhatsappToasts() {
  const notifications = notificationsState()
  notifications.value = []
}

export function handleWhatsappToastRealtimePayload(payload = {}) {
  if (isOnWhatsappChatPage()) return

  const item = buildToastFromPayload(payload)
  if (item) pushWhatsappToast(item)
}

export function openWhatsappToastChat(item) {
  if (!item?.chatJid) return
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('wa_pending_open_chat', item.chatJid)
  }
  void navigateTo({ path: WHATSAPP_CHAT_PATH, query: { jid: item.chatJid } })
}

export function startWhatsappToastListener() {
  if (typeof window === 'undefined' || toastListenerActive) return
  toastListenerActive = true
  toastUnsub = subscribeWhatsappRealtime(handleWhatsappToastRealtimePayload)
  connectWhatsappSse()
  void connectWhatsappPusher()
}

export function stopWhatsappToastListener() {
  if (!toastListenerActive) return
  toastListenerActive = false
  if (toastUnsub) {
    toastUnsub()
    toastUnsub = null
  }
  clearWhatsappToasts()
  disconnectWhatsappSse()
  disconnectWhatsappPusher()
}

export function useWhatsappToastNotifications() {
  const route = useRoute()
  const notifications = notificationsState()
  const expanded = expandedState()
  const visible = computed(() => {
    if (String(route.path || '') === WHATSAPP_CHAT_PATH) return false
    return notifications.value.length > 0
  })

  return {
    notifications,
    expanded,
    visible,
    formatRelativeTime: formatWhatsappToastRelativeTime,
    dismissWhatsappToast,
    clearWhatsappToasts,
    openWhatsappToastChat,
    startWhatsappToastListener,
    stopWhatsappToastListener,
    playWhatsappIncomingSound,
  }
}
