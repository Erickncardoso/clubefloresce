const MIN_VISIBLE_MS = 520
const MAX_VISIBLE_MS = 4000

/** Rotas de auth/recuperação — overlay branco aqui parece "site em branco" no celular. */
const AUTH_PATHS_WITHOUT_LOADER = new Set([
  '/',
  '/register',
  '/esqueci-senha',
  '/redefinir-senha',
  '/abrir',
  '/documento',
])

let hideTimer: ReturnType<typeof setTimeout> | null = null
let safetyTimer: ReturnType<typeof setTimeout> | null = null
let shownAt = 0

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function clearSafetyTimer() {
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
}

function shouldSkipLoader(path: string) {
  return AUTH_PATHS_WITHOUT_LOADER.has(path)
}

export function usePatientNavigationLoading() {
  const isNavigating = useState('patient-nav-loading', () => false)

  function startNavigation(path?: string) {
    if (!import.meta.client) return
    const routePath = path ?? useRoute().path
    if (shouldSkipLoader(routePath)) return

    clearHideTimer()
    clearSafetyTimer()
    if (!isNavigating.value) {
      shownAt = Date.now()
    }
    isNavigating.value = true

    safetyTimer = setTimeout(() => {
      isNavigating.value = false
      safetyTimer = null
    }, MAX_VISIBLE_MS)
  }

  function finishNavigation() {
    if (!import.meta.client) return
    clearSafetyTimer()
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
