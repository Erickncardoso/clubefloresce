/** Carrega contagem de notificações ao entrar no app paciente. */
export default defineNuxtPlugin({
  name: 'patient-notifications',
  enforce: 'post',
  setup() {
    const config = useRuntimeConfig()
    if (!config.public.mobileApp || !import.meta.client) return

    const { bootstrapToken } = usePatientAuth()
    const { fetchNotifications } = usePatientNotifications()

    let lastRefreshAt = 0
    const VISIBILITY_REFRESH_MS = 30_000

    const refresh = (force = false) => {
      if (!bootstrapToken()) return
      const now = Date.now()
      if (!force && now - lastRefreshAt < VISIBILITY_REFRESH_MS) return
      lastRefreshAt = now
      void fetchNotifications()
    }

    refresh(true)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh()
    })

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type !== 'PUSH_RECEIVED') return
        refresh(true)
      })
    }
  },
})
