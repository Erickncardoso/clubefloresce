import { getPatientScrollRoot } from '~/composables/useVerticalWheelPassthrough'

const TOP_REVEAL_PX = 12
const MIN_SCROLL_DELTA = 6

/** Menu inferior some ao rolar para baixo e reaparece ao rolar para cima. */
export function usePatientTabBarScrollReveal() {
  const hidden = useState('patient-tab-bar-scroll-hidden', () => false)
  const revealFromBottom = useState('patient-tab-bar-scroll-from-bottom', () => true)

  let lastScrollTop = 0
  let scrollRoot: HTMLElement | null = null
  let cleanup: (() => void) | null = null

  function reveal() {
    hidden.value = false
    revealFromBottom.value = true
  }

  function onScroll() {
    if (!scrollRoot) return

    const scrollTop = scrollRoot.scrollTop
    const delta = scrollTop - lastScrollTop

    if (scrollTop <= TOP_REVEAL_PX) {
      reveal()
    } else if (Math.abs(delta) >= MIN_SCROLL_DELTA) {
      if (delta > 0) {
        revealFromBottom.value = false
        hidden.value = true
      } else {
        revealFromBottom.value = true
        hidden.value = false
      }
    }

    lastScrollTop = scrollTop
  }

  function bind() {
    scrollRoot = getPatientScrollRoot()
    if (!(scrollRoot instanceof HTMLElement)) return

    lastScrollTop = scrollRoot.scrollTop
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    cleanup = () => {
      scrollRoot?.removeEventListener('scroll', onScroll)
      scrollRoot = null
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    requestAnimationFrame(bind)
  })

  onUnmounted(() => {
    cleanup?.()
    cleanup = null
    reveal()
  })

  return { hidden, revealFromBottom, reveal }
}
