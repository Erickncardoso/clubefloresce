/** Status de conexão (útil durante gravação por telemedicina). */
export function useNetworkStatus() {
  const online = ref(true)

  function sync() {
    if (typeof navigator !== 'undefined') {
      online.value = navigator.onLine !== false
    }
  }

  onMounted(() => {
    if (!import.meta.client) return
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('online', sync)
    window.removeEventListener('offline', sync)
  })

  return { online }
}
