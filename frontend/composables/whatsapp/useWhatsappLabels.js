/**
 * Etiquetas (labels) do WhatsApp via UAZAPI.
 * Cada chat traz `wa_label` (IDs); os metadados (nome/cor) vêm de GET /labels.
 */
import { ref } from 'vue'
import { getProxyBase, whatsappJsonHeaders, whatsappAuthHeaders, whatsappHasAuth } from './useWhatsappApi.js'

/** Paleta oficial WhatsApp Web / UAZAPI (índices 0–19) — WAHA 2024+ */
export const WA_LABEL_COLOR_HEX = [
  '#ff9485',
  '#64c4ff',
  '#ffd429',
  '#dfaef0',
  '#99b6c1',
  '#55ccb3',
  '#ff9dff',
  '#d3a91d',
  '#6d7cce',
  '#d7e752',
  '#00d0e2',
  '#ffc5c7',
  '#93ceac',
  '#f74848',
  '#00a0f2',
  '#83e422',
  '#ffaf04',
  '#b5ebff',
  '#9ba6ff',
  '#9368cf',
]

export const whatsappLabelsById = ref({})
/** Ordem retornada pela UAZAPI (mesma sequência do WhatsApp Web) */
export const whatsappLabelsOrder = ref([])
export const labelsSidebarOpen = ref(false)
export const activeLabelView = ref(null)
export const labelChatSelection = ref([])
export const labelAssignPickerOpen = ref(false)
export const labelBulkSaving = ref(false)
export const labelsLoading = ref(false)
export const labelsSaving = ref(false)

let labelsLoadInFlight = null
let labelsLastFingerprint = ''
let labelsLastBackgroundLoadAt = 0
const LABELS_BACKGROUND_MIN_MS = 60_000

const normalizeHexColor = (raw) => {
  let value = String(raw || '').trim()
  if (!value) return ''
  if (!value.startsWith('#')) value = `#${value}`
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const hex = value.slice(1)
    value = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  return ''
}

const parseLabelColorIndex = (label = {}) => {
  const raw = label.color ?? label.colorIndex ?? label.color_index ?? label.labelColor
  if (raw == null || raw === '') return null

  const asString = String(raw).trim()
  if (asString.startsWith('#')) {
    const hex = normalizeHexColor(asString)
    if (!hex) return null
    const exactIdx = WA_LABEL_COLOR_HEX.findIndex((item) => item.toLowerCase() === hex)
    if (exactIdx >= 0) return exactIdx
    return findClosestPaletteIndex(hex)
  }

  const idx = Number.parseInt(asString, 10)
  if (!Number.isFinite(idx)) return null
  if (idx >= 0 && idx < WA_LABEL_COLOR_HEX.length) return idx
  if (idx >= 1 && idx <= WA_LABEL_COLOR_HEX.length) return idx - 1
  return null
}

const hexToRgb = (hex) => {
  const value = normalizeHexColor(hex)
  if (!value) return null
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  }
}

const findClosestPaletteIndex = (hex) => {
  const target = hexToRgb(hex)
  if (!target) return null
  let bestIdx = 0
  let bestDist = Number.POSITIVE_INFINITY
  WA_LABEL_COLOR_HEX.forEach((paletteHex, index) => {
    const rgb = hexToRgb(paletteHex)
    if (!rgb) return
    const dist = ((target.r - rgb.r) ** 2) + ((target.g - rgb.g) ** 2) + ((target.b - rgb.b) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = index
    }
  })
  return bestIdx
}

/** Exibição: índice `color` (0–19) é a fonte de verdade do WhatsApp; `colorHex` pode estar stale no cache da UAZAPI. */
export const resolveLabelColorHex = (label = {}) => {
  const idx = parseLabelColorIndex(label)
  if (idx != null) return WA_LABEL_COLOR_HEX[idx]

  const fromHex = normalizeHexColor(label.colorHex || label.color_hex || label.hex)
  if (fromHex) {
    const exactIdx = WA_LABEL_COLOR_HEX.findIndex((item) => item.toLowerCase() === fromHex)
    if (exactIdx >= 0) return WA_LABEL_COLOR_HEX[exactIdx]
    const closest = findClosestPaletteIndex(fromHex)
    if (closest != null) return WA_LABEL_COLOR_HEX[closest]
    return fromHex
  }

  return '#99b6c1'
}

export const resolveLabelColorIndex = (labelOrHex = {}) => {
  if (labelOrHex && typeof labelOrHex === 'object') {
    const idx = parseLabelColorIndex(labelOrHex)
    if (idx != null) return idx

    const hex = normalizeHexColor(labelOrHex.colorHex || labelOrHex.color_hex || labelOrHex.hex)
    if (hex) {
      const exactIdx = WA_LABEL_COLOR_HEX.findIndex((item) => item.toLowerCase() === hex)
      if (exactIdx >= 0) return exactIdx
      const closest = findClosestPaletteIndex(hex)
      if (closest != null) return closest
    }

    return 0
  }

  const hex = normalizeHexColor(labelOrHex)
  if (!hex) return 0
  const exactIdx = WA_LABEL_COLOR_HEX.findIndex((item) => item.toLowerCase() === hex)
  if (exactIdx >= 0) return exactIdx
  return findClosestPaletteIndex(hex) ?? 0
}

export const formatLabelConversationCount = (count) => {
  const safe = Math.max(0, Math.floor(Number(count) || 0))
  return safe === 1 ? '1 conversa' : `${safe} conversas`
}

export const normalizeSingleChatLabelId = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.includes(':')) {
    const tail = value.split(':').pop() || ''
    if (/^\d+$/.test(tail)) return tail
  }
  return value
}

export const normalizeChatLabelIds = (waLabel) => {
  if (waLabel == null || waLabel === '') return []
  if (Array.isArray(waLabel)) {
    return waLabel.map((item) => normalizeSingleChatLabelId(item)).filter(Boolean)
  }
  const raw = String(waLabel).trim()
  if (!raw) return []
  if (raw.includes(',')) {
    return raw.split(',').map((item) => normalizeSingleChatLabelId(item)).filter(Boolean)
  }
  return [normalizeSingleChatLabelId(raw)]
}

const parseLabelsPayload = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.labels)) return data.labels
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.result)) return data.result
  return []
}

const resolveCanonicalLabelId = (label = {}) => {
  const labelid = String(label?.labelid || '').trim()
  const id = String(label?.id || '').trim()
  if (labelid) return normalizeSingleChatLabelId(labelid) || labelid
  if (id) return normalizeSingleChatLabelId(id) || id
  return ''
}

const buildLabelsFingerprint = (labels = []) => JSON.stringify(
  labels.map((label) => ({
    id: resolveCanonicalLabelId(label),
    name: String(label?.name || '').trim(),
    color: label?.color ?? label?.colorIndex ?? null,
    colorHex: normalizeHexColor(label?.colorHex || label?.color_hex || label?.hex),
    labelid: String(label?.labelid || '').trim(),
  }))
)

const buildLabelEntry = (label = {}, sortOrder = 0) => {
  const labelidRaw = String(label?.labelid || '').trim()
  const id = String(label?.id || '').trim()
  const canonicalId = resolveCanonicalLabelId(label)
  if (!canonicalId) return null

  const colorIndex = parseLabelColorIndex(label)
  const apiColorHex = normalizeHexColor(label.colorHex || label.color_hex || label.hex)
  const entry = {
    ...label,
    labelid: labelidRaw || canonicalId,
    id: id || canonicalId,
    name: String(label?.name || '').trim() || `Etiqueta ${canonicalId}`,
    sortOrder,
    color: colorIndex ?? (apiColorHex ? findClosestPaletteIndex(apiColorHex) : null),
    apiColorHex,
    colorHex: resolveLabelColorHex(label),
  }
  if (entry.color == null) entry.color = resolveLabelColorIndex(entry)
  return entry
}

const registerLabelInMap = (map, key, entry) => {
  const normalizedKey = String(key || '').trim()
  if (!normalizedKey || !entry) return

  const prev = map[normalizedKey]
  if (!prev) {
    map[normalizedKey] = entry
    return
  }

  const prevOrder = Number(prev.sortOrder)
  const nextOrder = Number(entry.sortOrder)
  const sortOrder = Number.isFinite(prevOrder) && Number.isFinite(nextOrder)
    ? Math.min(prevOrder, nextOrder)
    : (entry.sortOrder ?? prev.sortOrder)

  const mergedColor = entry.color ?? prev.color
  map[normalizedKey] = {
    ...prev,
    ...entry,
    sortOrder,
    name: entry.name || prev.name,
    color: mergedColor,
    apiColorHex: entry.apiColorHex || prev.apiColorHex,
    colorHex: resolveLabelColorHex({
      color: mergedColor,
      colorHex: entry.apiColorHex || prev.apiColorHex,
    }),
  }
}

const indexLabelEntry = (map, label, sortOrder = 0) => {
  const entry = buildLabelEntry(label, sortOrder)
  if (!entry) return entry

  const labelid = String(entry.labelid || '').trim()
  const id = String(entry.id || '').trim()
  const owner = String(label?.owner || '').trim()

  const keys = new Set([
    labelid,
    id,
    normalizeSingleChatLabelId(labelid),
    normalizeSingleChatLabelId(id),
    owner && labelid ? `${owner}:${labelid}` : '',
    owner && id ? `${owner}:${id}` : '',
    owner && labelid ? `${owner}:${normalizeSingleChatLabelId(labelid)}` : '',
  ])

  for (const key of keys) {
    if (key) registerLabelInMap(map, key, entry)
  }

  return entry
}

const findLabelEntryById = (labelById = {}, rawId = '') => {
  const id = String(rawId || '').trim()
  if (!id) return null

  const normalized = normalizeSingleChatLabelId(id)
  const direct = labelById[id] || labelById[normalized]
  if (direct) return direct

  for (const entry of Object.values(labelById || {})) {
    const entryId = String(entry?.labelid || entry?.id || '').trim()
    if (!entryId) continue
    if (entryId === id || entryId === normalized) return entry
    if (normalizeSingleChatLabelId(entryId) === normalized) return entry
  }
  return null
}

const findLabelMeta = (rawId, chat = {}, labelById = {}) => {
  const id = String(rawId || '').trim()
  if (!id) return {}

  const owner = String(
    chat?.owner || chat?.wa_owner || chat?.instanceOwner || ''
  ).trim()

  const candidates = [
    id,
    normalizeSingleChatLabelId(id),
    owner ? `${owner}:${id}` : '',
    owner ? `${owner}:${normalizeSingleChatLabelId(id)}` : '',
  ].filter(Boolean)

  for (const key of candidates) {
    if (labelById?.[key]) return labelById[key]
  }

  const found = findLabelEntryById(labelById, id)
  return found || {}
}

const compareLabelsLikeWhatsapp = (a, b) => {
  const orderA = Number(a?.sortOrder)
  const orderB = Number(b?.sortOrder)
  if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
    return orderA - orderB
  }

  const idA = Number.parseInt(String(a?.labelid || a?.id || ''), 10)
  const idB = Number.parseInt(String(b?.labelid || b?.id || ''), 10)
  if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) {
    return idA - idB
  }

  return String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR')
}

export const refreshWhatsappLabelsFromApi = async ({ force = false } = {}) => {
  if (!whatsappHasAuth()) return false

  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/labels/refresh`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ force: Boolean(force) }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const loadWhatsappLabels = async ({
  showLoading = false,
  refresh = false,
  force = false,
} = {}) => {
  if (labelsLoadInFlight) {
    return labelsLoadInFlight
  }

  labelsLoadInFlight = (async () => {
    if (!whatsappHasAuth()) return whatsappLabelsById.value

    if (showLoading) labelsLoading.value = true

    if (refresh) {
      await refreshWhatsappLabelsFromApi({ force: Boolean(force) })
    }

    const proxyBase = getProxyBase()
    let res
    try {
      res = await fetch(`${proxyBase}/labels`, {
        method: 'GET',
        headers: whatsappAuthHeaders(),
      })
    } catch {
      if (showLoading) labelsLoading.value = false
      return whatsappLabelsById.value
    }

    if (!res.ok) {
      if (showLoading) labelsLoading.value = false
      return whatsappLabelsById.value
    }

    let data = null
    try {
      data = await res.json()
    } catch {
      if (showLoading) labelsLoading.value = false
      return whatsappLabelsById.value
    }

    const labels = parseLabelsPayload(data)
    const fingerprint = buildLabelsFingerprint(labels)
    if (!force && fingerprint === labelsLastFingerprint && Object.keys(whatsappLabelsById.value || {}).length) {
      if (showLoading) labelsLoading.value = false
      return whatsappLabelsById.value
    }

    const map = {}
    const order = []

    labels.forEach((label, index) => {
      const entry = indexLabelEntry(map, label, index)
      const canonicalId = resolveCanonicalLabelId(label) || String(entry?.labelid || '').trim()
      if (canonicalId && !order.includes(canonicalId)) {
        order.push(canonicalId)
      }
    })

    labelsLastFingerprint = fingerprint
    whatsappLabelsById.value = map
    whatsappLabelsOrder.value = order
    if (showLoading) labelsLoading.value = false
    return map
  })()

  try {
    return await labelsLoadInFlight
  } finally {
    labelsLoadInFlight = null
  }
}

export const syncWhatsappLabelsInBackground = async () => {
  const now = Date.now()
  if (now - labelsLastBackgroundLoadAt < LABELS_BACKGROUND_MIN_MS) return whatsappLabelsById.value
  labelsLastBackgroundLoadAt = now
  return loadWhatsappLabels({ showLoading: false, refresh: false, force: false })
}

export const listUniqueWhatsappLabels = (
  labelById = whatsappLabelsById.value,
  order = whatsappLabelsOrder.value,
) => {
  const seen = new Set()
  const list = []

  const pushLabel = (rawId) => {
    const id = String(rawId || '').trim()
    if (!id || seen.has(id)) return
    const entry = findLabelEntryById(labelById, id)
    if (!entry) return
    const canonicalId = String(entry.labelid || id).trim()
    if (seen.has(canonicalId)) return
    seen.add(canonicalId)
    list.push({
      id: canonicalId,
      labelid: canonicalId,
      name: String(entry.name || '').trim() || `Etiqueta ${canonicalId}`,
      colorHex: resolveLabelColorHex(entry),
      color: resolveLabelColorIndex(entry),
      sortOrder: Number(entry.sortOrder),
    })
  }

  for (const id of Array.isArray(order) ? order : []) {
    pushLabel(id)
  }

  for (const entry of Object.values(labelById || {})) {
    pushLabel(entry?.labelid || entry?.id)
  }

  return list.sort(compareLabelsLikeWhatsapp)
}

export const countChatsWithLabel = (chats = [], labelId = '') => {
  const target = normalizeSingleChatLabelId(labelId)
  if (!target) return 0
  return filterChatsByLabel(chats, labelId).length
}

export const chatHasLabel = (chat = {}, labelId = '') => {
  const target = normalizeSingleChatLabelId(labelId)
  if (!target) return false
  const ids = chat?.labelIds?.length
    ? chat.labelIds
    : normalizeChatLabelIds(chat?.wa_label)
  return ids.some((id) => {
    const normalized = normalizeSingleChatLabelId(id)
    return normalized === target || String(id).trim() === target
  })
}

export const filterChatsByLabel = (chats = [], labelId = '') => {
  const target = normalizeSingleChatLabelId(labelId)
  if (!target) return []
  return (Array.isArray(chats) ? chats : []).filter((chat) => chatHasLabel(chat, target))
}

export const buildLabelsSidebarItems = (chats = [], labelById = whatsappLabelsById.value) =>
  listUniqueWhatsappLabels(labelById, whatsappLabelsOrder.value).map((label) => ({
    ...label,
    conversationCount: countChatsWithLabel(chats, label.id),
  }))

export const openLabelsManagePanel = async ({ reload = false } = {}) => {
  labelsSidebarOpen.value = true
  const cacheEmpty = !Object.keys(whatsappLabelsById.value || {}).length
  const shouldSync = reload || cacheEmpty
  if (shouldSync) labelsLastFingerprint = ''
  if (shouldSync) {
    await loadWhatsappLabels({
      showLoading: true,
      refresh: true,
      force: true,
    })
  }
}

export const closeLabelsSidebar = () => {
  labelsSidebarOpen.value = false
  activeLabelView.value = null
  labelChatSelection.value = []
  labelAssignPickerOpen.value = false
}

export const openLabelChatsView = (label = null) => {
  const id = String(label?.id || label?.labelid || '').trim()
  if (!id) return
  activeLabelView.value = {
    id,
    labelid: String(label?.labelid || id).trim(),
    name: String(label?.name || '').trim() || `Etiqueta ${id}`,
    colorHex: resolveLabelColorHex(label),
  }
  labelChatSelection.value = []
  labelAssignPickerOpen.value = false
}

export const closeLabelChatsView = () => {
  activeLabelView.value = null
  labelChatSelection.value = []
  labelAssignPickerOpen.value = false
}

const postLabelEdit = async (payload = {}) => {
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')

  labelsSaving.value = true
  try {
    const proxyBase = getProxyBase()
    const res = await fetch(`${proxyBase}/label/edit`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.message || data?.error || data?.response || 'Falha ao salvar etiqueta')
    }
    await loadWhatsappLabels({ showLoading: false, refresh: true, force: true })
    return data
  } finally {
    labelsSaving.value = false
  }
}

export const saveWhatsappLabel = async ({ labelid, name, color }) => {
  const safeName = String(name || '').trim()
  if (!safeName) throw new Error('Informe o nome da etiqueta')
  const safeId = String(labelid || 'new').trim() || 'new'
  const colorNum = Number.parseInt(String(color), 10)
  const safeColor = Number.isFinite(colorNum)
    ? Math.max(0, Math.min(WA_LABEL_COLOR_HEX.length - 1, colorNum))
    : resolveLabelColorIndex({ color })
  return postLabelEdit({
    labelid: safeId,
    name: safeName,
    color: safeColor,
    delete: false,
  })
}

export const deleteWhatsappLabel = async (label) => {
  const safeId = String(label?.labelid || label?.id || '').trim()
  if (!safeId) throw new Error('Etiqueta inválida')
  return postLabelEdit({
    labelid: safeId,
    name: String(label?.name || '').trim(),
    color: resolveLabelColorIndex(label),
    delete: true,
  })
}

export const clearWhatsappLabelsCache = () => {
  whatsappLabelsById.value = {}
  whatsappLabelsOrder.value = []
  labelsLastFingerprint = ''
  labelsLastBackgroundLoadAt = 0
  labelsSidebarOpen.value = false
  activeLabelView.value = null
  labelChatSelection.value = []
  labelAssignPickerOpen.value = false
}

export const resolveChatLabelViews = (chat = {}, labelById = whatsappLabelsById.value) => {
  const ids = chat.labelIds?.length
    ? chat.labelIds
    : normalizeChatLabelIds(chat.wa_label)

  return ids.map((id) => {
    const meta = findLabelMeta(id, chat, labelById)
    return {
      id,
      name: meta.name || `Etiqueta ${id}`,
      colorHex: resolveLabelColorHex(meta),
    }
  })
}

export function useWhatsappLabels() {
  return {
    whatsappLabelsById,
    whatsappLabelsOrder,
    labelsSidebarOpen,
    activeLabelView,
    labelChatSelection,
    labelAssignPickerOpen,
    labelsLoading,
    labelsSaving,
    loadWhatsappLabels,
    refreshWhatsappLabelsFromApi,
    openLabelsManagePanel,
    closeLabelsSidebar,
    openLabelChatsView,
    closeLabelChatsView,
    saveWhatsappLabel,
    deleteWhatsappLabel,
    buildLabelsSidebarItems,
    filterChatsByLabel,
    chatHasLabel,
    listUniqueWhatsappLabels,
    formatLabelConversationCount,
    clearWhatsappLabelsCache,
    normalizeChatLabelIds,
    resolveChatLabelViews,
    resolveLabelColorHex,
    resolveLabelColorIndex,
    WA_LABEL_COLOR_HEX,
  }
}
