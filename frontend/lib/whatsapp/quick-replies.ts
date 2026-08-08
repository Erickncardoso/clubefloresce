/**
 * Respostas rápidas (quick replies) do WhatsApp — tipos e funções de API.
 * Portado de useWhatsappQuickReplies.js (composable Vue).
 */
import { getProxyBase, whatsappFetchInit, whatsappHasAuth } from './api'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface QuickReply {
  id: string
  shortCut: string
  text: string
  type: string
  file: string
  docName: string
  onWhatsApp: boolean
}

export interface SaveQuickReplyPayload {
  id?: string
  shortCut: string
  type: string
  text: string
  file: string
  docName: string
}

// ─── Normalize helpers ─────────────────────────────────────────────────────

const normalizeQuickReply = (raw: Record<string, unknown>): QuickReply | null => {
  if (!raw || typeof raw !== 'object') return null
  const shortCut = String(raw.shortCut || raw.shortcut || raw.ShortCut || '').trim()
  if (!shortCut) return null
  return {
    id: String(raw.id || raw.ID || shortCut),
    shortCut,
    text: String(raw.text || raw.Text || '').trim(),
    type: String(raw.type || raw.Type || 'text').toLowerCase(),
    file: String(raw.file || raw.File || '').trim(),
    docName: String(raw.docName || raw.DocName || '').trim(),
    onWhatsApp: Boolean(raw.onWhatsApp ?? raw.OnWhatsApp),
  }
}

const parseQuickRepliesPayload = (data: unknown): QuickReply[] => {
  if (!data) return []
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map(normalizeQuickReply).filter(Boolean) as QuickReply[]
  }
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>
    const nested = d.quickReplies || d.QuickReplies || d.templates || d.data || d.result
    if (Array.isArray(nested)) {
      return (nested as Record<string, unknown>[]).map(normalizeQuickReply).filter(Boolean) as QuickReply[]
    }
    if (d.shortCut || d.shortcut || d.ShortCut) {
      const one = normalizeQuickReply(d)
      return one ? [one] : []
    }
  }
  return []
}

// ─── Display helpers ───────────────────────────────────────────────────────

export const quickReplyPreviewText = (reply: QuickReply): string => {
  const text = String(reply?.text || '').trim()
  if (text) return text
  const type = String(reply?.type || 'text').toLowerCase()
  if (type === 'image') return 'Imagem'
  if (type === 'video') return 'Vídeo'
  if (type === 'document') return String(reply?.docName || 'Documento').trim() || 'Documento'
  if (['audio', 'ptt', 'myaudio'].includes(type)) return 'Áudio'
  return 'Mensagem'
}

export const isTextQuickReply = (reply: QuickReply): boolean =>
  String(reply?.type || 'text').toLowerCase() === 'text'

export const filterQuickReplies = (items: QuickReply[], query: string): QuickReply[] => {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((r) => {
    const shortcut = r.shortCut.toLowerCase()
    const text = r.text.toLowerCase()
    return shortcut.includes(q) || text.includes(q)
  })
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const loadQuickReplies = async (): Promise<QuickReply[]> => {
  if (!whatsappHasAuth()) return []
  const proxyBase = getProxyBase()
  const endpoints = ['/quickreply/showall', '/quickreply/list']
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${proxyBase}${endpoint}`, whatsappFetchInit())
      if (!res.ok) continue
      const data = (await res.json().catch(() => [])) as unknown
      const parsed = parseQuickRepliesPayload(data)
      if (parsed.length > 0) {
        return parsed.sort((a, b) =>
          a.shortCut.localeCompare(b.shortCut, 'pt-BR', { sensitivity: 'base' })
        )
      }
    } catch {
      continue
    }
  }
  return []
}

export const saveQuickReply = async (payload: SaveQuickReplyPayload): Promise<void> => {
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')
  const body: Record<string, unknown> = {
    shortCut: String(payload.shortCut || '').trim(),
    type: String(payload.type || 'text').toLowerCase(),
    text: String(payload.text || '').trim(),
    file: String(payload.file || '').trim(),
    docName: String(payload.docName || '').trim(),
  }
  if (payload.id) body.id = payload.id
  if (!body.shortCut) throw new Error('Informe o atalho')
  if (body.type === 'text' && !body.text) throw new Error('Informe a mensagem')
  if (body.type !== 'text' && !body.file) throw new Error('Informe o arquivo')

  const res = await fetch(`${getProxyBase()}/quickreply/edit`, {
    ...whatsappFetchInit({ method: 'POST', body: JSON.stringify(body) }),
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao salvar resposta rápida')
}

export const deleteQuickReply = async (id: string): Promise<void> => {
  const replyId = String(id || '').trim()
  if (!replyId) throw new Error('Resposta inválida')
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')
  const body = JSON.stringify({ id: replyId, delete: true })
  const res = await fetch(`${getProxyBase()}/quickreply/edit`, {
    ...whatsappFetchInit({ method: 'POST', body }),
    method: 'POST',
    body,
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao apagar resposta rápida')
}
