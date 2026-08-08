/**
 * useWhatsappContactPanel
 * Estado e funções do painel lateral de contato: info, mídias, bloquear/desbloquear.
 * Extrai ~230 linhas do monolito chat.vue.
 */
import { ref } from 'vue'
import { selectedChat, chats, chatActionFeedback } from './useWhatsappState.js'
import { renderedMessages } from './useWhatsappMessages.js'
import { preloadMessageMediaIfNeeded } from './useWhatsappMessages.js'
import { selectChat, loadChats } from './useWhatsappChats.js'
import { fetchContactChatDetails } from './useWhatsappChatDetails.js'
import {
  requestToggleBlockDialog,
  executeBlockContact,
  executeUnblockContact,
  undoBlockContact,
  openUnblockContactDialog,
} from './useWhatsappBlockContact.js'
import { deleteChatFromList } from './useWhatsappChatListActions.js'
import { openBusinessProfile } from './useWhatsappBusinessProfile.js'
import {
  normalizeJid,
  formatJidAsPhoneLine,
} from './useWhatsappUtils.js'
import {
  groupMutedChats,
  groupFavoriteChats,
  groupMediaActiveTab,
  closeGroupInfoModal,
} from './useWhatsappGroupPanel.js'

// ─── Estado do painel de contato ──────────────────────────────────────────────
export const contactInfoModalOpen = ref(false)
export const contactSidePanelView = ref('contact')
export const contactInfoLoading = ref(false)
export const contactInfoError = ref('')
export const contactInfoDetails = ref(null)

// ─── Helpers internos ─────────────────────────────────────────────────────────

const resolveSelectedChatJid = () =>
  String(selectedChat.value?.chatJid || selectedChat.value?.wa_chatid || selectedChat.value?.chatid || '').trim()

// ─── Navegar para chat por JID (compartilhado com contactInfoOpenGroup) ────────

export const openChatByJid = async (rawJid, fallback = {}) => {
  const jid = normalizeJid(String(rawJid || '').trim())
  if (!jid) return
  const existing = (Array.isArray(chats.value) ? chats.value : []).find(
    (chat) => normalizeJid(chat?.chatJid || '') === jid
  )
  if (existing) {
    await selectChat(existing)
    return
  }
  await selectChat({
    id: jid,
    chatJid: jid,
    name: String(fallback.name || formatJidAsPhoneLine(jid) || 'Contato').trim(),
    pushName: String(fallback.name || formatJidAsPhoneLine(jid) || 'Contato').trim(),
    avatarUrl: '',
    isGroup: Boolean(fallback.isGroup ?? jid.endsWith('@g.us')),
    lastMessage: '',
    lastMessageTime: Date.now(),
    unreadCount: 0,
  })
}

// ─── Fechar painel ────────────────────────────────────────────────────────────

export const closeContactInfoModal = () => {
  contactInfoModalOpen.value = false
  contactSidePanelView.value = 'contact'
  contactInfoLoading.value = false
  contactInfoError.value = ''
}

export const handleContactMediaPanelBack = () => {
  contactSidePanelView.value = 'contact'
}

// ─── Aplicar detalhes ao chat ──────────────────────────────────────────────────

const applyContactDetailsToChat = (details) => {
  if (!details || !selectedChat.value?.chatJid) return
  const jid = String(selectedChat.value.chatJid)
  if (details.avatarUrl) {
    selectedChat.value.avatarUrl = details.avatarUrl
    chats.value = chats.value.map((chat) => (
      chat.chatJid === jid
        ? {
          ...chat,
          avatarUrl: details.avatarUrl,
          name: details.displayName || chat.name,
          pushName: details.waName || chat.pushName
        }
        : chat
    ))
  }
}

const syncContactInfoBlockedState = (blocked) => {
  if (!contactInfoDetails.value) return
  contactInfoDetails.value = { ...contactInfoDetails.value, isBlocked: blocked }
}

// ─── Abrir painel de contato ──────────────────────────────────────────────────

export const openContactInfoModal = async () => {
  const jid = resolveSelectedChatJid()
  if (!jid) return
  closeGroupInfoModal()
  contactSidePanelView.value = 'contact'
  contactInfoModalOpen.value = true
  contactInfoLoading.value = true
  contactInfoError.value = ''
  try {
    const details = await fetchContactChatDetails(jid, {
      preview: false,
      force: true
    })
    contactInfoDetails.value = details
    applyContactDetailsToChat(details)
    void preloadMessageMediaIfNeeded(renderedMessages.value)
  } catch (error) {
    contactInfoError.value = String(error?.message || 'Falha ao carregar detalhes do contato')
  } finally {
    contactInfoLoading.value = false
  }
}

// ─── Handlers de mídia ────────────────────────────────────────────────────────

export const handleContactInfoMediaDocs = () => {
  groupMediaActiveTab.value = 'media'
  contactSidePanelView.value = 'media'
  void preloadMessageMediaIfNeeded(renderedMessages.value)
}

// ─── Handlers de info ─────────────────────────────────────────────────────────

export const handleContactInfoSearch = () => {
  chatActionFeedback.value = 'Busca na conversa será disponibilizada em breve.'
}

export const handleContactInfoStarredMessages = () => {
  chatActionFeedback.value = 'Mensagens favoritas será disponibilizado em breve.'
}

export const handleContactInfoEditNotes = () => {
  const notes = String(contactInfoDetails.value?.waNotes || contactInfoDetails.value?.lead?.notes || '').trim()
  chatActionFeedback.value = notes
    ? `Notas: ${notes}`
    : 'Edição de notas será disponibilizada em breve.'
}

export const handleContactInfoClearChat = () => {
  chatActionFeedback.value = 'Limpar conversa será disponibilizado em breve.'
}

export const handleContactInfoReport = () => {
  chatActionFeedback.value = 'Denúncia será disponibilizada em breve.'
}

// ─── Mute / favorito ──────────────────────────────────────────────────────────

export const handleContactInfoToggleMute = () => {
  const chatJid = String(selectedChat.value?.chatJid || '').trim()
  if (!chatJid) return
  const current = Boolean(groupMutedChats.value[chatJid]) || Boolean(selectedChat.value?.isMuted)
  const next = !current
  groupMutedChats.value = { ...groupMutedChats.value, [chatJid]: next }
}

export const handleContactInfoToggleFavorite = () => {
  const chatJid = String(selectedChat.value?.chatJid || '').trim()
  if (!chatJid) return
  const current = Boolean(groupFavoriteChats.value[chatJid])
  groupFavoriteChats.value = { ...groupFavoriteChats.value, [chatJid]: !current }
}

// ─── Bloquear / desbloquear ───────────────────────────────────────────────────

export const handleContactInfoToggleBlock = () => {
  if (!selectedChat.value) return
  requestToggleBlockDialog(selectedChat.value)
}

export const handleConfirmBlockContact = async (report) => {
  const ok = await executeBlockContact({ report: Boolean(report) })
  if (ok) syncContactInfoBlockedState(true)
}

export const handleConfirmUnblockContact = async () => {
  const ok = await executeUnblockContact()
  if (ok) syncContactInfoBlockedState(false)
}

export const handleUndoBlockContact = async () => {
  await undoBlockContact()
  syncContactInfoBlockedState(false)
}

export const handleBlockedFooterUnblock = () => {
  if (!selectedChat.value) return
  openUnblockContactDialog(selectedChat.value)
}

// ─── Excluir chat ─────────────────────────────────────────────────────────────

export const handleContactInfoDeleteChat = () => {
  if (!selectedChat.value) return
  void deleteChatFromList(selectedChat.value)
}

export const handleBlockedFooterDeleteChat = () => {
  if (!selectedChat.value) return
  void deleteChatFromList(selectedChat.value)
}

// ─── Perfil comercial ─────────────────────────────────────────────────────────

export const handleContactInfoBusinessProfile = async () => {
  if (!selectedChat.value) return
  await openBusinessProfile(selectedChat.value)
}

// ─── Abrir grupo relacionado ──────────────────────────────────────────────────

export const handleContactInfoOpenGroup = (group) => {
  const jid = String(group?.jid || '').trim()
  if (!jid) return
  closeContactInfoModal()
  void openChatByJid(jid, { name: String(group?.name || 'Grupo').trim(), isGroup: true })
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useWhatsappContactPanel() {
  return {
    // estado
    contactInfoModalOpen,
    contactSidePanelView,
    contactInfoLoading,
    contactInfoError,
    contactInfoDetails,
    // funções
    openContactInfoModal,
    closeContactInfoModal,
    handleContactMediaPanelBack,
    handleContactInfoMediaDocs,
    handleContactInfoSearch,
    handleContactInfoStarredMessages,
    handleContactInfoEditNotes,
    handleContactInfoClearChat,
    handleContactInfoReport,
    handleContactInfoToggleMute,
    handleContactInfoToggleFavorite,
    handleContactInfoToggleBlock,
    handleConfirmBlockContact,
    handleConfirmUnblockContact,
    handleUndoBlockContact,
    handleBlockedFooterUnblock,
    handleContactInfoDeleteChat,
    handleBlockedFooterDeleteChat,
    handleContactInfoOpenGroup,
    openChatByJid,
  }
}
