/** Plugin iOS: estende backdrops + theme-color. Escurecimento principal = PatientScreenDim. */
import { installIosPwaOverlaySync } from '~/utils/ios-pwa-overlay.mjs'
import { isIOSDevice } from '~/utils/ios-pwa-chrome'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (!isIOSDevice()) return

  const cleanup = installIosPwaOverlaySync()

  if (import.meta.client) {
    window.addEventListener('pagehide', cleanup, { once: true })
  }
})
