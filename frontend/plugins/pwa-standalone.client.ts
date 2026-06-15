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
    return
  }

  const nuxtApp = useNuxtApp()
  if (nuxtApp.$pwa?.isPWAInstalled?.value) {
    markPwaInstalled()
    return
  }

  if (hasInstalledPwa()) return
})
