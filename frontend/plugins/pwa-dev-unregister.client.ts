/**
 * Em dev, remove SW e caches para o celular sempre pegar CSS/JS atualizado.
 * (Com Workbox ativo, reinstalar o PWA ainda servia assets velhos.)
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  const clear = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  }

  void clear()
})
