/**
 * useWhatsappMessageActions
 * Menu de ações de mensagens: reações, resposta, cópia, deleção, layout do painel flutuante.
 */
import { computed, nextTick, ref } from 'vue'
import {
  actionMenuMessageId, actionMenuMode, messageActionsCoords, replyingTo, reactionsDetailMessage,
  reactionsDetailTab, optimisticReactionsByNormalizedId, optimisticPinnedByChatJid, optimisticPinTimelineByChatJid, pinnedSnapshotsByChatJid,
  chatBodyRef, messageInputRef, selectedChat, messages, showChatFeedback,
  reactionEmojiPickerOpen, reactionPickerFixedStyle, registerReactionPickerOutsideCleanup,
} from './useWhatsappState.js'
import { strTrim, normalizeJid, normalizeProviderMessageId, formatJidAsPhoneLine } from './useWhatsappUtils.js'
import { getAuthToken, getProxyBase } from './useWhatsappApi.js'
import { parseJsonBodySafe } from './useWhatsappUtils.js'
import { resolveSenderName, getMessageSenderJid } from './useWhatsappContacts.js'
import { renderedMessages, extractUazapiJpegThumbDataUrl } from './useWhatsappMessages.js'
import { refreshSelectedChatMessages, refreshChatPreviewForUserReaction, mergeIncomingWhatsappMessage } from './useWhatsappChats.js'
import { createOptimisticPinTimelineEvent } from './useWhatsappChatTimeline.js'

// ─── Constantes de layout ─────────────────────────────────────────────────────
const MESSAGE_ACTIONS_GAP = 10
const MESSAGE_REACTION_BAR_EXTRA_W = 40
const MESSAGE_ACTIONS_MENU_W = 280
const MESSAGE_ACTIONS_TOP_SAFE = 78
const REACTION_MENU_STACK_GAP = 4

export const messageQuickReactions = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🙏'])

export const messageInfoModalOpen = ref(false)
export const messageInfoTarget = ref(null)

const touchMenuState = { timer: null, startX: 0, startY: 0, moved: false }
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_PX = 12

// Re-export para consumidores que importam deste módulo
export { showChatFeedback } from './useWhatsappState.js'

// ─── Layout do painel flutuante ───────────────────────────────────────────────

const escapeMessageActionsAnchor = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const resolveChatActionsBounds = () => {
  if (typeof document === 'undefined') return null
  const chatBody = document.querySelector('.chat-body') || document.querySelector('.chat-main')
  return chatBody?.getBoundingClientRect?.() || null
}

const clampStackRight = (stackRight, hostW, chatBounds, vw) => {
  const pad = MESSAGE_ACTIONS_GAP
  const maxRight = chatBounds ? chatBounds.right - pad : vw - pad
  const minRight = chatBounds ? chatBounds.left + pad + hostW : pad + hostW
  return Math.max(minRight, Math.min(stackRight, maxRight))
}

export const messageActionsPreHostStyle = Object.freeze({ position: 'fixed', right: '-12000px', top: '0', visibility: 'hidden', pointerEvents: 'none', zIndex: 10040 })
export const messageActionsPreReactionStyle = Object.freeze({ width: '100%', visibility: 'hidden', pointerEvents: 'none' })
export const messageActionsPreMenuStyle = Object.freeze({ width: '100%', maxHeight: '0', overflow: 'hidden', visibility: 'hidden' })

const REACTION_PICKER_W = 352
const REACTION_PICKER_H = 380
const REACTION_PICKER_OPEN_GUARD_MS = 400

let reactionPickerOutsideListener = null
let reactionPickerOpenGuardUntil = 0

const detachReactionPickerOutsideListener = () => {
  if (typeof document === 'undefined' || !reactionPickerOutsideListener) return
  document.removeEventListener('pointerdown', reactionPickerOutsideListener, false)
  reactionPickerOutsideListener = null
}

const getReactionPickerPortalEl = () => {
  if (typeof document === 'undefined') return null
  return document.querySelector('[data-wa-reaction-picker-portal]')
}

const isReactionPickerMoreButton = (event) => {
  const el = event?.target
  if (el && typeof el.closest === 'function' && el.closest('[data-reaction-more-btn]')) return true
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    if (node?.dataset?.reactionMoreBtn != null) return true
    if (typeof node.closest === 'function' && node.closest('[data-reaction-more-btn]')) return true
  }
  return false
}

export const closeReactionEmojiPicker = () => {
  reactionEmojiPickerOpen.value = false
  reactionPickerFixedStyle.value = null
  reactionPickerOpenGuardUntil = 0
  detachReactionPickerOutsideListener()
}

export const openReactionEmojiPicker = (anchorEl) => {
  reactionEmojiPickerOpen.value = true
  reactionPickerOpenGuardUntil = Date.now() + REACTION_PICKER_OPEN_GUARD_MS
  nextTick(() => {
    updateReactionPickerPosition(anchorEl)
    detachReactionPickerOutsideListener()
    reactionPickerOutsideListener = (event) => {
      if (!reactionEmojiPickerOpen.value) return
      if (Date.now() < reactionPickerOpenGuardUntil) return
      if (isInsideReactionPickerPortal(event)) return
      if (isReactionPickerMoreButton(event)) return
      closeReactionEmojiPicker()
    }
    document.addEventListener('pointerdown', reactionPickerOutsideListener, false)
  })
}

export const updateReactionPickerPosition = (anchorEl) => {
  if (!anchorEl || typeof window === 'undefined') {
    reactionPickerFixedStyle.value = null
    return
  }
  const rect = anchorEl.getBoundingClientRect()
  const pickerW = Math.min(REACTION_PICKER_W, window.innerWidth - 16)
  const pickerH = Math.min(REACTION_PICKER_H, Math.floor(window.innerHeight * 0.42))
  let left = rect.right - pickerW
  left = Math.max(8, Math.min(left, window.innerWidth - pickerW - 8))
  const spaceBelow = window.innerHeight - rect.bottom - 12
  const openUp = spaceBelow < pickerH && rect.top > spaceBelow + 40
  reactionPickerFixedStyle.value = openUp
    ? {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${window.innerHeight - rect.top + 6}px`,
      width: `${pickerW}px`,
      height: `${pickerH}px`,
      '--wa-picker-h': `${pickerH}px`,
      zIndex: 10055,
    }
    : {
      position: 'fixed',
      left: `${left}px`,
      top: `${rect.bottom + 6}px`,
      width: `${pickerW}px`,
      height: `${pickerH}px`,
      '--wa-picker-h': `${pickerH}px`,
      zIndex: 10055,
    }
}

export const layoutMessageActionsPanel = () => {
  if (reactionEmojiPickerOpen.value) return
  const id = actionMenuMessageId.value
  if (!id || typeof document === 'undefined') { messageActionsCoords.value = null; return }
  const wrap = document.querySelector(`[data-message-actions-anchor="${escapeMessageActionsAnchor(id)}"]`)
  const bubble = wrap?.querySelector('.message-bubble')
  const menuPanelEl = document.querySelector('.message-actions-floater-host .message-actions-menu-panel')
  if (!wrap || !bubble) { messageActionsCoords.value = null; return }

  const rect = bubble.getBoundingClientRect()
  const isOutgoing = wrap.classList.contains('message-out')
  const reactionsOnly = actionMenuMode.value === 'reactions'
  const vw = window.innerWidth, vh = window.innerHeight
  const chatBounds = resolveChatActionsBounds()
  const chatTop = chatBounds ? chatBounds.top + MESSAGE_ACTIONS_GAP : MESSAGE_ACTIONS_TOP_SAFE
  const chatBottom = chatBounds ? chatBounds.bottom - MESSAGE_ACTIONS_GAP : vh - MESSAGE_ACTIONS_GAP
  const menuW = Math.min(
    MESSAGE_ACTIONS_MENU_W,
    (chatBounds ? chatBounds.width : vw) - MESSAGE_ACTIONS_GAP * 2,
  )
  const reactionBarExtra = Math.min(
    MESSAGE_REACTION_BAR_EXTRA_W,
    Math.max(0, (chatBounds ? chatBounds.width : vw) - MESSAGE_ACTIONS_GAP * 2 - menuW - 8),
  )
  const reactionBarW = isOutgoing ? menuW : menuW + reactionBarExtra
  const hostW = reactionsOnly ? Math.max(menuW, 280) : (isOutgoing ? menuW : reactionBarW)

  let stackRight = rect.right
  if (reactionsOnly && !isOutgoing) {
    stackRight = Math.min(rect.right, (chatBounds?.right ?? vw) - MESSAGE_ACTIONS_GAP)
  }
  stackRight = clampStackRight(stackRight, hostW, chatBounds, vw)
  if (rect.right <= (chatBounds?.right ?? vw) - MESSAGE_ACTIONS_GAP
    && rect.right >= (chatBounds?.left ?? 0) + MESSAGE_ACTIONS_GAP + hostW) {
    stackRight = rect.right
    stackRight = clampStackRight(stackRight, hostW, chatBounds, vw)
  }
  const rightPx = vw - stackRight

  const reactionEl = document.querySelector('.message-actions-floater-host .message-reaction-bar--floater')
  const reactionBarVisibleStyle = {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '6px 8px',
    visibility: 'visible',
    pointerEvents: 'auto',
    flexShrink: 0,
    alignSelf: 'stretch',
  }

  let hostTop, reactionStyle, menuPanelStyle
  if (reactionsOnly) {
    let hr = reactionEl?.offsetHeight || 44
    if (hr < 22) hr = 44
    hostTop = Math.max(chatTop, rect.top - hr - 6)
    reactionStyle = reactionBarVisibleStyle
    menuPanelStyle = { display: 'none', visibility: 'hidden', pointerEvents: 'none', maxHeight: '0', overflow: 'hidden' }
  } else {
    let hr = reactionEl?.offsetHeight || 46
    if (hr < 22) hr = 46
    hostTop = Math.max(chatTop, rect.top - hr - 4)
    reactionStyle = reactionBarVisibleStyle
  }

  const reactionStackH = (reactionEl?.offsetHeight || 44) + (reactionsOnly ? 0 : REACTION_MENU_STACK_GAP)
  let menuMaxH = reactionsOnly
    ? 0
    : Math.max(160, chatBottom - hostTop - reactionStackH - MESSAGE_ACTIONS_GAP - 6)
  if (!reactionsOnly && menuPanelEl) {
    const mh = menuPanelEl.getBoundingClientRect().height
    const totalH = reactionStackH + mh
    if (totalH > 40 && hostTop + totalH > chatBottom) {
      hostTop = Math.max(chatTop, chatBottom - totalH)
      menuMaxH = Math.max(160, chatBottom - hostTop - reactionStackH - MESSAGE_ACTIONS_GAP - 6)
    }
  }
  if (!reactionsOnly) menuMaxH = Math.min(520, menuMaxH)

  if (!reactionsOnly) {
    menuPanelStyle = {
      width: '100%',
      maxWidth: '100%',
      alignSelf: 'stretch',
      maxHeight: `${menuMaxH}px`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 auto',
      minHeight: 0,
      boxSizing: 'border-box',
      visibility: 'visible',
      pointerEvents: 'auto',
    }
  }

  messageActionsCoords.value = {
    hostStyle: {
      position: 'fixed',
      right: `${rightPx}px`,
      left: 'auto',
      top: `${hostTop}px`,
      width: `${hostW}px`,
      minWidth: `${hostW}px`,
      maxWidth: `${hostW}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: reactionsOnly ? (isOutgoing ? 'flex-end' : 'flex-end') : (isOutgoing ? 'stretch' : 'flex-end'),
      gap: `${REACTION_MENU_STACK_GAP}px`,
      zIndex: 10040,
      visibility: 'visible',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    },
    reactionStyle,
    menuPanelStyle,
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
  actionMenuMode.value = 'full'
  actionMenuMessageId.value = msg.id
}

export const toggleMessageActionMenu = (e, msg) => {
  e?.stopPropagation?.()
  e?.preventDefault?.()
  if (actionMenuMessageId.value === msg.id && actionMenuMode.value === 'full') {
    actionMenuMessageId.value = null
    actionMenuMode.value = 'full'
    return
  }
  actionMenuMode.value = 'full'
  actionMenuMessageId.value = msg.id
}

export const toggleMessageReactionMenu = (e, msg) => {
  e?.stopPropagation?.()
  e?.preventDefault?.()
  if (msg?.isContactShare) return
  if (actionMenuMessageId.value === msg.id && actionMenuMode.value === 'reactions') {
    actionMenuMessageId.value = null
    actionMenuMode.value = 'full'
    return
  }
  actionMenuMode.value = 'reactions'
  actionMenuMessageId.value = msg.id
}

export const openMessageReactionMenu = (msg) => {
  if (msg?.isContactShare) return
  actionMenuMode.value = 'reactions'
  actionMenuMessageId.value = msg.id
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

const isInsideReactionPickerPortal = (event) => {
  const portal = getReactionPickerPortalEl()
  if (portal) {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
    if (path.includes(portal)) return true
    for (const node of path) {
      if (node === portal) return true
    }
  }

  const el = event?.target
  if (el && typeof el.closest === 'function') {
    if (el.closest('[data-wa-reaction-picker-portal]')) return true
    if (el.closest('.message-reaction-picker-portal')) return true
  }
  if (portal && el && (portal === el || portal.contains(el))) return true

  const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    if (node.classList?.contains?.('message-reaction-picker-portal')) return true
    if (String(node.tagName || '').toUpperCase() === 'EM-EMOJI-PICKER') return true
    if (String(node.getAttribute?.('data-wa-reaction-picker-portal') || '') === 'true') return true
  }
  return false
}

export const isInsideAnyEmojiPicker = (event) => {
  if (isInsideReactionPickerPortal(event)) return true
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    if (node.classList?.contains?.('footer-emoji-picker-wrap')) return true
    if (String(node.tagName || '').toUpperCase() === 'EM-EMOJI-PICKER') return true
  }
  const el = event?.target
  if (el && typeof el.closest === 'function') {
    if (el.closest('.footer-emoji-picker-wrap')) return true
    if (el.closest('em-emoji-picker')) return true
  }
  return false
}

export const isInsideMessageActionsUi = (event) => {
  if (isInsideAnyEmojiPicker(event)) return true
  if (isInsideReactionPickerPortal(event)) return true
  const el = event?.target
  if (el && typeof el.closest === 'function') {
    if (
      el.closest('.message-actions-floater-host') ||
      el.closest('.message-reaction-picker-pop') ||
      el.closest('.message-bubble-wrapper.is-actions-open') ||
      el.closest('.msg-reaction-hint')
    ) return true
  }
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    const tag = String(node.tagName || '').toUpperCase()
    if (tag === 'EM-EMOJI-PICKER') return true
    if (node.classList?.contains?.('message-actions-floater-host')) return true
    if (node.classList?.contains?.('message-reaction-picker-pop')) return true
    if (node.classList?.contains?.('message-actions-floater-inner')) return true
  }
  return false
}

export const onGlobalPointerDown = (e) => {
  if (isInsideAnyEmojiPicker(e)) return
  const el = e.target
  if (reactionsDetailMessage.value) {
    if (el && typeof el.closest === 'function' && el.closest('.reactions-detail-modal')) return
    reactionsDetailMessage.value = null
  }
  if (actionMenuMessageId.value == null) return
  if (isInsideMessageActionsUi(e)) return
  if (reactionEmojiPickerOpen.value) closeReactionEmojiPicker()
  actionMenuMessageId.value = null
  actionMenuMode.value = 'full'
}

export const onGlobalKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (reactionsDetailMessage.value) { reactionsDetailMessage.value = null; return }
  if (reactionEmojiPickerOpen.value) { closeReactionEmojiPicker(); return }
  if (actionMenuMessageId.value) {
    closeReactionEmojiPicker()
    actionMenuMessageId.value = null
    actionMenuMode.value = 'full'
    return
  }
  if (replyingTo.value) replyingTo.value = null
}

export const onMessageActionsWindowResize = () => {
  if (reactionEmojiPickerOpen.value) {
    const btn = document.querySelector('[data-reaction-more-btn]')
    if (btn) updateReactionPickerPosition(btn)
    return
  }
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

const applyOptimisticReaction = (msg, id, payload) => {
  const optKey = normalizeProviderMessageId(id)
  const rawTrim = String(id).trim()
  const aliasKeys = [optKey, rawTrim, msg.normalizedMessageId, msg.normalizedInternalId, String(msg.id || '').trim()]
    .map((k) => strTrim(k))
    .filter(Boolean)
  const uniqueAliases = [...new Set(aliasKeys)]

  if (!payload || payload.removed) {
    const entry = { removed: true, ts: Date.now() }
    const patch = {}
    for (const k of uniqueAliases) patch[k] = entry
    optimisticReactionsByNormalizedId.value = { ...optimisticReactionsByNormalizedId.value, ...patch }
    return
  }

  const entry = { emoji: payload.emoji, ts: payload.ts || Date.now() }
  const patch = {}
  for (const k of uniqueAliases) patch[k] = entry
  optimisticReactionsByNormalizedId.value = { ...optimisticReactionsByNormalizedId.value, ...patch }
}

const clearOptimisticReaction = (msg, id) => {
  const optKey = normalizeProviderMessageId(id)
  const rawTrim = String(id).trim()
  const next = { ...optimisticReactionsByNormalizedId.value }
  for (const k of [optKey, rawTrim, msg.normalizedMessageId, msg.normalizedInternalId, String(msg.id || '').trim()]) {
    const key = strTrim(k)
    if (key) delete next[key]
  }
  optimisticReactionsByNormalizedId.value = next
}

const resolveReactionToggleText = (msg, emoji) => {
  const text = emoji === undefined || emoji === null ? '' : String(emoji)
  if (text === '') return ''
  const id = String(msg.messageid || msg.id || '').trim()
  const optKey = normalizeProviderMessageId(id)
  const optEntry = optKey ? optimisticReactionsByNormalizedId.value[optKey] : null
  if (optEntry?.removed) return text
  const optEmoji = strTrim(String(optEntry?.emoji || ''))
  const myRow = Array.isArray(msg.reactions) ? msg.reactions.find((r) => r.fromMe) : null
  const currentEmoji = optEmoji || strTrim(String(myRow?.emoji || ''))
  return currentEmoji === strTrim(text) ? '' : text
}

export const sendMessageReaction = async (msg, emoji) => {
  const text = resolveReactionToggleText(msg, emoji)
  if (text !== '' && msg.fromMe) { showChatFeedback('Só é possível reagir a mensagens enviadas por outras pessoas'); return }
  const id = String(msg.messageid || msg.id || '').trim()
  const number = buildChatNumberForReact()
  if (!id || !number) { showChatFeedback('Chat ou ID da mensagem inválido para reagir'); return }

  actionMenuMessageId.value = null
  actionMenuMode.value = 'full'
  if (reactionsDetailMessage.value?.id === msg.id) reactionsDetailMessage.value = null

  const previousSnap = { ...optimisticReactionsByNormalizedId.value }
  applyOptimisticReaction(msg, id, text === '' ? { removed: true } : { emoji: text, ts: Date.now() })

  if (text === '') {
    refreshChatPreviewForUserReaction(msg, '', { removed: true })
  } else {
    refreshChatPreviewForUserReaction(msg, text, { removed: false })
  }

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

    const optKey = normalizeProviderMessageId(id)
    const rx = data && typeof data === 'object' ? data.reaction : null
    if (text === '') {
      clearOptimisticReaction(msg, id)
    } else {
      let optimisticEmoji = text
      let optimisticTs = Date.now()
      if (rx && typeof rx === 'object' && strTrim(String(rx.emoji || ''))) {
        optimisticEmoji = String(rx.emoji)
        optimisticTs = Number(rx.timestamp) || Date.now()
      }
      applyOptimisticReaction(msg, id, { emoji: optimisticEmoji, ts: optimisticTs })
      const rid = rx?.id != null ? normalizeProviderMessageId(String(rx.id)) : ''
      if (rid && rid !== optKey) {
        optimisticReactionsByNormalizedId.value = {
          ...optimisticReactionsByNormalizedId.value,
          [rid]: { emoji: optimisticEmoji, ts: optimisticTs },
        }
      }
    }
    void refreshSelectedChatMessages()
  } catch (err) {
    optimisticReactionsByNormalizedId.value = previousSnap
    console.error('Erro ao reagir', err)
    showChatFeedback(err instanceof Error ? err.message : 'Não foi possível reagir')
  }
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
  const id = msg.normalizedMessageId || msg.messageid || msg.id
  if (!id) return
  const chatJid = normalizeJid(selectedChat.value?.chatJid || '')
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(`${proxyBase}/message/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ id }) })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao fixar')
    const targetId = normalizeProviderMessageId(data.targetMessageID || data.targetMessageId || id)
    const pinned = data.pinned !== false
    if (chatJid && targetId) {
      const snapshot = pinned ? { ...msg, normalizedMessageId: targetId } : null
      optimisticPinnedByChatJid.value = {
        ...optimisticPinnedByChatJid.value,
        [chatJid]: {
          messageId: targetId,
          pinned,
          snapshot,
        },
      }
      if (snapshot) {
        pinnedSnapshotsByChatJid.value = {
          ...pinnedSnapshotsByChatJid.value,
          [chatJid]: {
            ...(pinnedSnapshotsByChatJid.value[chatJid] || {}),
            [targetId]: snapshot,
          },
        }
      } else {
        const prev = { ...(pinnedSnapshotsByChatJid.value[chatJid] || {}) }
        delete prev[targetId]
        pinnedSnapshotsByChatJid.value = {
          ...pinnedSnapshotsByChatJid.value,
          [chatJid]: prev,
        }
      }
      const timelineEvent = createOptimisticPinTimelineEvent(pinned)
      optimisticPinTimelineByChatJid.value = {
        ...optimisticPinTimelineByChatJid.value,
        [chatJid]: [
          ...(Array.isArray(optimisticPinTimelineByChatJid.value[chatJid])
            ? optimisticPinTimelineByChatJid.value[chatJid]
            : []),
          timelineEvent,
        ],
      }
    }
    actionMenuMessageId.value = null
    showChatFeedback(pinned ? 'Mensagem fixada' : 'Mensagem desafixada')
    if (data && typeof data === 'object') {
      mergeIncomingWhatsappMessage(data, chatJid)
    }
    await refreshSelectedChatMessages()
    if (chatJid && !pinned) {
      const { [chatJid]: _removed, ...rest } = optimisticPinnedByChatJid.value
      optimisticPinnedByChatJid.value = rest
      const prev = { ...(pinnedSnapshotsByChatJid.value[chatJid] || {}) }
      delete prev[targetId]
      pinnedSnapshotsByChatJid.value = {
        ...pinnedSnapshotsByChatJid.value,
        [chatJid]: prev,
      }
    }
  } catch (err) { console.error('Erro ao fixar mensagem', err); showChatFeedback('Não foi possível fixar') }
}

export const forwardMessageStub = (msg) => { void msg; showChatFeedback('Encaminhar: em breve'); actionMenuMessageId.value = null }
export const starMessageStub = (msg) => { void msg; showChatFeedback('Favoritar: em breve'); actionMenuMessageId.value = null }

export const openMessageInfoModal = (msg) => {
  messageInfoTarget.value = msg || null
  messageInfoModalOpen.value = Boolean(msg)
  actionMenuMessageId.value = null
}

export const closeMessageInfoModal = () => {
  messageInfoModalOpen.value = false
  messageInfoTarget.value = null
}

export const commercialBroadcastStub = (msg) => {
  void msg
  showChatFeedback('Nova transmissão comercial: em breve')
  actionMenuMessageId.value = null
}

export const addMessageToNotesStub = (msg) => {
  void msg
  showChatFeedback('Adicionar texto às notas: em breve')
  actionMenuMessageId.value = null
}

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
    clearTouchMenuTimer, openMessageActionMenu, toggleMessageActionMenu, toggleMessageReactionMenu, openMessageReactionMenu,
    onMessageTouchStart, onMessageTouchMove, onMessageTouchEnd,
    onGlobalPointerDown, onGlobalKeydown, onMessageActionsWindowResize, isInsideMessageActionsUi, isInsideAnyEmojiPicker,
    openReactionsDetail, sendMessageReaction, onReactionsDetailRowClick, onReactMenuItem,
    startReplyToMessage, clearReplyingTo, copyMessagePlain,
    deleteThisMessageForAll, editThisMessageText, pinThisMessageInChat,
    forwardMessageStub, starMessageStub, onFormattedMessageClick,
    openMessageInfoModal, closeMessageInfoModal, messageInfoModalOpen, messageInfoTarget,
    commercialBroadcastStub, addMessageToNotesStub,
    triggerFilePicker, handleMediaSelection,
    openReactionEmojiPicker, closeReactionEmojiPicker,
  }
}

registerReactionPickerOutsideCleanup(closeReactionEmojiPicker)
