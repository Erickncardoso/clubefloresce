import { hasInstalledPwa, isStandalonePwa } from '~/utils/pwa-standalone'
import { isPushSecureContext } from '~/utils/resolve-api-base.mjs'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function usePushNotifications() {
  const apiBase = useApiBase()
  const { authHeaders, bootstrapToken } = usePatientAuth()

  const supported = useState('push-supported', () => false)
  const standalone = useState('push-standalone', () => false)
  const needsHttps = useState('push-needs-https', () => false)
  const checking = useState('push-checking', () => true)
  const enabledOnServer = useState('push-server-enabled', () => false)
  const permission = useState('push-permission', () => 'default')
  const subscribed = useState('push-subscribed', () => false)
  const mealRemindersEnabled = useState('push-meal-reminders', () => true)
  const loading = useState('push-loading', () => false)
  const error = useState('push-error', () => '')
  const { patientTimeHeaders } = usePatientLocalTime()

  const canSubscribe = computed(() => (
    supported.value
    && enabledOnServer.value
    && permission.value === 'granted'
    && !subscribed.value
  ))

  function detectStandalone() {
    if (!import.meta.client) return false
    const installed = isStandalonePwa() || hasInstalledPwa()
    standalone.value = installed
    return installed
  }

  async function waitForServiceWorker(maxWaitMs = 12000) {
    if (!('serviceWorker' in navigator)) return null

    const deadline = Date.now() + maxWaitMs
    while (Date.now() < deadline) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration?.active) return registration
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    try {
      return await navigator.serviceWorker.ready
    } catch {
      return null
    }
  }

  /**
   * iOS PWA não expõe PushManager em window — só em registration.pushManager.
   * App instalado + Notification + service worker = suporte para mostrar o botão.
   */
  async function detectPushSupport() {
    if (!import.meta.client) {
      supported.value = false
      return false
    }

    const isInstalled = detectStandalone()

    if (typeof Notification !== 'undefined') {
      permission.value = Notification.permission
    }

    if (!isPushSecureContext()) {
      needsHttps.value = true
      supported.value = false
      return false
    }
    needsHttps.value = false

    const hasBasics = 'serviceWorker' in navigator && 'Notification' in window
    if (!hasBasics) {
      supported.value = false
      return false
    }

    const registration = await waitForServiceWorker(isInstalled ? 10000 : 6000)
    if (registration?.pushManager) {
      supported.value = true
      return true
    }

    if (isInstalled) {
      supported.value = true
      return true
    }

    if ('PushManager' in window) {
      supported.value = true
      return true
    }

    supported.value = false
    return false
  }

  /** @deprecated use detectPushSupport */
  function detectSupport() {
    detectStandalone()
    if (typeof Notification !== 'undefined') {
      permission.value = Notification.permission
    }
    return supported.value
  }

  async function checkServerEnabled() {
    try {
      const data = await $fetch(`${apiBase.value}/push/vapid-public-key`)
      enabledOnServer.value = Boolean(data?.enabled && data?.publicKey)
      return enabledOnServer.value
    } catch {
      enabledOnServer.value = false
      return false
    }
  }

  async function syncTimezone() {
    if (!bootstrapToken()) return
    try {
      await $fetch(`${apiBase.value}/push/sync-timezone`, {
        method: 'POST',
        headers: patientTimeHeaders(),
      })
    } catch {
      // timezone sync is best-effort
    }
  }

  async function refreshStatus() {
    await detectPushSupport()
    await checkServerEnabled()
    if (!bootstrapToken()) return

    try {
      const status = await $fetch(`${apiBase.value}/push/status`, {
        headers: patientTimeHeaders(),
      })
      enabledOnServer.value = Boolean(status?.enabled)
      subscribed.value = Boolean(status?.subscribed)
      if (typeof status?.mealRemindersEnabled === 'boolean') {
        mealRemindersEnabled.value = status.mealRemindersEnabled
      }
    } catch {
      subscribed.value = false
    }
  }

  async function initPushState() {
    checking.value = true
    error.value = ''
    try {
      await detectPushSupport()
      await checkServerEnabled()
      if (bootstrapToken()) {
        try {
          const status = await $fetch(`${apiBase.value}/push/status`, {
            headers: patientTimeHeaders(),
          })
          subscribed.value = Boolean(status?.subscribed)
          if (typeof status?.mealRemindersEnabled === 'boolean') {
            mealRemindersEnabled.value = status.mealRemindersEnabled
          }
        } catch {
          subscribed.value = false
        }
      }
    } finally {
      checking.value = false
    }
  }

  async function subscribe() {
    error.value = ''
    loading.value = true

    try {
      await detectPushSupport()
      if (needsHttps.value) {
        throw new Error('Push no celular exige HTTPS. Em desenvolvimento local use o app publicado ou um túnel seguro (ngrok).')
      }
      if (!supported.value) {
        throw new Error('Seu aparelho não suporta notificações push neste navegador.')
      }

      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') {
        throw new Error('Permissão de notificação negada.')
      }

      const { publicKey, enabled } = await $fetch(`${apiBase.value}/push/vapid-public-key`)
      if (!enabled || !publicKey) {
        throw new Error('Push não está configurado no servidor.')
      }
      enabledOnServer.value = true

      const registration = await waitForServiceWorker()
      if (!registration?.pushManager) {
        throw new Error('Aguarde o app carregar e tente novamente.')
      }

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = subscription.toJSON()
      await $fetch(`${apiBase.value}/push/subscribe`, {
        method: 'POST',
        headers: patientTimeHeaders(),
        body: {
          endpoint: json.endpoint,
          keys: json.keys,
        },
      })

      subscribed.value = true
      mealRemindersEnabled.value = true
      return true
    } catch (err) {
      error.value = err?.data?.message || err?.message || 'Não foi possível ativar as notificações.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function unsubscribe() {
    error.value = ''
    loading.value = true

    try {
      const registration = await waitForServiceWorker()
      const subscription = await registration?.pushManager?.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await $fetch(`${apiBase.value}/push/unsubscribe`, {
          method: 'POST',
          headers: patientTimeHeaders(),
          body: { endpoint },
        })
        await subscription.unsubscribe()
      }
      subscribed.value = false
      return true
    } catch (err) {
      error.value = err?.data?.message || err?.message || 'Não foi possível desativar as notificações.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateMealReminders(enabled) {
    error.value = ''
    loading.value = true

    try {
      const data = await $fetch(`${apiBase.value}/push/preferences`, {
        method: 'PATCH',
        headers: patientTimeHeaders(),
        body: { mealRemindersEnabled: enabled },
      })
      mealRemindersEnabled.value = Boolean(data?.mealRemindersEnabled)
      return true
    } catch (err) {
      error.value = err?.data?.message || err?.message || 'Não foi possível salvar a preferência.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function syncSubscriptionIfGranted() {
    await detectPushSupport()
    if (!supported.value || !bootstrapToken()) return
    await syncTimezone()
    if (Notification.permission !== 'granted') return
    await refreshStatus()
    if (!enabledOnServer.value) return
    if (!subscribed.value) {
      await subscribe()
    }
  }

  return {
    supported,
    standalone,
    needsHttps,
    checking,
    enabledOnServer,
    permission,
    subscribed,
    mealRemindersEnabled,
    loading,
    error,
    canSubscribe,
    detectSupport,
    detectPushSupport,
    checkServerEnabled,
    refreshStatus,
    syncTimezone,
    initPushState,
    subscribe,
    unsubscribe,
    updateMealReminders,
    syncSubscriptionIfGranted,
  }
}
