/**
 * Bloqueio / desbloqueio de contatos (estilo WhatsApp Web).
 */
import { ref } from 'vue'
import { refreshChatPreview } from './useWhatsappChats.js'
import { showChatFeedback } from './useWhatsappState.js'
import { normalizeJid, parseJsonBodySafe } from './useWhatsappUtils.js'
import { getProxyBase, whatsappJsonHeaders } from './useWhatsappApi.js'

export const blockConfirmOpen = ref(false)
export const unblockConfirmOpen = ref(false)
export const blockDialogTarget = ref(null)
export const blockActionLoading = ref(false)
export const blockContactSnackbar = ref(null)

let blockSnackbarTimer = null

export const resolveChatDisplayName = (chat = {}) =>
  String(
    chat?.pushName ||
    chat?.name ||
    chat?.wa_contactName ||
    chat?.wa_name ||
    'Contato'
  ).trim() || 'Contato'

export const isPrivateChatBlocked = (chat = {}) => {
  const jid = normalizeJid(chat?.chatJid || '')
  if (!jid || jid.endsWith('@g.us')) return false
  return Boolean(chat?.isBlocked || chat?.wa_isBlocked)
}

const clearBlockSnackbarTimer = () => {
  if (blockSnackbarTimer) {
    clearTimeout(blockSnackbarTimer)
    blockSnackbarTimer = null
  }
}

export const dismissBlockContactSnackbar = () => {
  clearBlockSnackbarTimer()
  blockContactSnackbar.value = null
}

const showBlockContactSnackbar = (displayName, chatJid) => {
  clearBlockSnackbarTimer()
  blockContactSnackbar.value = { displayName, chatJid }
  blockSnackbarTimer = setTimeout(() => {
    blockContactSnackbar.value = null
    blockSnackbarTimer = null
  }, 8000)
}

export const closeBlockConfirmDialog = () => {
  blockConfirmOpen.value = false
  if (!unblockConfirmOpen.value) blockDialogTarget.value = null
}

export const closeUnblockConfirmDialog = () => {
  unblockConfirmOpen.value = false
  if (!blockConfirmOpen.value) blockDialogTarget.value = null
}

export const openBlockContactDialog = (chat) => {
  const chatJid = normalizeJid(chat?.chatJid || '')
  if (!chatJid || chatJid.endsWith('@g.us')) return
  blockDialogTarget.value = chat
  unblockConfirmOpen.value = false
  blockConfirmOpen.value = true
}

export const openUnblockContactDialog = (chat) => {
  const chatJid = normalizeJid(chat?.chatJid || '')
  if (!chatJid || chatJid.endsWith('@g.us')) return
  blockDialogTarget.value = chat
  blockConfirmOpen.value = false
  unblockConfirmOpen.value = true
}

export const requestToggleBlockDialog = (chat) => {
  if (isPrivateChatBlocked(chat)) openUnblockContactDialog(chat)
  else openBlockContactDialog(chat)
}

const postBlockAction = async (chatJid, block) => {
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/chat/block`, {
    method: 'POST',
    headers: whatsappJsonHeaders(),
    body: JSON.stringify({ number: chatJid, block }),
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao alterar bloqueio')
  return data
}

const applyBlockedState = (chatJid, blocked) => {
  refreshChatPreview(chatJid, { isBlocked: blocked, wa_isBlocked: blocked })
}

export const executeBlockContact = async ({ report = false } = {}) => {
  const chat = blockDialogTarget.value
  const chatJid = normalizeJid(chat?.chatJid || '')
  if (!chatJid) return false

  blockActionLoading.value = true
  applyBlockedState(chatJid, true)
  try {
    await postBlockAction(chatJid, true)
    closeBlockConfirmDialog()
    showBlockContactSnackbar(resolveChatDisplayName(chat), chatJid)
    if (report) showChatFeedback('Denúncia registrada. O bloqueio foi aplicado.')
    return true
  } catch (error) {
    applyBlockedState(chatJid, false)
    showChatFeedback(error instanceof Error ? error.message : 'Não foi possível bloquear o contato')
    return false
  } finally {
    blockActionLoading.value = false
  }
}

export const executeUnblockContact = async ({ dismissSnackbar = true } = {}) => {
  const chat = blockDialogTarget.value
  const chatJid = normalizeJid(chat?.chatJid || '')
  if (!chatJid) return false

  blockActionLoading.value = true
  applyBlockedState(chatJid, false)
  try {
    await postBlockAction(chatJid, false)
    closeUnblockConfirmDialog()
    if (dismissSnackbar) dismissBlockContactSnackbar()
    return true
  } catch (error) {
    applyBlockedState(chatJid, true)
    showChatFeedback(error instanceof Error ? error.message : 'Não foi possível desbloquear o contato')
    return false
  } finally {
    blockActionLoading.value = false
  }
}

export const undoBlockContact = async () => {
  const snack = blockContactSnackbar.value
  if (!snack?.chatJid) return
  blockDialogTarget.value = { chatJid: snack.chatJid, pushName: snack.displayName, name: snack.displayName }
  dismissBlockContactSnackbar()
  await executeUnblockContact({ dismissSnackbar: false })
  blockDialogTarget.value = null
}
