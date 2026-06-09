export function getPatientScrollRoot() {
  if (typeof document === 'undefined') return null
  return document.querySelector('.patient-shell-body')
    || document.scrollingElement
    || document.documentElement
}

export function scrollPatientPageBy(deltaY) {
  const root = getPatientScrollRoot()
  if (!root || !deltaY) return
  root.scrollTop += deltaY
}

/**
 * Carrosséis horizontais capturam o wheel vertical no Chrome.
 * Repassa o gesto vertical para o container de scroll do app paciente.
 */
export function useVerticalWheelPassthrough(containerRef) {
  let cleanup = null

  onMounted(() => {
    const el = unref(containerRef)
    if (!el || typeof window === 'undefined') return

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      if (event.deltaY === 0) return

      scrollPatientPageBy(event.deltaY)
      event.preventDefault()
      event.stopPropagation()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    cleanup = () => el.removeEventListener('wheel', onWheel)
  })

  onBeforeUnmount(() => {
    cleanup?.()
    cleanup = null
  })
}

/**
 * Centraliza o repasse de wheel vertical em carrosséis horizontais do app paciente.
 */
export function usePatientHorizontalWheelBridge(rootRef) {
  let cleanup = null

  onMounted(() => {
    const root = unref(rootRef)
    if (!root || typeof window === 'undefined') return

    const selector = [
      '[data-h-scroll]',
      '.cf-tile-carousel',
      '.bib-chips',
      '.home-stat-carousel',
    ].join(',')

    const onWheel = (event) => {
      if (!(event.target instanceof Element)) return
      if (!event.target.closest(selector)) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      if (event.deltaY === 0) return

      scrollPatientPageBy(event.deltaY)
      event.preventDefault()
    }

    root.addEventListener('wheel', onWheel, { passive: false, capture: true })
    cleanup = () => root.removeEventListener('wheel', onWheel, { capture: true })
  })

  onBeforeUnmount(() => {
    cleanup?.()
    cleanup = null
  })
}
