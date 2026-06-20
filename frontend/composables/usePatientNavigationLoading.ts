const MIN_VISIBLE_MS = 520

let hideTimer: ReturnType<typeof setTimeout> | null = null
let shownAt = 0

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export function usePatientNavigationLoading() {
  const isNavigating = useState('patient-nav-loading', () => false)

  function startNavigation() {
    if (!import.meta.client) return
    clearHideTimer()
    if (!isNavigating.value) {
      shownAt = Date.now()
    }
    isNavigating.value = true
  }

  function finishNavigation() {
    if (!import.meta.client) return
    clearHideTimer()
    const elapsed = shownAt ? Date.now() - shownAt : MIN_VISIBLE_MS
    const delay = Math.max(MIN_VISIBLE_MS - elapsed, 100)
    hideTimer = setTimeout(() => {
      isNavigating.value = false
      hideTimer = null
    }, delay)
  }

  return {
    isNavigating,
    startNavigation,
    finishNavigation,
  }
}
