import {
  clearPwaUpdating,
  hasInstalledPwa,
  isStandalonePwa,
  markPwaInstalled,
} from '~/utils/pwa-standalone'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  clearPwaUpdating()

  if (isStandalonePwa()) {
    markPwaInstalled()
    document.documentElement.classList.add('cf-pwa-standalone')
    return
  }

  const nuxtApp = useNuxtApp()
  if (nuxtApp.$pwa?.isPWAInstalled?.value) {
    markPwaInstalled()
    document.documentElement.classList.add('cf-pwa-standalone')
    return
  }

  if (hasInstalledPwa()) {
    document.documentElement.classList.add('cf-pwa-standalone')
    return
  }
})
