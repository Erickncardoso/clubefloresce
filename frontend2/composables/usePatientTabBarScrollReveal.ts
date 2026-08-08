import { getPatientScrollRoot } from '~/composables/useVerticalWheelPassthrough'

const TOP_REVEAL_PX = 12
const MIN_SCROLL_DELTA = 6

/** Menu inferior some ao rolar para baixo e reaparece ao rolar para cima. */
export function usePatientTabBarScrollReveal() {
  const hidden = useState('patient-tab-bar-scroll-hidden', () => false)

  let lastScrollTop = 0
  let scrollRoot: HTMLElement | null = null
  let cleanup: (() => void) | null = null

  function reveal() {
    hidden.value = false
  }

  function onScroll() {
    if (!scrollRoot) return

    const scrollTop = scrollRoot.scrollTop
    const delta = scrollTop - lastScrollTop

    if (scrollTop <= TOP_REVEAL_PX) {
      reveal()
    } else if (Math.abs(delta) >= MIN_SCROLL_DELTA) {
      hidden.value = delta > 0
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

  return { hidden, reveal }
}
