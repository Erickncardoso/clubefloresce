import { nextTick } from 'vue'
import { chatBodyRef } from './useWhatsappState.js'

const CHAT_SCROLL_BOTTOM_THRESHOLD_PX = 140
const CHAT_SCROLL_TOP_THRESHOLD_PX = 160

let lastScrollTop = 0
let userPinnedAwayFromBottom = false
let scrollListenerEl = null
let nearTopLoadTimer = null
let onNearTopLoad = null
let suppressNearTopLoadUntil = 0
let chatOpenScrollToken = 0

export const isChatBodyNearBottom = () => {
  const el = chatBodyRef.value
  if (!el) return true
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) return true
  return (maxScroll - el.scrollTop) <= CHAT_SCROLL_BOTTOM_THRESHOLD_PX
}

export const isUserPinnedAwayFromBottom = () => userPinnedAwayFromBottom

export const resetChatScrollBehavior = () => {
  userPinnedAwayFromBottom = false
  lastScrollTop = 0
}

export const suppressChatNearTopLoad = (ms = 900) => {
  suppressNearTopLoadUntil = Date.now() + Math.max(0, Number(ms) || 0)
}

const isNearTopLoadSuppressed = () => Date.now() < suppressNearTopLoadUntil

export const setChatScrollNearTopHandler = (handler) => {
  onNearTopLoad = typeof handler === 'function' ? handler : null
}

const scheduleNearTopLoad = () => {
  if (!onNearTopLoad || isNearTopLoadSuppressed()) return
  if (nearTopLoadTimer) return
  nearTopLoadTimer = window.setTimeout(() => {
    nearTopLoadTimer = null
    if (isNearTopLoadSuppressed()) return
    onNearTopLoad?.()
  }, 120)
}

const handleChatBodyScroll = () => {
  const el = chatBodyRef.value
  if (!el) return

  if (!isNearTopLoadSuppressed()) {
    if (el.scrollTop < lastScrollTop - 4) {
      userPinnedAwayFromBottom = true
    } else if (isChatBodyNearBottom()) {
      userPinnedAwayFromBottom = false
    }
  }
  lastScrollTop = el.scrollTop

  if (el.scrollTop <= CHAT_SCROLL_TOP_THRESHOLD_PX) {
    scheduleNearTopLoad()
  }
}

export const bindChatBodyScrollListeners = () => {
  const el = chatBodyRef.value
  if (!el || el === scrollListenerEl) return
  unbindChatBodyScrollListeners()
  scrollListenerEl = el
  lastScrollTop = el.scrollTop
  el.addEventListener('scroll', handleChatBodyScroll, { passive: true })
}

export const unbindChatBodyScrollListeners = () => {
  if (!scrollListenerEl) return
  scrollListenerEl.removeEventListener('scroll', handleChatBodyScroll)
  scrollListenerEl = null
  if (nearTopLoadTimer) {
    clearTimeout(nearTopLoadTimer)
    nearTopLoadTimer = null
  }
}

export const scrollToBottom = ({ resetPin = true } = {}) => {
  if (resetPin) {
    userPinnedAwayFromBottom = false
  }
  const run = () => {
    const el = chatBodyRef.value
    if (!el) return false
    el.scrollTop = el.scrollHeight
    lastScrollTop = el.scrollTop
    return (el.scrollHeight - el.clientHeight - el.scrollTop) <= 4
  }
  nextTick(() => {
    run()
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        run()
        requestAnimationFrame(run)
      })
    }
  })
}

/** Ao abrir conversa: rola até a mensagem mais recente e evita paginação antiga prematura. */
export const scrollToBottomOnChatOpen = () => {
  const token = ++chatOpenScrollToken
  suppressChatNearTopLoad(1200)
  userPinnedAwayFromBottom = false
  lastScrollTop = 0

  const attempt = (remaining = 10) => {
    if (token !== chatOpenScrollToken) return
    scrollToBottom({ resetPin: true })
    if (remaining <= 0) return

    const retry = () => {
      if (token !== chatOpenScrollToken) return
      const el = chatBodyRef.value
      if (!el) {
        if (remaining > 0) window.setTimeout(() => attempt(remaining - 1), 40)
        return
      }
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll <= 4 || (maxScroll - el.scrollTop) <= 8) return
      attempt(remaining - 1)
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(retry))
    } else {
      window.setTimeout(retry, 50)
    }
  }

  attempt()
}

export const stickChatScrollToBottomIfNeeded = () => {
  if (userPinnedAwayFromBottom) return
  if (!isChatBodyNearBottom()) return
  scrollToBottom({ resetPin: false })
}

export const captureChatScrollSnapshot = () => ({
  height: chatBodyRef.value?.scrollHeight ?? 0,
  top: chatBodyRef.value?.scrollTop ?? 0,
  nearBottom: isChatBodyNearBottom() && !userPinnedAwayFromBottom,
})

export const restoreChatScrollAfterMessagesUpdate = (snapshot, { forceBottom = false } = {}) => {
  if (!snapshot) return
  const shouldStickToBottom = forceBottom || (snapshot.nearBottom && !userPinnedAwayFromBottom)
  nextTick(() => {
    const apply = () => {
      const el = chatBodyRef.value
      if (!el) return
      if (shouldStickToBottom) {
        el.scrollTop = el.scrollHeight
        lastScrollTop = el.scrollTop
        if (forceBottom) userPinnedAwayFromBottom = false
        return
      }
      const delta = el.scrollHeight - snapshot.height
      if (delta !== 0) {
        el.scrollTop = snapshot.top + delta
        lastScrollTop = el.scrollTop
      }
    }
    apply()
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        apply()
        requestAnimationFrame(apply)
      })
    }
  })
}
