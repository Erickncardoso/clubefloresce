import { nextTick } from 'vue'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'
import {
  releasePatientInteractionLock,
  repairStuckPatientInteractionLock,
} from '~/utils/patient-interaction-lock.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  const { startNavigation, finishNavigation } = usePatientNavigationLoading()
  const router = useRouter()

  function clearStuckLock() {
    try {
      const dialOpen = useState('patient-quick-access-open', () => false)
      repairStuckPatientInteractionLock(Boolean(dialOpen.value))
    } catch {
      releasePatientInteractionLock()
    }
  }

  router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    releasePatientInteractionLock()
    startNavigation(to.path)
  })

  router.afterEach(() => {
    nextTick(() => {
      clearStuckLock()
      finishNavigation()
    })
  })

  router.onError((error) => {
    finishNavigation()
    clearStuckLock()

    const message = String(error?.message || error || '')
    if (
      /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)
      && typeof sessionStorage !== 'undefined'
    ) {
      const reloadKey = 'cf-pwa-chunk-reload'
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        return
      }
      sessionStorage.removeItem(reloadKey)
    }
  })

  nuxtApp.hook('page:start', () => {
    startNavigation(router.currentRoute.value.path)
  })

  nuxtApp.hook('page:finish', () => {
    nextTick(() => {
      clearStuckLock()
      finishNavigation()
    })
  })

  if (import.meta.client) {
    clearStuckLock()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') clearStuckLock()
    })
    window.addEventListener('pageshow', clearStuckLock)
    // Toque no FAB ou página: se a classe ficou órfã, libera no próximo gesto.
    window.addEventListener(
      'pointerdown',
      () => {
        clearStuckLock()
      },
      { capture: true, passive: true },
    )
  }
})
