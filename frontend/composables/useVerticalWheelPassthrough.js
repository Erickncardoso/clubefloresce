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

let patientScrollLockCount = 0
let patientScrollLockTop = 0

/**
 * Trava o scroll no container correto do app paciente (.patient-shell-body).
 * Evita travar body/html, que não são o scroll root no PWA.
 */
export function lockPatientScroll() {
  if (typeof document === 'undefined') return
  const root = getPatientScrollRoot()
  if (!(root instanceof HTMLElement)) return

  patientScrollLockCount += 1
  if (patientScrollLockCount > 1) return

  patientScrollLockTop = root.scrollTop
  root.dataset.patientScrollLocked = 'true'
  root.style.overflow = 'hidden'
  root.style.touchAction = 'none'
  root.style.overscrollBehavior = 'none'
}

export function unlockPatientScroll() {
  if (typeof document === 'undefined') return
  const root = getPatientScrollRoot()
  if (!(root instanceof HTMLElement)) return

  patientScrollLockCount = Math.max(0, patientScrollLockCount - 1)
  if (patientScrollLockCount > 0) return

  root.style.overflow = ''
  root.style.touchAction = ''
  root.style.overscrollBehavior = ''
  delete root.dataset.patientScrollLocked
  root.scrollTop = patientScrollLockTop
}

/** Força destravar ao desmontar modal (evita scroll preso se o componente sumir com lock ativo). */
export function resetPatientScrollLock() {
  if (typeof document === 'undefined') return
  if (patientScrollLockCount === 0) return
  patientScrollLockCount = 1
  unlockPatientScroll()
}

export function usePatientScrollLock() {
  onBeforeUnmount(() => {
    if (patientScrollLockCount > 0) {
      patientScrollLockCount = 0
      unlockPatientScroll()
    }
  })

  return {
    lockPatientScroll,
    unlockPatientScroll,
  }
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
