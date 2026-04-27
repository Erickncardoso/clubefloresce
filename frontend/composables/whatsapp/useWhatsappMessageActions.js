/**
 * useWhatsappMessageActions
 * Menu de ações de mensagens: reações, resposta, cópia, deleção, layout do painel flutuante.
 */
import { computed, nextTick } from 'vue'
import {
  actionMenuMessageId, messageActionsCoords, replyingTo, reactionsDetailMessage,
  reactionsDetailTab, optimisticReactionsByNormalizedId, chatActionFeedback,
  chatBodyRef, messageInputRef, selectedChat, messages
} from './useWhatsappState.js'
import { strTrim, normalizeJid, normalizeProviderMessageId, formatJidAsPhoneLine } from './useWhatsappUtils.js'
import { getAuthToken, getProxyBase } from './useWhatsappApi.js'
import { parseJsonBodySafe } from './useWhatsappUtils.js'
import { resolveSenderName, getMessageSenderJid } from './useWhatsappContacts.js'
import { renderedMessages, extractUazapiJpegThumbDataUrl } from './useWhatsappMessages.js'
import { refreshSelectedChatMessages } from './useWhatsappChats.js'

// ─── Constantes de layout ─────────────────────────────────────────────────────
const MESSAGE_ACTIONS_GAP = 10
const MESSAGE_ACTIONS_SIDE_PUSH = 18
const MESSAGE_REACTION_BAR_EXTRA_W = 40
const MESSAGE_ACTIONS_MENU_W = 256
const MESSAGE_ACTIONS_TOP_SAFE = 78
const REACTION_MENU_STACK_GAP = 6
const REACTION_OVERLAP_BUBBLE_TOP = 4

export const messageQuickReactions = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🙏'])

let chatActionFeedbackTimer = null
const touchMenuState = { timer: null, startX: 0, startY: 0, moved: false }
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_PX = 12

// ─── Feedback toast ───────────────────────────────────────────────────────────

export const showChatFeedback = (message) => {
  chatActionFeedback.value = message
  if (chatActionFeedbackTimer) clearTimeout(chatActionFeedbackTimer)
  chatActionFeedbackTimer = setTimeout(() => { chatActionFeedback.value = ''; chatActionFeedbackTimer = null }, 3200)
}

// ─── Layout do painel flutuante ───────────────────────────────────────────────

const escapeMessageActionsAnchor = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

export const messageActionsPreHostStyle = Object.freeze({ position: 'fixed', right: '-12000px', top: '0', visibility: 'hidden', pointerEvents: 'none', zIndex: 10040 })
export const messageActionsPreReactionStyle = Object.freeze({ width: '100%', visibility: 'hidden', pointerEvents: 'none' })
export const messageActionsPreMenuStyle = Object.freeze({ width: '100%', maxHeight: '0', overflow: 'hidden', visibility: 'hidden' })

export const layoutMessageActionsPanel = () => {
  const id = actionMenuMessageId.value
  if (!id || typeof document === 'undefined') { messageActionsCoords.value = null; return }
  const wrap = document.querySelector(`[data-message-actions-anchor="${escapeMessageActionsAnchor(id)}"]`)
  const bubble = wrap?.querySelector('.message-bubble')
  const menuPanelEl = document.querySelector('.message-actions-floater-host .message-actions-menu-panel')
  if (!wrap || !bubble) { messageActionsCoords.value = null; return }

  const rect = bubble.getBoundingClientRect()
  const isOutgoing = wrap.classList.contains('message-out')
  const vw = window.innerWidth, vh = window.innerHeight
  const menuW = Math.min(MESSAGE_ACTIONS_MENU_W, vw - MESSAGE_ACTIONS_GAP * 2)
  const reactionBarExtra = Math.min(MESSAGE_REACTION_BAR_EXTRA_W, Math.max(0, vw - MESSAGE_ACTIONS_GAP * 2 - menuW - 8))
  const reactionBarW = isOutgoing ? menuW : menuW + reactionBarExtra
  const hostW = reactionBarW

  let stackRight = isOutgoing ? rect.right + MESSAGE_ACTIONS_SIDE_PUSH : rect.right + MESSAGE_ACTIONS_GAP + MESSAGE_ACTIONS_SIDE_PUSH
  stackRight = Math.max(MESSAGE_ACTIONS_GAP + hostW, Math.min(stackRight, vw - MESSAGE_ACTIONS_GAP))
  const rightPx = vw - stackRight

  const reactionEl = document.querySelector('.message-actions-floater-host .message-reaction-bar--floater')
  let hostTop, reactionStyle
  if (isOutgoing) {
    hostTop = Math.max(MESSAGE_ACTIONS_TOP_SAFE, rect.top)
    reactionStyle = { display: 'none' }
  } else {
    let hr = reactionEl?.offsetHeight || 46
    if (hr < 22) hr = 46
    hostTop = Math.max(MESSAGE_ACTIONS_TOP_SAFE, rect.top + REACTION_OVERLAP_BUBBLE_TOP - hr)
    reactionStyle = { width: '100%', boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 10px', visibility: 'visible', pointerEvents: 'auto', flexShrink: 0, alignSelf: 'stretch' }
  }

  const reactionStackH = isOutgoing ? 0 : (reactionEl?.offsetHeight || 46) + REACTION_MENU_STACK_GAP
  let menuMaxH = Math.max(160, vh - hostTop - reactionStackH - MESSAGE_ACTIONS_GAP - 10)
  if (menuPanelEl) {
    const mh = menuPanelEl.getBoundingClientRect().height
    const totalH = reactionStackH + mh
    if (totalH > 40 && hostTop + totalH > vh - MESSAGE_ACTIONS_GAP) {
      hostTop = Math.max(MESSAGE_ACTIONS_GAP, vh - totalH - MESSAGE_ACTIONS_GAP)
      menuMaxH = Math.max(160, vh - hostTop - reactionStackH - MESSAGE_ACTIONS_GAP - 6)
    }
  }
  menuMaxH = Math.min(520, menuMaxH)

  messageActionsCoords.value = {
    hostStyle: { position: 'fixed', right: `${rightPx}px`, left: 'auto', top: `${hostTop}px`, width: `${hostW}px`, minWidth: `${hostW}px`, maxWidth: `${hostW}px`, display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'stretch' : 'flex-end', gap: `${REACTION_MENU_STACK_GAP}px`, zIndex: 10040, visibility: 'visible', pointerEvents: 'auto', boxSizing: 'border-box' },
    reactionStyle,
    menuPanelStyle: { width: isOutgoing ? '100%' : `${menuW}px`, maxWidth: isOutgoing ? '100%' : `${menuW}px`, alignSelf: isOutgoing ? 'stretch' : 'flex-end', maxHeight: `${menuMaxH}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, boxSizing: 'border-box', visibility: 'visible', pointerEvents: 'auto' }
  }
}

export const messageActionsHostInlineStyle = computed(() => {
  if (!actionMenuMessageId.value) return {}
  const c = messageActionsCoords.value
  return c?.hostStyle ? c.hostStyle : messageActionsPreHostStyle
})

export const messageActionsReactionInlineStyle = computed(() => {
  if (!actionMenuMessageId.value) return {}
  const c = messageActionsCoords.value
  return c?.reactionStyle ? c.reactionStyle : messageActionsPreReactionStyle
})

export const messageActionsMenuInlineStyle = computed(() => {
  if (!actionMenuMessageId.value) return {}
  const c = messageActionsCoords.value
  return c?.menuPanelStyle ? c.menuPanelStyle : messageActionsPreMenuStyle
})

export const openActionMenuMessage = computed(() => {
  const id = actionMenuMessageId.value
  if (id == null || id === '') return null
  return renderedMessages.value.find((m) => m.id === id) || null
})

// ─── Computed de reações ──────────────────────────────────────────────────────

export const reactionsDetailEmojiTabs = computed(() => {
  const m = reactionsDetailMessage.value
  if (!m?.reactions?.length) return []
  const map = new Map()
  for (const r of m.reactions) map.set(r.emoji, (map.get(r.emoji) || 0) + 1)
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }))
})

export const reactionsDetailListRows = computed(() => {
  const m = reactionsDetailMessage.value
  if (!m?.reactions?.length) return []
  const tab = reactionsDetailTab.value
  return tab === 'all' ? m.reactions : m.reactions.filter((r) => r.emoji === tab)
})

// ─── Handlers de menu ─────────────────────────────────────────────────────────

export const clearTouchMenuTimer = () => {
  if (touchMenuState.timer) { clearTimeout(touchMenuState.timer); touchMenuState.timer = null }
}

export const openMessageActionMenu = (e, msg) => {
  e?.preventDefault?.()
  if (msg?.isContactShare) return
  actionMenuMessageId.value = msg.id
}

export const toggleMessageActionMenu = (e, msg) => {
  e?.stopPropagation?.()
  e?.preventDefault?.()
  if (actionMenuMessageId.value === msg.id) actionMenuMessageId.value = null
  else actionMenuMessageId.value = msg.id
}

export const onMessageTouchStart = (e, msg) => {
  if (msg.isContactShare) return
  clearTouchMenuTimer()
  touchMenuState.moved = false
  const t = e.touches?.[0]
  if (!t) return
  touchMenuState.startX = t.clientX
  touchMenuState.startY = t.clientY
  touchMenuState.timer = setTimeout(() => { if (!touchMenuState.moved) openMessageActionMenu(e, msg) }, LONG_PRESS_MS)
}

export const onMessageTouchMove = (e) => {
  const t = e.touches?.[0]
  if (!t) return
  const dx = Math.abs(t.clientX - touchMenuState.startX), dy = Math.abs(t.clientY - touchMenuState.startY)
  if (dx > LONG_PRESS_MOVE_PX || dy > LONG_PRESS_MOVE_PX) { touchMenuState.moved = true; clearTouchMenuTimer() }
}

export const onMessageTouchEnd = () => clearTouchMenuTimer()

export const onGlobalPointerDown = (e) => {
  const el = e.target
  if (reactionsDetailMessage.value) {
    if (el && typeof el.closest === 'function' && el.closest('.reactions-detail-modal')) return
    reactionsDetailMessage.value = null
  }
  if (actionMenuMessageId.value == null) return
  if (el && typeof el.closest === 'function') {
    if (el.closest('.message-bubble-wrapper.is-actions-open') || el.closest('.message-actions-floater-host')) return
  }
  actionMenuMessageId.value = null
}

export const onGlobalKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (reactionsDetailMessage.value) { reactionsDetailMessage.value = null; return }
  if (actionMenuMessageId.value) { actionMenuMessageId.value = null; return }
  if (replyingTo.value) replyingTo.value = null
}

export const onMessageActionsWindowResize = () => {
  if (actionMenuMessageId.value) layoutMessageActionsPanel()
}

export const openReactionsDetail = (msg) => {
  actionMenuMessageId.value = null
  reactionsDetailTab.value = 'all'
  reactionsDetailMessage.value = msg
}

// ─── Reações ──────────────────────────────────────────────────────────────────

const buildChatNumberForReact = () => {
  let number = normalizeJid(selectedChat.value?.chatJid || '')
  if (!number) return ''
  if (!number.includes('@')) { const digits = number.replace(/\D/g, ''); number = digits ? `${digits}@s.whatsapp.net` : '' }
  return number
}

export const sendMessageReaction = async (msg, emoji) => {
  const text = emoji === undefined || emoji === null ? '' : String(emoji)
  if (text !== '' && msg.fromMe) { showChatFeedback('Só é possível reagir a mensagens enviadas por outras pessoas'); return }
  const id = String(msg.messageid || msg.id || '').trim()
  const number = buildChatNumberForReact()
  if (!id || !number) { showChatFeedback('Chat ou ID da mensagem inválido para reagir'); return }
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/message/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ number, text, id })
    })
    const data = await parseJsonBodySafe(res)
    if (typeof data?.success === 'boolean' && data.success === false) throw new Error(data?.message || data?.error || 'Falha ao enviar reação')
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao enviar reação')
    actionMenuMessageId.value = null
    if (reactionsDetailMessage.value?.id === msg.id) reactionsDetailMessage.value = null
    const optKey = normalizeProviderMessageId(id)
    let optimisticEmoji = text, optimisticTs = Date.now()
    const rx = data && typeof data === 'object' ? data.reaction : null
    if (rx && typeof rx === 'object' && strTrim(String(rx.emoji || ''))) { optimisticEmoji = String(rx.emoji); optimisticTs = Number(rx.timestamp) || Date.now() }
    if (text !== '') {
      const extraKeys = {}
      const rid = rx?.id != null ? normalizeProviderMessageId(String(rx.id)) : ''
      if (rid && rid !== optKey) extraKeys[rid] = { emoji: optimisticEmoji, ts: optimisticTs }
      const rawTrim = String(id).trim()
      if (rawTrim && rawTrim !== optKey && rawTrim !== rid) extraKeys[rawTrim] = { emoji: optimisticEmoji, ts: optimisticTs }
      optimisticReactionsByNormalizedId.value = { ...optimisticReactionsByNormalizedId.value, ...(optKey ? { [optKey]: { emoji: optimisticEmoji, ts: optimisticTs } } : {}), ...extraKeys }
    } else {
      const next = { ...optimisticReactionsByNormalizedId.value }
      if (optKey) delete next[optKey]
      delete next[String(id).trim()]
      optimisticReactionsByNormalizedId.value = next
    }
    await refreshSelectedChatMessages()
    showChatFeedback(text === '' ? 'Reação removida' : 'Reação enviada')
  } catch (err) { console.error('Erro ao reagir', err); showChatFeedback(err instanceof Error ? err.message : 'Não foi possível reagir') }
}

export const onReactionsDetailRowClick = async (row) => {
  const target = reactionsDetailMessage.value
  if (!row.fromMe || !target || target.fromMe) return
  await sendMessageReaction(target, '')
}

export const onReactMenuItem = (msg) => {
  if (msg.fromMe) { showChatFeedback('Só é possível reagir a mensagens enviadas por outras pessoas'); return }
  showChatFeedback('Toque em um emoji acima')
}

// ─── Reply ────────────────────────────────────────────────────────────────────

export const startReplyToMessage = (msg) => {
  const raw = (msg.text || (msg.isMedia ? '[Mídia]' : '') || '').trim()
  const preview = raw.slice(0, 200) || 'Mensagem'
  const mid = msg.messageid || msg.id
  const authorLabel = msg.fromMe ? 'Você'
    : String(resolveSenderName(msg, selectedChat) || selectedChat.value?.name || selectedChat.value?.pushName || '').trim() || 'Contato'

  let kind = 'text', mediaLine = '', thumbUrl = ''
  if (msg.isMedia) {
    if (msg.mediaType === 'image') { kind = 'image'; mediaLine = 'Foto'; thumbUrl = String(msg.mediaUrl || '').trim() }
    else if (msg.mediaType === 'video') { kind = 'video'; mediaLine = 'Vídeo'; thumbUrl = extractUazapiJpegThumbDataUrl(msg.content) || String(msg.mediaUrl || '').trim() }
    else if (msg.mediaType === 'audio') { kind = 'audio'; mediaLine = 'Áudio' }
    else if (msg.mediaType === 'sticker' || String(msg.type || '').includes('sticker')) { kind = 'sticker'; mediaLine = 'Figurinha'; thumbUrl = String(msg.mediaUrl || '').trim() }
    else { kind = 'file'; mediaLine = 'Documento' }
  }

  replyingTo.value = { id: msg.id, messageid: mid, preview, authorLabel, kind, mediaLine, thumbUrl }
  actionMenuMessageId.value = null
  nextTick(() => messageInputRef.value?.focus())
}

export const clearReplyingTo = () => { replyingTo.value = null }

// ─── Copy ─────────────────────────────────────────────────────────────────────

export const copyMessagePlain = async (msg) => {
  const text = msg.text ? String(msg.text)
    : msg.mediaType === 'image' ? '[Imagem]'
    : msg.mediaType === 'video' ? '[Vídeo]'
    : msg.mediaType === 'audio' ? '[Áudio]'
    : msg.mediaType === 'document' ? '[Documento]'
    : msg.mediaType === 'sticker' ? '[Figurinha]'
    : msg.isContactShare ? (msg.sharedContact?.name || '[Contato]')
    : msg.isMedia ? '[Mídia]' : ''
  try {
    await navigator.clipboard.writeText(text)
    showChatFeedback(text ? 'Copiado' : 'Nada para copiar')
  } catch { showChatFeedback('Não foi possível copiar') }
  actionMenuMessageId.value = null
}

// ─── Delete / Edit ────────────────────────────────────────────────────────────

export const deleteThisMessageForAll = async (msg) => {
  if (typeof window !== 'undefined' && !window.confirm('Apagar esta mensagem para todos?')) return
  const id = msg.messageid || msg.id
  if (!id) return
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/message/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ id }) })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao apagar')
    actionMenuMessageId.value = null
    await refreshSelectedChatMessages()
  } catch (err) { console.error('Erro ao apagar mensagem', err); showChatFeedback('Não foi possível apagar') }
}

export const editThisMessageText = async (msg) => {
  if (typeof window === 'undefined' || !msg.text || msg.isMedia) return
  const id = msg.messageid || msg.id
  if (!id) return
  const next = window.prompt('Editar mensagem', String(msg.text))
  if (next == null) return
  const trimmed = next.trim()
  if (trimmed === String(msg.text).trim()) return
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/message/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ id, text: trimmed }) })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao editar')
    actionMenuMessageId.value = null
    await refreshSelectedChatMessages()
  } catch (err) { console.error('Erro ao editar mensagem', err); showChatFeedback('Não foi possível editar') }
}

export const pinThisMessageInChat = async (msg) => {
  const id = msg.messageid || msg.id
  if (!id) return
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/message/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ id }) })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao fixar')
    actionMenuMessageId.value = null
    await refreshSelectedChatMessages()
  } catch (err) { console.error('Erro ao fixar mensagem', err); showChatFeedback('Não foi possível fixar') }
}

export const forwardMessageStub = (msg) => { void msg; showChatFeedback('Encaminhar: em breve'); actionMenuMessageId.value = null }
export const starMessageStub = (msg) => { void msg; showChatFeedback('Favoritar: em breve'); actionMenuMessageId.value = null }

// ─── onFormattedMessageClick ──────────────────────────────────────────────────

export const onFormattedMessageClick = (event, openConversationFn) => {
  const target = event?.target
  if (!(target instanceof Element)) return
  const mentionEl = target.closest('.wa-mention')
  if (!mentionEl) return
  const mentionNumber = String(mentionEl.getAttribute('data-mention-number') || '').trim()
  if (!mentionNumber) return
  event.preventDefault()
  event.stopPropagation()
  if (openConversationFn) openConversationFn({ name: '', phone: mentionNumber })
}

// ─── Mídia ────────────────────────────────────────────────────────────────────

export const triggerFilePicker = (mediaInputRefEl, sendingVal, selectedChatVal, acceptValue = '') => {
  if (sendingVal || !selectedChatVal) return
  if (mediaInputRefEl && typeof acceptValue === 'string' && acceptValue.trim()) {
    mediaInputRefEl.accept = acceptValue.trim()
  }
  mediaInputRefEl?.click()
}

export const handleMediaSelection = async (event, options = {}) => {
  const { selectedChatVal, newMessageVal, sendingRef, refreshFn, refreshPreviewFn, selectChatFn } = options
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !selectedChatVal) return
  const isImage = file.type.startsWith('image/')
  const isAudio = file.type.startsWith('audio/')
  const isVideo = file.type.startsWith('video/')
  const isDocument = file.type.startsWith('application/') || /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv)$/i.test(String(file.name || ''))
  if (!isImage && !isAudio && !isVideo && !isDocument) return
  const proxyBase = getProxyBase()
  try {
    sendingRef.value = true
    const reader = new FileReader()
    const base64File = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    const type = isImage ? 'image' : isAudio ? 'audio' : isVideo ? 'video' : 'document'
    const res = await fetch(`${proxyBase}/send/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({
        number: selectedChatVal.chatJid,
        type,
        file: base64File,
        mimetype: file.type,
        fileName: String(file.name || '').trim(),
        text: isImage || isVideo ? (newMessageVal?.trim() || '') : ''
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao enviar mídia')
    if (refreshPreviewFn) {
      const previewLabel = isImage
        ? '📷 Imagem'
        : isAudio
          ? '🎵 Áudio'
          : isVideo
            ? '🎥 Vídeo'
            : '📄 Documento'
      refreshPreviewFn(selectedChatVal.chatJid, { lastMessage: previewLabel, lastMessageTime: Date.now() })
    }
    if (selectChatFn) await selectChatFn(selectedChatVal)
  } catch (e) { console.error('Erro ao enviar mídia', e) }
  finally { sendingRef.value = false }
}

export function useWhatsappMessageActions() {
  return {
    messageQuickReactions, showChatFeedback, layoutMessageActionsPanel,
    messageActionsHostInlineStyle, messageActionsReactionInlineStyle, messageActionsMenuInlineStyle,
    messageActionsPreHostStyle, messageActionsPreReactionStyle, messageActionsPreMenuStyle,
    openActionMenuMessage, reactionsDetailEmojiTabs, reactionsDetailListRows,
    clearTouchMenuTimer, openMessageActionMenu, toggleMessageActionMenu,
    onMessageTouchStart, onMessageTouchMove, onMessageTouchEnd,
    onGlobalPointerDown, onGlobalKeydown, onMessageActionsWindowResize,
    openReactionsDetail, sendMessageReaction, onReactionsDetailRowClick, onReactMenuItem,
    startReplyToMessage, clearReplyingTo, copyMessagePlain,
    deleteThisMessageForAll, editThisMessageText, pinThisMessageInChat,
    forwardMessageStub, starMessageStub, onFormattedMessageClick,
    triggerFilePicker, handleMediaSelection
  }
}
