/**
 * useWhatsappChats
 * Gerenciamento da lista de chats, seleção de chat, envio de mensagens e sincronização em tempo real.
 */
import { nextTick } from 'vue'
import {
  chats, selectedChat, messages, loadingChats, loadingMessages, selectChatLoadSeq,
  isRefreshingMessages, chatsPollingTimer, messagesPollingTimer, sending,
  newMessage, replyingTo, chatBodyRef, newMessage as newMessageRef,
  chatsBackendOfflineLogged, messagesBackendOfflineLogged,
  visibilitySyncHandler, windowFocusSyncHandler, windowOnlineSyncHandler,
  groupParticipantsDirectory, groupParticipantsByJid, groupParticipantsByLid,
  lidToJidMap, observedSenderDirectory, senderAvatarDirectory, clearWhatsappSessionState
} from './useWhatsappState.js'
import {
  normalizeJid, strTrim, buildLookupKeys, normalizeTimestampToMs, parseJsonBodySafe
} from './useWhatsappUtils.js'
import { getAuthToken, getProxyBase, CHATS_POLL_INTERVAL_MS, MESSAGES_POLL_INTERVAL_MS } from './useWhatsappApi.js'
import {
  loadGroupParticipantsDirectory, syncContactsDirectoryIfNeeded, learnObservedSenderNames,
  ingestLidPnHintsFromMessages, enrichUnknownSenderNames, ensureGroupSenderAvatars, resolveChatListSenderLabel,
  loadPersistedGroupObservedSenders, schedulePersistGroupObservedSenders, cancelScheduledGroupObservedPersist
} from './useWhatsappContacts.js'
import { normalizeMessage, getMessageMergeKey, pickRicherDuplicateBaseMessage, preloadMessageMediaIfNeeded } from './useWhatsappMessages.js'

const messagesCacheByChatJid = new Map()

export const resetChatsRuntimeCaches = () => {
  try { messagesCacheByChatJid.clear() } catch {}
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

export const fallbackLastMessageFromChatType = (chat = {}) => {
  const t = String(chat?.wa_lastMessageType || chat?.lastMessageType || '').trim().toLowerCase()
  if (!t) return ''
  if (t.includes('sticker')) return 'Figurinha'
  if (t.includes('audio') || t.includes('ptt') || t.includes('voice')) return 'Áudio'
  if (t.includes('video') || t.includes('gif')) return 'Vídeo'
  if (t.includes('image')) return 'Foto'
  if (t.includes('document') || t.includes('file')) return 'Documento'
  if (t.includes('contact') || t.includes('vcard')) return 'Contato compartilhado'
  return ''
}

export const canonicalChatListKey = (chat) => {
  const j = normalizeJid(chat?.chatJid || chat?.wa_chatid || chat?.chatid || '')
  if (!j) return ''
  if (j.endsWith('@g.us')) return `g:${j}`
  const digits = (j.split('@')[0] || '').replace(/\D/g, '')
  if (digits.length >= 10) return `pn:${digits}`
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
  const digits = (jid.split('@')[0] || '').replace(/\D/g, '')
  if (digits) return `contact:${digits}`
  return `jid:${jid}`
}

const buildPinnedMatchKeysFromPayload = (payload = {}) => {
  const candidates = [payload?.wa_chatid, payload?.chatid, payload?.chatJid, payload?.id, payload?.phone, payload?.wa_fastid]
  const keys = new Set()
  for (const candidate of candidates) { const key = buildPinnedMatchKey(candidate); if (key) keys.add(key) }
  return Array.from(keys)
}

export const normalizeChat = (chat) => {
  const internalId = chat.id || chat.fastid || ''
  const chatJid = chat.chatJid || chat.wa_chatid || chat.chatid || ''
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
    lastMessage: pickFirstNonEmptyText(
      chat.lastMessage,
      chat.wa_lastMsgText,
      chat.wa_lastMessageText,
      chat.wa_lastMessageTextVote,
      chat.lastMsgText,
      chat.last_message,
      chat.last_message_text,
      chat.lastMessagePreview,
      chat.wa_lastMsgBody
    ) || fallbackLastMessageFromChatType(chat) || '',
    lastMessageSender: normalizeJid(chat.lastMessageSender || chat.wa_lastMessageSender || ''),
    isPinned: parseWaPinnedFlag(chat.wa_isPinned),
    lastMessagePrefix: isGroup ? lastMessagePrefixRaw : (lastMessagePrefixRaw.startsWith('Você') ? lastMessagePrefixRaw : ''),
    lastMessageTime: resolvedLastMessageTimeMs,
    timestamp: resolvedTimestampMs,
    unreadCount: unreadSafe,
    wa_unreadCount: unreadSafe,
    updatedAt: normalizeTimestampToMs(chat.updatedAt)
  }

  if (normalized.isGroup && !normalized.lastMessagePrefix && lastSenderLabel) {
    normalized.lastMessagePrefix = `~${lastSenderLabel}: `
  }

  return normalized
}

export const mergeDuplicateChatRows = (prevRow, incomingRow) => {
  if (!incomingRow) return prevRow
  if (!prevRow) { const sole = { ...incomingRow }; sole.chatJid = preferWhatsappNetPrivateJid(sole.chatJid, sole.chatJid); sole.isPinned = Boolean(parseWaPinnedFlag(sole.wa_isPinned)); return sole }
  const merged = { ...prevRow, ...incomingRow }
  merged.chatJid = preferWhatsappNetPrivateJid(prevRow.chatJid, incomingRow.chatJid)
  merged.isPinned = Boolean(parseWaPinnedFlag(merged.wa_isPinned) || Boolean(prevRow.isPinned))

  // Sincronização de não lidas:
  // - Se a API trouxe MENOS que o estado local, confiar na API (leitura no celular / outro cliente).
  // - Se local já está 0 e a API ainda mostra não lidas mas sem mensagem nova, manter 0 (UAZAPI stale após /chat/read no web).
  const prevUnread = Math.max(0, Math.floor(Number(prevRow?.unreadCount ?? prevRow?.wa_unreadCount ?? 0) || 0))
  const incomingUnread = Math.max(0, Math.floor(Number(incomingRow?.unreadCount ?? incomingRow?.wa_unreadCount ?? 0) || 0))
  const prevLastMsg = Number(prevRow?.lastMessageTime || prevRow?.timestamp || 0)
  const incomingLastMsg = Number(incomingRow?.lastMessageTime || incomingRow?.timestamp || 0)

  if (incomingUnread < prevUnread) {
    merged.unreadCount = incomingUnread
    merged.wa_unreadCount = incomingUnread
  } else if (prevUnread === 0 && incomingUnread > 0 && incomingLastMsg <= prevLastMsg) {
    merged.unreadCount = 0
    merged.wa_unreadCount = 0
  } else {
    merged.unreadCount = incomingUnread
    merged.wa_unreadCount = incomingUnread
  }
  const incomingText = strTrim(incomingRow.lastMessage || ''), prevText = strTrim(prevRow.lastMessage || '')
  const incomingPrefix = strTrim(incomingRow.lastMessagePrefix || ''), prevPrefix = strTrim(prevRow.lastMessagePrefix || '')
  const samePreviewMessage = Boolean(incomingText && prevText && incomingText === prevText)
  if (!incomingPrefix && prevPrefix && samePreviewMessage) merged.lastMessagePrefix = prevPrefix
  else if (incomingPrefix) merged.lastMessagePrefix = incomingPrefix
  else merged.lastMessagePrefix = strTrim(merged.lastMessagePrefix || '')

  if (!strTrim(merged.lastMessage || '')) {
    const inferredByType = fallbackLastMessageFromChatType(incomingRow) || fallbackLastMessageFromChatType(merged)
    if (inferredByType) merged.lastMessage = inferredByType
  }

  const keepPrevIfIncomingEmpty = (field) => {
    const inc = incomingRow?.[field], prev = prevRow?.[field]
    if (typeof inc === 'string' && strTrim(inc) === '' && typeof prev === 'string' && strTrim(prev) !== '') merged[field] = prev
  }
  for (const f of ['wa_lastSenderName', 'wa_lastMsgSenderName', 'lastSenderName', 'wa_lastMessageSender', 'lastMessageSender']) keepPrevIfIncomingEmpty(f)

  const isGroup = Boolean(merged.isGroup) || normalizeJid(merged.chatJid).endsWith('@g.us')
  const nextPrefix = strTrim(merged.lastMessagePrefix || '')
  if (isGroup && !nextPrefix) {
    const label = sanitizeSenderLabelCandidate(merged.wa_lastSenderName) || sanitizeSenderLabelCandidate(merged.lastSenderName)
    if (label) merged.lastMessagePrefix = `~${label}: `
  }
  return merged
}

export const mergeChatsSliceIntoList = (rawIncoming) => {
  const byKey = new Map()
  for (const chat of (chats.value || [])) {
    const key = canonicalChatListKey(chat)
    if (key) byKey.set(key, chat)
  }
  for (const rawChat of rawIncoming) {
    const normalized = normalizeChat(rawChat)
    const key = canonicalChatListKey(normalized)
    if (!key) continue
    byKey.set(key, mergeDuplicateChatRows(byKey.get(key) || null, normalized))
  }
  chats.value = sortChatsByPriority(Array.from(byKey.values()))
}

export const syncSelectedChatAfterChatsMutation = () => {
  const cur = selectedChat.value
  if (!cur) return
  const key = canonicalChatListKey(cur)
  if (!key) return
  const found = (chats.value || []).find((c) => canonicalChatListKey(c) === key)
  if (!found) return
  const preferJid = preferWhatsappNetPrivateJid(cur.chatJid, found.chatJid)
  if (found === cur && normalizeJid(cur.chatJid) === normalizeJid(preferJid)) return
  selectedChat.value = { ...found, chatJid: preferJid }
}

export const refreshChatPreview = (chatJid, payload) => {
  const norm = normalizeJid(chatJid)
  const targetKey = canonicalChatListKey({ chatJid: norm })
  const rowMatchesTarget = (item) => !norm ? false : normalizeJid(item.chatJid) === norm || (Boolean(targetKey) && canonicalChatListKey(item) === targetKey)

  chats.value = chats.value.map((item) => rowMatchesTarget(item) ? { ...item, ...payload } : item)
    .sort((a, b) => {
      const pinA = a?.isPinned ? 1 : 0, pinB = b?.isPinned ? 1 : 0
      if (pinA !== pinB) return pinB - pinA
      return getChatActivityTimestamp(b) - getChatActivityTimestamp(a)
    })

  if (selectedChat.value && rowMatchesTarget(selectedChat.value)) selectedChat.value = { ...selectedChat.value, ...payload }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
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
      if (!key) continue
      byKey.set(key, mergeDuplicateChatRows(byKey.get(key) || null, normalized))
    }
    offset += pageResult.chats.length
    if (totalRecords !== null && offset >= totalRecords) break
    if (pageResult.chats.length < pageSize) break
  }
  return Array.from(byKey.values())
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

// ─── Enriquecer avatares da lista ─────────────────────────────────────────────

import { fetchChatDetailsSafe } from './useWhatsappApi.js'
import { normalizeAvatarCandidate, extractAvatarFromDetailsPayload } from './useWhatsappUtils.js'

export const enrichMissingChatAvatars = async () => {
  const withoutAvatar = (chats.value || []).filter((chat) => !normalizeAvatarCandidate(chat.avatarUrl || chat.image || chat.imagePreview || ''))
  if (!withoutAvatar.length) return

  const BATCH_SIZE = 10
  const batch = withoutAvatar.slice(0, BATCH_SIZE)

  await Promise.allSettled(batch.map(async (chat) => {
    const key = canonicalChatListKey(chat)
    if (!key) return
    const numberOrJid = normalizeJid(chat.chatJid || chat.id || '')
    if (!numberOrJid || numberOrJid.endsWith('@lid')) return

    const data = await fetchChatDetailsSafe(numberOrJid, { preview: true, timeoutMs: 5000, cacheTtlMs: 300000 })
    if (!data) return
    const avatar = extractAvatarFromDetailsPayload(data)
    if (!avatar) return

    chats.value = chats.value.map((item) => canonicalChatListKey(item) === key ? { ...item, avatarUrl: avatar } : item)
  }))
}

// ─── fetchChatMessages ────────────────────────────────────────────────────────

export const fetchChatMessages = async (chatJid, limit = 200, offset = 0) => {
  const proxyBase = getProxyBase()
  const normalizedChatId = normalizeJid(chatJid)
  const resolveMessageFindChatId = (value) => {
    const normalized = normalizeJid(value)
    if (!normalized) return ''
    if (normalized.endsWith('@lid')) {
      const digits = (normalized.split('@')[0] || '').replace(/\D/g, '')
      return digits.length >= 10 ? `${digits}@s.whatsapp.net` : ''
    }
    return normalized
  }
  const requestChatId = resolveMessageFindChatId(normalizedChatId)
  if (!requestChatId) throw new Error('CHAT_ID_INVALID')
  let res
  try {
    res = await fetch(`${proxyBase}/message/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ chatid: requestChatId, limit, offset })
    })
  } catch { throw new Error('BACKEND_OFFLINE') }
  const data = await parseJsonBodySafe(res)
  // 503 = instância UAZAPI temporariamente indisponível — tratar como BACKEND_OFFLINE
  if (res.status === 503 || res.status === 504) throw new Error('BACKEND_OFFLINE')
  if (res.status === 400) throw new Error('BAD_REQUEST_MESSAGE_FIND')
  if (!res.ok) throw new Error(data?.message || data?.error || 'Erro ao buscar mensagens')
  const payload = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : [])
  return { messages: payload, hasMore: Boolean(data?.hasMore), nextOffset: Number.isFinite(Number(data?.nextOffset)) ? Number(data.nextOffset) : (offset + payload.length) }
}

// ─── scrollToBottom ───────────────────────────────────────────────────────────

export const scrollToBottom = () => {
  nextTick(() => { if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight })
}

export const isChatBodyNearBottom = () => {
  const el = chatBodyRef.value
  if (!el) return true
  return (el.scrollHeight - el.scrollTop - el.clientHeight) <= 120
}

// ─── refreshSelectedChatMessages ─────────────────────────────────────────────

let lastPollUnknownEnrichAt = 0
const UNKNOWN_ENRICH_MIN_MS = 35000

export const refreshSelectedChatMessages = async (enrichSharedFns = {}) => {
  const currentChatJid = normalizeJid(selectedChat.value?.chatJid)
  if (!currentChatJid || loadingMessages.value || isRefreshingMessages.value) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const seqSnapshot = selectChatLoadSeq.value
  try {
    isRefreshingMessages.value = true
    await syncContactsDirectoryIfNeeded(false)
    if (selectChatLoadSeq.value !== seqSnapshot) return
    const wasNearBottom = isChatBodyNearBottom()
    const pageResult = await fetchChatMessages(currentChatJid, 120, 0)
    if (messagesBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); messagesBackendOfflineLogged.value = false }
    if (!Array.isArray(pageResult.messages) || pageResult.messages.length === 0) return
    ingestLidPnHintsFromMessages(pageResult.messages)
    learnObservedSenderNames(pageResult.messages)
    const now = Date.now()
    if (now - lastPollUnknownEnrichAt >= UNKNOWN_ENRICH_MIN_MS) {
      lastPollUnknownEnrichAt = now
      enrichUnknownSenderNames(pageResult.messages).catch(() => {})
    }
    const normalizedIncoming = pageResult.messages.map((incoming) => normalizeMessage(incoming))
    if (enrichSharedFns.hydratePersistedContactStatesFromMessages) await enrichSharedFns.hydratePersistedContactStatesFromMessages(normalizedIncoming)
    const hasSharedContact = normalizedIncoming.some((msg) => msg.isContactShare && msg.sharedContact?.phone)
    if (hasSharedContact) {
      await syncContactsDirectoryIfNeeded(true)
      if (enrichSharedFns.persistSavedStatesFromMessages) await enrichSharedFns.persistSavedStatesFromMessages(normalizedIncoming)
    }
    if (enrichSharedFns.enrichSharedContactAvatars) enrichSharedFns.enrichSharedContactAvatars(normalizedIncoming)
    if (enrichSharedFns.enrichSharedContactBusinessProfiles) enrichSharedFns.enrichSharedContactBusinessProfiles(normalizedIncoming)

    const mergedById = new Map()
    for (const current of messages.value) { const n = normalizeMessage(current); mergedById.set(getMessageMergeKey(n), n) }
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
      mergedById.set(key, { ...winner, previewUrl: mergedPreview, mediaUrl: mergedMediaUrl || winner?.mediaUrl || '' })
    }
    const merged = Array.from(mergedById.values()).sort((a, b) => a.timestamp - b.timestamp)
    if (selectChatLoadSeq.value !== seqSnapshot) return

    const prevLen = messages.value.length, prevLastId = messages.value[prevLen - 1]?.id
    const mergedLen = merged.length, mergedLastId = merged[mergedLen - 1]?.id
    const hadStructuralListChange = mergedLen !== prevLen || mergedLastId !== prevLastId

    messages.value = merged
    messagesCacheByChatJid.set(currentChatJid, [...merged])
    ingestLidPnHintsFromMessages(merged)
    learnObservedSenderNames(merged)
    preloadMessageMediaIfNeeded(messages.value).catch(() => {})
    ensureGroupSenderAvatars(messages.value).catch(() => {})
    if (normalizeJid(currentChatJid).endsWith('@g.us')) {
      schedulePersistGroupObservedSenders(currentChatJid, merged)
    }

    if (hadStructuralListChange) {
      const lastMessage = merged[merged.length - 1] || null
      const currentChat = chats.value.find((item) => canonicalChatListKey(item) === canonicalChatListKey(selectedChat.value)) || selectedChat.value
      refreshChatPreview(currentChatJid, {
        lastMessage: lastMessage?.text || selectedChat.value.lastMessage,
        lastMessagePrefix: lastMessage ? (lastMessage.fromMe ? 'Você: ' : (Boolean(currentChat?.isGroup) && lastMessage.senderDisplayName ? `~${lastMessage.senderDisplayName}: ` : '')) : '',
        lastMessageTime: lastMessage?.timestamp || selectedChat.value.lastMessageTime
      })
      if (wasNearBottom) scrollToBottom()
    }
  } catch (error) {
    if (error?.message === 'BACKEND_OFFLINE' || error?.message === 'BAD_REQUEST_MESSAGE_FIND' || error?.message === 'CHAT_ID_INVALID') {
      if (!messagesBackendOfflineLogged.value) { console.warn('Backend WhatsApp indisponivel para mensagens em tempo real.'); messagesBackendOfflineLogged.value = true }
      return
    }
    console.error('Erro ao atualizar mensagens em tempo real', error)
  } finally { isRefreshingMessages.value = false }
}

// ─── markCurrentChatAsRead ────────────────────────────────────────────────────

export const markAllChatsAsRead = async () => {
  const proxyBase = getProxyBase()
  const token = getAuthToken()
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ number: chat.chatJid, read: true })
    })
    bumpListUnreadZero()
    const inboundIds = loadedMessages.filter((m) => !m.fromMe && (m.messageid || m.id)).map((m) => m.messageid || m.id)
    if (inboundIds.length > 0) {
      await fetch(`${proxyBase}/message/markread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
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
  const { silent = false, lightSync = false } = options
  try {
    if (!silent) loadingChats.value = true
    if (lightSync) {
      // Janela maior que o default da UAZAPI para não deixar chats “presos” com unread stale fora do primeiro slice.
      const pageResult = await fetchChatsPage(600, 0)
      if (chatsBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); chatsBackendOfflineLogged.value = false }
      if (Array.isArray(pageResult.chats) && pageResult.chats.length > 0) {
        mergeChatsSliceIntoList(pageResult.chats)
        return
      }
      // Fallback: algumas contas novas retornam vazio no slice curto por alguns segundos.
      // Nesse caso, continua para o carregamento completo ao invés de encerrar em branco.
    }
    const allChats = await listAllChatsFromUazapi()
    if (chatsBackendOfflineLogged.value) { console.info('Conexao com backend restabelecida.'); chatsBackendOfflineLogged.value = false }
    const chatsWithPin = allChats.map((chat) => ({ ...chat, isPinned: parseWaPinnedFlag(chat.wa_isPinned) }))
    const pinnedByFilter = await listPinnedChatsFromUazapi()
    const chatsWithPinSynced = chatsWithPin.map((chat) => {
      const keys = buildPinnedMatchKeysFromPayload(chat)
      return { ...chat, isPinned: Boolean(chat.isPinned || keys.some((key) => pinnedByFilter.has(key))) }
    })
    chats.value = sortChatsByPriority(chatsWithPinSynced)
    syncSelectedChatAfterChatsMutation()
    enrichMissingChatAvatars().catch(() => {})
  } catch (e) {
    if (e?.message === 'BACKEND_OFFLINE') {
      if (!chatsBackendOfflineLogged.value) { console.warn('Backend WhatsApp indisponivel.'); chatsBackendOfflineLogged.value = true }
      return
    }
    if (e?.message === 'AUTH_EXPIRED') return
    console.error('Erro ao carregar chats', e)
  } finally { if (!silent) loadingChats.value = false }
}

// ─── selectChat ───────────────────────────────────────────────────────────────

export const selectChat = async (chat, enrichSharedFns = {}) => {
  const mySeq = ++selectChatLoadSeq.value
  const chatJid = chat.chatJid
  const unreadCountAtOpen = Number(chat.unreadCount || 0)

  cancelScheduledGroupObservedPersist()

  if (chat?.isGroup && chatJid) {
    // Limpa cache antigo para evitar "herdar" avatar de outro participante/grupo.
    senderAvatarDirectory.value = {}
    await loadGroupParticipantsDirectory(chatJid)
    if (mySeq !== selectChatLoadSeq.value) return
    await loadPersistedGroupObservedSenders(chatJid)
  } else {
    groupParticipantsDirectory.value = {}
    groupParticipantsByJid.value = {}
    groupParticipantsByLid.value = {}
    lidToJidMap.value = {}
    observedSenderDirectory.value = {}
  }
  if (mySeq !== selectChatLoadSeq.value) return

  const openKey = canonicalChatListKey(chat)
  chats.value = chats.value.map((item) => {
    if (openKey && canonicalChatListKey(item) !== openKey) return item
    if (!openKey && item.id !== chat.id && item.chatJid !== chatJid) return item
    return { ...item, unreadCount: 0, wa_unreadCount: 0 }
  })

  const resolved = (openKey ? chats.value.find((item) => canonicalChatListKey(item) === openKey) : null) ||
    chats.value.find((item) => item.id === chat.id || item.chatJid === chatJid) || null
  selectedChat.value = resolved
    ? { ...resolved, chatJid: preferWhatsappNetPrivateJid(resolved.chatJid, chatJid), unreadCount: 0 }
    : { ...chat, chatJid: preferWhatsappNetPrivateJid(chatJid, chatJid), unreadCount: 0 }

  const activeFetchJid = normalizeJid(selectedChat.value?.chatJid) || normalizeJid(chatJid) || String(chatJid || '').trim()
  const cachedMessages = messagesCacheByChatJid.get(activeFetchJid)
  if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
    messages.value = [...cachedMessages]
  }
  try {
    loadingMessages.value = true
    const pageLimit = 120, maxPages = 3
    const aggregated = [], seenIds = new Set()
    const rawByMergeKey = new Map()
    let offset = 0, hasMore = true

    for (let page = 0; page < maxPages && hasMore; page++) {
      if (mySeq !== selectChatLoadSeq.value) return
      const pageResult = await fetchChatMessages(activeFetchJid, pageLimit, offset)
      if (mySeq !== selectChatLoadSeq.value) return
      for (const rawMessage of pageResult.messages) {
        const normalized = normalizeMessage(rawMessage)
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
      hasMore = pageResult.hasMore && pageResult.messages.length > 0
      offset = pageResult.nextOffset
      if (!hasMore || pageResult.messages.length < pageLimit) break
    }
    if (mySeq !== selectChatLoadSeq.value) return

    const rawForLearn = aggregated.map((m) => rawByMergeKey.get(getMessageMergeKey(m)) || m)
    ingestLidPnHintsFromMessages(rawForLearn)
    learnObservedSenderNames(rawForLearn)
    // Payload bruto da API preserva campos que às vezes somem na cópia normalizada; melhora nomes em grupo.
    enrichUnknownSenderNames(rawForLearn).catch(() => {})
    if (mySeq !== selectChatLoadSeq.value) return

    if (enrichSharedFns.enrichSharedContactAvatars) enrichSharedFns.enrichSharedContactAvatars(aggregated)
    if (enrichSharedFns.enrichSharedContactBusinessProfiles) enrichSharedFns.enrichSharedContactBusinessProfiles(aggregated)

    const normalizedMessages = aggregated.sort((a, b) => a.timestamp - b.timestamp)
    if (enrichSharedFns.hydratePersistedContactStatesFromMessages) await enrichSharedFns.hydratePersistedContactStatesFromMessages(normalizedMessages)
    if (mySeq !== selectChatLoadSeq.value) return

    const hasSharedContact = normalizedMessages.some((msg) => msg.isContactShare && msg.sharedContact?.phone)
    if (hasSharedContact) {
      await syncContactsDirectoryIfNeeded(true)
      if (mySeq !== selectChatLoadSeq.value) return
      if (enrichSharedFns.persistSavedStatesFromMessages) await enrichSharedFns.persistSavedStatesFromMessages(normalizedMessages)
    }
    if (mySeq !== selectChatLoadSeq.value) return

    messages.value = normalizedMessages
    messagesCacheByChatJid.set(activeFetchJid, [...normalizedMessages])
    preloadMessageMediaIfNeeded(messages.value).catch(() => {})
    ensureGroupSenderAvatars(messages.value, { forceRefresh: Boolean(chat?.isGroup) }).catch(() => {})
    if (normalizeJid(activeFetchJid).endsWith('@g.us')) {
      schedulePersistGroupObservedSenders(activeFetchJid, rawForLearn)
    }
    markCurrentChatAsRead({ ...selectedChat.value, chatJid: activeFetchJid }, normalizedMessages)

    // scrollToFirstUnreadOrBottom
    nextTick(() => {
      const chatBodyEl = chatBodyRef.value
      if (!chatBodyEl) return
      const total = messages.value.length
      if (!unreadCountAtOpen || unreadCountAtOpen <= 0 || total === 0) {
        scrollToBottom()
        return
      }
      const firstUnreadIndex = Math.max(total - unreadCountAtOpen, 0)
      const target = chatBodyEl.querySelector(`[data-message-index="${firstUnreadIndex}"]`)
      if (!target) { scrollToBottom(); return }
      target.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  } catch (e) {
    if (e?.message === 'BAD_REQUEST_MESSAGE_FIND' || e?.message === 'CHAT_ID_INVALID') return
    if (mySeq === selectChatLoadSeq.value) console.error('Erro ao carregar mensagens', e)
  } finally {
    if (mySeq === selectChatLoadSeq.value) loadingMessages.value = false
  }
}

// ─── sendMessage ──────────────────────────────────────────────────────────────

export const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return
  const textToSend = newMessage.value.trim()
  const currentChatJid = selectedChat.value?.chatJid
  const savedReplyingTo = replyingTo.value
  const proxyBase = getProxyBase()
  newMessage.value = ''
  try {
    sending.value = true
    const pollCmd = textToSend.match(/^\/poll\s+(.+?)\s*\|\s*(.+)$/i)
    const menuJsonCmd = textToSend.match(/^\/menujson\s+(\{[\s\S]+\})$/i)

    if (menuJsonCmd) {
      const proxyBase = getProxyBase()
      const payload = JSON.parse(menuJsonCmd[1])
      payload.number = payload.number || selectedChat.value.chatJid
      const menuRes = await fetch(`${proxyBase}/send/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(payload)
      })
      const menuData = await menuRes.json().catch(() => ({}))
      if (!menuRes.ok) throw new Error(menuData?.message || menuData?.error || 'Falha ao enviar menu')
      newMessage.value = ''
      replyingTo.value = null
      refreshSelectedChatMessages().catch(() => {})
      scrollToBottom()
      return
    }

    if (pollCmd) {
      const proxyBase = getProxyBase()
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({
          number: selectedChat.value.chatJid,
          type: 'poll',
          text: pollTitle,
          choices: pollOptions,
          selectableCount: 1
        })
      })
      const menuData = await menuRes.json().catch(() => ({}))
      if (!menuRes.ok) throw new Error(menuData?.message || menuData?.error || 'Falha ao enviar enquete')
      newMessage.value = ''
      replyingTo.value = null
      refreshSelectedChatMessages().catch(() => {})
      scrollToBottom()
      return
    }

    const body = { number: selectedChat.value.chatJid, text: textToSend }
    if (savedReplyingTo?.messageid) body.replyid = savedReplyingTo.messageid
    const res = await fetch(`${proxyBase}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(body)
    })
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data?.message || data?.error || 'Falha ao enviar mensagem') }
    replyingTo.value = null
    if (currentChatJid) refreshChatPreview(currentChatJid, { lastMessage: textToSend, lastMessagePrefix: 'Você: ', lastMessageTime: Date.now() })
    refreshSelectedChatMessages().catch(() => {})
    scrollToBottom()
  } catch (e) {
    console.error('Erro ao enviar mensagem', e)
    newMessage.value = textToSend
    replyingTo.value = savedReplyingTo
  } finally { sending.value = false }
}

// ─── Realtime sync ────────────────────────────────────────────────────────────

let forceRealtimeSyncDebounceTimer = null

export const forceRealtimeSync = (enrichSharedFns = {}) => {
  if (typeof window === 'undefined') return
  if (forceRealtimeSyncDebounceTimer) clearTimeout(forceRealtimeSyncDebounceTimer)
  forceRealtimeSyncDebounceTimer = setTimeout(async () => {
    forceRealtimeSyncDebounceTimer = null
    try { await loadChats(false, { silent: true }); await refreshSelectedChatMessages(enrichSharedFns) }
    catch (err) { console.error('Sincronizacao em tempo real', err) }
  }, 550)
}

export const startRealtimeSync = (enrichSharedFns = {}) => {
  if (chatsPollingTimer.value) clearInterval(chatsPollingTimer.value)
  chatsPollingTimer.value = setInterval(() => { loadChats(false, { silent: true, lightSync: true }) }, CHATS_POLL_INTERVAL_MS)

  if (messagesPollingTimer.value) clearInterval(messagesPollingTimer.value)
  messagesPollingTimer.value = setInterval(() => { refreshSelectedChatMessages(enrichSharedFns) }, MESSAGES_POLL_INTERVAL_MS)

  if (!visibilitySyncHandler.value) {
    visibilitySyncHandler.value = () => { if (document.visibilityState === 'visible') forceRealtimeSync(enrichSharedFns) }
    document.addEventListener('visibilitychange', visibilitySyncHandler.value)
  }
  if (!windowFocusSyncHandler.value) {
    windowFocusSyncHandler.value = () => forceRealtimeSync(enrichSharedFns)
    window.addEventListener('focus', windowFocusSyncHandler.value)
  }
  if (!windowOnlineSyncHandler.value) {
    windowOnlineSyncHandler.value = () => forceRealtimeSync(enrichSharedFns)
    window.addEventListener('online', windowOnlineSyncHandler.value)
  }
}

export const stopRealtimeSync = () => {
  if (forceRealtimeSyncDebounceTimer) { clearTimeout(forceRealtimeSyncDebounceTimer); forceRealtimeSyncDebounceTimer = null }
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
  clearWhatsappSessionState()
}

export function useWhatsappChats() {
  return {
    loadChats, selectChat, sendMessage, scrollToBottom, isChatBodyNearBottom,
    refreshSelectedChatMessages, refreshChatPreview, markCurrentChatAsRead, markAllChatsAsRead,
    toggleChatPinned, startRealtimeSync, stopRealtimeSync, resetWhatsappAfterDisconnect, forceRealtimeSync,
    enrichMissingChatAvatars, mergeChatsSliceIntoList, sortChatsByPriority,
    canonicalChatListKey, preferWhatsappNetPrivateJid, isActiveChatListItem,
    normalizeChat, mergeDuplicateChatRows, chatListPreviewPrefix,
    fallbackLastMessageFromChatType, getChatActivityTimestamp, parseWaPinnedFlag,
    syncSelectedChatAfterChatsMutation, fetchChatMessages
  }
}
