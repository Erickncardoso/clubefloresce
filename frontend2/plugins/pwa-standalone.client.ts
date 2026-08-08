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

  // Safari inline (ex.: IP local no iPhone): só registrar instalação — NÃO aplicar cf-pwa-standalone,
  // senão o CSS de PWA (safe-area no menu) vence e cria faixa branca extra na tab bar.
  const nuxtApp = useNuxtApp()
  if (nuxtApp.$pwa?.isPWAInstalled?.value || hasInstalledPwa()) {
    markPwaInstalled()
  }
})
