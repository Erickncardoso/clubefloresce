import { nextTick } from 'vue'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'

export default defineNuxtPlugin((nuxtApp) => {
  const { startNavigation, finishNavigation } = usePatientNavigationLoading()
  const router = useRouter()

  router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    startNavigation()
  })

  router.afterEach(() => {
    nextTick(() => finishNavigation())
  })

  router.onError(() => {
    finishNavigation()
  })

  nuxtApp.hook('page:start', () => {
    startNavigation()
  })

  nuxtApp.hook('page:finish', () => {
    nextTick(() => finishNavigation())
  })
})
