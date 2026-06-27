/**
 * Conversas filtradas por etiqueta — seleção em lote e add/remove via UAZAPI.
 */
import {
  activeLabelView,
  labelChatSelection,
  labelAssignPickerOpen,
  labelBulkSaving,
  normalizeChatLabelIds,
  normalizeSingleChatLabelId,
  chatHasLabel,
  listUniqueWhatsappLabels,
  whatsappLabelsById,
} from './useWhatsappLabels.js'
import { canonicalChatListKey, refreshChatPreview, syncSelectedChatAfterChatsMutation } from './useWhatsappChats.js'
import { normalizeJid, parseJsonBodySafe } from './useWhatsappUtils.js'
import { getAuthToken, getProxyBase } from './useWhatsappApi.js'

export const resolveChatLabelsApiNumber = (chat = {}) => {
  const jid = normalizeJid(chat?.chatJid || chat?.wa_chatid || chat?.chatid || chat?.id || '')
  if (!jid) return ''
  if (jid.endsWith('@g.us')) return jid
  const digits = (jid.split('@')[0] || '').replace(/\D/g, '')
  return digits || jid
}

const resolveChatSelectionKey = (chat = {}) => canonicalChatListKey(chat) || String(chat?.id || '').trim()

export const isLabelChatSelected = (chat = {}) => {
  const key = resolveChatSelectionKey(chat)
  if (!key) return false
  return labelChatSelection.value.includes(key)
}

export const toggleLabelChatSelection = (chat = {}) => {
  const key = resolveChatSelectionKey(chat)
  if (!key) return
  const current = Array.isArray(labelChatSelection.value) ? [...labelChatSelection.value] : []
  const index = current.indexOf(key)
  if (index >= 0) current.splice(index, 1)
  else current.push(key)
  labelChatSelection.value = current
}

export const clearLabelChatSelection = () => {
  labelChatSelection.value = []
}

const buildNextChatLabelIds = (chat = {}, { addLabelId, removeLabelId } = {}) => {
  const current = chat?.labelIds?.length
    ? [...chat.labelIds]
    : normalizeChatLabelIds(chat?.wa_label)

  let next = current.map((id) => String(id).trim()).filter(Boolean)

  const removeTarget = normalizeSingleChatLabelId(removeLabelId)
  if (removeTarget) {
    next = next.filter((id) => {
      const normalized = normalizeSingleChatLabelId(id)
      return normalized !== removeTarget && String(id).trim() !== removeTarget
    })
  }

  const addTarget = normalizeSingleChatLabelId(addLabelId)
  if (addTarget) {
    const alreadyHas = next.some((id) => {
      const normalized = normalizeSingleChatLabelId(id)
      return normalized === addTarget || String(id).trim() === addTarget
    })
    if (!alreadyHas) next.push(addTarget)
  }

  return next
}

const postChatLabelChange = async (chat = {}, { addLabelId, removeLabelId } = {}) => {
  const number = resolveChatLabelsApiNumber(chat)
  if (!number) throw new Error('Conversa inválida')

  const body = { number }
  const addTarget = normalizeSingleChatLabelId(addLabelId)
  const removeTarget = normalizeSingleChatLabelId(removeLabelId)
  if (addTarget) body.add_labelid = addTarget
  if (removeTarget) body.remove_labelid = removeTarget
  if (!body.add_labelid && !body.remove_labelid) return null

  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/chat/labels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) {
    throw new Error(data?.message || data?.error || data?.response || 'Falha ao atualizar etiquetas da conversa')
  }
  return data
}

const applyChatLabelChangeLocal = (chat = {}, { addLabelId, removeLabelId } = {}) => {
  const chatJid = normalizeJid(chat?.chatJid || chat?.wa_chatid || chat?.chatid || '')
  if (!chatJid) return
  const nextIds = buildNextChatLabelIds(chat, { addLabelId, removeLabelId })
  refreshChatPreview(chatJid, {
    wa_label: nextIds,
    labelIds: nextIds,
    preserveSortOrder: true,
  })
  syncSelectedChatAfterChatsMutation()
}

export const applyChatLabelChange = async (chat = {}, options = {}) => {
  await postChatLabelChange(chat, options)
  applyChatLabelChangeLocal(chat, options)
}

const resolveSelectedChats = (allChats = []) => {
  const keys = new Set(labelChatSelection.value || [])
  if (!keys.size) return []
  return (Array.isArray(allChats) ? allChats : []).filter((chat) => keys.has(resolveChatSelectionKey(chat)))
}

export const bulkRemoveActiveLabelFromSelection = async (allChats = []) => {
  const labelId = String(activeLabelView.value?.id || '').trim()
  if (!labelId) throw new Error('Etiqueta inválida')
  const targets = resolveSelectedChats(allChats)
  if (!targets.length) return 0

  labelBulkSaving.value = true
  try {
    for (const chat of targets) {
      if (!chatHasLabel(chat, labelId)) continue
      await applyChatLabelChange(chat, { removeLabelId: labelId })
    }
    clearLabelChatSelection()
    return targets.length
  } finally {
    labelBulkSaving.value = false
  }
}

export const bulkAddLabelToSelection = async (allChats = [], labelId = '') => {
  const safeLabelId = normalizeSingleChatLabelId(labelId)
  if (!safeLabelId) throw new Error('Etiqueta inválida')
  const targets = resolveSelectedChats(allChats)
  if (!targets.length) return 0

  labelBulkSaving.value = true
  try {
    for (const chat of targets) {
      if (chatHasLabel(chat, safeLabelId)) continue
      await applyChatLabelChange(chat, { addLabelId: safeLabelId })
    }
    labelAssignPickerOpen.value = false
    clearLabelChatSelection()
    return targets.length
  } finally {
    labelBulkSaving.value = false
  }
}

export const openLabelAssignPicker = () => {
  if (!labelChatSelection.value?.length) return
  labelAssignPickerOpen.value = true
}

export const closeLabelAssignPicker = () => {
  labelAssignPickerOpen.value = false
}

export const listAssignableWhatsappLabels = () =>
  listUniqueWhatsappLabels(whatsappLabelsById.value)

export { labelBulkSaving } from './useWhatsappLabels.js'

export function useWhatsappLabelChats() {
  return {
    activeLabelView,
    labelChatSelection,
    labelAssignPickerOpen,
    labelBulkSaving,
    isLabelChatSelected,
    toggleLabelChatSelection,
    clearLabelChatSelection,
    bulkRemoveActiveLabelFromSelection,
    bulkAddLabelToSelection,
    openLabelAssignPicker,
    closeLabelAssignPicker,
    listAssignableWhatsappLabels,
    resolveChatLabelsApiNumber,
  }
}
