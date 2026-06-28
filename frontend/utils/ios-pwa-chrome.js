export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isTextInputFocused() {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return false
  if (active.isContentEditable) return true

  const tag = active.tagName
  if (tag === 'TEXTAREA') return true
  if (tag !== 'INPUT') return false

  const type = (active.getAttribute('type') || 'text').toLowerCase()
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'hidden', 'range', 'color'].includes(type)
}

function getScrollableAncestor(el) {
  let node = el instanceof Element ? el : null

  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    const canScrollY = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'

    if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
      return node
    }

    node = node.parentElement
  }

  return null
}

function clampWindowScroll() {
  if (window.scrollY !== 0) window.scrollTo(0, 0)
  if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0
  if (document.body.scrollTop !== 0) document.body.scrollTop = 0
}

function syncViewportMetrics() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const offsetTop = vv?.offsetTop ?? 0

  document.documentElement.style.setProperty('--cf-vvh', `${Math.round(height)}px`)
  document.documentElement.style.setProperty('--cf-vv-offset-top', `${Math.round(offsetTop)}px`)
}

/**
 * Evita rubber-band no documento e scroll fantasma que faz o Safari exibir/esconder barras.
 */
export function installIOSPwaChromeGuard() {
  if (typeof window === 'undefined' || !isIOSDevice()) return () => {}

  document.documentElement.classList.add('cf-ios-pwa')

  syncViewportMetrics()
  clampWindowScroll()

  let lastTouchY = 0
  let lastTouchX = 0

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return
    lastTouchY = event.touches[0].clientY
    lastTouchX = event.touches[0].clientX
  }

  const onTouchMove = (event) => {
    if (event.touches.length !== 1) return

    const touchY = event.touches[0].clientY
    const touchX = event.touches[0].clientX
    const deltaY = touchY - lastTouchY
    const deltaX = touchX - lastTouchX
    lastTouchY = touchY
    lastTouchX = touchX

    if (Math.abs(deltaY) <= Math.abs(deltaX)) return

    const scrollable = getScrollableAncestor(event.target)
    if (!scrollable) {
      event.preventDefault()
      return
    }

    if (deltaY > 0 && scrollable.scrollTop <= 0) {
      event.preventDefault()
      return
    }

    if (deltaY < 0 && scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1) {
      event.preventDefault()
    }
  }

  const onWindowScroll = () => {
    clampWindowScroll()
  }

  const onViewportChange = () => {
    syncViewportMetrics()
    clampWindowScroll()
  }

  const onFocusIn = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!isTextInputFocused()) return

    requestAnimationFrame(() => {
      syncViewportMetrics()
      clampWindowScroll()
    })
  }

  const onFocusOut = () => {
    requestAnimationFrame(() => {
      syncViewportMetrics()
      clampWindowScroll()
    })
  }

  const onGestureStart = (event) => {
    event.preventDefault()
  }

  const onTouchEnd = () => {
    requestAnimationFrame(() => {
      syncViewportMetrics()
      clampWindowScroll()
    })
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
  document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true })
  document.addEventListener('gesturestart', onGestureStart, { passive: false, capture: true })
  window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true })
  window.addEventListener('orientationchange', onViewportChange, { passive: true })
  document.addEventListener('focusin', onFocusIn, { passive: true, capture: true })
  document.addEventListener('focusout', onFocusOut, { passive: true, capture: true })

  const vv = window.visualViewport
  vv?.addEventListener('resize', onViewportChange, { passive: true })
  vv?.addEventListener('scroll', onViewportChange, { passive: true })

  return () => {
    document.documentElement.classList.remove('cf-ios-pwa')
    document.documentElement.style.removeProperty('--cf-vvh')
    document.documentElement.style.removeProperty('--cf-vv-offset-top')
    document.removeEventListener('touchstart', onTouchStart, { capture: true })
    document.removeEventListener('touchmove', onTouchMove, { capture: true })
    document.removeEventListener('touchend', onTouchEnd, { capture: true })
    document.removeEventListener('touchcancel', onTouchEnd, { capture: true })
    document.removeEventListener('gesturestart', onGestureStart, { capture: true })
    window.removeEventListener('scroll', onWindowScroll, { capture: true })
    window.removeEventListener('orientationchange', onViewportChange)
    document.removeEventListener('focusin', onFocusIn, { capture: true })
    document.removeEventListener('focusout', onFocusOut, { capture: true })
    vv?.removeEventListener('resize', onViewportChange)
    vv?.removeEventListener('scroll', onViewportChange)
  }
}
