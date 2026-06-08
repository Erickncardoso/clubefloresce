/** Registra o SW apenas em produção (build estático). Dev não usa PWA para evitar erro dev-sw-dist. */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (import.meta.dev) return
  if (!config.public.mobileApp || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[PWA] Falha ao registrar service worker:', err)
    })
  }, { once: true })
})
