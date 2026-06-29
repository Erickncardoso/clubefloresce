const DEV_SW_PURGE_KEY = 'cf-dev-sw-purged'

async function purgeServiceWorkerAndCaches() {
  if (!('serviceWorker' in navigator)) return false

  const regs = await navigator.serviceWorker.getRegistrations()
  const hadSw = regs.length > 0

  await Promise.all(regs.map((reg) => reg.unregister()))

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  return hadSw
}

/**
 * Dev: bloqueia SW, limpa caches e recarrega uma vez se havia SW ativo.
 */
export default defineNuxtPlugin({
  name: 'pwa-dev-unregister',
  enforce: 'pre',
  parallel: true,
  setup() {
    if (!import.meta.dev) return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => {
        await purgeServiceWorkerAndCaches()
        throw new DOMException('Service Worker desabilitado em desenvolvimento', 'NotSupportedError')
      }
    }

    void (async () => {
      const hadSw = await purgeServiceWorkerAndCaches()

      if (hadSw && !sessionStorage.getItem(DEV_SW_PURGE_KEY)) {
        sessionStorage.setItem(DEV_SW_PURGE_KEY, '1')
        window.location.reload()
        return
      }

      // Segunda passagem — alguns iOS seguram o SW até depois do load
      window.setTimeout(() => {
        void purgeServiceWorkerAndCaches()
      }, 1200)
    })()
  },
})
