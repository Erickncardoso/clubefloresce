/**
 * chats.ts — helpers para carregar, normalizar e sincronizar a lista de chats.
 * Inclui match LID↔PN (mesmo bug histórico do Nuxt: webhook @lid vs chat @s.whatsapp.net).
 */
import { getProxyBase, getWhatsappApiBase, whatsappFetchInit } from './api'
import {
  collectChatIdentityIds,
  extractDigitsFromJid,
  normalizeJid as normalizeJidRaw,
} from './utils'

function normalizeJid(value: unknown): string {
  return String(normalizeJidRaw(value) || '')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaChat {
  /** JID canônico da conversa (preferência @s.whatsapp.net) */
  chatJid: string
  /** Alias PN (@s.whatsapp.net) quando conhecido */
  waChatId: string
  /** Alias LID (@lid) quando conhecido — crítico p/ match realtime */
  waChatLid: string
  /** Nome para exibição */
  name: string
  /** Prévia da última mensagem */
  lastMessagePreview: string
  /** Timestamp ms da última mensagem */
  lastMessageAt: number
  /** Contador de não lidas */
  unreadCount: number
  /** URL do avatar (pode ser vazia) */
  avatarUrl: string
  /** Dados brutos originais */
  _raw: Record<string, unknown>
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function pickString(...candidates: unknown[]): string {
  for (const c of candidates) {
    const s = String(c || '').trim()
    if (s) return s
  }
  return ''
}

function pickNumber(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 0
}

function normalizeTimestampToMs(value: unknown): number {
  const n = Number(value ?? 0)
  if (!n) return 0
  return n < 9_999_999_999 ? n * 1000 : n
}

export function preferWhatsappNetPrivateJid(a: unknown, b: unknown = ''): string {
  const x = normalizeJid(a)
  const y = normalizeJid(b)
  if (!x) return y
  if (!y) return x
  if (x.endsWith('@s.whatsapp.net')) return x
  if (y.endsWith('@s.whatsapp.net')) return y
  return x
}

/** Chave estável p/ dedupe sidebar (pn:digits | lid:digits | g:jid). */
export function canonicalChatListKey(chat: Partial<WaChat> | Record<string, unknown> | null | undefined): string {
  if (!chat) return ''
  const row = chat as Record<string, unknown>
  let j = normalizeJid(
    pickString(row.chatJid, row.waChatId, row.wa_chatid, row.chatid, row.chatId),
  )
  const lid = normalizeJid(
    pickString(row.waChatLid, row.wa_chatlid, row.chatlid, row.chatLid),
  )
  if (!j && lid) j = lid
  if (!j) return ''
  if (j.endsWith('@g.us')) return `g:${j}`

  const digits = extractDigitsFromJid(j).replace(/\D/g, '')
  if (j.endsWith('@lid')) return digits ? `lid:${digits}` : `jid:${j}`
  if (digits.length >= 10 && j.endsWith('@s.whatsapp.net')) return `pn:${digits}`
  // Se temos LID separado e JID ainda é frágil, preferir digits do PN quando possível
  if (lid) {
    const lidDigits = extractDigitsFromJid(lid).replace(/\D/g, '')
    if (lidDigits && !j.endsWith('@s.whatsapp.net')) return `lid:${lidDigits}`
  }
  return `jid:${j}`
}

/** Todos os JIDs/aliases conhecidos de um chat (inclui _raw). */
export function collectWaChatAliases(chat: WaChat | null | undefined): string[] {
  if (!chat) return []
  const fromUtils = collectChatIdentityIds({
    chatJid: chat.chatJid,
    wa_chatid: chat.waChatId,
    wa_chatlid: chat.waChatLid,
    chatid: chat.chatJid,
    ...(chat._raw || {}),
  }) as string[]
  const local = [
    chat.chatJid,
    chat.waChatId,
    chat.waChatLid,
  ].map((v) => normalizeJid(v)).filter((v): v is string => Boolean(v))
  return [...new Set([...local, ...fromUtils.map((v) => normalizeJid(v)).filter((v): v is string => Boolean(v))])]
}

export function jidsLooseEqual(a: unknown, b: unknown): boolean {
  const left = normalizeJid(a)
  const right = normalizeJid(b)
  if (!left || !right) return false
  if (left === right) return true
  return canonicalChatListKey({ chatJid: left }) === canonicalChatListKey({ chatJid: right })
}

/**
 * Dois JIDs referem à mesma conversa privada?
 * Usa igualdade direta, chave canônica e aliases do chat aberto.
 */
export function jidsReferToSameChat(
  a: unknown,
  b: unknown,
  openChat?: WaChat | null,
): boolean {
  const left = normalizeJid(a)
  const right = normalizeJid(b)
  if (!left || !right) return false
  if (left === right) return true
  if (canonicalChatListKey({ chatJid: left }) === canonicalChatListKey({ chatJid: right })) {
    return true
  }

  // Digits iguais em @s.whatsapp.net (multi-device já normalizado)
  const leftDigits = extractDigitsFromJid(left)
  const rightDigits = extractDigitsFromJid(right)
  if (
    leftDigits.length >= 10 &&
    leftDigits === rightDigits &&
    (left.endsWith('@s.whatsapp.net') || right.endsWith('@s.whatsapp.net')) &&
    !left.endsWith('@g.us') &&
    !right.endsWith('@g.us')
  ) {
    // Só se ambos forem PN — LID↔PN com mesmos digits NÃO é confiável (LID não é telefone)
    if (left.endsWith('@s.whatsapp.net') && right.endsWith('@s.whatsapp.net')) return true
  }

  if (openChat) {
    const aliases = collectWaChatAliases(openChat)
    const leftHit = aliases.some((alias) => jidsLooseEqual(alias, left))
    const rightHit = aliases.some((alias) => jidsLooseEqual(alias, right))
    if (leftHit && rightHit) return true
    if (leftHit && aliases.some((alias) => jidsLooseEqual(alias, right))) return true
    if (rightHit && aliases.some((alias) => jidsLooseEqual(alias, left))) return true
  }

  return false
}

/** JID (ou candidates) corresponde ao chat da sidebar / aberto. */
export function jidMatchesChat(
  chat: WaChat | null | undefined,
  ...candidates: unknown[]
): boolean {
  if (!chat) return false
  const aliases = collectWaChatAliases(chat)
  const norms = candidates.map((c) => normalizeJid(c)).filter(Boolean)
  if (!norms.length) return false
  return norms.some((jid) =>
    aliases.some((alias) => jidsReferToSameChat(jid, alias, chat)),
  )
}

export function findChatIndexByIdentity(list: WaChat[], incoming: WaChat | string): number {
  if (typeof incoming === 'string') {
    const jid = normalizeJid(incoming)
    return list.findIndex((c) => jidMatchesChat(c, jid))
  }
  const key = canonicalChatListKey(incoming)
  const idxByKey = key
    ? list.findIndex((c) => canonicalChatListKey(c) === key)
    : -1
  if (idxByKey >= 0) return idxByKey
  return list.findIndex((c) =>
    jidMatchesChat(c, incoming.chatJid, incoming.waChatId, incoming.waChatLid),
  )
}

export function normalizeChatRow(raw: Record<string, unknown>): WaChat {
  const chatidRaw = pickString(raw.chatid, raw.chatId, raw.wa_chatid, raw.id, raw.jid, raw.chatJid)
  const lidRaw = pickString(raw.wa_chatlid, raw.chatlid, raw.chatLid, raw.lid)
  const preferred = preferWhatsappNetPrivateJid(chatidRaw, lidRaw)
  const chatJid = normalizeJid(preferred) || normalizeJid(chatidRaw) || chatidRaw
  const waChatId = normalizeJid(
    pickString(
      chatJid.endsWith('@s.whatsapp.net') ? chatJid : '',
      raw.wa_chatid,
      chatidRaw.endsWith('@s.whatsapp.net') ? chatidRaw : '',
    ),
  )
  const waChatLid = normalizeJid(
    pickString(
      lidRaw,
      chatidRaw.endsWith('@lid') ? chatidRaw : '',
      chatJid.endsWith('@lid') ? chatJid : '',
    ),
  )

  const name = pickString(
    raw.name, raw.pushname, raw.wa_name, raw.subject, raw.groupName,
    raw.notifyName, raw.verifiedName, raw.title,
    chatJid.split('@')[0],
  )

  const lastMsgTs = normalizeTimestampToMs(
    raw.lastMessageTimestamp ??
    raw.wa_lastMsgTimestamp ??
    raw.wa_lastMessageTimestamp ??
    raw.lastMsgTimestamp ??
    raw.lastMessageTime ??
    raw.updatedAt,
  )

  const lastMsg = pickString(
    raw.lastMessage as string,
    raw.wa_lastMessageTextVote as string,
    raw.wa_lastMsgText as string,
    raw.wa_lastMessageText as string,
    (raw.lastMsg as Record<string, unknown>)?.text as string,
    (raw.lastMsg as Record<string, unknown>)?.body as string,
    raw.lastMsgBody as string,
    raw.wa_lastMsg as string,
    raw.preview as string,
  )

  const unread = Math.max(0, pickNumber(raw.unreadCount, raw.wa_unreadCount, raw.unread))
  const avatarUrl = pickString(raw.profilePicUrl, raw.avatarUrl, raw.imgUrl, raw.profilePic)

  return {
    chatJid: chatJid || waChatId || waChatLid || chatidRaw || '',
    waChatId: waChatId || '',
    waChatLid: waChatLid || '',
    name,
    lastMessagePreview: lastMsg,
    lastMessageAt: lastMsgTs,
    unreadCount: unread,
    avatarUrl,
    _raw: raw,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

interface FetchChatsOptions {
  limit?: number
  offset?: number
}

export async function fetchChats(opts: FetchChatsOptions = {}): Promise<WaChat[]> {
  const base = getWhatsappApiBase()
  const limit = opts.limit ?? 60
  const offset = opts.offset ?? 0

  try {
    const res = await fetch(
      `${base}/chats?limit=${limit}&offset=${offset}`,
      whatsappFetchInit(),
    )
    if (res.ok) {
      const data = await res.json() as unknown
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.chats)
          ? (data as Record<string, unknown>).chats as unknown[]
          : Array.isArray((data as Record<string, unknown>)?.data)
            ? (data as Record<string, unknown>).data as unknown[]
            : []
      return (rows as Record<string, unknown>[]).map(normalizeChatRow)
    }
  } catch {
    // fallback abaixo
  }

  try {
    const res = await fetch(
      `${base}/proxy/chat/findChats?count=${limit}&offset=${offset}`,
      whatsappFetchInit(),
    )
    if (res.ok) {
      const data = await res.json() as unknown
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.chats)
          ? (data as Record<string, unknown>).chats as unknown[]
          : []
      return (rows as Record<string, unknown>[]).map(normalizeChatRow)
    }
  } catch {
    // retorna vazio
  }

  return []
}

/** Marca conversa como lida na UAZAPI (/chat/read + /message/markread). */
export async function markChatAsRead(
  chat: WaChat,
  loadedMessages: Array<{ id: string; direction: string; _raw?: Record<string, unknown> }> = [],
): Promise<void> {
  if (!chat?.chatJid) return
  const proxyBase = getProxyBase()
  try {
    await fetch(`${proxyBase}/chat/read`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify({ number: chat.chatJid, read: true }),
    })).catch(() => null)

    const inboundIds = loadedMessages
      .filter((m) => m.direction === 'in')
      .map((m) => {
        const raw = m._raw || {}
        return pickString(raw.messageid, raw.id, m.id)
      })
      .filter((id) => id && !id.startsWith('opt_'))

    if (inboundIds.length > 0) {
      await fetch(`${proxyBase}/message/markread`, whatsappFetchInit({
        method: 'POST',
        body: JSON.stringify({ id: inboundIds }),
      })).catch(() => null)
    }
  } catch (err) {
    console.warn('[WA] markChatAsRead', err)
  }
}

// ─── Merge realtime ───────────────────────────────────────────────────────────

/**
 * Aplica uma atualização de chat (evento SSE/Pusher) na lista existente.
 * Retorna nova lista ordenada por lastMessageAt desc.
 */
export function mergeChatUpdate(
  list: WaChat[],
  incomingRaw: Record<string, unknown>,
): WaChat[] {
  const incoming = normalizeChatRow(incomingRaw)
  if (!incoming.chatJid) return list

  const existingIdx = findChatIndexByIdentity(list, incoming)
  let next: WaChat[]

  if (existingIdx >= 0) {
    const prev = list[existingIdx]
    const merged: WaChat = {
      ...prev,
      ...incoming,
      chatJid: preferWhatsappNetPrivateJid(incoming.chatJid, prev.chatJid) || prev.chatJid,
      waChatId: incoming.waChatId || prev.waChatId,
      waChatLid: incoming.waChatLid || prev.waChatLid,
      lastMessageAt: Math.max(incoming.lastMessageAt || 0, prev.lastMessageAt || 0),
      name: incoming.name || prev.name,
      avatarUrl: incoming.avatarUrl || prev.avatarUrl,
      lastMessagePreview: incoming.lastMessagePreview || prev.lastMessagePreview,
      unreadCount: incoming.unreadCount || prev.unreadCount,
      _raw: { ...prev._raw, ...incoming._raw },
    }
    next = [...list]
    next[existingIdx] = merged
  } else {
    next = [incoming, ...list]
  }

  return next.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

/** Incrementa contador de não lidas de um chat pelo JID (com LID↔PN). */
export function incrementUnread(list: WaChat[], chatJid: string): WaChat[] {
  return list.map((c) =>
    jidMatchesChat(c, chatJid) ? { ...c, unreadCount: c.unreadCount + 1 } : c,
  )
}

/** Zera contador de não lidas (ao abrir o chat). */
export function clearUnread(list: WaChat[], chatJid: string): WaChat[] {
  return list.map((c) =>
    jidMatchesChat(c, chatJid) ? { ...c, unreadCount: 0 } : c,
  )
}

/**
 * Atualiza preview/unread na sidebar a partir de um evento de mensagem.
 * Se o chat não existe, sintetiza uma linha nova (comportamento Nuxt).
 */
export function applyMessageToChatList(
  list: WaChat[],
  msgRaw: Record<string, unknown>,
  hintChatJid = '',
  options: { isActiveChat?: boolean } = {},
): WaChat[] {
  const synthetic = buildChatPayloadFromRealtimeMessage(msgRaw, hintChatJid)
  if (!synthetic) return list

  const incoming = normalizeChatRow(synthetic)
  const existingIdx = findChatIndexByIdentity(list, incoming)
  const isOutgoing = Boolean(msgRaw.fromMe ?? msgRaw.from_me ?? (msgRaw.key as Record<string, unknown>)?.fromMe)
  const msgText = pickString(
    msgRaw.text,
    msgRaw.body,
    msgRaw.caption,
    msgRaw.message as string,
    incoming.lastMessagePreview,
  )
  const ts = incoming.lastMessageAt || Date.now()

  if (existingIdx < 0) {
    const created: WaChat = {
      ...incoming,
      lastMessagePreview: msgText || incoming.lastMessagePreview,
      lastMessageAt: ts,
      unreadCount: options.isActiveChat || isOutgoing ? 0 : 1,
    }
    return [created, ...list].sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  }

  const prev = list[existingIdx]
  // Não regredir preview com evento antigo
  if (ts && prev.lastMessageAt && ts < prev.lastMessageAt - 1000) {
    return list
  }

  const updated: WaChat = {
    ...prev,
    chatJid: preferWhatsappNetPrivateJid(incoming.chatJid, prev.chatJid) || prev.chatJid,
    waChatId: incoming.waChatId || prev.waChatId,
    waChatLid: incoming.waChatLid || prev.waChatLid,
    lastMessagePreview: msgText || prev.lastMessagePreview,
    lastMessageAt: Math.max(ts, prev.lastMessageAt || 0),
    unreadCount: options.isActiveChat || isOutgoing
      ? prev.unreadCount
      : (prev.unreadCount || 0) + 1,
    _raw: { ...prev._raw, ...incoming._raw },
  }
  const next = [...list]
  next[existingIdx] = updated
  return next.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

/** Evento realtime só com `message`: monta payload mínimo de chat p/ sidebar. */
export function buildChatPayloadFromRealtimeMessage(
  raw: Record<string, unknown>,
  hintChatJid = '',
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const key = raw.key && typeof raw.key === 'object' ? raw.key as Record<string, unknown> : {}
  const fromMe = Boolean(raw.fromMe ?? raw.from_me ?? key.fromMe)
  const chatJidRaw = normalizeJid(
    pickString(
      hintChatJid,
      raw.chatid,
      raw.chatJid,
      raw.wa_chatid,
      key.remoteJid as string,
      key.RemoteJID as string,
      key.RemoteJid as string,
      fromMe ? pickString(raw.recipient, raw.to) : '',
      !fromMe ? pickString(raw.sender_pn, raw.SenderPn) : '',
      raw.sender as string,
    ),
  )
  if (!chatJidRaw) return null

  const senderPn = normalizeJid(pickString(raw.sender_pn, raw.SenderPn))
  const chatJid = preferWhatsappNetPrivateJid(chatJidRaw.endsWith('@lid') ? senderPn : chatJidRaw, chatJidRaw) || chatJidRaw
  const text = pickString(raw.text, raw.body, raw.caption, raw.message as string)
  const ts = normalizeTimestampToMs(raw.messageTimestamp ?? raw.timestamp ?? 0) || Date.now()

  return {
    wa_chatid: chatJid,
    chatJid,
    ...(chatJidRaw.endsWith('@lid') && chatJidRaw !== chatJid ? { wa_chatlid: chatJidRaw } : {}),
    ...(senderPn && senderPn.endsWith('@lid') ? { wa_chatlid: senderPn } : {}),
    wa_lastMsgTimestamp: ts,
    lastMessageTime: ts,
    wa_lastMessageType: String(raw.messageType || raw.type || ''),
    wa_lastMessageSender: String(raw.sender || raw.participant || raw.sender_pn || ''),
    ...(text ? { wa_lastMessageTextVote: text, lastMessage: text } : {}),
  }
}

/** Extrai candidates de JID de um evento realtime de mensagem. */
export function extractMessageChatJidCandidates(
  payload: Record<string, unknown>,
  msgRaw: Record<string, unknown>,
): string[] {
  const key = msgRaw.key && typeof msgRaw.key === 'object' ? msgRaw.key as Record<string, unknown> : {}
  const fromMe = Boolean(msgRaw.fromMe ?? msgRaw.from_me ?? key.fromMe)
  return [
    payload.chatJid,
    msgRaw.chatid,
    msgRaw.chatJid,
    msgRaw.wa_chatid,
    msgRaw.wa_chatlid,
    msgRaw.chatlid,
    msgRaw.sender_pn,
    msgRaw.SenderPn,
    key.remoteJid,
    key.RemoteJID,
    !fromMe ? msgRaw.sender : '',
    !fromMe ? msgRaw.sender_lid : '',
  ]
    .map((v) => normalizeJid(v))
    .filter((v): v is string => Boolean(v))
}
