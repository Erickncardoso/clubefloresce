import { nextTick } from 'vue'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'

export default defineNuxtPlugin((nuxtApp) => {
  const { startNavigation, finishNavigation } = usePatientNavigationLoading()
  const router = useRouter()

  router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    startNavigation(to.path)
  })

  router.afterEach(() => {
    nextTick(() => finishNavigation())
  })

  router.onError((error) => {
    finishNavigation()

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
    nextTick(() => finishNavigation())
  })
})
