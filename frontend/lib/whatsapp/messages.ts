/**
 * messages.ts — helpers para carregar mensagens e enviar texto.
 * Simplificado para o shell C0+C1.
 */
import { getWhatsappApiBase, whatsappFetchInit } from './api'
import { normalizeJid } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageDirection = 'in' | 'out'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WaMessage {
  id: string
  chatJid: string
  direction: MessageDirection
  text: string
  timestamp: number
  status: MessageStatus
  mediaType: string
  mediaUrl: string
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

function normalizeTimestampToMs(value: unknown): number {
  const n = Number(value ?? 0)
  if (!n) return 0
  return n < 9_999_999_999 ? n * 1000 : n
}

function resolveStatus(raw: Record<string, unknown>): MessageStatus {
  const v = String(raw.status ?? raw.ack ?? raw.messageStatus ?? '').toLowerCase()
  if (v === 'read' || v === '4' || v === 'played') return 'read'
  if (v === 'delivered' || v === '3') return 'delivered'
  if (v === 'sent' || v === '2' || v === '1') return 'sent'
  if (v === 'failed' || v === 'error') return 'failed'
  return 'sent'
}

function resolveMediaType(raw: Record<string, unknown>): string {
  return pickString(
    raw.mediaType, raw.MessageType, raw.messageType,
    (raw.content as Record<string, unknown>)?.imageMessage ? 'image' : '',
    (raw.content as Record<string, unknown>)?.videoMessage ? 'video' : '',
    (raw.content as Record<string, unknown>)?.audioMessage ? 'audio' : '',
    (raw.content as Record<string, unknown>)?.documentMessage ? 'document' : '',
  )
}

export function normalizeMessageRow(raw: Record<string, unknown>, fallbackChatJid = ''): WaMessage {
  const id = pickString(raw.messageid, raw.id, raw.messageId, String(raw.key && (raw.key as Record<string, unknown>).id || ''))
  const chatJid = normalizeJid(pickString(
    raw.chatid, raw.chatId, raw.wa_chatid, raw.remoteJid,
    (raw.key as Record<string, unknown>)?.remoteJid as string,
    fallbackChatJid,
  )) || fallbackChatJid

  const isMine = Boolean(raw.fromMe ?? raw.from_me ?? raw.isSelf ?? (raw.key as Record<string, unknown>)?.fromMe)
  const direction: MessageDirection = isMine ? 'out' : 'in'

  const content = raw.content && typeof raw.content === 'object' ? raw.content as Record<string, unknown> : {}
  const text = pickString(
    raw.text, raw.body, raw.caption, raw.message as string,
    content.text as string,
    content.conversation as string,
    (content.extendedTextMessage as Record<string, unknown>)?.text as string,
  )

  const timestamp = normalizeTimestampToMs(raw.messageTimestamp ?? raw.timestamp ?? raw.createdAt ?? raw.sentAt)
  const status = resolveStatus(raw)
  const mediaType = resolveMediaType(raw)
  const mediaUrl = pickString(raw.mediaUrl, raw.fileUrl, raw.url)

  return { id, chatJid, direction, text, timestamp, status, mediaType, mediaUrl, _raw: raw }
}

// ─── API calls ────────────────────────────────────────────────────────────────

interface FetchMessagesOptions {
  chatJid: string
  limit?: number
  offset?: number
}

export async function fetchMessages(opts: FetchMessagesOptions): Promise<WaMessage[]> {
  const base = getWhatsappApiBase()
  const { chatJid, limit = 40, offset = 0 } = opts

  // Tentativa 1: backend interno /messages
  try {
    const params = new URLSearchParams({ chatid: chatJid, limit: String(limit), offset: String(offset) })
    const res = await fetch(`${base}/messages?${params}`, whatsappFetchInit())
    if (res.ok) {
      const data = await res.json() as unknown
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.messages)
          ? (data as Record<string, unknown>).messages as unknown[]
          : Array.isArray((data as Record<string, unknown>)?.data)
            ? (data as Record<string, unknown>).data as unknown[]
            : []
      return (rows as Record<string, unknown>[])
        .map((r) => normalizeMessageRow(r, chatJid))
        .sort((a, b) => a.timestamp - b.timestamp)
    }
  } catch {
    // fallback abaixo
  }

  // Tentativa 2: proxy UAZAPI /message/findMessages
  try {
    const res = await fetch(`${base}/proxy/message/findMessages`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid, count: limit, page: Math.floor(offset / limit) }),
    }))
    if (res.ok) {
      const data = await res.json() as unknown
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.messages)
          ? (data as Record<string, unknown>).messages as unknown[]
          : []
      return (rows as Record<string, unknown>[])
        .map((r) => normalizeMessageRow(r, chatJid))
        .sort((a, b) => a.timestamp - b.timestamp)
    }
  } catch {
    // retorna vazio
  }

  return []
}

// ─── Send text ────────────────────────────────────────────────────────────────

interface SendTextOptions {
  chatJid: string
  text: string
  /** ID de mensagem a responder (opcional) */
  quotedId?: string
}

export interface SendTextResult {
  ok: boolean
  messageId?: string
  error?: string
}

export async function sendTextMessage(opts: SendTextOptions): Promise<SendTextResult> {
  const base = getWhatsappApiBase()
  const { chatJid, text, quotedId } = opts

  const body: Record<string, unknown> = {
    chatid: chatJid,
    text,
  }
  if (quotedId) body.quotedId = quotedId

  // Tentativa 1: backend interno /send/text
  try {
    const res = await fetch(`${base}/send/text`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify(body),
    }))
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      const messageId = pickString(data.messageid, data.id, data.messageId)
      return { ok: true, messageId }
    }
    const errText = await res.text().catch(() => '')
    return { ok: false, error: errText || `HTTP ${res.status}` }
  } catch (e) {
    // fallback abaixo
  }

  // Tentativa 2: proxy UAZAPI /message/sendText
  try {
    const res = await fetch(`${base}/proxy/message/sendText`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid, text }),
    }))
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      const messageId = pickString(data.messageid, data.id, data.messageId)
      return { ok: true, messageId }
    }
    const errText = await res.text().catch(() => '')
    return { ok: false, error: errText || `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) }
  }
}

// ─── Send media ───────────────────────────────────────────────────────────────

export type WaMediaType = 'image' | 'video' | 'audio' | 'document'

export interface SendMediaOptions {
  chatJid: string
  file: File
  caption?: string
  type?: WaMediaType
}

export interface SendMediaResult {
  ok: boolean
  messageId?: string
  error?: string
}

function fileToMediaType(file: File): WaMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function sendMediaMessage(opts: SendMediaOptions): Promise<SendMediaResult> {
  const base = getWhatsappApiBase()
  const { chatJid, file, caption = '' } = opts
  const type = opts.type ?? fileToMediaType(file)

  let base64File: string
  try {
    base64File = await fileToBase64(file)
  } catch {
    return { ok: false, error: 'Não foi possível ler o arquivo' }
  }

  const body: Record<string, unknown> = {
    number: chatJid,
    type,
    file: base64File,
    mimetype: file.type,
    fileName: file.name.trim(),
    text: (type === 'image' || type === 'video') ? caption.trim() : '',
  }

  // Tentativa 1: backend interno /send/media
  try {
    const res = await fetch(`${base}/send/media`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify(body),
    }))
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      const messageId = pickString(data.messageid, data.id, data.messageId)
      return { ok: true, messageId }
    }
    const errText = await res.text().catch(() => '')
    return { ok: false, error: errText || `HTTP ${res.status}` }
  } catch {
    // fallback abaixo
  }

  // Tentativa 2: proxy UAZAPI /send/media
  try {
    const res = await fetch(`${base}/proxy/send/media`, whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify(body),
    }))
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      const messageId = pickString(data.messageid, data.id, data.messageId)
      return { ok: true, messageId }
    }
    const errText = await res.text().catch(() => '')
    return { ok: false, error: errText || `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) }
  }
}

// ─── Optimistic send ──────────────────────────────────────────────────────────

let optimisticCounter = 0

/** Cria uma mensagem otimista local enquanto aguarda confirmação do backend. */
export function createOptimisticMessage(chatJid: string, text: string): WaMessage {
  optimisticCounter += 1
  return {
    id: `opt_${Date.now()}_${optimisticCounter}`,
    chatJid,
    direction: 'out',
    text,
    timestamp: Date.now(),
    status: 'pending',
    mediaType: '',
    mediaUrl: '',
    _raw: {},
  }
}

/** Chave de merge (provider id) — alinha otimista ↔ realtime ↔ poll. */
export function getMessageMergeKey(msg: WaMessage | Record<string, unknown> | null | undefined): string {
  if (!msg || typeof msg !== 'object') return 'unknown:'
  const row = msg as Record<string, unknown>
  const raw = (row._raw && typeof row._raw === 'object' ? row._raw : row) as Record<string, unknown>
  const baseId = pickString(
    raw.messageid,
    raw.id,
    raw.messageId,
    row.id as string,
    String((raw.key as Record<string, unknown> | undefined)?.id || ''),
  )
  if (baseId.startsWith('opt_')) return `opt:${baseId}`
  return baseId ? `base:${baseId}` : `base:id:${String(row.id || '')}`
}

function richerMessage(a: WaMessage, b: WaMessage): WaMessage {
  const aText = String(a.text || '').length
  const bText = String(b.text || '').length
  const aMedia = a.mediaUrl ? 1 : 0
  const bMedia = b.mediaUrl ? 1 : 0
  if (bMedia !== aMedia) return bMedia > aMedia ? b : a
  if (bText !== aText) return bText > aText ? b : a
  // Preferir status "mais avançado" e preservar mediaUrl existente
  const statusRank: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 0 }
  const winner = (statusRank[b.status] || 0) >= (statusRank[a.status] || 0) ? b : a
  return {
    ...a,
    ...winner,
    mediaUrl: winner.mediaUrl || a.mediaUrl || b.mediaUrl,
    text: winner.text || a.text || b.text,
  }
}

/** Remove otimistas outbound stale quando chega a mensagem real com mesmo texto. */
function dropStaleOptimisticOutbound(list: WaMessage[]): WaMessage[] {
  const confirmedOut = list.filter((m) => m.direction === 'out' && !m.id.startsWith('opt_'))
  return list.filter((m) => {
    if (!m.id.startsWith('opt_') || m.direction !== 'out') return true
    const text = String(m.text || '').trim()
    if (!text) return true
    const hasConfirm = confirmedOut.some((c) => {
      if (String(c.text || '').trim() !== text) return false
      const gap = Math.abs((c.timestamp || 0) - (m.timestamp || 0))
      return gap < 120_000
    })
    return !hasConfirm
  })
}

/** Merge de evento SSE/Pusher de mensagem na lista existente. */
export function mergeMessageUpdate(
  list: WaMessage[],
  incomingRaw: Record<string, unknown>,
  fallbackChatJid: string,
): WaMessage[] {
  const incoming = normalizeMessageRow(incomingRaw, fallbackChatJid)
  if (!incoming.id) return list

  const incomingKey = getMessageMergeKey(incoming)
  const byKey = new Map<string, WaMessage>()
  for (const row of list) {
    byKey.set(getMessageMergeKey(row), row)
  }

  const existing = byKey.get(incomingKey)
  if (existing) {
    byKey.set(incomingKey, richerMessage(existing, incoming))
  } else if (incoming.direction === 'out' && incoming.text) {
    // Casa otimista pendente pelo texto
    let matchedOpt: string | null = null
    for (const [key, row] of byKey) {
      if (!row.id.startsWith('opt_') || row.direction !== 'out') continue
      if (String(row.text || '').trim() !== String(incoming.text || '').trim()) continue
      matchedOpt = key
      break
    }
    if (matchedOpt) {
      const prev = byKey.get(matchedOpt)!
      byKey.delete(matchedOpt)
      byKey.set(incomingKey, richerMessage(prev, { ...incoming, status: incoming.status === 'pending' ? 'sent' : incoming.status }))
    } else {
      byKey.set(incomingKey, incoming)
    }
  } else {
    byKey.set(incomingKey, incoming)
  }

  return dropStaleOptimisticOutbound(Array.from(byKey.values())).sort(
    (a, b) => a.timestamp - b.timestamp,
  )
}

/**
 * Merge do poll HTTP com o thread local — preserva otimistas e merges realtime
 * que ainda não voltaram no fetch.
 */
export function mergePolledMessages(prev: WaMessage[], fetched: WaMessage[]): WaMessage[] {
  if (!fetched.length) return prev
  const byKey = new Map<string, WaMessage>()
  for (const row of fetched) {
    byKey.set(getMessageMergeKey(row), row)
  }
  for (const row of prev) {
    const key = getMessageMergeKey(row)
    if (row.id.startsWith('opt_')) {
      // Mantém otimista se ainda não há confirmação
      const text = String(row.text || '').trim()
      const confirmed = fetched.some(
        (f) =>
          f.direction === 'out' &&
          String(f.text || '').trim() === text &&
          Math.abs((f.timestamp || 0) - (row.timestamp || 0)) < 120_000,
      )
      if (!confirmed) byKey.set(key, row)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      // Mensagem realtime recente ainda fora do poll — mantém se for dos últimos 2 min
      if (Date.now() - (row.timestamp || 0) < 120_000) byKey.set(key, row)
      continue
    }
    byKey.set(key, richerMessage(row, existing))
  }
  return dropStaleOptimisticOutbound(Array.from(byKey.values())).sort(
    (a, b) => a.timestamp - b.timestamp,
  )
}
