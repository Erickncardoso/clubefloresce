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
  }, 280)
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

const isDomScrollAtBottom = (el) => {
  if (!el) return false
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
  if (maxScroll <= 4) return true
  return (maxScroll - el.scrollTop) <= 12
}

/** Ao abrir conversa: rola até a mensagem mais recente e evita paginação antiga prematura. */
export const scrollToBottomOnChatOpen = () => {
  const token = ++chatOpenScrollToken
  // Janela maior: evita load-older + banner “Sincronizando” logo ao abrir o chat.
  suppressChatNearTopLoad(5000)
  userPinnedAwayFromBottom = false

  const jumpNow = () => {
    const el = chatBodyRef.value
    if (!el) return false
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTop = maxScroll
    lastScrollTop = el.scrollTop
    return isDomScrollAtBottom(el)
  }

  const attempt = (remaining = 12) => {
    if (token !== chatOpenScrollToken) return
    if (jumpNow()) return
    if (remaining <= 0) return

    const retry = () => {
      if (token !== chatOpenScrollToken) return
      if (jumpNow()) return
      attempt(remaining - 1)
    }

    nextTick(() => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => requestAnimationFrame(retry))
      } else {
        window.setTimeout(retry, 40)
      }
    })
  }

  attempt()

  // Imagens/mídia mudam a altura depois do open — segura no fundo por um tempo curto.
  if (typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined') {
    const el = chatBodyRef.value
    if (el) {
      let left = 16
      const ro = new ResizeObserver(() => {
        if (token !== chatOpenScrollToken) {
          ro.disconnect()
          return
        }
        if (userPinnedAwayFromBottom) {
          ro.disconnect()
          return
        }
        jumpNow()
        left -= 1
        if (left <= 0) ro.disconnect()
      })
      ro.observe(el)
      window.setTimeout(() => ro.disconnect(), 4500)
    }
  }
}

/** Mantém scroll no fundo até o DOM estabilizar (abertura de chat). */
export const settleChatOpenScroll = (onSettled) => {
  suppressChatNearTopLoad(5000)
  userPinnedAwayFromBottom = false
  scrollToBottomOnChatOpen()

  let attempts = 0
  const maxAttempts = 30

  const tick = () => {
    const el = chatBodyRef.value
    if (el) {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
      el.scrollTop = maxScroll
      lastScrollTop = el.scrollTop
    }

    attempts += 1
    if (!el || isDomScrollAtBottom(el) || attempts >= maxAttempts) {
      onSettled?.()
      return
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(tick))
    } else {
      window.setTimeout(tick, 32)
    }
  }

  nextTick(() => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(tick))
    } else {
      tick()
    }
  })
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
