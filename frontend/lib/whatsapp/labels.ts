/**
 * Etiquetas (labels) do WhatsApp — tipos e funções de API para o frontend2.
 * Portado de useWhatsappLabels.js (composable Vue).
 */
import { getProxyBase, whatsappFetchInit, whatsappHasAuth } from './api'

// ─── Paleta oficial WhatsApp Web (índices 0–19) ────────────────────────────

export const WA_LABEL_COLOR_HEX: readonly string[] = [
  '#ff9485', '#64c4ff', '#ffd429', '#dfaef0', '#99b6c1',
  '#55ccb3', '#ff9dff', '#d3a91d', '#6d7cce', '#d7e752',
  '#00d0e2', '#ffc5c7', '#93ceac', '#f74848', '#00a0f2',
  '#83e422', '#ffaf04', '#b5ebff', '#9ba6ff', '#9368cf',
]

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WaLabel {
  id: string
  labelid: string
  name: string
  color: number | null
  colorHex: string
  sortOrder: number
  conversationCount?: number
}

export interface SaveLabelPayload {
  labelid: string
  name: string
  color: number
}

// ─── Color helpers ─────────────────────────────────────────────────────────

const normalizeHexColor = (raw: unknown): string => {
  let value = String(raw || '').trim()
  if (!value) return ''
  if (!value.startsWith('#')) value = `#${value}`
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const h = value.slice(1)
    value = `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  return ''
}

const hexToRgb = (hex: string) => {
  const v = normalizeHexColor(hex)
  if (!v) return null
  return {
    r: parseInt(v.slice(1, 3), 16),
    g: parseInt(v.slice(3, 5), 16),
    b: parseInt(v.slice(5, 7), 16),
  }
}

const findClosestPaletteIndex = (hex: string): number => {
  const target = hexToRgb(hex)
  if (!target) return 0
  let bestIdx = 0
  let bestDist = Infinity
  WA_LABEL_COLOR_HEX.forEach((paletteHex, idx) => {
    const rgb = hexToRgb(paletteHex)
    if (!rgb) return
    const dist = (target.r - rgb.r) ** 2 + (target.g - rgb.g) ** 2 + (target.b - rgb.b) ** 2
    if (dist < bestDist) { bestDist = dist; bestIdx = idx }
  })
  return bestIdx
}

const parseLabelColorIndex = (label: Record<string, unknown>): number | null => {
  const raw = label.color ?? label.colorIndex ?? label.color_index ?? label.labelColor
  if (raw == null || raw === '') return null
  const asString = String(raw).trim()
  if (asString.startsWith('#')) {
    const hex = normalizeHexColor(asString)
    if (!hex) return null
    const exactIdx = WA_LABEL_COLOR_HEX.findIndex((c) => c === hex)
    if (exactIdx >= 0) return exactIdx
    return findClosestPaletteIndex(hex)
  }
  const idx = parseInt(asString, 10)
  if (!isFinite(idx)) return null
  if (idx >= 0 && idx < WA_LABEL_COLOR_HEX.length) return idx
  if (idx >= 1 && idx <= WA_LABEL_COLOR_HEX.length) return idx - 1
  return null
}

export const resolveLabelColorHex = (label: Record<string, unknown>): string => {
  const idx = parseLabelColorIndex(label)
  if (idx != null) return WA_LABEL_COLOR_HEX[idx]
  const fromHex = normalizeHexColor(label.colorHex || label.color_hex || label.hex)
  if (fromHex) {
    const exact = WA_LABEL_COLOR_HEX.findIndex((c) => c === fromHex)
    if (exact >= 0) return WA_LABEL_COLOR_HEX[exact]
    return WA_LABEL_COLOR_HEX[findClosestPaletteIndex(fromHex)]
  }
  return '#99b6c1'
}

export const resolveLabelColorIndex = (label: Record<string, unknown>): number => {
  const idx = parseLabelColorIndex(label)
  if (idx != null) return idx
  const hex = normalizeHexColor(
    (label.colorHex as string) || (label.color_hex as string) || (label.hex as string)
  )
  if (hex) {
    const exact = WA_LABEL_COLOR_HEX.findIndex((c) => c === hex)
    if (exact >= 0) return exact
    return findClosestPaletteIndex(hex)
  }
  return 0
}

// ─── ID helpers ────────────────────────────────────────────────────────────

export const normalizeSingleChatLabelId = (raw: unknown): string => {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.includes(':')) {
    const tail = value.split(':').pop() || ''
    if (/^\d+$/.test(tail)) return tail
  }
  return value
}

export const normalizeChatLabelIds = (waLabel: unknown): string[] => {
  if (waLabel == null || waLabel === '') return []
  if (Array.isArray(waLabel)) {
    return waLabel.map((i) => normalizeSingleChatLabelId(i)).filter(Boolean)
  }
  const raw = String(waLabel).trim()
  if (!raw) return []
  if (raw.includes(',')) {
    return raw.split(',').map((i) => normalizeSingleChatLabelId(i)).filter(Boolean)
  }
  return [normalizeSingleChatLabelId(raw)]
}

const resolveCanonicalLabelId = (label: Record<string, unknown>): string => {
  const labelid = String(label?.labelid || '').trim()
  const id = String(label?.id || '').trim()
  if (labelid) return normalizeSingleChatLabelId(labelid) || labelid
  if (id) return normalizeSingleChatLabelId(id) || id
  return ''
}

// ─── Parse helpers ─────────────────────────────────────────────────────────

const parseLabelsPayload = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.labels)) return d.labels as Record<string, unknown>[]
    if (Array.isArray(d.data)) return d.data as Record<string, unknown>[]
    if (Array.isArray(d.result)) return d.result as Record<string, unknown>[]
  }
  return []
}

const buildLabelEntry = (label: Record<string, unknown>, sortOrder: number): WaLabel | null => {
  const canonicalId = resolveCanonicalLabelId(label)
  if (!canonicalId) return null
  const labelidRaw = String(label.labelid || '').trim()
  const colorIndex = parseLabelColorIndex(label)
  const apiColorHex = normalizeHexColor(
    (label.colorHex as string) || (label.color_hex as string) || (label.hex as string)
  )
  const color = colorIndex ?? (apiColorHex ? findClosestPaletteIndex(apiColorHex) : null)
  return {
    id: String(label.id || canonicalId).trim(),
    labelid: labelidRaw || canonicalId,
    name: String(label.name || '').trim() || `Etiqueta ${canonicalId}`,
    sortOrder,
    color,
    colorHex: resolveLabelColorHex({ ...label, color }),
  }
}

// ─── Format helpers ────────────────────────────────────────────────────────

export const formatLabelConversationCount = (count: number): string => {
  const safe = Math.max(0, Math.floor(Number(count) || 0))
  return safe === 1 ? '1 conversa' : `${safe} conversas`
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const loadLabels = async (): Promise<WaLabel[]> => {
  if (!whatsappHasAuth()) return []
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/labels`, whatsappFetchInit())
    if (!res.ok) return []
    const data = (await res.json().catch(() => [])) as unknown
    const raw = parseLabelsPayload(data)
    const entries: WaLabel[] = []
    raw.forEach((label, idx) => {
      const entry = buildLabelEntry(label, idx)
      if (entry) entries.push(entry)
    })
    entries.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name, 'pt-BR')
    })
    return entries
  } catch {
    return []
  }
}

const postLabelEdit = async (payload: Record<string, unknown>): Promise<void> => {
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/label/edit`, {
    ...whatsappFetchInit({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Falha ao salvar etiqueta')
  }
}

export const saveLabel = async (payload: SaveLabelPayload): Promise<void> => {
  const safeName = String(payload.name || '').trim()
  if (!safeName) throw new Error('Informe o nome da etiqueta')
  const safeId = String(payload.labelid || 'new').trim() || 'new'
  const colorNum = Math.max(0, Math.min(WA_LABEL_COLOR_HEX.length - 1, payload.color))
  await postLabelEdit({ labelid: safeId, name: safeName, color: colorNum, delete: false })
}

export const deleteLabel = async (label: { id: string; labelid?: string; name?: string; color?: number | null }): Promise<void> => {
  const safeId = String(label?.labelid || label?.id || '').trim()
  if (!safeId) throw new Error('Etiqueta inválida')
  await postLabelEdit({
    labelid: safeId,
    name: String(label?.name || '').trim(),
    color: label?.color ?? 0,
    delete: true,
  })
}

export const refreshLabelsOnApi = async (force = false): Promise<boolean> => {
  if (!whatsappHasAuth()) return false
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/labels/refresh`, {
      ...whatsappFetchInit({ method: 'POST', body: JSON.stringify({ force }) }),
      method: 'POST',
      body: JSON.stringify({ force }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Chat label helpers ────────────────────────────────────────────────────

export const chatHasLabel = (chat: Record<string, unknown>, labelId: string): boolean => {
  const target = normalizeSingleChatLabelId(labelId)
  if (!target) return false
  const ids = normalizeChatLabelIds(chat?.wa_label)
  return ids.some((id) => normalizeSingleChatLabelId(id) === target || id === target)
}

export const filterChatsByLabel = (
  chats: Record<string, unknown>[],
  labelId: string,
): Record<string, unknown>[] => {
  const target = normalizeSingleChatLabelId(labelId)
  if (!target) return []
  return chats.filter((c) => chatHasLabel(c, target))
}
