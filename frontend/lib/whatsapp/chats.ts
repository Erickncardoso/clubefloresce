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
  /** Dígitos do telefone (quando PN conhecido) */
  phone: string
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
  const phoneDigits = String(row.phone || '')
    .replace(/\D/g, '')
  if (phoneDigits.length >= 10 && phoneDigits.length <= 15) {
    return `pn:${phoneDigits}`
  }

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
  if (j.endsWith('@s.whatsapp.net') && digits.length >= 10) return `pn:${digits}`
  if (j.endsWith('@lid')) return digits ? `lid:${digits}` : `jid:${j}`
  // Se temos LID separado e JID ainda é frágil, preferir digits do PN quando possível
  if (lid) {
    const lidDigits = extractDigitsFromJid(lid).replace(/\D/g, '')
    if (lidDigits && !j.endsWith('@s.whatsapp.net')) return `lid:${lidDigits}`
  }
  return `jid:${j}`
}

/** Junta chats duplicados (mesmo PN / mesmo LID) preservando o mais recente. */
export function dedupeWaChatList(list: WaChat[]): WaChat[] {
  const byKey = new Map<string, WaChat>()
  for (const chat of list) {
    if (!chat?.chatJid && !chat?.waChatLid && !chat?.waChatId) continue
    const key = canonicalChatListKey(chat)
      || (chat.chatJid ? `jid:${chat.chatJid}` : '')
      || (chat.waChatLid ? `lid:${chat.waChatLid}` : '')
    if (!key) continue

    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, chat)
      continue
    }

    const preferIncoming = (chat.lastMessageAt || 0) >= (prev.lastMessageAt || 0)
    const winner = preferIncoming ? chat : prev
    const loser = preferIncoming ? prev : chat
    byKey.set(key, {
      ...loser,
      ...winner,
      chatJid: preferWhatsappNetPrivateJid(winner.chatJid, loser.chatJid) || winner.chatJid || loser.chatJid,
      waChatId: winner.waChatId || loser.waChatId,
      waChatLid: winner.waChatLid || loser.waChatLid,
      phone: winner.phone || loser.phone,
      name: winner.name || loser.name,
      avatarUrl: winner.avatarUrl || loser.avatarUrl,
      lastMessagePreview: winner.lastMessagePreview || loser.lastMessagePreview,
      lastMessageAt: Math.max(winner.lastMessageAt || 0, loser.lastMessageAt || 0),
      unreadCount: Math.max(winner.unreadCount || 0, loser.unreadCount || 0),
      _raw: { ...(loser._raw || {}), ...(winner._raw || {}) },
    })
  }
  return Array.from(byKey.values())
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

/** Preview a partir de `raw` WuzAPI (text_content / data_json) — o sync às vezes grava só "Mensagem". */
function parseEmbeddedDataJson(raw: Record<string, unknown>): Record<string, unknown> | null {
  const nested = (raw.raw && typeof raw.raw === 'object' ? raw.raw : raw) as Record<string, unknown>
  const dataJsonRaw = nested.data_json ?? nested.dataJson ?? nested.DataJson
  if (typeof dataJsonRaw === 'string' && dataJsonRaw.trim()) {
    try {
      return JSON.parse(dataJsonRaw) as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (dataJsonRaw && typeof dataJsonRaw === 'object') {
    return dataJsonRaw as Record<string, unknown>
  }
  // Já veio expandido (Info + Message) como no findMessages
  if (nested.Info || nested.info || nested.Message || nested.message) {
    return nested
  }
  return null
}

function isPlausiblePhoneDigits(digits: string): boolean {
  const d = String(digits || '').replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15
}

/** Extrai PN (@s.whatsapp.net) embutido no data_json (SenderAlt / RecipientAlt). */
function extractPhoneJidFromEmbeddedRaw(raw: Record<string, unknown>): string {
  const nested = (raw.raw && typeof raw.raw === 'object' ? raw.raw : raw) as Record<string, unknown>
  const parsed = parseEmbeddedDataJson(raw)
  const info = (parsed?.Info || parsed?.info || nested.Info || nested.info) as Record<string, unknown> | undefined
  const fromMe = Boolean(info?.IsFromMe ?? info?.isFromMe ?? nested.fromMe ?? parsed?.fromMe)

  // fromMe: RecipientAlt = contato (SenderAlt = sessão). Inbound: SenderAlt = contato.
  const candidates: unknown[] = []
  if (info) {
    if (!fromMe) {
      candidates.push(
        info.SenderAlt, info.senderAlt,
        info.Sender, info.sender,
        info.Participant, info.participant,
        info.RecipientAlt, info.recipientAlt,
      )
    } else {
      candidates.push(
        info.RecipientAlt, info.recipientAlt,
        info.Recipient, info.recipient,
      )
      const deviceMeta = info.DeviceSentMeta as Record<string, unknown> | undefined
      candidates.push(deviceMeta?.DestinationJID, deviceMeta?.destinationJID)
    }
  }

  // Top-level: em fromMe, sender_pn costuma ser a sessão — só recipient_*
  if (!fromMe) {
    candidates.push(
      nested.sender_pn, nested.SenderPn, nested.senderPn,
      nested.participant_pn, nested.ParticipantPn, nested.participantPn,
    )
  }
  candidates.push(
    nested.recipient_pn, nested.RecipientPn, nested.recipientPn,
  )

  for (const c of candidates) {
    const jid = normalizeJid(c)
    if (jid.endsWith('@s.whatsapp.net') && isPlausiblePhoneDigits(extractDigitsFromJid(jid))) {
      return jid
    }
  }

  if (!parsed) {
    const phoneDigits = String(nested.phone || '').replace(/\D/g, '')
    if (isPlausiblePhoneDigits(phoneDigits)) {
      return normalizeJid(`${phoneDigits}@s.whatsapp.net`)
    }
  }

  return ''
}

function extractPushNameFromEmbeddedRaw(raw: Record<string, unknown>): string {
  const parsed = parseEmbeddedDataJson(raw)
  if (!parsed) return ''
  const info = (parsed.Info || parsed.info) as Record<string, unknown> | undefined
  return pickString(info?.PushName, info?.pushName, info?.VerifiedName)
}

function extractPreviewFromEmbeddedRaw(raw: Record<string, unknown>): string {
  const nested = (raw.raw && typeof raw.raw === 'object' ? raw.raw : raw) as Record<string, unknown>
  const direct = pickString(
    nested.text_content,
    nested.textContent,
    nested.text,
    nested.body,
    nested.caption,
  )
  if (direct && direct.toLowerCase() !== 'mensagem') return direct

  const parsed = parseEmbeddedDataJson(raw)
  if (!parsed) return ''

  const msg =
    (parsed.Message as Record<string, unknown> | undefined) ||
    (parsed.message as Record<string, unknown> | undefined) ||
    parsed
  const extended = (msg.extendedTextMessage || msg.ExtendedTextMessage) as Record<string, unknown> | undefined
  const deviceSent = (msg.deviceSentMessage || msg.DeviceSentMessage) as Record<string, unknown> | undefined
  const deviceMsg = (deviceSent?.message || deviceSent?.Message) as Record<string, unknown> | undefined
  const deviceExt = (deviceMsg?.extendedTextMessage || deviceMsg?.ExtendedTextMessage) as
    | Record<string, unknown>
    | undefined

  return pickString(
    extended?.text,
    deviceExt?.text,
    msg.conversation,
    msg.Conversation,
    (msg.imageMessage as Record<string, unknown> | undefined)?.caption,
    (msg.videoMessage as Record<string, unknown> | undefined)?.caption,
  )
}

function isGenericPreviewPlaceholder(text: string): boolean {
  const t = text.trim().toLowerCase()
  return !t || t === 'mensagem' || t === 'message'
}

export function normalizeChatRow(raw: Record<string, unknown>): WaChat {
  const chatidRaw = pickString(raw.chatid, raw.chatId, raw.wa_chatid, raw.id, raw.jid, raw.chatJid)
  const lidRaw = pickString(raw.wa_chatlid, raw.chatlid, raw.chatLid, raw.lid)
  const phoneFromRaw = pickString(raw.phone)
  const phoneJidFromJson = extractPhoneJidFromEmbeddedRaw(raw)
  const phoneDigitsFromField = phoneFromRaw.replace(/\D/g, '')
  const phoneJid =
    phoneJidFromJson ||
    (isPlausiblePhoneDigits(phoneDigitsFromField)
      ? normalizeJid(`${phoneDigitsFromField}@s.whatsapp.net`)
      : '') ||
    (chatidRaw.endsWith('@s.whatsapp.net') ? normalizeJid(chatidRaw) : '')

  const lid =
    normalizeJid(
      pickString(
        lidRaw,
        chatidRaw.endsWith('@lid') ? chatidRaw : '',
      ),
    ) || ''

  const preferred = preferWhatsappNetPrivateJid(phoneJid || chatidRaw, lid)
  const chatJid = normalizeJid(preferred) || normalizeJid(chatidRaw) || chatidRaw || lid
  const waChatId = normalizeJid(
    pickString(
      phoneJid,
      chatJid.endsWith('@s.whatsapp.net') ? chatJid : '',
      chatidRaw.endsWith('@s.whatsapp.net') ? chatidRaw : '',
    ),
  )
  const waChatLid = lid || (chatJid.endsWith('@lid') ? chatJid : '')
  const phone = extractDigitsFromJid(waChatId || phoneJid) || (
    isPlausiblePhoneDigits(phoneDigitsFromField) ? phoneDigitsFromField : ''
  )

  const name = pickString(
    raw.name,
    raw.pushname,
    raw.wa_name,
    raw.wa_contactName,
    raw.subject,
    raw.groupName,
    raw.notifyName,
    raw.verifiedName,
    raw.title,
    extractPushNameFromEmbeddedRaw(raw),
    chatJid.endsWith('@lid') ? '' : chatJid.split('@')[0],
  )

  const lastMsgTs = normalizeTimestampToMs(
    raw.lastMessageTimestamp ??
    raw.wa_lastMsgTimestamp ??
    raw.wa_lastMessageTimestamp ??
    raw.lastMsgTimestamp ??
    raw.lastMessageTime ??
    raw.updatedAt,
  )

  let lastMsg = pickString(
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
  if (isGenericPreviewPlaceholder(lastMsg)) {
    lastMsg = extractPreviewFromEmbeddedRaw(raw) || lastMsg
  }

  const unread = Math.max(0, pickNumber(raw.unreadCount, raw.wa_unreadCount, raw.unread))
  const avatarUrl = pickString(
    raw.profilePicUrl,
    raw.profilePictureUrl,
    raw.avatarUrl,
    raw.image,
    raw.imagePreview,
    raw.imgUrl,
    raw.profilePic,
  )

  return {
    chatJid: chatJid || waChatId || waChatLid || chatidRaw || '',
    waChatId: waChatId || '',
    waChatLid: waChatLid || '',
    phone,
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
      return dedupeWaChatList((rows as Record<string, unknown>[]).map(normalizeChatRow))
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
      return dedupeWaChatList((rows as Record<string, unknown>[]).map(normalizeChatRow))
    }
  } catch {
    // retorna vazio
  }

  return []
}

/** Enriquece avatares ausentes via POST /chat/avatars/batch (igual Nuxt). */
export async function enrichMissingChatAvatars(list: WaChat[]): Promise<WaChat[]> {
  const missing = list.filter((c) => !String(c.avatarUrl || '').trim()).slice(0, 40)
  if (!missing.length) return list

  const targets: string[] = []
  const namesByTarget: Record<string, string> = {}
  const seen = new Set<string>()

  for (const chat of missing) {
    const candidates = [
      chat.waChatId,
      chat.phone ? `${chat.phone}@s.whatsapp.net` : '',
      chat.phone,
      chat.chatJid.endsWith('@s.whatsapp.net') ? chat.chatJid : '',
      chat.waChatLid,
      chat.chatJid,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean)

    // Envia PN + LID (backend resolve LID↔PN via agenda/nome + /user/lid)
    for (const target of candidates) {
      const key = target.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      targets.push(target)
      if (chat.name) {
        namesByTarget[key] = chat.name
        namesByTarget[target] = chat.name
      }
    }
  }
  if (!targets.length) return list

  try {
    const base = getWhatsappApiBase()
    const res = await fetch(`${base}/chat/avatars/batch`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify({ targets, namesByTarget, preview: true }),
    }))
    if (!res.ok) return list
    const body = await res.json() as { avatars?: Record<string, string> }
    const avatars = body?.avatars && typeof body.avatars === 'object' ? body.avatars : {}
    if (!Object.keys(avatars).length) return list

    return list.map((chat) => {
      if (chat.avatarUrl) return chat
      const keys = [
        chat.waChatId,
        chat.phone,
        chat.phone ? `${chat.phone}@s.whatsapp.net` : '',
        chat.chatJid,
        chat.waChatLid,
        extractDigitsFromJid(chat.waChatId || chat.chatJid),
      ]
        .map((v) => String(v || '').trim().toLowerCase())
        .filter(Boolean)
      for (const key of keys) {
        const url = String(avatars[key] || '').trim()
        if (!url) continue
        const phoneFromKey = key.includes('@s.whatsapp.net')
          ? extractDigitsFromJid(key)
          : (/^\d{10,15}$/.test(key) ? key : '')
        return {
          ...chat,
          avatarUrl: url,
          phone: chat.phone || phoneFromKey,
          waChatId: chat.waChatId
            || (phoneFromKey ? `${phoneFromKey}@s.whatsapp.net` : ''),
        }
      }
      return chat
    })
  } catch {
    return list
  }
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
      phone: incoming.phone || prev.phone,
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
    phone: incoming.phone || prev.phone,
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
