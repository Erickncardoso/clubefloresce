/** Ancora a tab bar na borda inferior *visível* (visualViewport) — fix iOS/Android PWA. */
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
    return
  }

  const styles = getComputedStyle(html)
  const navTotal = parseFloat(styles.getPropertyValue('--patient-nav-total')) || 64
  const vv = window.visualViewport
  const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
  const top = visibleBottom - navTotal

  html.style.setProperty('--patient-nav-top', `${Math.round(Math.max(0, top))}px`)
}

export function clearPatientTabBarDock() {
  if (typeof document === 'undefined') return
  document.documentElement.style.removeProperty('--patient-nav-top')
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
