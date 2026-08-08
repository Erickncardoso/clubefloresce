import { isPatientCheckoutPath } from '~/utils/patient-access'
import {
  isPatientPublicPath,
  resolvePatientRouteAccess,
} from '~/utils/patient-route-guard'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const config = useRuntimeConfig()

  if (config.public.mobileApp) {
    const recheckAccess = async (path: string) => {
      if (isPatientPublicPath(path) || isPatientCheckoutPath(path)) return
      const redirect = await resolvePatientRouteAccess(path)
      if (redirect && path !== redirect) {
        await navigateTo(redirect, { replace: true })
      }
    }

    router.beforeEach(async (to) => {
      if (isPatientPublicPath(to.path)) return true
      const redirect = await resolvePatientRouteAccess(to.path)
      if (redirect && to.path !== redirect) {
        return redirect
      }
      return true
    })

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void recheckAccess(router.currentRoute.value.path)
        }
      })
    }
  }

  function syncBellaChatShell(path: string) {
    if (!import.meta.client) return
    const onChat = path.startsWith('/bella/chat')
    document.documentElement.classList.toggle('bella-chat-active', onChat)
    document.body.classList.toggle('bella-chat-active', onChat)
  }

  syncBellaChatShell(router.currentRoute.value.path)

  router.afterEach((to) => {
    syncBellaChatShell(to.path)
    if (!import.meta.client) return
    if (to.path.startsWith('/bella/chat')) return
    const shell = document.querySelector('.patient-shell-body')
    if (shell instanceof HTMLElement) {
      shell.scrollTop = 0
    }
  })
})
