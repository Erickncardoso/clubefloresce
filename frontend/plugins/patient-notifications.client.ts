/** Carrega contagem de notificações ao entrar no app paciente. */
export default defineNuxtPlugin({
  name: 'patient-notifications',
  enforce: 'post',
  setup() {
    const config = useRuntimeConfig()
    if (!config.public.mobileApp || !import.meta.client) return

    const { bootstrapToken } = usePatientAuth()
    const { fetchNotifications } = usePatientNotifications()

    const refresh = () => {
      if (!bootstrapToken()) return
      void fetchNotifications()
    }

    refresh()

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh()
    })
  },
})
