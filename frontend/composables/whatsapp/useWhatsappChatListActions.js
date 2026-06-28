/**
 * Ações do menu de contexto da lista de conversas (estilo WhatsApp Web).
 */
import {
  chats, selectedChat, showChatFeedback,
} from './useWhatsappState.js'
import { refreshChatPreview, loadChats, canonicalChatListKey } from './useWhatsappChats.js'
import {
  archivedSidebarOpen,
  loadArchivedChats,
  removeArchivedChatFromList,
  patchArchivedChatIfPresent,
} from './useWhatsappArchivedChats.js'
import { requestToggleBlockDialog } from './useWhatsappBlockContact.js'
import { normalizeJid, parseJsonBodySafe } from './useWhatsappUtils.js'
import { getProxyBase, whatsappJsonHeaders } from './useWhatsappApi.js'
import { formatMuteEndLabel } from './useWhatsappChatDetails.js'

/** Códigos UAZAPI: 0=off, 8=8h, 168=1 semana, -1=sempre */
export const MUTE_DURATION_OPTIONS = Object.freeze([
  { code: 8, label: '8 horas' },
  { code: 168, label: '1 semana' },
  { code: -1, label: 'Sempre' },
])

export const estimateMuteEndTimestamp = (muteEndTimeCode) => {
  const code = Number(muteEndTimeCode)
  if (code === 0) return 0
  if (code === -1) return -1
  if (!Number.isFinite(code) || code <= 0) return 0
  return Date.now() + code * 3600 * 1000
}

const postChatAction = async (path, body) => {
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}${path}`, {
    method: 'POST',
    headers: whatsappJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) throw new Error(data?.message || data?.error || `Falha em ${path}`)
  return data
}

const removeChatFromList = (chatJid) => {
  const norm = normalizeJid(chatJid)
  const key = canonicalChatListKey({ chatJid: norm })
  chats.value = (chats.value || []).filter((item) => {
    if (normalizeJid(item.chatJid) === norm) return false
    if (key && canonicalChatListKey(item) === key) return false
    return true
  })
  if (selectedChat.value && (
    normalizeJid(selectedChat.value.chatJid) === norm ||
    (key && canonicalChatListKey(selectedChat.value) === key)
  )) {
    selectedChat.value = null
  }
}

export const getChatMuteSubtitle = (chat) => {
  if (!chat?.isMuted) return ''
  const end = Number(chat.muteEndTime ?? chat.wa_muteEndTime ?? 0)
  if (end === -1) return 'Silenciada sempre'
  return formatMuteEndLabel(end) || 'Silenciada'
}

export const archiveChatFromList = async (chat) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return
  const shouldArchive = !Boolean(chat?.isArchived || chat?.wa_archived)
  try {
    if (shouldArchive) {
      removeChatFromList(chatJid)
      if (archivedSidebarOpen.value) {
        void loadArchivedChats({ showLoading: false })
      }
    } else {
      refreshChatPreview(chatJid, { isArchived: false, wa_archived: false })
      removeArchivedChatFromList(chat)
    }
    await postChatAction('/chat/archive', { number: chatJid, archive: shouldArchive })
    if (shouldArchive) showChatFeedback('Conversa arquivada')
    else showChatFeedback('Conversa desarquivada')
  } catch (error) {
    console.error('Erro ao arquivar conversa', error)
    showChatFeedback('Não foi possível arquivar a conversa')
    void loadChats(false, { silent: true })
  }
}

export const setChatMuteFromList = (chat, muteEndTimeCode) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return

  const code = Number(muteEndTimeCode)
  const optimisticEnd = estimateMuteEndTimestamp(code)
  const optimisticMuted = code !== 0
  const snapshot = {
    isMuted: Boolean(chat.isMuted),
    muteEndTime: Number(chat.muteEndTime ?? chat.wa_muteEndTime ?? 0),
    wa_muteEndTime: Number(chat.wa_muteEndTime ?? chat.muteEndTime ?? 0),
  }

  refreshChatPreview(chatJid, {
    isMuted: optimisticMuted,
    muteEndTime: optimisticEnd,
    wa_muteEndTime: optimisticEnd,
  })
  patchArchivedChatIfPresent(chatJid, {
    isMuted: optimisticMuted,
    muteEndTime: optimisticEnd,
    wa_muteEndTime: optimisticEnd,
  })

  void postChatAction('/chat/mute', { number: chatJid, muteEndTime: code })
    .catch((error) => {
      console.error('Erro ao silenciar conversa', error)
      refreshChatPreview(chatJid, {
        isMuted: snapshot.isMuted,
        muteEndTime: snapshot.muteEndTime,
        wa_muteEndTime: snapshot.wa_muteEndTime,
      })
      patchArchivedChatIfPresent(chatJid, {
        isMuted: snapshot.isMuted,
        muteEndTime: snapshot.muteEndTime,
        wa_muteEndTime: snapshot.wa_muteEndTime,
      })
      showChatFeedback('Não foi possível alterar notificações')
    })
}

export const pinChatFromList = (chat) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return
  const nextPinned = !Boolean(chat?.isPinned)
  refreshChatPreview(chatJid, { isPinned: nextPinned })
  void postChatAction('/chat/pin', { number: chatJid, pin: nextPinned }).catch(() => {
    refreshChatPreview(chatJid, { isPinned: !nextPinned })
    showChatFeedback('Não foi possível fixar a conversa')
  })
}

export const markChatUnreadFromList = (chat) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return
  refreshChatPreview(chatJid, { unreadCount: 1, wa_unreadCount: 1 })
  patchArchivedChatIfPresent(chatJid, { unreadCount: 1, wa_unreadCount: 1 })
}

export const blockChatFromList = (chat) => {
  requestToggleBlockDialog(chat)
}

export const deleteChatFromList = async (chat) => {
  const chatJid = normalizeJid(chat?.chatJid)
  if (!chatJid) return
  if (typeof window !== 'undefined' && !window.confirm('Apagar esta conversa?')) return
  removeChatFromList(chatJid)
  removeArchivedChatFromList(chat)
  try {
    await postChatAction('/chat/delete', { number: chatJid })
  } catch (error) {
    console.error('Erro ao apagar conversa', error)
    showChatFeedback('Não foi possível apagar a conversa')
    void loadChats(false, { silent: true })
  }
}

export const clearChatFromList = () => {
  showChatFeedback('Limpar conversa em breve')
}

export const labelChatFromList = () => {
  showChatFeedback('Etiquetas: use o painel de etiquetas em breve')
}

export const favoriteChatFromList = () => {
  showChatFeedback('Favoritos em breve')
}

export const runChatListContextAction = (actionId, chat) => {
  if (String(actionId || '').startsWith('mute:')) {
    const code = Number(String(actionId).split(':')[1])
    return setChatMuteFromList(chat, code)
  }
  switch (actionId) {
    case 'archive': return void archiveChatFromList(chat)
    case 'unmute': return setChatMuteFromList(chat, 0)
    case 'pin': return pinChatFromList(chat)
    case 'label': return labelChatFromList()
    case 'unread': return markChatUnreadFromList(chat)
    case 'favorite': return favoriteChatFromList()
    case 'block': return blockChatFromList(chat)
    case 'clear': return clearChatFromList()
    case 'delete': return void deleteChatFromList(chat)
    default: return undefined
  }
}
