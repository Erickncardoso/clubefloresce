/**
 * useWhatsappChats
 * Gerenciamento da lista de chats, seleção de chat, envio de mensagens e sincronização em tempo real.
 */
import {
  chats, selectedChat, messages, loadingChats, loadingMessages, chatHistorySyncPending, loadingOlderMessages, chatMessagesHasMore, selectChatLoadSeq,
  isRefreshingMessages, chatsPollingTimer, messagesPollingTimer, sending,
  newMessage, replyingTo, chatBodyRef, newMessage as newMessageRef,
  chatsBackendOfflineLogged, messagesBackendOfflineLogged,
  visibilitySyncHandler, windowFocusSyncHandler, windowOnlineSyncHandler,
  groupParticipantsDirectory, groupParticipantsByJid, groupParticipantsByLid,
  lidToJidMap, observedSenderDirectory, senderAvatarDirectory, chatPresenceByKey,
  chatDetailsCache, chatDetailsInflight, deletedChatKeys,
  clearWhatsappSessionState, showChatFeedback
} from './useWhatsappState.js'
import {
  normalizeJid, strTrim, buildLookupKeys, normalizeTimestampToMs, parseJsonBodySafe,
  normalizeProviderMessageId, parseListMessageTextVote, isChatMutedByEndTime, toUazapiChatNumber,
  collectMessageFindChatIds,
  collectChatIdentityIds,
} from './useWhatsappUtils.js'
import {
  getProxyBase,
  getWhatsappApiBase,
  MESSAGES_POLL_INTERVAL_MS,
  MESSAGES_POLL_REALTIME_SAFE_MS,
  whatsappJsonHeaders,
  whatsappFetchInit,
} from './useWhatsappApi.js'
import {
  isInitialSyncGentleMode,
  isWhatsappWuzapiProvider,
  getGentleChatsPollIntervalMs,
  getGentleChatPageLimit,
  markInitialSyncActivity,
  noteInitialSyncChatCount,
  resetInitialSyncState,
} from './useWhatsappInitialSync.js'

/** Mantém mute otimista enquanto a UAZAPI ainda devolve estado antigo no lightSync. */
export const MUTE_OPTIMISTIC_TTL_MS = 20000

const resolveMuteEndTime = (row) => Number(row?.muteEndTime ?? row?.wa_muteEndTime ?? 0)

const mergeChatMuteState = (prevRow, incomingRow) => {
  const prevMuteEnd = resolveMuteEndTime(prevRow)
  const incomingMuteEnd = resolveMuteEndTime(incomingRow)
  const optimisticUntil = Number(prevRow?._muteOptimisticUntil ?? 0)
  const prevMuted = isChatMutedByEndTime(prevMuteEnd)
  const incomingMuted = isChatMutedByEndTime(incomingMuteEnd)

  if (optimisticUntil > Date.now() && prevMuted !== incomingMuted) {
    return {
      muteEndTime: prevMuteEnd,
      wa_muteEndTime: prevMuteEnd,
      isMuted: prevMuted,
      _muteOptimisticUntil: optimisticUntil,
    }
  }

  const nextEnd = incomingMuteEnd || prevMuteEnd
  return {
    muteEndTime: nextEnd,
    wa_muteEndTime: nextEnd,
    isMuted: isChatMutedByEndTime(nextEnd),
    _muteOptimisticUntil: 0,
  }
}
import { loadWhatsappLabels, syncWhatsappLabelsInBackground, normalizeChatLabelIds, clearWhatsappLabelsCache } from './useWhatsappLabels.js'
import {
  connectWhatsappPusher,
  disconnectWhatsappPusher,
  isWhatsappPusherConnected,
} from './useWhatsappPusher.js'
import {
  connectWhatsappSse,
  disconnectWhatsappSse,
} from './useWhatsappSse.js'
import { subscribeWhatsappRealtime } from './whatsapp-realtime-bus.js'
import {
  loadGroupParticipantsDirectory, syncContactsDirectoryIfNeeded, learnObservedSenderNames,
  ingestLidPnHintsFromMessages, enrichUnknownSenderNames, ensureGroupSenderAvatars, resolveChatListSenderLabel,
  loadPersistedGroupObservedSenders, schedulePersistGroupObservedSenders, cancelScheduledGroupObservedPersist,
  resolvePrivateChatPhoneJid,
} from './useWhatsappContacts.js'
import { normalizeMessage, getMessageMergeKey, pickRicherDuplicateBaseMessage, preloadMessageMediaIfNeeded, hydrateMessagesMediaFromCache, normalizeIncomingMessage, isStoredNormalizedMessage, normalizeMessageForDisplay } from './useWhatsappMessages.js'
import { handleInteractiveMenuOptionClick } from './useWhatsappInteractive.js'
import {
  scrollToBottom,
  scrollToBottomOnChatOpen,
  isChatBodyNearBottom,
  stickChatScrollToBottomIfNeeded,
  captureChatScrollSnapshot,
  restoreChatScrollAfterMessagesUpdate,
  resetChatScrollBehavior,
  setChatScrollNearTopHandler,
  unbindChatBodyScrollListeners,
} from './useWhatsappScroll.js'

const messagesCacheByChatJid = new Map()
/** @type {Map<string, { aggregated: object[], seenIds: Set<string>, rawByMergeKey: Map<string, object>, hasMore: boolean, nextOffset: number }>} */
const chatOlderPaginationByJid = new Map()
const messagePreviewTextById = new Map()
const playedMarkInflight = new Set()
const prefetchMessagesInflight = new Set()

/** Uma chave por linha da sidebar — evita misturar mensagens entre conversas. */
const getChatRuntimeCacheKey = (chatRow = {}) => canonicalChatListKey(chatRow)

const getMessagesCacheForChat = (chatRow = {}) => {
  const key = getChatRuntimeCacheKey(chatRow)
  if (!key) return null
  const cached = messagesCacheByChatJid.get(key)
  if (Array.isArray(cached) && cached.length > 0) {
    return { key, messages: cached }
  }
  return null
}

const storeMessagesInChatCache = (chatRow, normalizedMessages) => {
  const key = getChatRuntimeCacheKey(chatRow)
  if (!key) return
  messagesCacheByChatJid.set(key, [...normalizedMessages])
}

/** Atualiza cache do chat aberto (ex.: após download de mídia). */
export const storeOpenChatMessagesCache = (chatRow, normalizedMessages) => {
  storeMessagesInChatCache(chatRow || selectedChat.value, normalizedMessages)
}

const isSelectedChatListKey = (expectedListKey) => {
  if (!expectedListKey) return true
  return canonicalChatListKey(selectedChat.value) === expectedListKey
}

const normalizeRawMessagesBatch = (rawMessages = []) => {
  const aggregated = []
  const seenIds = new Set()
  const rawByMergeKey = new Map()
  appendRawMessagesToAggregate(aggregated, seenIds, rawByMergeKey, rawMessages)
  return [...aggregated].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

/** Máx. de prefetches simultâneos — sobra conexão para o fetch do clique (HTTP/1.1 ≈ 6/origem). */
const PREFETCH_MAX_CONCURRENT = 3

export const prefetchChatMessagesFromDb = (chat) => {
  if (!chat || typeof window === 'undefined') return
  const listKey = getChatRuntimeCacheKey(chat)
  if (!listKey || getMessagesCacheForChat(chat)) return
  if (prefetchMessagesInflight.has(listKey)) return
  // Prefetch é oportunista: no teto, simplesmente pula (o clique busca na hora com prioridade alta).
  if (prefetchMessagesInflight.size >= PREFETCH_MAX_CONCURRENT) return
  prefetchMessagesInflight.add(listKey)

  const jid = resolveActiveChatFetchJid(chat)
  if (!jid) {
    prefetchMessagesInflight.delete(listKey)
    return
  }

  void fetchChatMessages(jid, CHAT_MESSAGES_INITIAL_BATCH, 0, {
    syncFromUazapi: false,
    timeoutMs: 4000,
    priority: 'low',
  })
    .then((pageResult) => {
      if (!Array.isArray(pageResult?.messages) || pageResult.messages.length === 0) return
      const normalized = normalizeRawMessagesBatch(pageResult.messages)
      storeMessagesInChatCache(chat, normalized)
      indexMessagesForPreviewCache(normalized)
      // Clique ganhou a corrida do prefetch: aplica no chat aberto sem esperar outro round-trip.
      if (
        listKey &&
        canonicalChatListKey(selectedChat.value) === listKey &&
        (loadingMessages.value || !Array.isArray(messages.value) || messages.value.length === 0)
      ) {
        messages.value = normalized
        loadingMessages.value = false
        chatHistorySyncPending.value = false
        applySelectChatScroll()
      }
    })
    .catch(() => {})
    .finally(() => {
      prefetchMessagesInflight.delete(listKey)
    })
}

const prefetchTopChatsMessagesFromDb = (chatList, limit = 10) => {
  if (typeof window === 'undefined') return
  const list = Array.isArray(chatList) ? chatList.slice(0, limit) : []
  // 2 em paralelo — cobre o topo da sidebar sem saturar o backend.
  let i = 0
  let inflight = 0
  const maxParallel = 2
  const runNext = () => {
    while (inflight < maxParallel && i < list.length) {
      const chat = list[i++]
      inflight += 1
      prefetchChatMessagesFromDb(chat)
      window.setTimeout(() => {
        inflight -= 1
        runNext()
      }, 180)
    }
  }
  runNext()
}

export const resetChatsRuntimeCaches = () => {
  try { messagesCacheByChatJid.clear() } catch {}
  try { messagePreviewTextById.clear() } catch {}
  try { chatOlderPaginationByJid.clear() } catch {}
}

const collectDeletedChatKeys = (chatOrJid = {}) => {
  const keys = new Set()
  if (typeof chatOrJid === 'string') {
    const norm = normalizeJid(chatOrJid)
    const key = canonicalChatListKey({ chatJid: norm })
    if (key) keys.add(key)
    return keys
  }
  const key = canonicalChatListKey(chatOrJid)
  if (key) keys.add(key)
  for (const variant of [chatOrJid?.chatJid, chatOrJid?.wa_chatid, chatOrJid?.chatid, chatOrJid?.id]) {
    const variantKey = canonicalChatListKey({ chatJid: variant })
    if (variantKey) keys.add(variantKey)
  }
  return keys
}

export const isChatDeletedLocally = (chat = {}) => {
  const key = canonicalChatListKey(chat)
  return Boolean(key && deletedChatKeys.value?.[key])
}

export const markChatDeletedLocally = (chatOrJid = {}) => {
  const next = { ...(deletedChatKeys.value || {}) }
  for (const key of collectDeletedChatKeys(chatOrJid)) {
    next[key] = Date.now()
  }
  deletedChatKeys.value = next
}

export const unmarkChatDeletedLocally = (chatOrJid = {}) => {
  const next = { ...(deletedChatKeys.value || {}) }
  for (const key of collectDeletedChatKeys(chatOrJid)) {
    delete next[key]
  }
  deletedChatKeys.value = next
}

const purgeChatRuntimeCaches = (chatOrJid = {}) => {
  const keys = new Set()
  if (typeof chatOrJid === 'string') {
    keys.add(getChatRuntimeCacheKey({ chatJid: chatOrJid }))
    keys.add(normalizeJid(chatOrJid))
  } else {
    keys.add(getChatRuntimeCacheKey(chatOrJid))
    for (const variant of [chatOrJid?.chatJid, chatOrJid?.wa_chatid, chatOrJid?.chatid]) {
      const norm = normalizeJid(variant)
      if (norm) keys.add(norm)
    }
  }

  for (const key of keys) {
    if (!key) continue
    messagesCacheByChatJid.delete(key)
    chatOlderPaginationByJid.delete(key)
    if (chatDetailsCache.value?.[key]) {
      const next = { ...chatDetailsCache.value }
      delete next[key]
      chatDetailsCache.value = next
    }
    if (chatDetailsInflight.value?.[key]) {
      const next = { ...chatDetailsInflight.value }
      delete next[key]
      chatDetailsInflight.value = next
    }
  }
}

export const removeChatFromLocalState = (chatOrJid = {}) => {
  markChatDeletedLocally(chatOrJid)
  const norm = normalizeJid(typeof chatOrJid === 'string' ? chatOrJid : chatOrJid?.chatJid)
  const key = canonicalChatListKey(typeof chatOrJid === 'string' ? { chatJid: norm } : chatOrJid)

  chats.value = (chats.value || []).filter((item) => {
    if (norm && normalizeJid(item.chatJid) === norm) return false
    if (key && canonicalChatListKey(item) === key) return false
    return true
  })

  if (selectedChat.value && (
    (norm && normalizeJid(selectedChat.value.chatJid) === norm) ||
    (key && canonicalChatListKey(selectedChat.value) === key)
  )) {
    selectedChat.value = null
    messages.value = []
  }

  purgeChatRuntimeCaches(chatOrJid)
}

// ─── Funções auxiliares ───────────────────────────────────────────────────────

export const getChatActivityTimestamp = (chat) =>
  normalizeTimestampToMs(
    chat?.lastMessageTime ||
    chat?.wa_lastMsgTimestamp ||
    chat?.timestamp ||
    chat?.updatedAt ||
    chat?.wa_updatedAt ||
    chat?.createdAt ||
    0
  )

export const sortChatsByPriority = (items = []) =>
  [...items].sort((a, b) => {
    const pinA = a?.isPinned ? 1 : 0, pinB = b?.isPinned ? 1 : 0
    if (pinA !== pinB) return pinB - pinA
    return getChatActivityTimestamp(b) - getChatActivityTimestamp(a)
  })

export const parseWaPinnedFlag = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return false
}

const sanitizeSenderLabelCandidate = (value) => {
  const v = String(value || '').trim()
  if (!v || v.includes('@') || /^\d{8,}$/.test(v.replace(/[+\s()-]/g, ''))) return ''
  return v
}

const pickFirstNonEmptyText = (...values) => {
  for (const value of values) {
    const text = strTrim(value)
    if (text) return text
  }
  return ''
}

const REACTION_LIST_PREVIEW_RE = /^(você\s+)?reagiu\s+com\s+/i
const CHAT_LIST_PREVIEW_MAX_LEN = 56
const CHAT_PRESENCE_TTL_MS = 25000
const PRESENCE_TEXT_RECORDING_RE = /^(~[^:]{1,40}:\s*)?(gravando(\s+(áudio|audio))?(\.{3})?|recording(\s+audio)?(\.{3})?)$/i
const PRESENCE_TEXT_COMPOSING_RE = /^(~[^:]{1,40}:\s*)?(digitando(\.{3})?|typing(\.{3})?)$/i

const truncateChatListPreview = (text = '') => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= CHAT_LIST_PREVIEW_MAX_LEN) return normalized
  return `${normalized.slice(0, CHAT_LIST_PREVIEW_MAX_LEN).trimEnd()}...`
}

export const isReactionListPreviewText = (text = '') => REACTION_LIST_PREVIEW_RE.test(String(text || '').trim())

export const inferChatLastMessageFromMe = (chat = {}) => {
  if (chat.lastMessageFromMe === true || chat.fromMe === true || chat.wa_lastMessageFromMe === true) return true
  const prefix = strTrim(chat.lastMessagePrefix || chat.wa_lastMsgPrefix || '')
  if (prefix.toLowerCase().startsWith('você')) return true

  const isGroup = Boolean(chat.isGroup) || normalizeJid(chat.chatJid || chat.wa_chatid || '').endsWith('@g.us')
  if (!isGroup) {
    const contactLid = normalizeJid(chat.wa_chatlid || '')
    const sender = normalizeJid(chat.wa_lastMessageSender || chat.lastMessageSender || '')
    if (contactLid && sender) return sender !== contactLid
  }
  return false
}

export const chatListDeliveryStatus = (chat = {}) => {
  if (!inferChatLastMessageFromMe(chat)) return ''
  const status = strTrim(chat.lastMessageStatus || chat.wa_lastMessageStatus || chat.wa_lastMsgStatus || '').toLowerCase()
  if (status === 'read' || status === 'played') return 'read'
  if (status === 'delivered' || status === 'delivery_ack') return 'delivered'
  if (status === 'sent' || status === 'server_ack' || status === 'serverack') return 'sent'
  if (status === 'pending' || status === 'sending') return 'pending'
  return 'delivered'
}

export const shouldShowChatListPreviewTicks = (chat = {}) => {
  if (resolveChatListPresencePreview(chat)) return false
  const preview = resolveChatListLastMessage(chat)
  if (!preview || isReactionListPreviewText(preview)) return false
  return inferChatLastMessageFromMe(chat)
}

export const normalizeChatPresenceKind = (raw = '') => {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return ''
  if (value.includes('record') || value.includes('ptt') || value.includes('gravando')) return 'recording'
  if (value.includes('compos') || value.includes('typing') || value.includes('digitando')) return 'composing'
  if (value === 'paused' || value === 'available' || value === 'unavailable') return ''
  return ''
}

export const detectChatPresenceKindFromText = (text = '') => {
  const normalized = String(text || '').trim()
  if (!normalized) return ''
  if (PRESENCE_TEXT_RECORDING_RE.test(normalized)) return 'recording'
  if (PRESENCE_TEXT_COMPOSING_RE.test(normalized)) return 'composing'
  return ''
}

const buildChatPresencePreviewText = (kind, chat = {}, senderLabel = '') => {
  if (kind === 'recording') {
    return senderLabel ? `~${senderLabel}: gravando áudio...` : 'gravando áudio...'
  }
  if (kind === 'composing') {
    return senderLabel ? `~${senderLabel}: digitando...` : 'digitando...'
  }
  return ''
}

export const applyChatPresenceUpdate = (chatJid, kind, options = {}) => {
  const key = canonicalChatListKey({ chatJid })
  if (!key) return
  const normalizedKind = normalizeChatPresenceKind(kind)
  const next = { ...chatPresenceByKey.value }
  if (!normalizedKind) {
    delete next[key]
  } else {
    next[key] = {
      kind: normalizedKind,
      at: Date.now(),
      senderLabel: strTrim(options.senderLabel || '')
    }
  }
  chatPresenceByKey.value = next
}

export const clearChatPresence = (chatJid) => {
  applyChatPresenceUpdate(chatJid, '')
}

const resolvePresenceSenderLabel = (chat = {}, participantJid = '') => {
  const participant = normalizeJid(participantJid)
  if (participant) {
    const fromObserved = sanitizeSenderLabelCandidate(observedSenderDirectory.value?.[participant])
    if (fromObserved) return fromObserved
  }
  return sanitizeSenderLabelCandidate(chat.wa_lastSenderName)
    || sanitizeSenderLabelCandidate(chat.wa_lastMsgSenderName)
    || sanitizeSenderLabelCandidate(chat.lastSenderName)
    || resolveChatListSenderLabel(chat)
    || ''
}

export const getChatPresenceState = (chat = {}) => {
  const key = canonicalChatListKey(chat)
  const live = key ? chatPresenceByKey.value[key] : null
  if (live && (Date.now() - Number(live.at || 0)) < CHAT_PRESENCE_TTL_MS) return live

  const previewSource = pickFirstNonEmptyText(
    chat.wa_lastMessageTextVote,
    chat.wa_lastMsgText,
    chat.wa_lastMessageText,
    chat.lastMessage,
    chat.lastMessagePreview
  )
  const fromText = detectChatPresenceKindFromText(previewSource)
  const fromType = normalizeChatPresenceKind(
    chat.wa_lastMessageType || chat.wa_chatPresence || chat.presenceState || chat.presenceKind
  )
  const kind = fromType || fromText
  if (!kind) return null

  const isGroup = Boolean(chat.isGroup) || normalizeJid(chat.chatJid || chat.wa_chatid || '').endsWith('@g.us')
  const senderLabel = isGroup ? resolvePresenceSenderLabel(chat) : ''
  return { kind, at: Date.now(), senderLabel, fromApi: true }
}

export const resolveChatListPresencePreview = (chat = {}) => {
  const state = getChatPresenceState(chat)
  if (!state?.kind) return ''
  return buildChatPresencePreviewText(state.kind, chat, state.senderLabel || '')
}

export const parsePresenceFromRealtimePayload = (payload = {}) => {
  const roots = [payload?.data, payload?.event, payload?.presence, payload].filter(Boolean)
  for (const root of roots) {
    if (!root || typeof root !== 'object' || Array.isArray(root)) continue

    const chatJid = normalizeJid(
      root.id ||
      root.chatid ||
      root.chatId ||
      root.wa_chatid ||
      root.remoteJid ||
      payload?.chatJid ||
      ''
    )
    const presences = root.presences || root.Presences
    if (!chatJid) continue

    if (!presences || typeof presences !== 'object') {
      const directKind = normalizeChatPresenceKind(
        root.lastKnownPresence || root.presence || root.state || root.status
      )
      if (directKind) {
        return { chatJid, kind: directKind, participantJid: chatJid, senderLabel: '' }
      }
      continue
    }

    let cleared = true
    let winner = null
    for (const [participant, info] of Object.entries(presences)) {
      const kind = normalizeChatPresenceKind(
        (info && typeof info === 'object' ? (info.lastKnownPresence || info.state || info.presence) : info)
      )
      if (!kind) continue
      cleared = false
      winner = { chatJid, kind, participantJid: normalizeJid(participant), senderLabel: '' }
      break
    }

    if (winner) return winner
    if (cleared) return { chatJid, kind: '', participantJid: '', senderLabel: '' }
  }
  return null
}

export const applyPresenceFromRealtimePayload = (payload = {}) => {
  const parsed = parsePresenceFromRealtimePayload(payload)
  if (!parsed?.chatJid) return false

  const chatRow = (chats.value || []).find((item) => canonicalChatListKey(item) === canonicalChatListKey({ chatJid: parsed.chatJid })) || {}
  const senderLabel = parsed.senderLabel || resolvePresenceSenderLabel(chatRow, parsed.participantJid)
  applyChatPresenceUpdate(parsed.chatJid, parsed.kind, { senderLabel })

  if (parsed.kind) {
    const preview = buildChatPresencePreviewText(parsed.kind, chatRow, senderLabel)
    refreshChatPreview(parsed.chatJid, {
      wa_lastMessageTextVote: preview,
      wa_lastMessageType: parsed.kind,
      presenceKind: parsed.kind,
      lastMessage: preview
    })
  } else {
    refreshChatPreview(parsed.chatJid, {
      wa_lastMessageType: '',
      presenceKind: ''
    })
  }
  return true
}

const truncateReactionQuote = (text, max = 48) => {
  const normalized = strTrim(text).replace(/\s+/g, ' ')
  if (!normalized) return ''
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max).trimEnd()}...`
}

export const formatReactionListPreview = (emoji, quotedText, { fromMe = false } = {}) => {
  const reactionEmoji = strTrim(emoji) || '❤️'
  const quote = truncateReactionQuote(quotedText)
  const verb = fromMe ? 'Você reagiu' : 'Reagiu'
  if (!quote) return `${verb} com ${reactionEmoji}`
  return `${verb} com ${reactionEmoji} a: "${quote}"`
}

const isReactionMessageType = (typeRaw = '') => {
  const type = String(typeRaw || '').trim().toLowerCase()
  return type.includes('reaction') || type === 'react'
}

const inferReactionFromMe = (chat = {}) => {
  if (chat.fromMe === true || chat.lastMessageFromMe === true) return true
  const prefix = strTrim(chat.lastMessagePrefix || chat.wa_lastMsgPrefix || '')
  if (prefix.toLowerCase().startsWith('você')) return true
  if (chat.wa_lastMessageFromMe === true || chat.lastMessageFromMe === true) return true
  return false
}

const pickReactionTargetIdFromChat = (chat = {}) => normalizeProviderMessageId(
  chat.wa_lastReactionTargetId ||
  chat.lastReactionTargetId ||
  chat._lastReactionTargetId ||
  ''
)

const pickReactionEmojiFromChat = (chat = {}) => {
  const msgType = String(chat.wa_lastMessageType || chat.lastMessageType || '').trim()
  if (isReactionMessageType(msgType)) {
    // No payload UAZAPI o emoji da reação vem em wa_lastMessageTextVote, não o texto citado.
    return pickFirstNonEmptyText(
      chat.wa_lastMessageTextVote,
      chat.wa_lastMsgText,
      chat.wa_lastMessageText,
      chat.lastReactionEmoji
    )
  }
  return pickFirstNonEmptyText(
    chat.wa_lastMsgText,
    chat.wa_lastMessageText,
    chat.lastMsgText,
    chat.last_message,
    chat.last_message_text,
    chat.wa_lastMsgBody
  )
}

const findMessageInCachesById = (targetId, preferredChatJid = '') => {
  if (!targetId) return null
  const jid = normalizeJid(preferredChatJid)
  if (jid) {
    const local = (messagesCacheByChatJid.get(jid) || []).find((row) => {
      if (!row || row.isReaction) return false
      const keys = [
        normalizeProviderMessageId(row.messageid),
        normalizeProviderMessageId(row.id),
        normalizeProviderMessageId(row.normalizedMessageId)
      ].filter(Boolean)
      return keys.includes(targetId)
    })
    if (local) return local
  }
  for (const rows of messagesCacheByChatJid.values()) {
    const found = (rows || []).find((row) => {
      if (!row || row.isReaction) return false
      const keys = [
        normalizeProviderMessageId(row.messageid),
        normalizeProviderMessageId(row.id),
        normalizeProviderMessageId(row.normalizedMessageId)
      ].filter(Boolean)
      return keys.includes(targetId)
    })
    if (found) return found
  }
  return null
}

const lookupReactionQuotedText = (chat = {}, targetId = '') => {
  const resolvedTargetId = targetId || pickReactionTargetIdFromChat(chat)
  if (!resolvedTargetId) return ''
  const cachedText = messagePreviewTextById.get(resolvedTargetId)
  if (cachedText) return cachedText
  const target = findMessageInCachesById(
    resolvedTargetId,
    chat.chatJid || chat.wa_chatid || chat.chatid || ''
  )
  return messageTextForReactionQuote(target)
}

const refreshReactionPreviewForChatJid = (chatJid, msgs = []) => {
  const key = canonicalChatListKey({ chatJid })
  const row = (chats.value || []).find((item) => canonicalChatListKey(item) === key)
  if (!row || !isReactionMessageType(row.wa_lastMessageType || row.lastMessageType)) return

  const lastReaction = [...(msgs || [])].reverse().find((item) => item?.isReaction)
  const patch = {}
  if (lastReaction?.reactionTargetId) {
    patch.wa_lastReactionTargetId = lastReaction.reactionTargetId
  }
  if (strTrim(lastReaction?.reactionEmoji || '')) {
    patch.wa_lastMessageTextVote = strTrim(lastReaction.reactionEmoji)
  }

  refreshChatPreview(chatJid, {
    ...patch,
    lastMessage: resolveChatListLastMessage({ ...row, ...patch }),
    lastMessageFromMe: lastReaction ? Boolean(lastReaction.fromMe) : inferChatLastMessageFromMe(row),
    wa_lastMessageType: 'reaction',
    preserveSortOrder: true,
  })
}

export const indexMessagesForPreviewCache = (messages = []) => {
  for (const raw of messages || []) {
    const msg = raw?.isReaction != null ? raw : normalizeMessageForDisplay(raw)
    if (!msg || msg.isReaction) continue
    const preview = messageTextForReactionQuote(msg)
    if (!preview) continue
    const keys = [
      normalizeProviderMessageId(msg.messageid),
      normalizeProviderMessageId(msg.id),
      normalizeProviderMessageId(msg.normalizedMessageId)
    ].filter(Boolean)
    for (const key of keys) messagePreviewTextById.set(key, preview)
  }
}

const indexRawWebhookMessageForCache = (message = {}) => {
  if (!message || typeof message !== 'object') return
  if (isReactionMessageType(message.messageType || message.type)) return
  const preview = strTrim(message.text || message.body || '')
  if (!preview) return
  const keys = [
    normalizeProviderMessageId(message.messageid),
    normalizeProviderMessageId(message.id)
  ].filter(Boolean)
  for (const key of keys) messagePreviewTextById.set(key, preview)
}

const extractReactionMetaFromWebhookMessage = (message = {}) => {
  if (!message || typeof message !== 'object') return {}
  if (!isReactionMessageType(message.messageType || message.type)) return {}
  const targetId = normalizeProviderMessageId(
    message.reaction ||
    message.content?.key?.ID ||
    message.content?.key?.id
  )
  return {
    wa_lastReactionTargetId: targetId,
    lastMessageFromMe: Boolean(message.fromMe),
    fromMe: Boolean(message.fromMe)
  }
}

const extractLastMessageMetaFromWebhookMessage = (message = {}) => {
  if (!message || typeof message !== 'object') return {}
  const reactionMeta = extractReactionMetaFromWebhookMessage(message)
  if (Object.keys(reactionMeta).length) return reactionMeta
  const text = strTrim(message.text || message.body || '')
  return {
    lastMessageFromMe: Boolean(message.fromMe),
    fromMe: Boolean(message.fromMe),
    ...(text ? { wa_lastMessageTextVote: text } : {})
  }
}

export const applyWhatsappRealtimePayload = (payload = {}) => {
  const chat = payload?.chat
  if (chat && typeof chat === 'object') {
    const deletedCandidate = normalizeChat({
      ...chat,
      chatJid: chat.wa_chatid || chat.chatid || chat.chatJid || payload?.chatJid || '',
    })
    if (isChatDeletedLocally(deletedCandidate)) return true
    if (
      chat.deleted === true ||
      chat.wa_deleted === true ||
      chat.isDeleted === true
    ) {
      removeChatFromLocalState(deletedCandidate)
      return true
    }
  }

  if (!chat || typeof chat !== 'object') return false

  const message = payload?.message
  const reactionMeta = message && typeof message === 'object'
    ? extractLastMessageMetaFromWebhookMessage(message)
    : {}

  if (message) {
    indexRawWebhookMessageForCache(message)
    ingestLidPnHintsFromMessages([message])
  }

  const chatWaChatid = normalizeJid(chat.wa_chatid || chat.chatid || chat.chatJid || message?.chatid || '')
  const chatWaChatlid = normalizeJid(chat.wa_chatlid || '')
  if (chatWaChatlid && chatWaChatid.endsWith('@s.whatsapp.net')) {
    ingestLidPnHintsFromMessages([{
      fromMe: false,
      sender_lid: chatWaChatlid,
      sender_pn: chatWaChatid,
    }])
  }

  const selectedJid = normalizeJid(selectedChat.value?.chatJid || '')
  const isOpenChat = Boolean(selectedJid && chatWaChatid && jidsReferToSameChat(chatWaChatid, selectedJid))
  const chatKey = canonicalChatListKey({ chatJid: chatWaChatid })
  const existingRow = chatKey
    ? (chats.value || []).find((item) => canonicalChatListKey(item) === chatKey)
    : null
  const prevUnread = Math.max(0, Math.floor(Number(existingRow?.unreadCount ?? existingRow?.wa_unreadCount ?? 0) || 0))
  const apiUnread = Math.max(0, Math.floor(Number(chat.wa_unreadCount ?? chat.unreadCount ?? 0) || 0))

  let nextUnread = Math.max(prevUnread, apiUnread)
  if (isOpenChat) {
    nextUnread = 0
  } else if (message && typeof message === 'object' && !Boolean(message.fromMe)) {
    const msgTs = normalizeTimestampToMs(
      message.messageTimestamp || message.timestamp || chat.wa_lastMsgTimestamp
    )
    const prevTs = getChatActivityTimestamp(existingRow || chat)
    const previewText = strTrim(message.text || message.body || chat.wa_lastMessageTextVote || '')
    const prevPreview = strTrim(existingRow?.lastMessage || existingRow?.wa_lastMessageTextVote || '')
    if (msgTs > prevTs || (previewText && previewText !== prevPreview)) {
      nextUnread = Math.max(nextUnread, prevUnread + 1, 1)
    }
  }

  const row = normalizeChat({
    ...chat,
    ...reactionMeta,
    unreadCount: nextUnread,
    wa_unreadCount: nextUnread,
    chatJid: chat.wa_chatid || chat.chatid || chat.chatJid || message?.chatid,
    avatarUrl: chat.imagePreview || chat.image || chat.avatarUrl || ''
  })

  mergeChatsSliceIntoList([row])
  syncSelectedChatAfterChatsMutation()

  const chatJid = row.chatJid
  if (chatJid && isReactionMessageType(chat.wa_lastMessageType || chat.lastMessageType)) {
    const preview = resolveChatListLastMessage({ ...row, ...reactionMeta })
    refreshChatPreview(chatJid, {
      ...row,
      ...reactionMeta,
      lastMessage: preview,
      preserveSortOrder: true,
    })
  }

  return true
}

export const resolveChatListLastMessage = (chat = {}) => {
  const presencePreview = resolveChatListPresencePreview(chat)
  if (presencePreview) return presencePreview

  const formatted = pickFirstNonEmptyText(chat.lastMessage, chat.lastMessagePreview)
  if (formatted && REACTION_LIST_PREVIEW_RE.test(formatted)) return truncateChatListPreview(formatted)

  const msgType = String(chat.wa_lastMessageType || chat.lastMessageType || '').trim()
  if (isReactionMessageType(msgType)) {
    const emoji = pickReactionEmojiFromChat(chat)
    const quotedText = lookupReactionQuotedText(chat)
    return truncateChatListPreview(
      formatReactionListPreview(emoji, quotedText, { fromMe: inferReactionFromMe(chat) })
    )
  }

  const emojiOrText = pickFirstNonEmptyText(
    chat.wa_lastMessageTextVote,
    chat.wa_lastMsgText,
    chat.wa_lastMessageText,
    chat.lastMsgText,
    chat.last_message,
    chat.last_message_text,
    chat.wa_lastMsgBody,
    formatted
  )

  const msgTypeLower = msgType.toLowerCase()
  if (msgTypeLower.includes('list') && emojiOrText.includes('\n')) {
    const { body } = parseListMessageTextVote(emojiOrText)
    if (body) return truncateChatListPreview(body)
  }

  const result = emojiOrText || formatted || fallbackLastMessageFromChatType(chat) || ''
  return truncateChatListPreview(result)
}

const formatAudioDurationLabel = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `🎙️ ${minutes}:${String(secs).padStart(2, '0')}`
}

export const messageTextForReactionQuote = (msg) => {
  if (!msg) return ''
  const text = strTrim(msg.text)
  if (text) return text
  if (msg.isMedia || msg.mediaUrl || msg.mediaThumbUrl) {
    if (msg.mediaType === 'image') return 'Foto'
    if (msg.mediaType === 'video') return 'Vídeo'
    if (msg.mediaType === 'audio') {
      const dur = Number(msg.audioDurationSeconds || 0)
      return dur > 0 ? formatAudioDurationLabel(dur) : '🎙️ 0:00'
    }
    if (msg.mediaType === 'sticker') return 'Figurinha'
    if (msg.mediaType === 'document') return strTrim(msg.documentFileName) || 'Documento'
    return 'Mídia'
  }
  if (msg.isContactShare) return 'Contato compartilhado'
  return ''
}

export const buildReactionChatListPreview = (targetMsg, emoji, { fromMe = false } = {}) => {
  const quotedText = messageTextForReactionQuote(targetMsg)
  return truncateChatListPreview(formatReactionListPreview(emoji, quotedText, { fromMe }))
}

export const refreshChatPreviewForUserReaction = (targetMsg, emoji, { removed = false } = {}) => {
  const chatJid = normalizeJid(selectedChat.value?.chatJid || targetMsg?.chatJid || '')
  if (!chatJid) return

  const targetId = normalizeProviderMessageId(targetMsg?.messageid || targetMsg?.id || '')
  if (targetId) {
    const quote = messageTextForReactionQuote(targetMsg)
    if (quote) messagePreviewTextById.set(targetId, quote)
  }

  if (removed) return

  const reactionEmoji = strTrim(String(emoji || ''))
  if (!reactionEmoji) return

  refreshChatPreview(chatJid, {
    lastMessage: buildReactionChatListPreview(targetMsg, reactionEmoji, { fromMe: true }),
    lastMessageFromMe: true,
    lastMessagePrefix: '',
    preserveSortOrder: true,
    wa_lastMessageType: 'reaction',
    wa_lastMessageTextVote: reactionEmoji,
    wa_lastReactionTargetId: targetId,
  })
}

export const buildChatListPreviewFromMessage = (msg, allMessages = []) => {
  if (!msg) return ''
  if (msg.isReaction) {
    let quotedText = ''
    const targetId = normalizeProviderMessageId(msg.reactionTargetId)
    if (targetId) {
      const target = (allMessages || []).find((row) => {
        if (!row || row.isReaction) return false
        const keys = [
          normalizeProviderMessageId(row.messageid),
          normalizeProviderMessageId(row.id),
          normalizeProviderMessageId(row.normalizedMessageId)
        ].filter(Boolean)
        return keys.includes(targetId)
      })
      quotedText = messageTextForReactionQuote(target)
    }
    return formatReactionListPreview(msg.reactionEmoji, quotedText, { fromMe: Boolean(msg.fromMe) })
  }
  if (msg.interactive?.kind === 'menu') {
    if (msg.interactive.menuType === 'list') {
      return strTrim(msg.interactive.title) || strTrim(msg.interactive.listButton) || 'Lista'
    }
    if (msg.interactive.menuType === 'carousel') return strTrim(msg.interactive.title) || 'Carrossel'
    if (msg.interactive.menuType === 'pix-button' || msg.interactive.menuType === 'request-payment') {
      return strTrim(msg.interactive.title) || 'Pagamento PIX'
    }
    const firstOption = (msg.interactive.options || []).find((opt) => !opt?.isSection)
    return strTrim(msg.interactive.title) || strTrim(firstOption?.label) || 'Botões'
  }
  return strTrim(msg.text) || messageTextForReactionQuote(msg) || ''
}

export const fallbackLastMessageFromChatType = (chat = {}) => {
  const t = String(chat?.wa_lastMessageType || chat?.lastMessageType || '').trim().toLowerCase()
  if (!t) return ''
  if (t.includes('sticker')) return 'Figurinha'
  if (t.includes('audio') || t.includes('ptt') || t.includes('voice')) return 'Áudio'
  if (t.includes('video') || t.includes('gif')) return 'Vídeo'
  if (t.includes('image')) return 'Foto'
  if (t.includes('document') || t.includes('file')) return 'Documento'
  if (t.includes('contact') || t.includes('vcard')) return 'Contato compartilhado'
  if (t.includes('list')) return 'Lista'
  if (t.includes('carousel')) return 'Carrossel'
  if (t.includes('pix')) return 'PIX'
  if (t.includes('payment')) return 'Pagamento'
  if (t.includes('button') || t.includes('template') || t.includes('interactive') || t.includes('native') || t.includes('flow')) return 'Botões'
  return ''
}

export const canonicalChatListKey = (chat) => {
  const j = normalizeJid(
    chat?.chatJid ||
    chat?.wa_chatid ||
    chat?.chatid ||
    chat?.wa_chatlid ||
    chat?.chatlid ||
    '',
  )
  if (!j) return ''
  if (j.endsWith('@g.us')) return `g:${j}`
  const digits = (j.split('@')[0] || '').replace(/\D/g, '')
  if (digits.length >= 10) return j.endsWith('@lid') ? `lid:${digits}` : `pn:${digits}`
  return `jid:${j}`
}

export const preferWhatsappNetPrivateJid = (a, b) => {
  const x = normalizeJid(a), y = normalizeJid(b)
  if (!x) return y
  if (!y) return x
  if (x.endsWith('@s.whatsapp.net')) return x
  if (y.endsWith('@s.whatsapp.net')) return y
  return x
}

export const isActiveChatListItem = (chat) => {
  if (!selectedChat.value || !chat) return false
  const a = canonicalChatListKey(chat), b = canonicalChatListKey(selectedChat.value)
  if (a && b && a === b) return true
  return selectedChat.value.id === chat.id
}

const buildPinnedMatchKey = (value) => {
  const jid = normalizeJid(value)
  if (!jid) return ''
  if (jid.endsWith('@g.us')) return `group:${jid}`
  if (jid.endsWith('@lid')) {
    const lidDigits = (jid.split('@')[0] || '').replace(/\D/g, '')
    return lidDigits ? `lid:${lidDigits}` : `jid:${jid}`
  }
  const digits = (jid.split('@')[0] || '').replace(/\D/g, '')
  if (digits) return `contact:${digits}`
  return `jid:${jid}`
}

const buildPinnedMatchKeysFromPayload = (payload = {}) => {
  const keys = new Set()
  for (const candidate of collectChatIdentityIds(payload)) {
    const key = buildPinnedMatchKey(candidate)
    if (key) keys.add(key)
  }
  return Array.from(keys)
}

export const normalizeChat = (chat) => {
  const internalId = chat.id || chat.fastid || ''
  const chatJid = preferWhatsappNetPrivateJid(
    chat.wa_chatid || '',
    chat.chatJid || chat.chatid || '',
  ) || chat.wa_chatid || chat.chatJid || chat.chatid || normalizeJid(chat.wa_chatlid || chat.chatlid || '')
  const resolvedLastMessageTimeMs = normalizeTimestampToMs(
    chat.lastMessageTime ||
    chat.wa_lastMsgTimestamp ||
    chat.wa_lastMessageTimestamp ||
    chat.wa_lastMessageTime ||
    chat.lastMsgTimestamp ||
    chat.last_message_timestamp ||
    chat.timestamp ||
    chat.updatedAt ||
    chat.wa_updatedAt ||
    chat.createdAt
  )
  const resolvedTimestampMs = normalizeTimestampToMs(
    chat.timestamp ||
    chat.wa_lastMsgTimestamp ||
    chat.wa_lastMessageTimestamp ||
    chat.wa_lastMessageTime ||
    chat.lastMsgTimestamp ||
    chat.last_message_timestamp ||
    chat.lastMessageTime ||
    chat.updatedAt ||
    chat.wa_updatedAt ||
    chat.createdAt
  )
  const isGroup = Boolean(chat.isGroup ?? chat.wa_isGroup ?? String(chatJid || '').endsWith('@g.us'))
  const lastSenderLabel = sanitizeSenderLabelCandidate(chat.wa_lastSenderName) || sanitizeSenderLabelCandidate(chat.wa_lastMsgSenderName) || sanitizeSenderLabelCandidate(chat.lastSenderName)
  const lastMessagePrefixRaw = strTrim(chat.lastMessagePrefix || chat.wa_lastMsgPrefix || chat.lastSenderName || '')

  const unreadRaw = Number(chat.unreadCount ?? chat.wa_unreadCount ?? 0)
  const unreadSafe = Number.isFinite(unreadRaw) ? Math.max(0, Math.floor(unreadRaw)) : 0
  const normalized = {
    ...chat,
    id: internalId || chatJid,
    chatJid,
    isGroup,
    name: chat.name || chat.wa_name || '',
    pushName: chat.pushName || chat.wa_contactName || chat.wa_name || '',
    avatarUrl: chat.avatarUrl || chat.image || chat.imagePreview || '',
    lastMessage: resolveChatListLastMessage(chat),
    lastMessageSender: normalizeJid(chat.lastMessageSender || chat.wa_lastMessageSender || ''),
    lastMessageFromMe: inferChatLastMessageFromMe(chat),
    isPinned: parseWaPinnedFlag(chat.wa_isPinned),
    isArchived: Boolean(chat.wa_archived || chat.isArchived),
    muteEndTime: Number(chat.wa_muteEndTime ?? chat.muteEndTime ?? 0),
    isMuted: isChatMutedByEndTime(chat.wa_muteEndTime ?? chat.muteEndTime),
    lastMessagePrefix: isGroup ? lastMessagePrefixRaw : '',
    lastMessageTime: resolvedLastMessageTimeMs,
    timestamp: resolvedTimestampMs,
    unreadCount: unreadSafe,
    wa_unreadCount: unreadSafe,
    labelIds: normalizeChatLabelIds(chat.wa_label),
    updatedAt: normalizeTimestampToMs(chat.updatedAt)
  }

  if (normalized.isGroup && !normalized.lastMessagePrefix && lastSenderLabel) {
    normalized.lastMessagePrefix = `~${lastSenderLabel}: `
  }

  return normalized
}

const syncChatActivityTimestampFields = (row, activityMs) => {
  const ts = normalizeTimestampToMs(activityMs)
  if (!ts) return
  row.lastMessageTime = ts
  row.timestamp = ts
  row.wa_lastMsgTimestamp = ts
}

const applyNewerChatActivityWinner = (merged, prevRow, incomingRow) => {
  const prevActivity = getChatActivityTimestamp(prevRow)
  const incomingActivity = getChatActivityTimestamp(incomingRow)
  if (prevActivity > incomingActivity) {
    syncChatActivityTimestampFields(merged, prevActivity)
    if (strTrim(prevRow.lastMessage || '')) {
      merged.lastMessage = prevRow.lastMessage
      merged.lastMessagePrefix = prevRow.lastMessagePrefix
      merged.lastMessageFromMe = prevRow.lastMessageFromMe
      merged.wa_lastMessageTextVote = prevRow.wa_lastMessageTextVote
      merged.wa_lastMessageType = prevRow.wa_lastMessageType
      merged.wa_lastMsgText = prevRow.wa_lastMsgText
      merged.wa_lastMessageText = prevRow.wa_lastMessageText
      merged.lastMessageSender = prevRow.lastMessageSender
      merged.wa_lastMessageSender = prevRow.wa_lastMessageSender
    }
    return
  }
  if (incomingActivity > prevActivity) {
    syncChatActivityTimestampFields(merged, incomingActivity)
  }
}

export const mergeDuplicateChatRows = (prevRow, incomingRow) => {
  if (!incomingRow) return prevRow
  if (!prevRow) {
    const sole = { ...incomingRow }
    sole.chatJid = preferWhatsappNetPrivateJid(sole.wa_chatid, sole.chatJid)
    sole.isPinned = Boolean(parseWaPinnedFlag(sole.wa_isPinned))
    sole.muteEndTime = Number(sole.wa_muteEndTime ?? sole.muteEndTime ?? 0)
    sole.isMuted = isChatMutedByEndTime(sole.muteEndTime)
    return sole
  }
  const merged = { ...prevRow, ...incomingRow }
  merged.chatJid = preferWhatsappNetPrivateJid(
    incomingRow.wa_chatid || prevRow.wa_chatid,
    preferWhatsappNetPrivateJid(prevRow.chatJid, incomingRow.chatJid),
  )
  merged.isPinned = Boolean(parseWaPinnedFlag(incomingRow.wa_isPinned ?? merged.wa_isPinned))
  Object.assign(merged, mergeChatMuteState(prevRow, incomingRow))

  const incomingTarget = pickReactionTargetIdFromChat(incomingRow)
  const prevTarget = pickReactionTargetIdFromChat(prevRow)
  if (!incomingTarget && prevTarget) {
    merged.wa_lastReactionTargetId = prevTarget
  }

  if (isReactionMessageType(merged.wa_lastMessageType || merged.lastMessageType)) {
    merged.lastMessage = resolveChatListLastMessage(merged)
  }

  // Sincronização de não lidas:
  // - Se a API trouxe MENOS que o estado local, confiar na API (leitura no celular / outro cliente).
  // - Se local já está 0 e a API ainda mostra não lidas mas sem mensagem nova, manter 0 (UAZAPI stale após /chat/read no web).
  const prevUnread = Math.max(0, Math.floor(Number(prevRow?.unreadCount ?? prevRow?.wa_unreadCount ?? 0) || 0))
  const incomingUnread = Math.max(0, Math.floor(Number(incomingRow?.unreadCount ?? incomingRow?.wa_unreadCount ?? 0) || 0))
  const prevLastMsg = getChatActivityTimestamp(prevRow)
  const incomingLastMsg = getChatActivityTimestamp(incomingRow)

  if (incomingUnread < prevUnread) {
    if (incomingUnread === 0 && incomingLastMsg <= prevLastMsg && prevUnread > 0) {
      merged.unreadCount = prevUnread
      merged.wa_unreadCount = prevUnread
    } else {
      merged.unreadCount = incomingUnread
      merged.wa_unreadCount = incomingUnread
    }
  } else if (prevUnread === 0 && incomingUnread > 0 && incomingLastMsg < prevLastMsg) {
    // UAZAPI stale: ainda reporta não lidas, mas a última atividade é mais antiga que a nossa.
    merged.unreadCount = 0
    merged.wa_unreadCount = 0
  } else if (prevUnread === 0 && incomingUnread > 0 && incomingLastMsg === prevLastMsg) {
    const previewChanged =
      strTrim(incomingRow.lastMessage || incomingRow.wa_lastMessageTextVote || '') !==
      strTrim(prevRow.lastMessage || prevRow.wa_lastMessageTextVote || '')
    merged.unreadCount = previewChanged ? incomingUnread : 0
    merged.wa_unreadCount = merged.unreadCount
  } else {
    merged.unreadCount = Math.max(prevUnread, incomingUnread)
    merged.wa_unreadCount = merged.unreadCount
  }
  const incomingText = strTrim(incomingRow.lastMessage || ''), prevText = strTrim(prevRow.lastMessage || '')
  const incomingPrefix = strTrim(incomingRow.lastMessagePrefix || ''), prevPrefix = strTrim(prevRow.lastMessagePrefix || '')
  const samePreviewMessage = Boolean(incomingText && prevText && incomingText === prevText)
  if (!incomingPrefix && prevPrefix && samePreviewMessage) merged.lastMessagePrefix = prevPrefix
  else if (incomingPrefix) merged.lastMessagePrefix = incomingPrefix
  else merged.lastMessagePrefix = strTrim(merged.lastMessagePrefix || '')

  const keepPrevIfIncomingEmpty = (field) => {
    const inc = incomingRow?.[field], prev = prevRow?.[field]
    if (typeof inc === 'string' && strTrim(inc) === '' && typeof prev === 'string' && strTrim(prev) !== '') merged[field] = prev
  }
  for (const f of [
    'wa_lastSenderName', 'wa_lastMsgSenderName', 'lastSenderName',
    'wa_lastMessageSender', 'lastMessageSender', 'wa_lastMessageTextVote', 'wa_lastMessageType'
  ]) keepPrevIfIncomingEmpty(f)

  const isGroup = Boolean(merged.isGroup) || normalizeJid(merged.chatJid).endsWith('@g.us')
  const nextPrefix = strTrim(merged.lastMessagePrefix || '')
  if (isGroup && !nextPrefix) {
    const label = sanitizeSenderLabelCandidate(merged.wa_lastSenderName) || sanitizeSenderLabelCandidate(merged.lastSenderName)
    if (label) merged.lastMessagePrefix = `~${label}: `
  }

  applyNewerChatActivityWinner(merged, prevRow, incomingRow)
  if (isReactionMessageType(merged.wa_lastMessageType || merged.lastMessageType)) {
    const prevSortTime = getChatActivityTimestamp(prevRow)
    if (prevSortTime) syncChatActivityTimestampFields(merged, prevSortTime)
  }
  merged.lastMessageFromMe = inferChatLastMessageFromMe(merged)
  if (!strTrim(merged.lastMessage || '')) {
    merged.lastMessage = resolveChatListLastMessage(merged) ||
      fallbackLastMessageFromChatType(incomingRow) ||
      fallbackLastMessageFromChatType(merged) ||
      ''
  }
  return merged
}

export const mergeChatsSliceIntoList = (rawIncoming) => {
  const byKey = new Map()
  for (const chat of (chats.value || [])) {
    if (!hasRealConversation(chat)) continue
    const key = canonicalChatListKey(chat)
    if (key && isChatDeletedLocally(chat)) continue
    if (key) byKey.set(key, chat)
  }
  for (const rawChat of rawIncoming) {
    const normalized = normalizeChat(rawChat)
    if (!hasRealConversation(normalized)) continue
    if (isChatDeletedLocally(normalized)) continue
    const key = canonicalChatListKey(normalized)
    if (!key) continue
    byKey.set(key, mergeDuplicateChatRows(byKey.get(key) || null, normalized))
  }
  chats.value = sortChatsByPriority(Array.from(byKey.values()))
}

let openChatCatchUpTimer = null
let lastOpenChatCatchUpAt = 0

const scheduleOpenChatCatchUp = (options = {}) => {
  if (typeof window === 'undefined') return
  if (!selectedChat.value) return
  if (!sidebarLooksNewerThanThread(selectedChat.value, messages.value)) return
  const now = Date.now()
  // Evita rajada de findMessages (GuzzApp) em lightSync/pin refresh.
  if (now - lastOpenChatCatchUpAt < 2500 && !options.force) return
  if (openChatCatchUpTimer) clearTimeout(openChatCatchUpTimer)
  openChatCatchUpTimer = setTimeout(() => {
    openChatCatchUpTimer = null
    if (!selectedChat.value) return
    if (!sidebarLooksNewerThanThread(selectedChat.value, messages.value)) return
    lastOpenChatCatchUpAt = Date.now()
    void refreshSelectedChatMessages({}, { force: true, light: true }).then(() => {
      stickChatScrollToBottomIfNeeded()
      if (!sidebarLooksNewerThanThread(selectedChat.value, messages.value)) return
      void refreshSelectedChatMessages({}, {
        force: true,
        light: true,
        syncFromUazapi: true,
      }).then(() => stickChatScrollToBottomIfNeeded())
    })
  }, options.immediate ? 0 : 350)
}

export const syncSelectedChatAfterChatsMutation = () => {
  const cur = selectedChat.value
  if (!cur) return
  const key = canonicalChatListKey(cur)
  if (!key) return
  const found = (chats.value || []).find((c) => canonicalChatListKey(c) === key)
  if (!found) return
  const preferJid = preferWhatsappNetPrivateJid(
    found.wa_chatid || cur.wa_chatid,
    preferWhatsappNetPrivateJid(cur.chatJid, found.chatJid),
  )
  const next = found === cur && normalizeJid(cur.chatJid) === normalizeJid(preferJid)
    ? cur
    : { ...found, chatJid: preferJid }
  if (next !== cur) selectedChat.value = next

  // Sidebar do chat aberto à frente → agenda catch-up do thread.
  scheduleOpenChatCatchUp()
}

export const refreshChatPreview = (chatJid, payload) => {
  const norm = normalizeJid(chatJid)
  const targetKey = canonicalChatListKey({ chatJid: norm })
  const rowMatchesTarget = (item) => !norm ? false : normalizeJid(item.chatJid) === norm || (Boolean(targetKey) && canonicalChatListKey(item) === targetKey)
  const existing = (chats.value || []).find((item) => rowMatchesTarget(item)) || {}
  const mergedPayload = { ...payload }
  const preserveSortOrder = payload.preserveSortOrder === true
  if (preserveSortOrder) {
    delete mergedPayload.lastMessageTime
    delete mergedPayload.timestamp
    delete mergedPayload.wa_lastMsgTimestamp
    delete mergedPayload._localActivityAt
  } else if (payload.lastMessageTime !== undefined) {
    const activityMs = normalizeTimestampToMs(payload.lastMessageTime)
    if (activityMs) {
      mergedPayload.lastMessageTime = activityMs
      mergedPayload.timestamp = activityMs
      mergedPayload.wa_lastMsgTimestamp = activityMs
    }
  }
  delete mergedPayload.preserveSortOrder
  if (payload.lastMessage !== undefined || payload.wa_lastMessageTextVote !== undefined) {
    mergedPayload.lastMessage = resolveChatListLastMessage({ ...existing, ...payload })
  }
  mergedPayload.lastMessageFromMe = inferChatLastMessageFromMe({ ...existing, ...mergedPayload })

  if (
    payload.isMuted !== undefined ||
    payload.muteEndTime !== undefined ||
    payload.wa_muteEndTime !== undefined
  ) {
    const end = Number(
      mergedPayload.muteEndTime ??
      mergedPayload.wa_muteEndTime ??
      existing.muteEndTime ??
      existing.wa_muteEndTime ??
      0
    )
    mergedPayload.muteEndTime = end
    mergedPayload.wa_muteEndTime = end
    mergedPayload.isMuted = payload.isMuted !== undefined
      ? Boolean(payload.isMuted)
      : isChatMutedByEndTime(end)
    mergedPayload._muteOptimisticUntil = Date.now() + MUTE_OPTIMISTIC_TTL_MS
  }

  chats.value = sortChatsByPriority(
    chats.value.map((item) => rowMatchesTarget(item) ? { ...item, ...mergedPayload } : item)
  )

  if (selectedChat.value && rowMatchesTarget(selectedChat.value)) {
    selectedChat.value = { ...selectedChat.value, ...mergedPayload }
  }
}

export const chatListPreviewPrefix = (chat = {}) => {
  const isGroup = Boolean(chat?.isGroup) || normalizeJid(chat?.chatJid || '').endsWith('@g.us')
  const raw = strTrim(chat?.lastMessagePrefix || '')
  if (!isGroup) return ''
  const senderLabel = resolveChatListSenderLabel(chat)
  if (senderLabel) return `${senderLabel}: `
  if (raw.startsWith('~')) return `${raw.slice(1)}`
  return ''
}

// ─── API fetch ────────────────────────────────────────────────────────────────

const fetchChatsPage = async (limit = 200, offset = 0, extraFilters = {}) => {
  const proxyBase = getProxyBase()
  const tryBodies = [
    { operator: 'AND', sort: '-wa_lastMsgTimestamp', limit, offset, ...extraFilters },
    { sort: '-wa_lastMsgTimestamp', limit, offset, ...extraFilters },
    { limit, offset, ...extraFilters }
  ]
  const parseChatsRows = (data) => {
    if (Array.isArray(data?.chats)) return data.chats
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data)) return data
    return []
  }

  let lastError = null
  for (const bodyPayload of tryBodies) {
    let res
    try {
      res = await fetch(`${proxyBase}/chat/find`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify(bodyPayload)
      })
    } catch {
      lastError = new Error('BACKEND_OFFLINE')
      continue
    }
    const data = await parseJsonBodySafe(res)
    if (res.status === 401) {
      if (typeof navigateTo !== 'undefined') navigateTo('/')
      throw new Error('AUTH_EXPIRED')
    }
    if (res.status === 503 || res.status === 504) {
      lastError = new Error('BACKEND_OFFLINE')
      continue
    }
    if (!res.ok) {
      lastError = new Error(data?.message || data?.error || 'Erro ao buscar chats')
      continue
    }
    const rows = parseChatsRows(data)
    const totalRecords = Number.isFinite(Number(data?.pagination?.totalRecords))
      ? Number(data.pagination.totalRecords)
      : Number.isFinite(Number(data?.totalRecords))
        ? Number(data.totalRecords)
        : null
    return { chats: rows, totalRecords }
  }

  throw lastError || new Error('Erro ao buscar chats')
}

const listAllChatsFromUazapi = async () => {
  const pageSize = 300, maxPages = 20
  let offset = 0, totalRecords = null
  const byKey = new Map()
  for (let page = 0; page < maxPages; page++) {
    const pageResult = await fetchChatsPage(pageSize, offset)
    if (totalRecords === null && pageResult.totalRecords !== null) totalRecords = pageResult.totalRecords
    if (pageResult.chats.length === 0) break
    for (const chat of pageResult.chats) {
      const normalized = normalizeChat(chat), key = canonicalChatListKey(normalized)
      if (!key || !hasRealConversation(normalized)) continue
      byKey.set(key, mergeDuplicateChatRows(byKey.get(key) || null, normalized))
    }
    offset += pageResult.chats.length
    if (totalRecords !== null && offset >= totalRecords) break
    if (pageResult.chats.length < pageSize) break
  }
  return Array.from(byKey.values())
}

const hasRealConversation = (chat = {}) => {
  const ts = Number(
    chat?.lastMessageTime ||
    chat?.wa_lastMsgTimestamp ||
    chat?.timestamp ||
    0,
  )
  return ts > 0
}

const filterRealConversations = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter((chat) => hasRealConversation(chat))

const loadChatsFromBackendCache = async () => {
  const apiBase = getWhatsappApiBase()
  if (!apiBase) return []
  try {
    const res = await fetch(`${apiBase}/chats?cache=1`, whatsappFetchInit())
    const data = await parseJsonBodySafe(res)
    if (!res.ok) return []
    const rows = Array.isArray(data?.chats) ? data.chats : []
    const normalized = rows.map((chat) => normalizeChat(chat)).filter((chat) => canonicalChatListKey(chat))
    // Cache do DB costuma ter contatos sem preview — isso vira o flash de "Nenhuma mensagem".
    const withPreview = filterRealConversations(normalized).filter((chat) => {
      const preview = String(
        chat?.lastMessage ||
        chat?.wa_lastMessageTextVote ||
        chat?.wa_lastMsgText ||
        chat?.wa_lastMessageText ||
        ''
      ).trim().toLowerCase()
      return preview && preview !== 'nenhuma mensagem'
    })
    if (withPreview.length >= 8) return withPreview
    return []
  } catch {
    return []
  }
}

const loadChatsFromBackendSync = async (forceRefresh = false) => {
  const apiBase = getWhatsappApiBase()
  if (!apiBase) return []
  try {
    const query = forceRefresh ? '?refresh=1' : ''
    const res = await fetch(`${apiBase}/chats${query}`, whatsappFetchInit())
    const data = await parseJsonBodySafe(res)
    if (!res.ok) return []
    const rows = Array.isArray(data?.chats) ? data.chats : []
    return filterRealConversations(
      rows.map((chat) => normalizeChat(chat)).filter((chat) => canonicalChatListKey(chat)),
    )
  } catch {
    return []
  }
}

const applyResolvedChatsList = async (resolvedChats, { skipPinnedFetch = false } = {}) => {
  const realChats = filterRealConversations(resolvedChats)
  if (!Array.isArray(realChats) || realChats.length === 0) return false

  const chatsWithPin = realChats.map((chat) => ({
    ...chat,
    isPinned: parseWaPinnedFlag(chat.wa_isPinned),
    muteEndTime: Number(chat.wa_muteEndTime ?? chat.muteEndTime ?? 0),
    isMuted: isChatMutedByEndTime(chat.wa_muteEndTime ?? chat.muteEndTime),
  }))

  let pinnedByFilter = new Map()
  if (!skipPinnedFetch) {
    try {
      pinnedByFilter = await listPinnedChatsFromUazapi()
    } catch {
      pinnedByFilter = new Map()
    }
  }

  const prevByKey = new Map()
  for (const chat of (chats.value || [])) {
    const key = canonicalChatListKey(chat)
    if (key) prevByKey.set(key, chat)
  }

  const chatsWithPinSynced = chatsWithPin.map((chat) => {
    const keys = buildPinnedMatchKeysFromPayload(chat)
    const next = { ...chat, isPinned: Boolean(chat.isPinned || keys.some((key) => pinnedByFilter.has(key))) }
    const prev = prevByKey.get(canonicalChatListKey(next))
    if (prev) Object.assign(next, mergeChatMuteState(prev, next))
    return next
  })

  chats.value = sortChatsByPriority(
    chatsWithPinSynced.filter((chat) => !isChatDeletedLocally(chat)),
  )
  syncSelectedChatAfterChatsMutation()
  enrichMissingChatAvatars().catch(() => {})
  // Mais avatares após lista fresca (grupos/contatos com URL CDN expirada).
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      enrichMissingChatAvatars({ limit: 40 }).catch(() => {})
    }, 1500)
  }
  prefetchTopChatsMessagesFromDb(chats.value)
  return true
}

const listPinnedChatsFromUazapi = async () => {
  const pageSize = 200, maxPages = 10
  let offset = 0, totalRecords = null
  const byKey = new Map()
  for (let page = 0; page < maxPages; page++) {
    const pageResult = await fetchChatsPage(pageSize, offset, { wa_isPinned: true })
    if (totalRecords === null && pageResult.totalRecords !== null) totalRecords = pageResult.totalRecords
    if (pageResult.chats.length === 0) break
    for (const chat of pageResult.chats) {
      if (!parseWaPinnedFlag(chat?.wa_isPinned ?? chat?.isPinned)) continue
      const keys = buildPinnedMatchKeysFromPayload(chat)
      if (!keys.length) continue
      for (const key of keys) byKey.set(key, true)
    }
    offset += pageResult.chats.length
    if (totalRecords !== null && offset >= totalRecords) break
    if (pageResult.chats.length < pageSize) break
  }
  return byKey
}

/** Pinned flags custam 1-10 POST /chat/find na UAZAPI — no lightSync, no máx. 1×/60s. */
let lastPinnedFlagsRefreshAt = 0
const PINNED_FLAGS_REFRESH_MIN_MS = 60_000

const refreshPinnedChatFlagsThrottled = async () => {
  const now = Date.now()
  if (now - lastPinnedFlagsRefreshAt < PINNED_FLAGS_REFRESH_MIN_MS) return
  lastPinnedFlagsRefreshAt = now
  await refreshPinnedChatFlags()
}

export const refreshPinnedChatFlags = async () => {
  const list = chats.value || []
  if (!list.length) return

  let pinnedByFilter = new Map()
  try {
    pinnedByFilter = await listPinnedChatsFromUazapi()
  } catch {
    pinnedByFilter = new Map()
  }

  chats.value = sortChatsByPriority(list.map((chat) => {
    const keys = buildPinnedMatchKeysFromPayload(chat)
    return {
      ...chat,
      isPinned: Boolean(
        parseWaPinnedFlag(chat.wa_isPinned)
        || parseWaPinnedFlag(chat.isPinned)
        || keys.some((key) => pinnedByFilter.has(key)),
      ),
    }
  }))
  syncSelectedChatAfterChatsMutation()
}

// ─── Enriquecer avatares da lista ─────────────────────────────────────────────

import { fetchChatDetailsSafe } from './useWhatsappApi.js'
import { normalizeAvatarCandidate, extractAvatarFromDetailsPayload } from './useWhatsappUtils.js'

export const enrichMissingChatAvatars = async ({ chatList = null, limit = 10 } = {}) => {
  const source = Array.isArray(chatList) ? chatList : (chats.value || [])
  const withoutAvatar = source.filter((chat) => !normalizeAvatarCandidate(chat.avatarUrl || chat.image || chat.imagePreview || ''))
  if (!withoutAvatar.length) return

  const batch = withoutAvatar.slice(0, Math.max(1, Number(limit) || 10))

  const enrichOne = async (chat) => {
    const key = canonicalChatListKey(chat)
    if (!key) return
    const numberOrJid = resolveChatMessagesFetchJid(chat) || normalizeJid(chat.chatJid || chat.id || '')
    if (!numberOrJid || numberOrJid.endsWith('@lid')) return

    const data = await fetchChatDetailsSafe(numberOrJid, { preview: true, timeoutMs: 5000, cacheTtlMs: 300000 })
    if (!data) return
    const avatar = extractAvatarFromDetailsPayload(data)
    if (!avatar) return

    const lookupKeys = buildLookupKeys(numberOrJid, chat.wa_chatlid, chat.phone, chat.wa_chatid)
    if (lookupKeys.length) {
      const nextAvatars = { ...senderAvatarDirectory.value }
      for (const key of lookupKeys) nextAvatars[key] = avatar
      senderAvatarDirectory.value = nextAvatars
    }

    chats.value = chats.value.map((item) => canonicalChatListKey(item) === key ? { ...item, avatarUrl: avatar, image: avatar, imagePreview: avatar } : item)
  }

  // Pool de 3 — antes eram até 40 requests simultâneos brigando com o fetch do chat aberto.
  const queue = [...batch]
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) {
      const chat = queue.shift()
      if (!chat) break
      try { await enrichOne(chat) } catch {}
    }
  })
  await Promise.allSettled(workers)
}

/** URL de avatar quebrou no <img> — limpa e busca foto fresca via /chat/details. */
export const clearChatAvatarAndRefresh = async (chat = {}) => {
  const key = canonicalChatListKey(chat)
  if (!key) return
  chats.value = chats.value.map((item) => {
    if (canonicalChatListKey(item) !== key) return item
    return { ...item, avatarUrl: '', image: '', imagePreview: '' }
  })
  if (selectedChat.value && canonicalChatListKey(selectedChat.value) === key) {
    selectedChat.value = { ...selectedChat.value, avatarUrl: '', image: '', imagePreview: '' }
  }
  // Bust cache do /chat/details para não devolver a mesma URL morta.
  const numberOrJid = resolveChatMessagesFetchJid(chat) || normalizeJid(chat.chatJid || chat.id || '')
  if (numberOrJid) {
    const data = await fetchChatDetailsSafe(numberOrJid, {
      preview: true,
      timeoutMs: 5000,
      cacheTtlMs: 0,
      force: true,
    })
    const avatar = extractAvatarFromDetailsPayload(data)
    if (!avatar) return
    const lookupKeys = buildLookupKeys(numberOrJid, chat.wa_chatlid, chat.phone, chat.wa_chatid)
    if (lookupKeys.length) {
      const nextAvatars = { ...senderAvatarDirectory.value }
      for (const k of lookupKeys) nextAvatars[k] = avatar
      senderAvatarDirectory.value = nextAvatars
    }
    chats.value = chats.value.map((item) =>
      canonicalChatListKey(item) === key
        ? { ...item, avatarUrl: avatar, image: avatar, imagePreview: avatar }
        : item
    )
    if (selectedChat.value && canonicalChatListKey(selectedChat.value) === key) {
      selectedChat.value = {
        ...selectedChat.value,
        avatarUrl: avatar,
        image: avatar,
        imagePreview: avatar,
      }
    }
  }
}

// ─── fetchChatMessages ────────────────────────────────────────────────────────

const extractMessageFindPayload = (data) => {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.messages)) return data.messages
  if (Array.isArray(data.Messages)) return data.Messages
  if (Array.isArray(data.data?.messages)) return data.data.messages
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.result?.messages)) return data.result.messages
  if (Array.isArray(data.result)) return data.result
  if (Array.isArray(data)) return data
  return []
}

export const resolveChatMessagesFetchJid = (chatRow = {}) => {
  const isGroup = Boolean(
    chatRow.isGroup ||
    chatRow.wa_isGroup ||
    normalizeJid(chatRow.wa_chatid || chatRow.chatJid || '').endsWith('@g.us')
  )
  if (isGroup) {
    return normalizeJid(chatRow.wa_chatid || chatRow.chatJid || chatRow.chatid || '')
  }
  const candidates = collectMessageFindChatIds(chatRow)
  const phoneJid = resolvePrivateChatPhoneJid(chatRow)
  if (phoneJid && !candidates.includes(phoneJid)) candidates.unshift(phoneJid)
  return candidates[0] || ''
}

/** JID/número para POST /send/* — prioriza @s.whatsapp.net, depois @lid, depois grupo. */
export const resolveSendChatNumber = (chatRow = {}) => {
  if (!chatRow) return ''
  const isGroup = Boolean(
    chatRow.isGroup ||
    chatRow.wa_isGroup ||
    normalizeJid(chatRow.wa_chatid || chatRow.chatJid || '').endsWith('@g.us')
  )
  if (isGroup) {
    return normalizeJid(chatRow.wa_chatid || chatRow.chatJid || chatRow.chatid || '')
  }

  const ids = collectChatIdentityIds(chatRow)
  const phoneJid = ids.find((id) => id.endsWith('@s.whatsapp.net'))
  if (phoneJid) return phoneJid

  const phoneFromContacts = resolvePrivateChatPhoneJid(chatRow)
  if (phoneFromContacts.endsWith('@s.whatsapp.net')) return phoneFromContacts

  const lidJid = ids.find((id) => id.endsWith('@lid'))
  if (lidJid) return lidJid

  return normalizeJid(chatRow.chatJid || chatRow.wa_chatid || '') || ids[0] || ''
}

export const resolveActiveChatFetchJid = (chatRow = selectedChat.value) => {
  if (!chatRow) return ''
  return resolveChatMessagesFetchJid(chatRow)
    || normalizeJid(chatRow.chatJid)
    || normalizeJid(chatRow.wa_chatid)
    || collectMessageFindChatIds(chatRow)[0]
    || ''
}

export const fetchChatMessages = async (chatJid, limit = 200, offset = 0, options = {}) => {
  const apiBase = getWhatsappApiBase()
  const normalizedChatId = normalizeJid(chatJid)
  if (!normalizedChatId) throw new Error('CHAT_ID_INVALID')

  const syncFromUazapi = options.syncFromUazapi === true
  const timeoutMs = Math.min(60_000, Math.max(3_000, Number(options.timeoutMs) || (syncFromUazapi ? 12_000 : 4_000)))
  const params = new URLSearchParams({
    limit: String(Math.min(200, Math.max(1, Number(limit) || 50))),
    offset: String(Math.max(0, Number(offset) || 0)),
    sync: syncFromUazapi ? '1' : '0',
  })
  if (syncFromUazapi && options.awaitHistory === true) {
    params.set('awaitHistory', '1')
  } else {
    params.set('awaitHistory', '0')
  }
  if (options.requestHistory) params.set('history', '1')

  let res
  try {
    const init = whatsappFetchInit()
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
    // Priority hint: clique do usuário fura a fila de prefetches/avatares no pool de conexões.
    const priority = options.priority === 'high' || options.priority === 'low' ? options.priority : undefined
    try {
      res = await fetch(
        `${apiBase}/chats/${encodeURIComponent(normalizedChatId)}/messages?${params.toString()}`,
        { ...init, signal: controller?.signal, ...(priority ? { priority } : {}) },
      )
    } finally {
      if (timer) clearTimeout(timer)
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('MESSAGE_FETCH_TIMEOUT')
    throw new Error('BACKEND_OFFLINE')
  }

  const data = await parseJsonBodySafe(res)
  if (res.status === 503 || res.status === 504) throw new Error('BACKEND_OFFLINE')
  if (res.status === 400 && (data?.error === 'CHAT_ID_INVALID' || data?.message?.includes('JID'))) {
    throw new Error('CHAT_ID_INVALID')
  }
  if (res.status === 400) throw new Error('BAD_REQUEST_MESSAGE_FIND')
  if (!res.ok) throw new Error(data?.message || data?.error || 'Erro ao buscar mensagens')

  const payload = extractMessageFindPayload(data)
  return {
    messages: payload,
    hasMore: Boolean(data?.hasMore),
    nextOffset: Number.isFinite(Number(data?.nextOffset)) ? Number(data.nextOffset) : (offset + payload.length),
  }
}

const chatHistorySyncInflight = new Set()
/** Evita re-disparar history/backfill na UAZAPI (celular/GuzzApp fica “sincronizando”). */
const chatProviderSyncCooldownUntil = new Map()
/** 30 min — history-sync / findMessages na UAZAPI derruba a sessão multi-device. */
const PROVIDER_SYNC_COOLDOWN_MS = 30 * 60 * 1000
/** Sync UAZAPI automático desligado: só botão “Tentar sincronizar” / force explícito. */
const AUTO_PROVIDER_MESSAGE_SYNC = false

const providerSyncKeyForChat = (chatJid = '') =>
  canonicalChatListKey({ chatJid }) || normalizeJid(chatJid) || String(chatJid || '').trim()

const isProviderSyncOnCooldown = (chatJid = '') => {
  const key = providerSyncKeyForChat(chatJid)
  if (!key) return false
  return Number(chatProviderSyncCooldownUntil.get(key) || 0) > Date.now()
}

const markProviderSyncCooldown = (chatJid = '', ttlMs = PROVIDER_SYNC_COOLDOWN_MS) => {
  const key = providerSyncKeyForChat(chatJid)
  if (!key) return
  chatProviderSyncCooldownUntil.set(key, Date.now() + Math.max(60_000, Number(ttlMs) || PROVIDER_SYNC_COOLDOWN_MS))
}

/** Dispara backfill de histórico no backend (varre chats + history-sync + persistência). */
export const requestChatHistoryBackfill = async (chatJids = [], { force = true } = {}) => {
  const apiBase = getWhatsappApiBase()
  if (!apiBase) return false
  const targets = (Array.isArray(chatJids) ? chatJids : []).filter(Boolean)
  if (!force && targets.some((jid) => isProviderSyncOnCooldown(jid))) return false
  try {
    const res = await fetch(`${apiBase}/messages/backfill`, {
      ...whatsappFetchInit(),
      method: 'POST',
      headers: {
        ...(whatsappFetchInit().headers || {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force: Boolean(force),
        chatJids: targets,
      }),
    })
    if (res.ok) {
      for (const jid of targets) markProviderSyncCooldown(jid)
    }
    return res.ok
  } catch {
    return false
  }
}

/** Solicita histórico sob demanda na UAZAPI (celular precisa estar ativo). */
export const requestChatHistorySync = async (chatJid, count = 100) => {
  const number = resolveChatMessagesFetchJid({ chatJid, wa_chatid: chatJid }) || normalizeJid(chatJid)
  if (!number) return false

  const syncKey = canonicalChatListKey({ chatJid: number }) || number
  if (isProviderSyncOnCooldown(number)) return false
  if (chatHistorySyncInflight.has(syncKey)) return true
  chatHistorySyncInflight.add(syncKey)

  try {
    const apiBase = getWhatsappApiBase()
    if (!apiBase) return false
    const params = new URLSearchParams({ history: '1', sync: '0', limit: '1', offset: '0' })
    const res = await fetch(
      `${apiBase}/chats/${encodeURIComponent(number)}/messages?${params.toString()}`,
      whatsappFetchInit()
    )
    if (!res.ok) return false
    markProviderSyncCooldown(number)
    markInitialSyncActivity('history-sync')
    return true
  } catch {
    return false
  } finally {
    if (typeof window !== 'undefined') {
      window.setTimeout(() => chatHistorySyncInflight.delete(syncKey), 60_000)
    } else {
      chatHistorySyncInflight.delete(syncKey)
    }
  }
}

const extractRealtimeMessagesFromPayload = (payload = {}) => {
  const items = []
  const push = (entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) items.push(entry)
  }

  push(payload?.message)

  if (Array.isArray(payload?.messages)) {
    for (const entry of payload.messages) push(entry)
  }

  const data = payload?.data
  if (Array.isArray(data)) {
    for (const entry of data) push(entry)
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.messages)) {
      for (const entry of data.messages) push(entry)
    }
    push(data.message)
    // Formato UAZAPI {event, data}: `data` pode SER a mensagem — mas nunca uma linha de chat.
    const looksLikeMessage = Boolean(
      data.messageid || data.key?.id || data.messageType ||
      ((data.id || data.chatid) && (data.text || data.body || data.mediaType))
    )
    const looksLikeChatRow = Boolean(data.wa_chatid && !data.messageid && !data.messageType && !data.chatid)
    if (looksLikeMessage && !looksLikeChatRow) push(data)
  }

  const event = payload?.event
  if (event && typeof event === 'object' && !Array.isArray(event) && Array.isArray(event.messages)) {
    for (const entry of event.messages) push(entry)
  }

  return items
}

const applyFetchedMessagesToOpenChat = (pageResult, activeFetchJid, enrichSharedFns, chat, mySeq, expectedListKey = '') => {
  if (mySeq !== selectChatLoadSeq.value) return false
  if (expectedListKey && !isSelectedChatListKey(expectedListKey)) return false
  if (!Array.isArray(pageResult?.messages) || pageResult.messages.length === 0) return false

  // Primeiro paint do thread (abertura) vs refresh em background com msgs na tela.
  const isInitialThreadPaint = !Array.isArray(messages.value) || messages.value.length === 0 || loadingMessages.value

  const aggregated = []
  const seenIds = new Set()
  const rawByMergeKey = new Map()
  appendRawMessagesToAggregate(aggregated, seenIds, rawByMergeKey, pageResult.messages)

  // Preserva mediaUrl já na tela / no cache do chat (DB costuma voltar sem URL).
  const prevMediaByKey = new Map()
  for (const row of messages.value || []) {
    const key = getMessageMergeKey(row)
    const url = String(row?.mediaUrl || '').trim()
    if (key && /^https?:\/\//i.test(url)) prevMediaByKey.set(key, url)
  }

  let normalizedMessages = hydrateMessagesMediaFromCache(
    [...aggregated].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
  )
  if (prevMediaByKey.size) {
    normalizedMessages = normalizedMessages.map((row) => {
      if (/^https?:\/\//i.test(String(row?.mediaUrl || ''))) return row
      const kept = prevMediaByKey.get(getMessageMergeKey(row))
      if (!kept) return row
      return {
        ...row,
        mediaUrl: kept,
        fileURL: kept,
        fileUrl: kept,
        isMediaThumbOnly: false,
      }
    })
  }

  const recentSynthetic = (messages.value || []).filter((row) => {
    if (!String(row?.id || row?.messageid || '').startsWith('rt-chat-preview:')) return false
    const ageMs = Date.now() - Number(row.timestamp || 0)
    if (!Number.isFinite(ageMs) || ageMs < -5000 || ageMs > 15000) return false
    const text = strTrim(row.text || row.body || '')
    if (!text) return false
    return !normalizedMessages.some((real) => (
      Boolean(real.fromMe) === Boolean(row.fromMe) &&
      strTrim(real.text || real.body || '') === text &&
      Math.abs(Number(real.timestamp || 0) - Number(row.timestamp || 0)) <= 90000
    ))
  })
  if (recentSynthetic.length) {
    normalizedMessages = [...normalizedMessages, ...recentSynthetic]
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  }

  // MERGE com o thread atual — não descarta histórico que só existe no cache/tela
  // (o DB local pode ter menos mensagens que o cache; substituir encolhia o thread).
  const fetchedKeys = new Set(normalizedMessages.map((m) => getMessageMergeKey(m)).filter(Boolean))
  const keepFromThread = (messages.value || []).filter((row) => {
    const key = getMessageMergeKey(row)
    if (!key || fetchedKeys.has(key)) return false
    if (String(row?.id || row?.messageid || '').startsWith('rt-chat-preview:')) return false
    return true
  })
  if (keepFromThread.length) {
    normalizedMessages = dropStaleOptimisticOutbound(
      [...normalizedMessages, ...keepFromThread].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    )
  }

  // Refresh em background sem mudança estrutural → não mexe em nada (evita flicker).
  const prevRows = Array.isArray(messages.value) ? messages.value : []
  const structuralChange =
    prevRows.length !== normalizedMessages.length ||
    getMessageMergeKey(prevRows[prevRows.length - 1] || {}) !== getMessageMergeKey(normalizedMessages[normalizedMessages.length - 1] || {})
  if (!isInitialThreadPaint && !structuralChange) {
    storeMessagesInChatCache(selectedChat.value || chat, normalizedMessages)
    return true
  }

  messages.value = normalizedMessages
  storeMessagesInChatCache(selectedChat.value || chat, normalizedMessages)
  indexMessagesForPreviewCache(normalizedMessages)
  refreshReactionPreviewForChatJid(activeFetchJid, normalizedMessages)
  // Abertura: vai para a última msg. Background: só acompanha se o usuário JÁ está no fundo.
  if (isInitialThreadPaint) {
    applySelectChatScroll()
  } else {
    stickChatScrollToBottomIfNeeded()
  }
  // Mídia do cache já está na bolha; só baixa o que ainda falta (sem delay).
  void preloadMessageMediaIfNeeded(normalizedMessages)
  runSelectChatBackgroundEnrichment(activeFetchJid, aggregated, rawByMergeKey, enrichSharedFns, chat)

  const paginationKey = expectedListKey || getChatRuntimeCacheKey(selectedChat.value || chat)
  if (pageResult.hasMore) {
    loadOlderSelectChatPages(paginationKey, pageResult.nextOffset, aggregated, seenIds, rawByMergeKey)
  } else {
    chatOlderPaginationByJid.set(paginationKey, {
      aggregated,
      seenIds,
      rawByMergeKey,
      hasMore: false,
      nextOffset: pageResult.nextOffset,
    })
    chatMessagesHasMore.value = false
  }
  return true
}

const pollChatMessagesAfterHistorySync = async (chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, expectedListKey = '') => {
  if (typeof window === 'undefined') return
  chatHistorySyncPending.value = true
  try {
    // Só DB — NÃO puxar UAZAPI no poll (isso reinicia sync no celular/GuzzApp).
    const delays = [0, 900, 2000, 4000, 8000]
    for (const delayMs of delays) {
      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs))
      }
      if (mySeq !== selectChatLoadSeq.value) return
      if (expectedListKey && !isSelectedChatListKey(expectedListKey)) return
      try {
        const applied = await refreshOpenChatMessages(
          chatRow,
          activeFetchJid,
          enrichSharedFns,
          chat,
          mySeq,
          { syncFromUazapi: false, awaitHistory: false },
          expectedListKey,
        )
        if (applied) {
          noteInitialSyncChatCount((chats.value || []).length)
          return
        }
      } catch {
        /* continua tentando */
      }
    }
  } finally {
    if (mySeq === selectChatLoadSeq.value) chatHistorySyncPending.value = false
  }
}

// ─── refreshSelectedChatMessages ─────────────────────────────────────────────

let lastPollUnknownEnrichAt = 0
const UNKNOWN_ENRICH_MIN_MS = 35000
let pendingMessageRefresh = false

const resolvePrivateJidAlias = (jid = '') => {
  const n = normalizeJid(jid)
  if (!n) return ''
  if (n.endsWith('@s.whatsapp.net') || n.endsWith('@g.us')) return n
  if (n.endsWith('@lid')) {
    const map = lidToJidMap.value || {}
    const mapped = normalizeJid(map[n] || map[n.split('@')[0]] || '')
    if (mapped) return mapped
  }
  return n
}

const jidsReferToSameChat = (a, b) => {
  const left = normalizeJid(a)
  const right = normalizeJid(b)
  if (!left || !right) return false
  if (left === right) return true
  if (canonicalChatListKey({ chatJid: left }) === canonicalChatListKey({ chatJid: right })) return true
  // LID ↔ PN: webhook manda @lid, chat aberto costuma ser @s.whatsapp.net
  const leftAlias = resolvePrivateJidAlias(left)
  const rightAlias = resolvePrivateJidAlias(right)
  if (leftAlias && rightAlias && leftAlias === rightAlias) return true
  if (leftAlias && canonicalChatListKey({ chatJid: leftAlias }) === canonicalChatListKey({ chatJid: right })) return true
  if (rightAlias && canonicalChatListKey({ chatJid: left }) === canonicalChatListKey({ chatJid: rightAlias })) return true
  // Cruza com a linha da sidebar (wa_chatlid / wa_chatid).
  const selected = selectedChat.value
  if (selected) {
    const aliases = [
      selected.chatJid,
      selected.wa_chatid,
      selected.wa_chatlid,
      selected.chatlid,
      selected.chatid,
    ].map((v) => normalizeJid(v)).filter(Boolean)
    const leftHit = aliases.some((alias) => alias === left || alias === leftAlias || jidsLooseEqual(alias, left))
    const rightHit = aliases.some((alias) => alias === right || alias === rightAlias || jidsLooseEqual(alias, right))
    if (leftHit && rightHit) return true
    if ((leftHit || rightHit) && aliases.some((alias) => {
      const other = leftHit ? right : left
      return alias === other || resolvePrivateJidAlias(alias) === resolvePrivateJidAlias(other)
    })) return true
  }
  return false
}

const jidsLooseEqual = (a, b) => {
  const left = normalizeJid(a)
  const right = normalizeJid(b)
  if (!left || !right) return false
  if (left === right) return true
  return canonicalChatListKey({ chatJid: left }) === canonicalChatListKey({ chatJid: right })
}

export const refreshSelectedChatMessages = async (enrichSharedFns = {}, options = {}) => {
  const { force = false, light = false, syncFromUazapi = false } = options
  const currentChatJid = resolveActiveChatFetchJid(selectedChat.value)
  if (!currentChatJid) return
  if (loadingMessages.value && !force) return
  if (isRefreshingMessages.value) {
    pendingMessageRefresh = true
    return
  }
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const seqSnapshot = selectChatLoadSeq.value
  try {
    isRefreshingMessages.value = true
    if (!light) await syncContactsDirectoryIfNeeded(false)
    if (selectChatLoadSeq.value !== seqSnapshot) return
    const scrollSnapshot = captureChatScrollSnapshot()
    // light = sem enrich pesado; syncFromUazapi = puxa mensagem nova quando sidebar está à frente.
    const pageResult = await fetchChatMessages(currentChatJid, 120, 0, {
      syncFromUazapi: Boolean(syncFromUazapi),
      awaitHistory: false,
      timeoutMs: syncFromUazapi ? 10_000 : 4_000,
    })
    if (messagesBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); messagesBackendOfflineLogged.value = false }
    if (!Array.isArray(pageResult.messages) || pageResult.messages.length === 0) return
    ingestLidPnHintsFromMessages(pageResult.messages)
    learnObservedSenderNames(pageResult.messages)
    const now = Date.now()
    if (now - lastPollUnknownEnrichAt >= UNKNOWN_ENRICH_MIN_MS) {
      lastPollUnknownEnrichAt = now
      enrichUnknownSenderNames(pageResult.messages).catch(() => {})
    }
    const normalizedIncoming = pageResult.messages
      .map((incoming) => normalizeIncomingMessage(incoming))
      .filter(Boolean)
    if (!light) {
      if (enrichSharedFns.hydratePersistedContactStatesFromMessages) await enrichSharedFns.hydratePersistedContactStatesFromMessages(normalizedIncoming)
      const hasSharedContact = normalizedIncoming.some((msg) => msg.isContactShare && msg.sharedContact?.phone)
      if (hasSharedContact) {
        await syncContactsDirectoryIfNeeded(true)
        if (enrichSharedFns.persistSavedStatesFromMessages) await enrichSharedFns.persistSavedStatesFromMessages(normalizedIncoming)
      }
      if (enrichSharedFns.enrichSharedContactAvatars) enrichSharedFns.enrichSharedContactAvatars(normalizedIncoming)
      if (enrichSharedFns.enrichSharedContactBusinessProfiles) enrichSharedFns.enrichSharedContactBusinessProfiles(normalizedIncoming)
    }

    const mergedById = new Map()
    for (const current of messages.value) {
      const n = isStoredNormalizedMessage(current) ? current : normalizeMessageForDisplay(current)
      if (!n) continue
      mergedById.set(getMessageMergeKey(n), n)
    }
    for (const n of normalizedIncoming) {
      const key = getMessageMergeKey(n)
      const existing = mergedById.get(key)
      if (!existing) {
        mergedById.set(key, n)
        continue
      }
      const winner = key.startsWith('reaction:')
        ? ((n.timestamp || 0) >= (existing.timestamp || 0) ? n : existing)
        : pickRicherDuplicateBaseMessage(existing, n)
      const mergedPreview = String(winner?.previewUrl || existing?.previewUrl || n?.previewUrl || '').trim()
      const mergedMediaUrl = String(winner?.mediaUrl || existing?.mediaUrl || n?.mediaUrl || '').trim()
      const mergedMediaThumbUrl = String(winner?.mediaThumbUrl || existing?.mediaThumbUrl || n?.mediaThumbUrl || '').trim()
      mergedById.set(key, {
        ...winner,
        previewUrl: mergedPreview,
        mediaUrl: mergedMediaUrl || winner?.mediaUrl || '',
        mediaThumbUrl: mergedMediaThumbUrl || winner?.mediaThumbUrl || '',
        isMediaThumbOnly: !mergedMediaUrl && Boolean(mergedMediaThumbUrl || winner?.mediaThumbUrl),
      })
    }
    for (const current of messages.value) {
      const n = isStoredNormalizedMessage(current) ? current : normalizeMessageForDisplay(current)
      if (!n || !n.isReaction) continue
      const key = getMessageMergeKey(n)
      if (!mergedById.has(key)) mergedById.set(key, n)
    }
    const merged = dropStaleOptimisticOutbound(Array.from(mergedById.values())).sort((a, b) => a.timestamp - b.timestamp)
    if (selectChatLoadSeq.value !== seqSnapshot) return

    const prevLen = messages.value.length, prevLastId = messages.value[prevLen - 1]?.id
    const mergedLen = merged.length, mergedLastId = merged[mergedLen - 1]?.id
    const hadStructuralListChange = mergedLen !== prevLen || mergedLastId !== prevLastId

    messages.value = merged
    const cacheKey = getChatRuntimeCacheKey(selectedChat.value)
    if (cacheKey) messagesCacheByChatJid.set(cacheKey, [...merged])
    indexMessagesForPreviewCache(merged)
    refreshReactionPreviewForChatJid(currentChatJid, merged)
    ingestLidPnHintsFromMessages(merged)
    learnObservedSenderNames(merged)
    preloadMessageMediaIfNeeded(messages.value).catch(() => {})
    ensureGroupSenderAvatars(messages.value).catch(() => {})
    if (normalizeJid(currentChatJid).endsWith('@g.us')) {
      schedulePersistGroupObservedSenders(currentChatJid, merged)
    }

    if (hadStructuralListChange) {
      const sortedMerged = [...merged].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      const lastBase = sortedMerged[sortedMerged.length - 1] || null
      const latestReaction = sortedMerged.filter((row) => row?.isReaction).slice(-1)[0] || null
      const lastMessage = latestReaction && (latestReaction.timestamp || 0) >= (lastBase?.timestamp || 0)
        ? latestReaction
        : lastBase
      const currentChat = chats.value.find((item) => canonicalChatListKey(item) === canonicalChatListKey(selectedChat.value)) || selectedChat.value
      const previewText = buildChatListPreviewFromMessage(lastMessage, sortedMerged) ||
        selectedChat.value.lastMessage
      const reactionTargetId = lastMessage?.isReaction
        ? normalizeProviderMessageId(lastMessage.reactionTargetId || '')
        : ''
      const reactionPreviewActive = isReactionMessageType(
        currentChat?.wa_lastMessageType || selectedChat.value?.wa_lastMessageType
      ) || isReactionListPreviewText(previewText) || Boolean(lastMessage?.isReaction)
      refreshChatPreview(currentChatJid, {
        lastMessage: reactionPreviewActive && isReactionListPreviewText(currentChat?.lastMessage)
          ? currentChat.lastMessage
          : previewText,
        lastMessageFromMe: reactionPreviewActive && currentChat?.lastMessageFromMe != null
          ? Boolean(currentChat.lastMessageFromMe)
          : Boolean(lastMessage?.fromMe),
        lastMessagePrefix: lastMessage && Boolean(currentChat?.isGroup) && !lastMessage.fromMe && lastMessage.senderDisplayName
          ? `~${lastMessage.senderDisplayName}: `
          : '',
        preserveSortOrder: Boolean(lastMessage?.isReaction || reactionPreviewActive),
        wa_lastMessageType: reactionPreviewActive && isReactionMessageType(currentChat?.wa_lastMessageType)
          ? 'reaction'
          : (lastMessage?.isReaction ? 'reaction' : (lastMessage?.type || selectedChat.value.wa_lastMessageType)),
        wa_lastMessageTextVote: reactionPreviewActive && strTrim(currentChat?.wa_lastMessageTextVote || '')
          ? strTrim(currentChat.wa_lastMessageTextVote)
          : (lastMessage?.isReaction ? strTrim(lastMessage.reactionEmoji || '') : (strTrim(lastMessage?.text) || undefined)),
        ...(reactionTargetId ? { wa_lastReactionTargetId: reactionTargetId } : {}),
        ...(currentChat?.wa_lastReactionTargetId && reactionPreviewActive
          ? { wa_lastReactionTargetId: currentChat.wa_lastReactionTargetId }
          : {}),
      })
      restoreChatScrollAfterMessagesUpdate(scrollSnapshot)
    }
  } catch (error) {
    if (error?.message === 'BACKEND_OFFLINE' || error?.message === 'BAD_REQUEST_MESSAGE_FIND' || error?.message === 'CHAT_ID_INVALID') {
      if (!messagesBackendOfflineLogged.value) { console.warn('Backend WhatsApp indisponivel para mensagens em tempo real.'); messagesBackendOfflineLogged.value = true }
      return
    }
    console.error('Erro ao atualizar mensagens em tempo real', error)
  } finally {
    isRefreshingMessages.value = false
    if (pendingMessageRefresh) {
      pendingMessageRefresh = false
      refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true }).catch(() => {})
    }
  }
}

// ─── markMessageAsPlayed ──────────────────────────────────────────────────────

export const markMessageAsPlayed = async (msg = {}) => {
  if (!msg || msg.fromMe || msg.mediaType !== 'audio') return false

  const messageId = normalizeProviderMessageId(msg.messageid || msg.normalizedMessageId || msg.id)
  if (!messageId || playedMarkInflight.has(messageId)) return false

  playedMarkInflight.add(messageId)
  const apiBase = getWhatsappApiBase()
  if (!apiBase) {
    playedMarkInflight.delete(messageId)
    return false
  }

  try {
    const res = await fetch(`${apiBase}/message/markplayed`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ id: [messageId] })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.warn('Falha ao marcar áudio como ouvido:', data?.message || res.status)
      return false
    }
    return true
  } catch (error) {
    console.warn('Falha ao marcar áudio como ouvido', error)
    return false
  } finally {
    playedMarkInflight.delete(messageId)
  }
}

// ─── markCurrentChatAsRead ────────────────────────────────────────────────────

export const markAllChatsAsRead = async () => {
  const proxyBase = getProxyBase()
    const unreadChats = (chats.value || []).filter((c) => Number(c.unreadCount || 0) > 0)
  if (unreadChats.length === 0) return

  // Zera localmente de imediato para feedback instantâneo ao usuário
  chats.value = chats.value.map((c) =>
    Number(c.unreadCount || 0) > 0 ? { ...c, unreadCount: 0, wa_unreadCount: 0 } : c
  )

  // Chama /chat/read na UAZAPI para cada chat em paralelo (máximo 10 simultâneos)
  const BATCH = 10
  for (let i = 0; i < unreadChats.length; i += BATCH) {
    const batch = unreadChats.slice(i, i + BATCH)
    await Promise.allSettled(
      batch.map((chat) =>
        fetch(`${proxyBase}/chat/read`, {
          method: 'POST',
          headers: whatsappJsonHeaders(),
          body: JSON.stringify({ number: chat.chatJid, read: true })
        }).catch(() => {})
      )
    )
  }
}

export const markCurrentChatAsRead = async (chat, loadedMessages = []) => {
  if (!chat?.chatJid) return
  const proxyBase = getProxyBase()
  const normJid = normalizeJid(chat.chatJid)
  const openKey = canonicalChatListKey(chat)
  const bumpListUnreadZero = () => {
    chats.value = chats.value.map((c) => {
      const same = openKey ? canonicalChatListKey(c) === openKey : normalizeJid(c.chatJid) === normJid
      return same ? { ...c, unreadCount: 0, wa_unreadCount: 0 } : c
    })
    if (selectedChat.value && (openKey ? canonicalChatListKey(selectedChat.value) === openKey : normalizeJid(selectedChat.value.chatJid) === normJid)) {
      selectedChat.value = { ...selectedChat.value, unreadCount: 0, wa_unreadCount: 0 }
    }
  }
  try {
    await fetch(`${proxyBase}/chat/read`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ number: chat.chatJid, read: true })
    })
    bumpListUnreadZero()
    const inboundIds = loadedMessages.filter((m) => !m.fromMe && (m.messageid || m.id)).map((m) => m.messageid || m.id)
    if (inboundIds.length > 0) {
      await fetch(`${proxyBase}/message/markread`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify({ id: inboundIds })
      })
    }
  } catch (error) { console.error('Erro ao marcar chat como lido', error) }
}

// ─── toggleChatPinned ─────────────────────────────────────────────────────────

export const toggleChatPinned = async (chat, loadChatsFn) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return
  const nextPinned = !Boolean(chat?.isPinned)
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/chat/pin`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ number: chatJid, pin: nextPinned })
    })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao atualizar pin do chat')
    refreshChatPreview(chatJid, { isPinned: nextPinned })
    if (loadChatsFn) await loadChatsFn(false, { silent: true })
  } catch (error) { console.error('Erro ao fixar/desafixar chat', error) }
}

// ─── loadChats ────────────────────────────────────────────────────────────────

export const loadChats = async (forceRefresh = false, options = {}) => {
  const {
    silent = false,
    lightSync = false,
    preferCache = false,
  } = options
  // Se o caller passa gentle explicitamente, respeita — senão segue o modo do sync inicial.
  const gentleMode = Object.prototype.hasOwnProperty.call(options, 'gentle')
    ? Boolean(options.gentle)
    : isInitialSyncGentleMode()
  if (!lightSync && !preferCache) {
    loadWhatsappLabels({ showLoading: false, refresh: false }).catch(() => {})
  } else {
    syncWhatsappLabelsInBackground().catch(() => {})
  }
  try {
    if (!silent) loadingChats.value = true

    // Cache só para pintar rápido — com forceRefresh sempre segue para UAZAPI.
    if (!forceRefresh && (preferCache || (chats.value || []).length === 0)) {
      const cached = await loadChatsFromBackendCache()
      if (cached.length > 0) {
        await applyResolvedChatsList(cached, { skipPinnedFetch: preferCache || gentleMode })
        noteInitialSyncChatCount((chats.value || []).length)
        if (preferCache) return
      }
    }

    if (!forceRefresh && (lightSync || gentleMode)) {
      const pageLimit = gentleMode ? getGentleChatPageLimit() : 600
      const pageResult = await fetchChatsPage(pageLimit, 0)
      if (chatsBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); chatsBackendOfflineLogged.value = false }
      if (Array.isArray(pageResult.chats) && pageResult.chats.length > 0) {
        mergeChatsSliceIntoList(pageResult.chats)
        await refreshPinnedChatFlagsThrottled()
        noteInitialSyncChatCount((chats.value || []).length)
        if (gentleMode) return
      } else if (gentleMode && (chats.value || []).length > 0) {
        noteInitialSyncChatCount((chats.value || []).length)
        return
      }
    }
    if (!forceRefresh && gentleMode && (chats.value || []).length > 0) {
      noteInitialSyncChatCount((chats.value || []).length)
      return
    }

    let resolvedChats = []
    try {
      resolvedChats = await listAllChatsFromUazapi()
    } catch (proxyError) {
      if (proxyError?.message !== 'BACKEND_OFFLINE' && proxyError?.message !== 'AUTH_EXPIRED') {
        throw proxyError
      }
    }

    if (chatsBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); chatsBackendOfflineLogged.value = false }

    if (!resolvedChats.length) resolvedChats = await loadChatsFromBackendCache()
    if (!resolvedChats.length) resolvedChats = await loadChatsFromBackendSync(forceRefresh)

    if (resolvedChats.length) {
      await applyResolvedChatsList(resolvedChats)
    }
    noteInitialSyncChatCount((chats.value || []).length)
  } catch (e) {
    if (e?.message === 'AUTH_EXPIRED') return
    if ((chats.value || []).length === 0) {
      const cached = await loadChatsFromBackendCache()
      if (cached.length > 0) {
        await applyResolvedChatsList(cached, { skipPinnedFetch: true })
        noteInitialSyncChatCount((chats.value || []).length)
        return
      }
    }
    if (e?.message === 'BACKEND_OFFLINE') {
      if (!chatsBackendOfflineLogged.value) { console.warn('Backend WhatsApp indisponivel.'); chatsBackendOfflineLogged.value = true }
      return
    }
    console.error('Erro ao carregar chats', e)
  } finally { if (!silent) loadingChats.value = false }
}

// ─── selectChat ───────────────────────────────────────────────────────────────

/** Mensagens carregadas ao abrir o chat */
export const CHAT_MESSAGES_INITIAL_BATCH = 30
/** Mensagens carregadas a cada scroll até o topo */
export const CHAT_MESSAGES_OLDER_BATCH = 30

const appendRawMessagesToAggregate = (aggregated, seenIds, rawByMergeKey, rawMessages = []) => {
  for (const rawMessage of rawMessages) {
    const normalized = normalizeIncomingMessage(rawMessage)
    if (!normalized) continue
    const key = getMessageMergeKey(normalized)
    if (seenIds.has(key)) {
      const idx = aggregated.findIndex((m) => getMessageMergeKey(m) === key)
      if (idx >= 0) {
        const winner = key.startsWith('reaction:')
          ? ((normalized.timestamp || 0) >= (aggregated[idx].timestamp || 0) ? normalized : aggregated[idx])
          : pickRicherDuplicateBaseMessage(aggregated[idx], normalized)
        aggregated[idx] = winner
        if (winner === normalized) rawByMergeKey.set(key, rawMessage)
      }
      continue
    }
    seenIds.add(key)
    aggregated.push(normalized)
    rawByMergeKey.set(key, rawMessage)
  }
  return aggregated
}

const applySelectChatScroll = () => {
  scrollToBottomOnChatOpen()
}

const loadOlderMessagesPage = async (paginationKey, activeFetchJid, mySeq) => {
  const pagination = chatOlderPaginationByJid.get(paginationKey)
  if (!pagination?.hasMore || loadingOlderMessages.value) return

  loadingOlderMessages.value = true
  try {
      // Sempre do DB/cache — sync=1 na UAZAPI faz o celular “sincronizar” de novo.
    const pageResult = await fetchChatMessages(
      activeFetchJid,
      CHAT_MESSAGES_OLDER_BATCH,
      pagination.nextOffset,
      { syncFromUazapi: false },
    )
    if (mySeq !== selectChatLoadSeq.value) return
    if (!isSelectedChatListKey(paginationKey)) return
    if (!Array.isArray(pageResult.messages) || pageResult.messages.length === 0) {
      pagination.hasMore = false
      chatMessagesHasMore.value = false
      return
    }

    const scrollSnapshot = captureChatScrollSnapshot()
    appendRawMessagesToAggregate(
      pagination.aggregated,
      pagination.seenIds,
      pagination.rawByMergeKey,
      pageResult.messages,
    )

    const normalizedMessages = [...pagination.aggregated].sort((a, b) => a.timestamp - b.timestamp)
    messages.value = normalizedMessages
    storeMessagesInChatCache(selectedChat.value, normalizedMessages)
    indexMessagesForPreviewCache(normalizedMessages)
    refreshReactionPreviewForChatJid(activeFetchJid, normalizedMessages)
    restoreChatScrollAfterMessagesUpdate(scrollSnapshot)

    pagination.nextOffset = pageResult.nextOffset
    pagination.hasMore = Boolean(pageResult.hasMore)
    chatMessagesHasMore.value = pagination.hasMore
  } catch (e) {
    if (e?.message !== 'BAD_REQUEST_MESSAGE_FIND' && e?.message !== 'CHAT_ID_INVALID') {
      console.error('Erro ao carregar mensagens antigas', e)
    }
  } finally {
    if (mySeq === selectChatLoadSeq.value) loadingOlderMessages.value = false
  }
}

const tryLoadOlderMessagesNearTop = () => {
  const paginationKey = getChatRuntimeCacheKey(selectedChat.value)
  const activeFetchJid = resolveActiveChatFetchJid(selectedChat.value)
  if (!paginationKey || !activeFetchJid || loadingOlderMessages.value || loadingMessages.value) return
  const pagination = chatOlderPaginationByJid.get(paginationKey)
  if (!pagination?.hasMore) return
  void loadOlderMessagesPage(paginationKey, activeFetchJid, selectChatLoadSeq.value)
}

export const loadOlderChatMessages = () => {
  tryLoadOlderMessagesNearTop()
}

setChatScrollNearTopHandler(tryLoadOlderMessagesNearTop)

const runSelectChatBackgroundEnrichment = (activeFetchJid, aggregated, rawByMergeKey, enrichSharedFns, chat) => {
  // Adia trabalho pesado para não competir com o paint do chat aberto.
  const run = () => {
    try {
      const rawForLearn = aggregated.map((m) => rawByMergeKey.get(getMessageMergeKey(m)) || m)
      ingestLidPnHintsFromMessages(rawForLearn)
      learnObservedSenderNames(rawForLearn)
      enrichUnknownSenderNames(rawForLearn).catch(() => {})

      if (enrichSharedFns.enrichSharedContactAvatars) enrichSharedFns.enrichSharedContactAvatars(aggregated)
      if (enrichSharedFns.enrichSharedContactBusinessProfiles) enrichSharedFns.enrichSharedContactBusinessProfiles(aggregated)

      if (enrichSharedFns.hydratePersistedContactStatesFromMessages) {
        enrichSharedFns.hydratePersistedContactStatesFromMessages(aggregated).catch(() => {})
      }

      const hasSharedContact = aggregated.some((msg) => msg.isContactShare && msg.sharedContact?.phone)
      if (hasSharedContact) {
        syncContactsDirectoryIfNeeded(true)
          .then(() => {
            if (enrichSharedFns.persistSavedStatesFromMessages) {
              return enrichSharedFns.persistSavedStatesFromMessages(aggregated)
            }
            return undefined
          })
          .catch(() => {})
      }

      // Avatares de grupo: depois. Mídia já hidratada no applyFetched / selectChat.
      window.setTimeout?.(() => {
        if (chat?.isGroup) {
          ensureGroupSenderAvatars(messages.value, { forceRefresh: false }).catch(() => {})
        }
      }, 600)

      if (normalizeJid(activeFetchJid).endsWith('@g.us')) {
        schedulePersistGroupObservedSenders(activeFetchJid, rawForLearn)
      }

      markCurrentChatAsRead({ ...selectedChat.value, chatJid: activeFetchJid }, aggregated).catch(() => {})
    } catch (e) {
      console.warn('[WhatsApp] enrich pós-open falhou', e?.message || e)
    }
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 1200 })
  } else if (typeof window !== 'undefined') {
    window.setTimeout(run, 120)
  } else {
    run()
  }
}

const loadOlderSelectChatPages = (paginationKey, startOffset, aggregated, seenIds, rawByMergeKey) => {
  chatOlderPaginationByJid.set(paginationKey, {
    aggregated,
    seenIds,
    rawByMergeKey,
    hasMore: true,
    nextOffset: startOffset,
  })
  chatMessagesHasMore.value = true
}

/** PN (@s.whatsapp.net) primeiro: é como o DB grava; LID costuma voltar vazio. */
const sortMessageFindCandidates = (candidates = []) => {
  const rank = (jid) => {
    const j = String(jid || '').toLowerCase()
    if (j.endsWith('@s.whatsapp.net')) return 0
    if (j.endsWith('@g.us')) return 1
    if (j.endsWith('@lid')) return 3
    return 2
  }
  return [...candidates].sort((a, b) => rank(a) - rank(b))
}

const fetchSelectChatMessages = async (chatRow, limit, offset, options = {}) => {
  const awaitHistory = options.awaitHistory === true
  const syncFromUazapi = options.syncFromUazapi === true
  const candidates = sortMessageFindCandidates(collectMessageFindChatIds(chatRow))

  if (!candidates.length) throw new Error('CHAT_ID_INVALID')

  let lastError = null
  let lastEmpty = null
  for (const chatid of candidates) {
    try {
      const pageResult = await fetchChatMessages(chatid, limit, offset, {
        syncFromUazapi,
        awaitHistory: awaitHistory && offset === 0,
        timeoutMs: syncFromUazapi ? 10_000 : 4_000,
        priority: 'high',
      })
      if (Array.isArray(pageResult.messages) && pageResult.messages.length > 0) {
        return { ...pageResult, usedChatId: chatid }
      }
      lastEmpty = { ...pageResult, usedChatId: chatid }
      // sync=0 é só o DB local (barato) — tenta TODOS os aliases antes de desistir.
      // Antes desistia no 1º vazio: se o 1º era @lid, o thread abria velho para sempre.
    } catch (error) {
      lastError = error
      if (syncFromUazapi) break
    }
  }

  if (lastEmpty) return lastEmpty
  throw lastError || new Error('CHAT_ID_INVALID')
}

const refreshOpenChatMessages = async (chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, options = {}, expectedListKey = '') => {
  const pageResult = await fetchSelectChatMessages(
    chatRow,
    CHAT_MESSAGES_INITIAL_BATCH,
    0,
    options,
  )
  if (mySeq !== selectChatLoadSeq.value) return false
  if (expectedListKey && !isSelectedChatListKey(expectedListKey)) return false
  return applyFetchedMessagesToOpenChat(pageResult, activeFetchJid, enrichSharedFns, chat, mySeq, expectedListKey)
}

const threadLastActivityMs = (rows = []) => {
  let max = 0
  for (const row of Array.isArray(rows) ? rows : []) {
    const ts = normalizeTimestampToMs(row?.timestamp || row?.messageTimestamp || 0)
    if (ts > max) max = ts
  }
  return max
}

const sidebarLooksNewerThanThread = (chatRow = {}, threadRows = []) => {
  const sidebarTs = getChatActivityTimestamp(chatRow)
  if (!sidebarTs) return false
  const threadTs = threadLastActivityMs(threadRows)
  if (!threadTs) return true

  // Se a última bolha do thread já é o preview da sidebar, NÃO está atrás —
  // o ts da sidebar pode vir segundos à frente (evento chats/ingest) e isso
  // criava loop de refresh: bolha piscando + scroll pulando para o fundo.
  const rows = Array.isArray(threadRows) ? threadRows : []
  for (let i = rows.length - 1; i >= 0 && i >= rows.length - 4; i -= 1) {
    const text = strTrim(rows[i]?.text || rows[i]?.body || '')
    if (!text) continue
    const preview = strTrim(resolveChatListLastMessage(chatRow) || '').replace(/…$/, '')
    if (preview && (text === preview || text.startsWith(preview))) return false
    break
  }

  // Sidebar à frente do thread aberto (mensagem nova ainda não no painel).
  return sidebarTs > threadTs + 1500
}

const syncOpenChatMessagesInBackground = (chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, expectedListKey = '') => {
  void (async () => {
    try {
      // Só DB/cache. UAZAPI automática = sync no celular (GuzzApp) o tempo todo.
      const fromDb = await refreshOpenChatMessages(chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, {
        syncFromUazapi: false,
        awaitHistory: false,
      }, expectedListKey)
      if (mySeq !== selectChatLoadSeq.value) return
      if (expectedListKey && !isSelectedChatListKey(expectedListKey)) return

      if (fromDb) {
        chatHistorySyncPending.value = false
        return
      }

      // Sem msgs no DB: mostra estado vazio/sync pendente — NÃO dispara history/backfill sozinho.
      if (chatHasListPreview(selectedChat.value || chat)) {
        chatHistorySyncPending.value = true
      } else {
        chatHistorySyncPending.value = false
      }

      if (!AUTO_PROVIDER_MESSAGE_SYNC) return
      if (isProviderSyncOnCooldown(activeFetchJid)) return

      const fromProvider = await refreshOpenChatMessages(chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, {
        syncFromUazapi: true,
        awaitHistory: false,
      }, expectedListKey)
      markProviderSyncCooldown(activeFetchJid, fromProvider ? PROVIDER_SYNC_COOLDOWN_MS : PROVIDER_SYNC_COOLDOWN_MS)
      if (fromProvider) {
        chatHistorySyncPending.value = false
        return
      }
      void requestChatHistoryBackfill([activeFetchJid], { force: false })
      await pollChatMessagesAfterHistorySync(chatRow, activeFetchJid, enrichSharedFns, chat, mySeq, expectedListKey)
    } catch {
      if (mySeq === selectChatLoadSeq.value) chatHistorySyncPending.value = false
    }
  })()
}

export const chatHasListPreview = (chat = {}) => {
  const preview = String(resolveChatListLastMessage(chat) || '').trim()
  if (!preview) return false
  return preview.toLowerCase() !== 'nenhuma mensagem'
}

export const retrySelectedChatHistorySync = async (enrichSharedFns = {}) => {
  const chat = selectedChat.value
  if (!chat) return
  const activeFetchJid = resolveActiveChatFetchJid(chat)
  if (!activeFetchJid) return
  const mySeq = selectChatLoadSeq.value

  try {
    loadingMessages.value = true
    chatHistorySyncPending.value = true
    await requestChatHistoryBackfill([activeFetchJid], { force: true })
    await requestChatHistorySync(activeFetchJid, 100)
    if (mySeq !== selectChatLoadSeq.value) return

    const pageResult = await fetchSelectChatMessages(chat, CHAT_MESSAGES_INITIAL_BATCH, 0, {
      syncFromUazapi: true,
      awaitHistory: false,
    })
    if (mySeq !== selectChatLoadSeq.value) return

    const applied = applyFetchedMessagesToOpenChat(
      pageResult,
      activeFetchJid,
      enrichSharedFns,
      chat,
      mySeq,
      getChatRuntimeCacheKey(chat),
    )
    loadingMessages.value = false

    if (!applied) {
      await pollChatMessagesAfterHistorySync(
        chat,
        activeFetchJid,
        enrichSharedFns,
        chat,
        mySeq,
        getChatRuntimeCacheKey(chat),
      )
    } else {
      chatHistorySyncPending.value = false
    }
  } catch (error) {
    if (mySeq !== selectChatLoadSeq.value) return
    console.error('Erro ao sincronizar histórico', error)
    chatHistorySyncPending.value = false
  } finally {
    loadingMessages.value = false
    if (mySeq === selectChatLoadSeq.value) {
      applySelectChatScroll()
    }
  }
}

export const selectChat = (chat, enrichSharedFns = {}) => {
  if (!chat) return
  const openKey = canonicalChatListKey(chat)
  // Já está neste chat — não refaz o pipeline (clique/pointerdown duplicado).
  if (
    selectedChat.value &&
    openKey &&
    canonicalChatListKey(selectedChat.value) === openKey &&
    Array.isArray(messages.value) &&
    messages.value.length > 0 &&
    !loadingMessages.value
  ) {
    return
  }

  const mySeq = ++selectChatLoadSeq.value
  const chatJid = chat.chatJid
  chatHistorySyncPending.value = false
  loadingMessages.value = false

  resetChatScrollBehavior()
  cancelScheduledGroupObservedPersist()

  // Abre o chat NA HORA — sem remapear a lista inteira no clique (isso travava a UI).
  const resolved = (openKey ? (chats.value || []).find((item) => canonicalChatListKey(item) === openKey) : null) ||
    (chats.value || []).find((item) => item.id === chat.id || item.chatJid === chatJid) ||
    chat
  const nextJid = preferWhatsappNetPrivateJid(
    resolved?.wa_chatid,
    preferWhatsappNetPrivateJid(resolved?.chatJid, chatJid),
  )
  selectedChat.value = { ...resolved, chatJid: nextJid, unreadCount: 0, wa_unreadCount: 0 }

  // Zera badge só do item clicado (barato).
  if (openKey || chatJid) {
    const list = chats.value || []
    const idx = list.findIndex((item) =>
      (openKey && canonicalChatListKey(item) === openKey) ||
      (!openKey && (item.id === chat.id || item.chatJid === chatJid))
    )
    if (idx >= 0 && Number(list[idx]?.unreadCount || list[idx]?.wa_unreadCount || 0) > 0) {
      const copy = list.slice()
      copy[idx] = { ...copy[idx], unreadCount: 0, wa_unreadCount: 0 }
      chats.value = copy
    }
  }

  const activeFetchJid = resolveActiveChatFetchJid(selectedChat.value) || String(chatJid || '').trim()
  const listKey = canonicalChatListKey(selectedChat.value) || openKey
  const cacheHit = getMessagesCacheForChat(selectedChat.value)
  const cachedMessages = cacheHit?.messages
  const hadCache = Array.isArray(cachedMessages) && cachedMessages.length > 0
  // Hidrata URLs de mídia do localStorage ANTES do paint — sem “Baixando…” se já baixou.
  messages.value = hadCache ? hydrateMessagesMediaFromCache(cachedMessages) : []
  // Sem cache: loading NA HORA (evita flash de “Nenhuma mensagem” que parece atraso).
  // Com cache: mensagens já na tela — zero spinner.
  loadingMessages.value = !hadCache

  // Sempre última mensagem ao abrir (cache ou após fetch).
  if (hadCache) {
    applySelectChatScroll()
    void preloadMessageMediaIfNeeded(messages.value)
  }

  // Grupo / sync: tudo depois, sem competir com o fetch das mensagens.
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      if (mySeq !== selectChatLoadSeq.value) return
      if (chat?.isGroup && chatJid) {
        void loadGroupParticipantsDirectory(chatJid, { force: false }).then(() => {
          if (mySeq !== selectChatLoadSeq.value) return
          return loadPersistedGroupObservedSenders(chatJid)
        }).catch(() => {})
      }
    }, 1200)
  }

  void (async () => {
    try {
      if (hadCache) {
        // Cache: mostra na hora; refresh só do DB (sem UAZAPI — evita sync no celular).
        syncOpenChatMessagesInBackground(selectedChat.value, activeFetchJid, enrichSharedFns, chat, mySeq, listKey)
        return
      }

      const applied = await refreshOpenChatMessages(
        selectedChat.value,
        activeFetchJid,
        enrichSharedFns,
        chat,
        mySeq,
        { syncFromUazapi: false, awaitHistory: false },
        listKey,
      )
      if (mySeq !== selectChatLoadSeq.value) return
      loadingMessages.value = false

      if (applied) {
        // Sidebar à frente: só DB de novo — NÃO sync UAZAPI automático.
        if (sidebarLooksNewerThanThread(selectedChat.value, messages.value)) {
          syncOpenChatMessagesInBackground(selectedChat.value, activeFetchJid, enrichSharedFns, chat, mySeq, listKey)
        }
        return
      }

      // Sem msgs no DB: banner + botão retry. Não dispara history/backfill sozinho (GuzzApp).
      chatHistorySyncPending.value = chatHasListPreview(selectedChat.value)
      if (!AUTO_PROVIDER_MESSAGE_SYNC) return
      if (isProviderSyncOnCooldown(activeFetchJid)) return

      const fromProvider = await refreshOpenChatMessages(
        selectedChat.value,
        activeFetchJid,
        enrichSharedFns,
        chat,
        mySeq,
        { syncFromUazapi: true, awaitHistory: false },
        listKey,
      )
      markProviderSyncCooldown(activeFetchJid, PROVIDER_SYNC_COOLDOWN_MS)
      if (fromProvider) {
        chatHistorySyncPending.value = false
        return
      }
      void requestChatHistoryBackfill([activeFetchJid], { force: false })
    } catch (e) {
      if (mySeq !== selectChatLoadSeq.value) return
      loadingMessages.value = false
      if (e?.message === 'BAD_REQUEST_MESSAGE_FIND' || e?.message === 'CHAT_ID_INVALID') return
      console.error('Erro ao carregar mensagens', e)
      chatHistorySyncPending.value = false
    } finally {
      if (mySeq === selectChatLoadSeq.value) {
        loadingMessages.value = false
      }
    }
  })()
}

// ─── sendMessage ──────────────────────────────────────────────────────────────

const dropStaleOptimisticOutbound = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const confirmed = rows.filter((row) => row?.fromMe && !row?.optimisticOutbound)
  return rows.filter((row) => {
    if (!row?.optimisticOutbound) return true
    const text = strTrim(row.text || row.body || '')
    const ts = Number(row.timestamp || 0)
    if (!text || !ts) return false
    return !confirmed.some((real) => {
      const realText = strTrim(real.text || real.body || '')
      const realTs = Number(real.timestamp || 0)
      return realText === text && Math.abs(realTs - ts) <= 90_000
    })
  })
}

const appendOptimisticOutgoingText = (chatJid, text, replyTo = null) => {
  const normalizedChatJid = normalizeJid(chatJid)
  if (!normalizedChatJid || !text) return null

  const optimisticId = `opt-out:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`
  const raw = {
    id: optimisticId,
    messageid: optimisticId,
    chatid: normalizedChatJid,
    text,
    body: text,
    fromMe: true,
    messageTimestamp: Date.now(),
    messageType: 'Conversation',
    status: 'pending',
    ...(replyTo?.messageid ? { quoted: replyTo.messageid } : {}),
  }

  const normalized = normalizeIncomingMessage(raw)
  if (!normalized) return null

  // Limpa apenas otimistas antigas pendentes; a NOVA bolha nunca pode ser descartada
  // aqui (senão um texto repetido em <90s some do input e só volta via webhook/poll).
  const cleanedPrev = dropStaleOptimisticOutbound(messages.value)
  const next = [
    ...cleanedPrev,
    { ...normalized, optimisticOutbound: true, deliveryStatus: 'pending' },
  ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

  messages.value = next
  storeMessagesInChatCache(selectedChat.value, next)
  return optimisticId
}

const removeOptimisticOutgoing = (optimisticId) => {
  if (!optimisticId) return
  const next = messages.value.filter((row) =>
    row.id !== optimisticId &&
    row.messageid !== optimisticId &&
    row.normalizedMessageId !== optimisticId
  )
  messages.value = next
  storeMessagesInChatCache(selectedChat.value, next)
}

/** Extrai messageid + timestamp da resposta do /send/text para confirmar na hora. */
const extractSentMessageRef = (responseData) => {
  const payload = responseData && typeof responseData === 'object' ? responseData : {}
  const node = (payload.message && typeof payload.message === 'object' && payload.message)
    || (payload.data && typeof payload.data === 'object' && payload.data)
    || payload
  const key = node?.key && typeof node.key === 'object' ? node.key : {}
  const realId = normalizeProviderMessageId(
    node?.id || node?.messageid || node?.messageId || key?.id || key?.ID || ''
  )
  const tsRaw = node?.messageTimestamp || node?.timestamp || node?.t || 0
  const realTs = normalizeTimestampToMs(tsRaw) || 0
  return { realId, realTs }
}

/** Converte a mensagem otimista (⏱) em enviada (✓) usando a resposta da UAZAPI. */
const confirmOptimisticOutgoing = (optimisticId, responseData) => {
  if (!optimisticId) return
  const { realId, realTs } = extractSentMessageRef(responseData)

  const next = messages.value.map((row) => {
    const isTarget = row.id === optimisticId
      || row.messageid === optimisticId
      || row.normalizedMessageId === optimisticId
    if (!isTarget) return row
    return {
      ...row,
      id: realId || row.id,
      messageid: realId || row.messageid,
      normalizedMessageId: realId || row.normalizedMessageId,
      timestamp: realTs || row.timestamp,
      status: 'sent',
      deliveryStatus: 'sent',
      deliveryIndicator: '✓',
      optimisticOutbound: !realId,
    }
  })
  messages.value = next
  storeMessagesInChatCache(selectedChat.value, next)
}

export const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return
  if (!selectedChat.value) {
    showChatFeedback('Selecione uma conversa para enviar.')
    return
  }
  const chatNumber = resolveSendChatNumber(selectedChat.value)
  if (!chatNumber) {
    showChatFeedback('Não foi possível identificar o destinatário.')
    return
  }

  const textToSend = newMessage.value.trim()
  const currentChatJid = resolveActiveChatFetchJid(selectedChat.value) || selectedChat.value?.chatJid
  const savedReplyingTo = replyingTo.value
  const proxyBase = getProxyBase()

  newMessage.value = ''
  replyingTo.value = null

  const optimisticId = currentChatJid ? appendOptimisticOutgoingText(currentChatJid, textToSend, savedReplyingTo) : null
  if (currentChatJid) {
    refreshChatPreview(currentChatJid, {
      lastMessage: textToSend,
      lastMessageFromMe: true,
      lastMessagePrefix: '',
      lastMessageTime: Date.now(),
      wa_lastMessageTextVote: textToSend,
    })
  }
  scrollToBottom()

  sending.value = true
  try {
    const pollCmd = textToSend.match(/^\/poll\s+(.+?)\s*\|\s*(.+)$/i)
    const menuJsonCmd = textToSend.match(/^\/menujson\s+(\{[\s\S]+\})$/i)

    if (menuJsonCmd) {
      const payload = JSON.parse(menuJsonCmd[1])
      payload.number = payload.number || chatNumber
      const menuRes = await fetch(`${proxyBase}/send/menu`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const menuData = await menuRes.json().catch(() => ({}))
      if (!menuRes.ok) throw new Error(menuData?.message || menuData?.error || 'Falha ao enviar menu')
      removeOptimisticOutgoing(optimisticId)
      refreshSelectedChatMessages({}, { light: true }).catch(() => {})
      scrollToBottom()
      return
    }

    if (pollCmd) {
      const pollTitle = String(pollCmd[1] || '').trim()
      const pollOptions = String(pollCmd[2] || '')
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
      if (!pollTitle || pollOptions.length < 2) {
        throw new Error('Formato de enquete inválido. Use: /poll Pergunta | Opcao 1; Opcao 2')
      }
      const menuRes = await fetch(`${proxyBase}/send/menu`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify({
          number: chatNumber,
          type: 'poll',
          text: pollTitle,
          choices: pollOptions,
          selectableCount: 1
        })
      })
      const menuData = await menuRes.json().catch(() => ({}))
      if (!menuRes.ok) throw new Error(menuData?.message || menuData?.error || 'Falha ao enviar enquete')
      removeOptimisticOutgoing(optimisticId)
      refreshSelectedChatMessages({}, { light: true }).catch(() => {})
      scrollToBottom()
      return
    }

    const body = { number: chatNumber, text: textToSend }
    if (savedReplyingTo?.messageid) body.replyid = savedReplyingTo.messageid
    const res = await fetch(`${proxyBase}/send/text`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(body)
    })
    const sentData = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(sentData?.message || sentData?.error || 'Falha ao enviar mensagem')
    }

    confirmOptimisticOutgoing(optimisticId, sentData)

    window.setTimeout(() => {
      refreshSelectedChatMessages({}, { light: true }).catch(() => {})
    }, 350)
  } catch (e) {
    console.error('Erro ao enviar mensagem', e)
    removeOptimisticOutgoing(optimisticId)
    newMessage.value = textToSend
    replyingTo.value = savedReplyingTo
    showChatFeedback('Não foi possível enviar. Tente novamente.')
  } finally {
    sending.value = false
  }
}

export const sendInteractiveMenuReply = async (message, opt) => {
  if (!message || !opt || opt.isSection || sending.value) return

  const normalized = {
    ...opt,
    buttonType: String(opt.buttonType || opt.type || 'REPLY').toUpperCase(),
    id: strTrim(opt.id || opt.description || opt.label),
    label: strTrim(opt.label || opt.id),
  }
  if (!normalized.label) return

  if (handleInteractiveMenuOptionClick(normalized)) return
  if (!selectedChat.value?.chatJid) return

  const textToSend = normalized.label
  const currentChatJid = selectedChat.value.chatJid
  const replyId = strTrim(message.messageid || message.normalizedMessageId || message.id)

  const body = {
    number: currentChatJid,
    text: textToSend,
    readchat: true,
  }
  if (replyId && !replyId.startsWith('local-')) body.replyid = replyId

  try {
    sending.value = true
    const proxyBase = getProxyBase()
    const res = await fetch(`${proxyBase}/send/text`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message || data?.error || 'Falha ao enviar resposta interativa')
    }
    refreshChatPreview(currentChatJid, {
      lastMessage: textToSend,
      lastMessageFromMe: true,
      lastMessagePrefix: '',
      lastMessageTime: Date.now(),
      wa_lastMessageTextVote: textToSend,
    })
    await refreshSelectedChatMessages()
    scrollToBottom()
  } catch (e) {
    console.error('Erro ao enviar resposta interativa', e)
  } finally {
    sending.value = false
  }
}

// ─── Realtime sync ────────────────────────────────────────────────────────────

let forceRealtimeSyncDebounceTimer = null
let chatRealtimeUnsub = null
let initialSyncCompleteUnsub = null
let lastRealtimeHealthy = null

/** Pusher ou SSE saudável → polling vira safety-net, não fonte primária. */
const isRealtimeTransportHealthy = () => isWhatsappPusherConnected() || isWhatsappSseConnected()

let chatsPollInflight = false

const rescheduleChatsPolling = (enrichSharedFns = {}) => {
  if (typeof window === 'undefined') return
  if (chatsPollingTimer.value) clearInterval(chatsPollingTimer.value)
  const healthy = isRealtimeTransportHealthy()
  lastRealtimeHealthy = healthy
  const interval = getGentleChatsPollIntervalMs({ realtimeHealthy: healthy })
  chatsPollingTimer.value = setInterval(() => {
    const nowHealthy = isRealtimeTransportHealthy()
    if (nowHealthy !== lastRealtimeHealthy) {
      rescheduleChatsPolling(enrichSharedFns)
      rescheduleMessagesPolling(enrichSharedFns)
      return
    }
    // Poll anterior ainda rodando (UAZAPI lenta) → pula o tick, não empilha requests.
    if (chatsPollInflight) return
    chatsPollInflight = true
    loadChats(false, { silent: true, lightSync: true, gentle: isInitialSyncGentleMode() })
      .catch(() => {})
      .finally(() => { chatsPollInflight = false })
  }, interval)
}

const pollOpenChatCatchUp = (enrichSharedFns = {}) => {
  if (!selectedChat.value) return
  const behind = sidebarLooksNewerThanThread(selectedChat.value, messages.value)
  // Sidebar à frente → findMessages (sem history-sync). Caso normal: só DB.
  refreshSelectedChatMessages(enrichSharedFns, {
    light: true,
    force: behind,
    syncFromUazapi: behind,
  }).catch(() => {})
}

const rescheduleMessagesPolling = (enrichSharedFns = {}) => {
  if (typeof window === 'undefined') return
  if (messagesPollingTimer.value) clearInterval(messagesPollingTimer.value)
  const healthy = isRealtimeTransportHealthy()
  // Com realtime ok, não pollar mensagens a cada 4s — só safety-net longo.
  if (healthy && !isInitialSyncGentleMode()) {
    messagesPollingTimer.value = setInterval(() => {
      if (!isRealtimeTransportHealthy()) {
        rescheduleMessagesPolling(enrichSharedFns)
        rescheduleChatsPolling(enrichSharedFns)
        return
      }
      pollOpenChatCatchUp(enrichSharedFns)
    }, MESSAGES_POLL_REALTIME_SAFE_MS)
    return
  }
  messagesPollingTimer.value = setInterval(() => {
    if (isInitialSyncGentleMode()) return
    if (isRealtimeTransportHealthy()) {
      rescheduleMessagesPolling(enrichSharedFns)
      rescheduleChatsPolling(enrichSharedFns)
      return
    }
    pollOpenChatCatchUp(enrichSharedFns)
  }, MESSAGES_POLL_INTERVAL_MS)
}

const watchInitialSyncCompletion = (enrichSharedFns = {}) => {
  if (typeof window === 'undefined') return
  if (initialSyncCompleteUnsub) return
  let prevActive = isInitialSyncGentleMode()
  initialSyncCompleteUnsub = setInterval(() => {
    const active = isInitialSyncGentleMode()
    const healthy = isRealtimeTransportHealthy()
    if (prevActive && !active) {
      rescheduleChatsPolling(enrichSharedFns)
      rescheduleMessagesPolling(enrichSharedFns)
      loadChats(true, { silent: true }).catch(() => {})
    } else if (healthy !== lastRealtimeHealthy) {
      rescheduleChatsPolling(enrichSharedFns)
      rescheduleMessagesPolling(enrichSharedFns)
    }
    prevActive = active
  }, 3000)
}

export const mergeIncomingWhatsappMessage = (rawMessage, chatJid = '', options = {}) => {
  if (!rawMessage || typeof rawMessage !== 'object') return false
  const selected = selectedChat.value
  const selectedJid = normalizeJid(selected?.chatJid)
  if (!selectedJid) return false
  const forceOpenChat = options.forceOpenChat === true

  const incomingCandidates = [
    chatJid,
    rawMessage.chatid,
    rawMessage.chatJid,
    rawMessage.wa_chatid,
    rawMessage.wa_chatlid,
    rawMessage.chatlid,
    rawMessage.sender_pn,
    // Em chat privado, fromMe=false: sender pode ser o contato (mesmo chat).
    !rawMessage.fromMe && !selectedJid.endsWith('@g.us') ? rawMessage.sender : '',
    !rawMessage.fromMe && !selectedJid.endsWith('@g.us') ? rawMessage.sender_lid : '',
  ].map((v) => normalizeJid(v)).filter(Boolean)

  // Aliases conhecidos do chat aberto (PN, LID, chatid) — resolve LID↔PN sem forçar.
  const openChatAliases = [
    selectedJid,
    normalizeJid(selected?.wa_chatid),
    normalizeJid(selected?.wa_chatlid),
    normalizeJid(selected?.chatid),
  ].filter(Boolean)

  const matchesOpenChat = forceOpenChat || (
    incomingCandidates.length > 0 &&
    incomingCandidates.some((jid) => openChatAliases.some((alias) => jidsReferToSameChat(jid, alias)))
  )
  if (!matchesOpenChat) return false

  const normalized = normalizeIncomingMessage(rawMessage)
  if (!normalized) return false
  // Garante chatid do thread aberto (evita merge key estranha / cache errado).
  normalized.chatid = selectedJid
  normalized.chatJid = selectedJid
  const key = getMessageMergeKey(normalized)
  const mergedByKey = new Map()

  for (const current of messages.value) {
    const row = current?.isReaction != null ? current : normalizeMessageForDisplay(current)
    if (!row) continue
    mergedByKey.set(getMessageMergeKey(row), row)
  }

  const existing = mergedByKey.get(key)
  if (existing) {
    const winner = key.startsWith('reaction:')
      ? ((normalized.timestamp || 0) >= (existing.timestamp || 0) ? normalized : existing)
      : pickRicherDuplicateBaseMessage(existing, normalized)
    mergedByKey.set(key, winner)
  } else {
    mergedByKey.set(key, normalized)
  }

  const merged = dropStaleOptimisticOutbound(Array.from(mergedByKey.values())).sort((a, b) => a.timestamp - b.timestamp)
  messages.value = merged
  storeMessagesInChatCache(selectedChat.value, merged)
  indexMessagesForPreviewCache(merged)
  refreshReactionPreviewForChatJid(selectedJid, merged)
  return true
}

export const forceRealtimeSync = (enrichSharedFns = {}) => {
  if (typeof window === 'undefined') return
  if (forceRealtimeSyncDebounceTimer) clearTimeout(forceRealtimeSyncDebounceTimer)
  const debounceMs = isInitialSyncGentleMode() ? 900 : 200
  forceRealtimeSyncDebounceTimer = setTimeout(async () => {
    forceRealtimeSyncDebounceTimer = null
    try {
      await loadChats(false, { silent: true, lightSync: true, gentle: isInitialSyncGentleMode() })
      if (!isInitialSyncGentleMode()) {
        await refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true })
      }
      stickChatScrollToBottomIfNeeded()
    } catch (err) { console.error('Sincronizacao em tempo real', err) }
  }, debounceMs)
}

const isChatMetadataEvent = (eventType = '') => {
  const root = String(eventType || '').trim().toLowerCase().split('.')[0]
  return root === 'chat' || root === 'chats'
}

const buildRealtimeMessageFromChatPreview = (payload = {}, selectedJid = '') => {
  const chat = payload?.chat
  if (!chat || typeof chat !== 'object' || Array.isArray(chat)) return null

  const row = normalizeChat({
    ...chat,
    chatJid: chat.wa_chatid || chat.chatid || chat.chatJid || payload?.chatJid || '',
  })
  const chatJid = normalizeJid(row.chatJid || payload?.chatJid || '')
  if (!chatJid || !selectedJid || !jidsReferToSameChat(chatJid, selectedJid)) return null

  const msgType = String(chat.wa_lastMessageType || chat.lastMessageType || '').trim()
  if (isReactionMessageType(msgType)) return null

  const text = pickFirstNonEmptyText(
    chat.wa_lastMessageTextVote,
    chat.wa_lastMsgText,
    chat.wa_lastMessageText,
    chat.lastMessage,
    row.lastMessage,
  )
  if (!text || detectChatPresenceKindFromText(text)) return null

  const ts = normalizeTimestampToMs(
    chat.wa_lastMsgTimestamp ||
    chat.wa_lastMessageTimestamp ||
    chat.wa_lastMessageTime ||
    chat.lastMessageTime ||
    chat.timestamp ||
    Date.now()
  ) || Date.now()

  const syntheticId = `rt-chat-preview:${chatJid}:${ts}:${text.slice(0, 24)}`
  return {
    id: syntheticId,
    messageid: syntheticId,
    chatid: selectedJid,
    chatJid: selectedJid,
    sender: row.lastMessageSender || chat.wa_lastMessageSender || '',
    sender_pn: row.lastMessageSender || chat.wa_lastMessageSender || '',
    fromMe: Boolean(row.lastMessageFromMe),
    text,
    body: text,
    message: text,
    messageTimestamp: ts,
    timestamp: ts,
    messageType: msgType || 'Conversation',
    type: msgType || 'text',
  }
}

/**
 * Evento realtime só com `message` (sem objeto `chat`): sintetiza o chat para
 * atualizar preview/ordem/unread da sidebar NA HORA, sem esperar poll HTTP.
 */
const buildChatPayloadFromRealtimeMessage = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return null
  const chatJid = normalizeJid(
    raw.chatid ||
    raw.chatJid ||
    raw.wa_chatid ||
    (!raw.fromMe ? raw.sender_pn : '') ||
    ''
  )
  if (!chatJid) return null
  const text = strTrim(raw.text || raw.body || raw.caption || '')
  const ts = normalizeTimestampToMs(raw.messageTimestamp || raw.timestamp || 0) || Date.now()
  return {
    wa_chatid: chatJid,
    chatJid,
    wa_lastMsgTimestamp: ts,
    lastMessageTime: ts,
    wa_lastMessageType: String(raw.messageType || raw.type || ''),
    wa_lastMessageSender: String(raw.sender || raw.participant || raw.sender_pn || ''),
    ...(text ? { wa_lastMessageTextVote: text, lastMessage: text } : {}),
  }
}

export const handleWhatsappRealtimeEvent = (payload = {}, enrichSharedFns = {}) => {
  const eventType = String(payload?.eventType || '').trim().toLowerCase()
  if (eventType === 'session.reset' || payload?.sessionReset === true) {
    if (isWhatsappWuzapiProvider()) {
      void loadChats(true)
      return
    }
    resetWhatsappAfterDisconnect()
    void loadChats(true)
    return
  }
  if (eventType === 'sse.reconnected') {
    // Stream caiu e voltou: eventos podem ter se perdido no intervalo — resync HTTP.
    forceRealtimeSync(enrichSharedFns)
    return
  }
  if (eventType === 'history' || eventType.includes('history')) {
    markInitialSyncActivity('history')
    const historyChatJid = String(
      payload?.chatJid ||
      payload?.chat?.wa_chatid ||
      payload?.message?.chatid ||
      payload?.details?.number ||
      payload?.details?.chat ||
      ''
    ).trim()
    const selectedJid = normalizeJid(selectedChat.value?.chatJid)
    const historyMessages = extractRealtimeMessagesFromPayload(payload)
    if (historyMessages.length) {
      let mergedAny = false
      for (const rawMessage of historyMessages) {
        const msgChatJid = String(
          rawMessage?.chatid ||
          rawMessage?.chatJid ||
          rawMessage?.wa_chatid ||
          historyChatJid ||
          ''
        ).trim()
        if (mergeIncomingWhatsappMessage(rawMessage, msgChatJid)) mergedAny = true
      }
      if (mergedAny) stickChatScrollToBottomIfNeeded()
    }
    if (selectedJid && historyChatJid && jidsReferToSameChat(historyChatJid, selectedJid)) {
      void refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true })
    } else if (selectedJid && historyMessages.length) {
      void refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true })
    }
  }
  const deletedJid = String(payload?.deletedChatJid || '').trim()
  if (payload?.chatDeleted && deletedJid) {
    removeChatFromLocalState({ chatJid: deletedJid })
    return
  }
  if (eventType === 'chats.delete' || eventType.endsWith('.delete')) {
    const jid = deletedJid || String(payload?.chatJid || payload?.chat?.wa_chatid || '').trim()
    if (jid) {
      removeChatFromLocalState({ chatJid: jid })
      return
    }
  }

  const isPresenceEvent = eventType === 'presence' || eventType.endsWith('.presence')

  let appliedChatFromPayload = false
  if (isPresenceEvent) {
    applyPresenceFromRealtimePayload(payload)
  } else {
    appliedChatFromPayload = applyWhatsappRealtimePayload(payload)

    // Evento sem objeto `chat` (só message): atualiza a sidebar direto do message.
    if (!appliedChatFromPayload) {
      const rawMsgs = payload?.message && typeof payload.message === 'object'
        ? [payload.message]
        : extractRealtimeMessagesFromPayload(payload)
      for (const raw of rawMsgs) {
        const syntheticChat = buildChatPayloadFromRealtimeMessage(raw)
        if (!syntheticChat) continue
        // messages_update de msg antiga não pode regredir preview/ordem da sidebar.
        const existingRow = (chats.value || []).find(
          (item) => canonicalChatListKey(item) === canonicalChatListKey(syntheticChat)
        )
        if (existingRow && Number(syntheticChat.lastMessageTime || 0) < getChatActivityTimestamp(existingRow) - 1000) {
          continue
        }
        if (applyWhatsappRealtimePayload({ chat: syntheticChat, message: raw })) {
          appliedChatFromPayload = true
        }
      }
    }
  }

  const eventChatJid = String(
    payload?.chatJid ||
    payload?.chat?.wa_chatid ||
    payload?.chat?.wa_chatlid ||
    payload?.message?.chatid ||
    payload?.message?.sender_pn ||
    parsePresenceFromRealtimePayload(payload)?.chatJid ||
    ''
  ).trim()
  const selectedJid = normalizeJid(selectedChat.value?.chatJid)
  // NÃO confiar só no JID do evento — LID vs PN falhava e a bolha nunca entrava.
  const affectsOpenChat = Boolean(selectedJid) && (
    !eventChatJid ||
    jidsReferToSameChat(eventChatJid, selectedJid) ||
    sidebarLooksNewerThanThread(selectedChat.value, messages.value)
  )
  const isGroupEvent = eventType === 'groups' || eventType === 'group'

  let mergedOpenChatMessage = false
  let mergedSyntheticChatPreview = false
  const tryMergeIntoOpenChat = (raw, hintJid = '', force = false) => {
    if (!selectedJid || !raw) return false
    // Sem id/texto/mídia — provavelmente só metadado de chat, não bolha.
    const hasBody = Boolean(
      raw.id || raw.messageid || raw.messageId || raw.key?.id ||
      raw.text || raw.body || raw.message || raw.content ||
      raw.messageType || raw.type || raw.mediaType
    )
    if (!hasBody) return false
    if (mergeIncomingWhatsappMessage(raw, hintJid || eventChatJid || selectedJid, { forceOpenChat: force })) return true
    // 2ª tentativa forçada SÓ quando o evento é do chat aberto (LID vs PN) —
    // sem isso, mensagem de OUTRA conversa era injetada no thread aberto.
    if (force && mergeIncomingWhatsappMessage(raw, selectedJid, { forceOpenChat: true })) return true
    return false
  }

  // Força merge SÓ quando o JID do evento é comprovadamente o chat aberto.
  // "sidebar à frente" NÃO é critério: forçava mensagem de OUTRA conversa
  // para dentro do thread aberto. LID↔PN é resolvido pelos aliases no merge.
  const forceMergeOpen = Boolean(selectedJid) &&
    !isPresenceEvent &&
    Boolean(eventChatJid) &&
    jidsReferToSameChat(eventChatJid, selectedJid)

  if (payload?.message && selectedJid && !isPresenceEvent) {
    mergedOpenChatMessage = tryMergeIntoOpenChat(payload.message, eventChatJid, forceMergeOpen)
    if (mergedOpenChatMessage) stickChatScrollToBottomIfNeeded()
  }

  // Extração ampla: alguns webhooks trazem message em data/event.
  if (!mergedOpenChatMessage && selectedJid && !isPresenceEvent) {
    const extras = extractRealtimeMessagesFromPayload(payload)
    if (extras.length) {
      let any = false
      for (const raw of extras) {
        if (tryMergeIntoOpenChat(raw, eventChatJid, forceMergeOpen)) any = true
      }
      if (any) {
        mergedOpenChatMessage = true
        stickChatScrollToBottomIfNeeded()
      }
    }
  }

  // Sidebar do chat aberto à frente do thread → puxa DB; se ainda falhar, findMessages (sem history-sync).
  if (!mergedOpenChatMessage && selectedJid && !isPresenceEvent && appliedChatFromPayload) {
    const synthetic = buildRealtimeMessageFromChatPreview(payload, selectedJid)
    // A mensagem REAL pode já ter entrado via evento `messages` — a bolha sintética
    // do preview tem outro id e duplicava o balão (ex.: "Ihhh" ×2).
    const syntheticText = strTrim(synthetic?.text || '')
    const syntheticTs = Number(synthetic?.timestamp || 0)
    const alreadyInThread = Boolean(syntheticText) && (messages.value || []).some((m) =>
      strTrim(m?.text || m?.body || '') === syntheticText &&
      Math.abs(Number(m?.timestamp || 0) - syntheticTs) < 5 * 60_000
    )
    if (synthetic && !alreadyInThread && tryMergeIntoOpenChat(synthetic, selectedJid, true)) {
      mergedOpenChatMessage = true
      mergedSyntheticChatPreview = true
      stickChatScrollToBottomIfNeeded()
    }
  }

  const openChatBehindSidebar = Boolean(selectedJid) &&
    !isPresenceEvent &&
    sidebarLooksNewerThanThread(selectedChat.value, messages.value)

  if (
    selectedJid &&
    !mergedOpenChatMessage &&
    !isPresenceEvent &&
    (affectsOpenChat || openChatBehindSidebar || appliedChatFromPayload || payload?.message)
  ) {
    void refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true }).then(() => {
      stickChatScrollToBottomIfNeeded()
      if (!sidebarLooksNewerThanThread(selectedChat.value, messages.value)) return
      // DB ainda vazio (chats.update sem message / race) → pull findMessages só deste chat.
      window.setTimeout?.(() => {
        void refreshSelectedChatMessages(enrichSharedFns, {
          force: true,
          light: true,
          syncFromUazapi: true,
        }).then(() => {
          stickChatScrollToBottomIfNeeded()
        })
      }, 400)
    })
  }

  // Evento de chat (mute, pin, arquivar…) já traz wa_muteEndTime no payload — não sobrescrever com lightSync stale.
  if (mergedSyntheticChatPreview) {
    window.setTimeout?.(() => {
      void refreshSelectedChatMessages(enrichSharedFns, { force: true, light: true }).then(() => {
        stickChatScrollToBottomIfNeeded()
      })
    }, 250)
  }

  const skipLightSync = appliedChatFromPayload && isChatMetadataEvent(eventType) && !payload?.message
  // Com Pusher/SSE ok: confiar no merge local; HTTP completo só em gaps (history já trata acima).
  const needsHttpRefresh =
    selectedJid &&
    !mergedOpenChatMessage &&
    !appliedChatFromPayload &&
    !isPresenceEvent &&
    !isRealtimeTransportHealthy()

  if (needsHttpRefresh) {
    forceRealtimeSync(enrichSharedFns)
  } else if (!skipLightSync && !mergedOpenChatMessage && !appliedChatFromPayload && !isPresenceEvent) {
    // Sidebar: só se o payload não trouxe chat/mensagem aplicável
    if (!isRealtimeTransportHealthy()) {
      loadChats(false, { silent: true, lightSync: true, gentle: isInitialSyncGentleMode() }).catch(() => {})
    }
  }

  if (isGroupEvent && selectedJid && selectedChat.value?.isGroup) {
    loadGroupParticipantsDirectory(selectedJid, { force: true }).catch(() => {})
  }

  if (appliedChatFromPayload || payload?.message) {
    markInitialSyncActivity(eventType || 'realtime')
  }
}

/** @deprecated use handleWhatsappRealtimeEvent */
export const handleWhatsappPusherEvent = handleWhatsappRealtimeEvent

export const startRealtimeSync = async (enrichSharedFns = {}) => {
  if (!chatRealtimeUnsub) {
    chatRealtimeUnsub = subscribeWhatsappRealtime((payload) => handleWhatsappRealtimeEvent(payload, enrichSharedFns))
  }

  connectWhatsappSse()
  rescheduleChatsPolling(enrichSharedFns)
  rescheduleMessagesPolling(enrichSharedFns)
  watchInitialSyncCompletion(enrichSharedFns)

  // Após Pusher conectar, reavaliar intervalos (connect é async).
  void connectWhatsappPusher().then(() => {
    rescheduleChatsPolling(enrichSharedFns)
    rescheduleMessagesPolling(enrichSharedFns)
  })

  if (!visibilitySyncHandler.value) {
    visibilitySyncHandler.value = () => {
      if (document.visibilityState !== 'visible') return
      rescheduleChatsPolling(enrichSharedFns)
      rescheduleMessagesPolling(enrichSharedFns)
      forceRealtimeSync(enrichSharedFns)
    }
    document.addEventListener('visibilitychange', visibilitySyncHandler.value)
  }
  if (!windowFocusSyncHandler.value) {
    windowFocusSyncHandler.value = () => {
      // Focus com realtime ok: não forçar HTTP completo — só reavaliar poll.
      if (isRealtimeTransportHealthy()) {
        rescheduleChatsPolling(enrichSharedFns)
        rescheduleMessagesPolling(enrichSharedFns)
        return
      }
      forceRealtimeSync(enrichSharedFns)
    }
    window.addEventListener('focus', windowFocusSyncHandler.value)
  }
  if (!windowOnlineSyncHandler.value) {
    windowOnlineSyncHandler.value = () => forceRealtimeSync(enrichSharedFns)
    window.addEventListener('online', windowOnlineSyncHandler.value)
  }
}

export const stopRealtimeSync = () => {
  if (chatRealtimeUnsub) {
    chatRealtimeUnsub()
    chatRealtimeUnsub = null
  }
  disconnectWhatsappSse()
  disconnectWhatsappPusher()
  if (forceRealtimeSyncDebounceTimer) { clearTimeout(forceRealtimeSyncDebounceTimer); forceRealtimeSyncDebounceTimer = null }
  if (initialSyncCompleteUnsub) { clearInterval(initialSyncCompleteUnsub); initialSyncCompleteUnsub = null }
  if (chatsPollingTimer.value) { clearInterval(chatsPollingTimer.value); chatsPollingTimer.value = null }
  if (messagesPollingTimer.value) { clearInterval(messagesPollingTimer.value); messagesPollingTimer.value = null }
  if (visibilitySyncHandler.value) { document.removeEventListener('visibilitychange', visibilitySyncHandler.value); visibilitySyncHandler.value = null }
  if (windowFocusSyncHandler.value) { window.removeEventListener('focus', windowFocusSyncHandler.value); windowFocusSyncHandler.value = null }
  if (windowOnlineSyncHandler.value) { window.removeEventListener('online', windowOnlineSyncHandler.value); windowOnlineSyncHandler.value = null }
}

/** Para polling, limpa chats/mensagens/contatos em memória — usar ao desconectar ou antes de novo QR. */
export const resetWhatsappAfterDisconnect = () => {
  cancelScheduledGroupObservedPersist()
  stopRealtimeSync()
  resetInitialSyncState()
  resetChatsRuntimeCaches()
  void import('./useWhatsappQuickReplies.js').then((m) => m.resetQuickRepliesState?.()).catch(() => {})
  chatOlderPaginationByJid.clear()
  chatProviderSyncCooldownUntil.clear()
  loadingOlderMessages.value = false
  chatMessagesHasMore.value = false
  unbindChatBodyScrollListeners()
  clearWhatsappSessionState()
  clearWhatsappLabelsCache()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('wa_session_jid')
    } catch { /* ignore */ }
  }
}

export function useWhatsappChats() {
  return {
    loadChats, selectChat, retrySelectedChatHistorySync, prefetchChatMessagesFromDb, sendMessage, sendInteractiveMenuReply, loadOlderChatMessages,
    scrollToBottom, scrollToBottomOnChatOpen, isChatBodyNearBottom, stickChatScrollToBottomIfNeeded,
    captureChatScrollSnapshot, restoreChatScrollAfterMessagesUpdate,
    refreshSelectedChatMessages, refreshChatPreview, markCurrentChatAsRead, markMessageAsPlayed, markAllChatsAsRead,
    toggleChatPinned, startRealtimeSync, stopRealtimeSync, resetWhatsappAfterDisconnect, forceRealtimeSync,
    handleWhatsappRealtimeEvent, handleWhatsappPusherEvent,
    enrichMissingChatAvatars, clearChatAvatarAndRefresh, mergeChatsSliceIntoList, sortChatsByPriority,
    canonicalChatListKey, preferWhatsappNetPrivateJid, isActiveChatListItem,
    normalizeChat, mergeDuplicateChatRows, chatListPreviewPrefix,
    resolveChatListLastMessage, formatReactionListPreview, buildChatListPreviewFromMessage,
    buildReactionChatListPreview, refreshChatPreviewForUserReaction, messageTextForReactionQuote,
    inferChatLastMessageFromMe, chatListDeliveryStatus, shouldShowChatListPreviewTicks, isReactionListPreviewText,
    resolveChatListPresencePreview, getChatPresenceState, applyPresenceFromRealtimePayload,
    applyWhatsappRealtimePayload, indexMessagesForPreviewCache,
    fallbackLastMessageFromChatType, getChatActivityTimestamp, parseWaPinnedFlag,
    syncSelectedChatAfterChatsMutation, fetchChatMessages, chatHasListPreview, resolveChatListLastMessage,
  }
}

export {
  scrollToBottom,
  scrollToBottomOnChatOpen,
  isChatBodyNearBottom,
  stickChatScrollToBottomIfNeeded,
  captureChatScrollSnapshot,
  restoreChatScrollAfterMessagesUpdate,
  resetChatScrollBehavior,
  bindChatBodyScrollListeners,
  unbindChatBodyScrollListeners,
} from './useWhatsappScroll.js'
