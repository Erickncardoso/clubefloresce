/** Marca PWA instalado vs Safari para ajustar layout (sem barra inferior do navegador no app). */
export default defineNuxtPlugin({
  name: 'pwa-display-mode',
  enforce: 'pre',
  setup() {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const root = document.documentElement

  function syncDisplayModeClass() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

    root.classList.toggle('pwa-standalone', standalone)
    root.classList.toggle('pwa-browser', !standalone)
  }

  syncDisplayModeClass()

  window.matchMedia('(display-mode: standalone)').addEventListener('change', syncDisplayModeClass)
  window.matchMedia('(display-mode: fullscreen)').addEventListener('change', syncDisplayModeClass)
  },
})
