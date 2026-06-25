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

/**
 * Evita rubber-band no documento e scroll fantasma que faz o Safari exibir/esconder barras.
 */
export function installIOSPwaChromeGuard() {
  if (typeof window === 'undefined' || !isIOSDevice()) return () => {}

  document.documentElement.classList.add('cf-ios-pwa')

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

  const onFocusIn = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!isTextInputFocused()) return

    requestAnimationFrame(() => {
      clampWindowScroll()
    })
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true })
  document.addEventListener('focusin', onFocusIn, { passive: true, capture: true })

  return () => {
    document.documentElement.classList.remove('cf-ios-pwa')
    document.removeEventListener('touchstart', onTouchStart, { capture: true })
    document.removeEventListener('touchmove', onTouchMove, { capture: true })
    window.removeEventListener('scroll', onWindowScroll, { capture: true })
    document.removeEventListener('focusin', onFocusIn, { capture: true })
  }
}
