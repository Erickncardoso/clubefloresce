import { createVNode, render } from 'vue'
import { hasAuthSession, verifyAuthSession } from '~/composables/useAuthSession.js'
import {
  startWhatsappToastListener,
  stopWhatsappToastListener,
} from '~/composables/whatsapp/useWhatsappToastNotifications.js'
import WhatsappMessageNotifications from '~/components/whatsapp/WhatsappMessageNotifications.vue'

/** Listener + UI global de notificações WhatsApp no painel admin. */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server || typeof window === 'undefined') return

  const config = useRuntimeConfig()
  if (config.public.mobileApp) return

  const mountEl = document.createElement('div')
  mountEl.id = 'wa-notifications-root'
  document.body.appendChild(mountEl)

  const vnode = createVNode(WhatsappMessageNotifications)
  vnode.appContext = nuxtApp.vueApp._context
  render(vnode, mountEl)

  nuxtApp.hook('app:beforeUnmount', () => {
    render(null, mountEl)
    mountEl.remove()
  })

  const maybeStart = async () => {
    if (!hasAuthSession()) return
    const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
    if (!user) return
    startWhatsappToastListener()
  }

  const stop = () => {
    stopWhatsappToastListener()
  }

  void maybeStart()

  const router = useRouter()
  router.afterEach(() => {
    void maybeStart()
  })

  window.addEventListener('storage', () => { void maybeStart() })

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void maybeStart()
    })
  }

  return {
    provide: {
      restartWhatsappToastListener: maybeStart,
      stopWhatsappToastListener: stop,
    },
  }
})
