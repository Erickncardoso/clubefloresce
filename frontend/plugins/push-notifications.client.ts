/** Registra push após login e navega ao tocar na notificação. */
export default defineNuxtPlugin({
  name: 'push-notifications',
  enforce: 'post',
  setup() {
    const config = useRuntimeConfig()
    if (!config.public.mobileApp || !import.meta.client) return

    const router = useRouter()
    const { bootstrapToken } = usePatientAuth()
    const {
      detectPushSupport,
      checkServerEnabled,
      refreshStatus,
      syncSubscriptionIfGranted,
      syncTimezone,
    } = usePushNotifications()

    void detectPushSupport()
    void checkServerEnabled()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type !== 'PUSH_NAVIGATE' || !event.data.url) return
        void router.push(event.data.url)
      })
    }

    const trySync = async () => {
      if (!bootstrapToken()) return
      await syncTimezone()
      await refreshStatus()
      if (Notification.permission === 'default') return
      await syncSubscriptionIfGranted()
    }

    void trySync()

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void trySync()
      }
    })
  },
})
