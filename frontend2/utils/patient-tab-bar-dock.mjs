/** Espelha `--cf-quick-fab-gap` + altura do botão (+) em patient-tab-bar.css */
const QUICK_FAB_GAP_PX = 12

/** Ancora tab bar e FAB na borda inferior *visível* (visualViewport) — fix iOS/Android PWA. */
export function syncPatientTabBarDock() {
  if (typeof window === 'undefined') return

  const html = document.documentElement
  if (!html.classList.contains('cf-mobile-app')) return

  if (
    html.classList.contains('vk-open')
    || html.classList.contains('keyboard-open')
    || html.classList.contains('meal-sheet-keyboard')
    || html.classList.contains('meal-flow-open')
  ) {
    html.style.removeProperty('--patient-nav-top')
    html.style.removeProperty('--patient-fab-top')
    return
  }

  const styles = getComputedStyle(html)
  const navTotal = parseFloat(styles.getPropertyValue('--patient-nav-total')) || 64
  const rootFont = Number.parseFloat(styles.fontSize) || 16
  const fabSizeRaw = styles.getPropertyValue('--cf-quick-fab-size').trim() || '3.5rem'
  const fabSizePx = fabSizeRaw.endsWith('rem')
    ? Number.parseFloat(fabSizeRaw) * rootFont
    : Number.parseFloat(fabSizeRaw) || 56

  const vv = window.visualViewport
  const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
  const top = visibleBottom - navTotal

  html.style.setProperty('--patient-nav-top', `${Math.round(Math.max(0, top))}px`)
  html.style.setProperty(
    '--patient-fab-top',
    `${Math.round(Math.max(0, top - QUICK_FAB_GAP_PX - fabSizePx))}px`,
  )
}

export function clearPatientTabBarDock() {
  if (typeof document === 'undefined') return
  document.documentElement.style.removeProperty('--patient-nav-top')
  document.documentElement.style.removeProperty('--patient-fab-top')
}

export function installPatientTabBarDock() {
  if (typeof window === 'undefined') return () => {}

  const onChange = () => syncPatientTabBarDock()

  syncPatientTabBarDock()

  window.addEventListener('orientationchange', onChange, { passive: true })
  window.addEventListener('resize', onChange, { passive: true })

  const vv = window.visualViewport
  vv?.addEventListener('resize', onChange, { passive: true })
  vv?.addEventListener('scroll', onChange, { passive: true })

  return () => {
    clearPatientTabBarDock()
    window.removeEventListener('orientationchange', onChange)
    window.removeEventListener('resize', onChange)
    vv?.removeEventListener('resize', onChange)
    vv?.removeEventListener('scroll', onChange)
  }
}
