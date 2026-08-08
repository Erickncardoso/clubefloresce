/**
 * Conversas arquivadas do WhatsApp — tipos e funções de API.
 * Portado de useWhatsappArchivedChats.js (composable Vue).
 */
import { getProxyBase, whatsappFetchInit } from './api'
import { normalizeChatRow, type WaChat } from './chats'

// ─── Fetch helpers ──────────────────────────────────────────────────────────

const parseChatsRows = (data: unknown): Record<string, unknown>[] => {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.chats)) return d.chats as Record<string, unknown>[]
    if (Array.isArray(d.data)) return d.data as Record<string, unknown>[]
    if (Array.isArray(d.results)) return d.results as Record<string, unknown>[]
    if (Array.isArray(d.items)) return d.items as Record<string, unknown>[]
  }
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  return []
}

// ─── Public API ────────────────────────────────────────────────────────────

export const loadArchivedChats = async (): Promise<WaChat[]> => {
  const proxyBase = getProxyBase()
  const tryBodies = [
    { operator: 'AND', sort: '-wa_lastMsgTimestamp', limit: 300, offset: 0, wa_archived: true },
    { sort: '-wa_lastMsgTimestamp', limit: 300, offset: 0, wa_archived: true },
    { limit: 300, offset: 0, wa_archived: true },
  ]

  for (const body of tryBodies) {
    try {
      const res = await fetch(`${proxyBase}/chat/find`, {
        ...whatsappFetchInit({ method: 'POST', body: JSON.stringify(body) }),
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) continue
      const data = (await res.json().catch(() => ({}))) as unknown
      const rows = parseChatsRows(data)
      if (rows.length === 0 && !Array.isArray(data)) continue
      const seen = new Set<string>()
      const result: WaChat[] = []
      for (const row of rows) {
        const chat = normalizeChatRow(row)
        if (!chat.chatJid || seen.has(chat.chatJid)) continue
        seen.add(chat.chatJid)
        result.push(chat)
      }
      result.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      return result
    } catch {
      continue
    }
  }
  return []
}
