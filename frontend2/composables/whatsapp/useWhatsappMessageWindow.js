/**
 * Windowing da timeline WhatsApp — renderiza só o viewport + overscan.
 * Usa o mesmo scroll container (`chatBodyRef`) para manter load-older / stick-to-bottom.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { chatBodyRef, chatOpeningPending } from './useWhatsappState.js'
import { isChatBodyNearBottom, scrollToBottomOnChatOpen } from './useWhatsappScroll.js'

/** Abaixo disso, renderiza tudo (custo de windowing não compensa). */
export const MESSAGE_WINDOW_THRESHOLD = 80
const DEFAULT_ESTIMATE_PX = 88
const OVERSCAN_PX = 900

/**
 * @param {import('vue').Ref|import('vue').ComputedRef} itemsRef — lista completa (msgs ou entries)
 * @param {{ estimatePx?: number, threshold?: number }} [options]
 */
export function useWhatsappMessageWindow(itemsRef, options = {}) {
  const estimatePx = Math.max(40, Number(options.estimatePx) || DEFAULT_ESTIMATE_PX)
  const threshold = Math.max(20, Number(options.threshold) || MESSAGE_WINDOW_THRESHOLD)

  const scrollTop = ref(0)
  const viewportHeight = ref(600)
  /** Fundo REAL do scroll (px) — a estimativa por altura média erra com bolhas grandes. */
  const nearBottomReal = ref(true)
  let rafPending = false
  let boundEl = null
  let resizeObserver = null
  let pendingOpenScrollToBottom = false
  let openMeasureAttempts = 0

  const isOpenScrollSettling = () => pendingOpenScrollToBottom || chatOpeningPending.value

  const measure = () => {
    if (isOpenScrollSettling()) {
      nearBottomReal.value = true
      scrollToBottomOnChatOpen()
      const el = chatBodyRef.value
      if (el && isChatBodyNearBottom()) {
        pendingOpenScrollToBottom = false
        openMeasureAttempts = 0
        scrollTop.value = el.scrollTop
        viewportHeight.value = el.clientHeight || 600
        nearBottomReal.value = true
        return
      }
      if (openMeasureAttempts++ < 60) {
        requestAnimationFrame(measure)
      } else {
        pendingOpenScrollToBottom = false
        openMeasureAttempts = 0
      }
      return
    }

    openMeasureAttempts = 0
    const el = chatBodyRef.value
    if (!el) return
    scrollTop.value = el.scrollTop
    viewportHeight.value = el.clientHeight || 600
    nearBottomReal.value = (el.scrollHeight - el.scrollTop - el.clientHeight) < 320
  }

  const onScroll = () => {
    if (rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      measure()
    })
  }

  const unbind = () => {
    if (boundEl) {
      boundEl.removeEventListener('scroll', onScroll)
      boundEl = null
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  const bind = () => {
    const el = chatBodyRef.value
    if (!el) return
    if (el === boundEl) {
      measure()
      return
    }
    unbind()
    boundEl = el
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(el)
    }
  }

  onMounted(bind)
  onBeforeUnmount(unbind)

  watch(chatBodyRef, () => {
    bind()
  })

  watch(itemsRef, (next, prev) => {
    const nextItems = Array.isArray(next) ? next : []
    const prevItems = Array.isArray(prev) ? prev : []
    const nextLen = nextItems.length
    const prevLen = prevItems.length
    // Troca de conversa / open: ancora janela no fundo até scroll DOM confirmar.
    if (nextLen > 0 && (prevLen === 0 || chatOpeningPending.value)) {
      const nextFirst = String(nextItems[0]?.id || nextItems[0]?.messageid || '')
      const prevFirst = String(prevItems[0]?.id || prevItems[0]?.messageid || '')
      const chatSwitched = prevLen === 0 || nextFirst !== prevFirst || chatOpeningPending.value
      if (chatSwitched) {
        const vh = Math.max(1, viewportHeight.value || chatBodyRef.value?.clientHeight || 600)
        scrollTop.value = Math.max(0, nextLen * estimatePx - vh)
        nearBottomReal.value = true
        pendingOpenScrollToBottom = true
      }
    }
    requestAnimationFrame(measure)
  }, { flush: 'post' })

  watch(chatOpeningPending, (pending) => {
    if (pending) {
      nearBottomReal.value = true
      pendingOpenScrollToBottom = true
      requestAnimationFrame(measure)
    }
  })

  const windowState = computed(() => {
    const items = Array.isArray(itemsRef.value) ? itemsRef.value : []
    const total = items.length
    if (total <= threshold) {
      return {
        enabled: false,
        items,
        startIndex: 0,
        endIndex: total,
        padTop: 0,
        padBottom: 0,
        total,
      }
    }

    const top = Math.max(0, scrollTop.value)
    const vh = Math.max(1, viewportHeight.value)

    // Usuário no fundo REAL → ancora a janela no FIM da lista.
    // A estimativa por altura média (88px) erra com bolhas grandes e deixava as
    // últimas mensagens (inclusive as que chegam ao vivo) FORA da janela renderizada.
    if (nearBottomReal.value) {
      const count = Math.max(10, Math.ceil((vh + OVERSCAN_PX * 2) / estimatePx))
      const startIndex = Math.max(0, total - count)
      return {
        enabled: true,
        items: items.slice(startIndex),
        startIndex,
        endIndex: total,
        padTop: startIndex * estimatePx,
        padBottom: 0,
        total,
      }
    }

    const startByScroll = Math.floor(Math.max(0, top - OVERSCAN_PX) / estimatePx)
    const endByScroll = Math.ceil((top + vh + OVERSCAN_PX) / estimatePx)
    const startIndex = Math.max(0, Math.min(total - 1, startByScroll))
    const endIndex = Math.max(startIndex + 1, Math.min(total, endByScroll))
    const padTop = startIndex * estimatePx
    const padBottom = Math.max(0, (total - endIndex) * estimatePx)

    return {
      enabled: true,
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      padTop,
      padBottom,
      total,
    }
  })

  const visibleItems = computed(() => windowState.value.items)
  const padTopPx = computed(() => windowState.value.padTop)
  const padBottomPx = computed(() => windowState.value.padBottom)
  const windowEnabled = computed(() => windowState.value.enabled)
  const windowStartIndex = computed(() => windowState.value.startIndex)

  return {
    visibleItems,
    padTopPx,
    padBottomPx,
    windowEnabled,
    windowStartIndex,
    windowState,
    remeasure: measure,
  }
}
