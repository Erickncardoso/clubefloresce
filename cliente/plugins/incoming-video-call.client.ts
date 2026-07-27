/**
 * Chamada entrante no app paciente — toast verde (mesmo padrão do AppToast).
 * Também reage a push em foreground.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const config = useRuntimeConfig()
  const router = useRouter()
  const route = useRoute()
  const { patientFetchInit } = usePatientLocalTime()
  const { showToast, hideToast, toast } = useAppToast()

  let timer = null
  let currentCallId = null

  function callPath(call) {
    if (!call?.id) return '/chamada'
    return `/chamada?callId=${encodeURIComponent(call.id)}&room=${encodeURIComponent(call.roomName || '')}`
  }

  function clearIncomingToast() {
    if (toast.value?.type === 'call') hideToast()
    currentCallId = null
  }

  function showIncomingToast(call) {
    if (!call?.id) return
    if (String(route.path || '').startsWith('/chamada')) {
      clearIncomingToast()
      return
    }
    if (currentCallId === call.id && toast.value?.type === 'call') return

    currentCallId = call.id
    showToast({
      type: 'call',
      title: 'Chamada de vídeo',
      message: `${call.nutriName || 'Sua nutricionista'} está te ligando`,
      duration: 0,
      actionLabel: 'Atender',
      onAction: () => {
        currentCallId = null
        void router.push(callPath(call))
      },
    })
  }

  async function refreshIncomingCall() {
    if (String(route.path || '').startsWith('/chamada')) {
      clearIncomingToast()
      return
    }
    try {
      const callData = await $fetch(
        `${config.public.apiBase}/patients/me/video-call`,
        patientFetchInit(),
      )
      const call = callData?.call
      if (call?.id && call.status === 'ringing') showIncomingToast(call)
      else clearIncomingToast()
    } catch {
      clearIncomingToast()
    }
  }

  function onPushMessage(event) {
    const data = event.data
    if (!data) return

    if (data.type === 'PUSH_NAVIGATE' && data.url) {
      const url = String(data.url)
      if (url.includes('/chamada')) {
        clearIncomingToast()
        void router.push(url)
      }
      return
    }

    if (data.type !== 'PUSH_RECEIVED') return
    const payload = data.payload || {}
    const tag = String(payload.tag || '')
    const url = String(payload.url || '')
    const isVideoCall = tag.startsWith('video-call:') || url.includes('/chamada')
    if (!isVideoCall) return

    // Mostra o toast imediatamente; o polling confirma/encerra.
    showIncomingToast({
      id: tag.replace(/^video-call:/, '') || `push-${Date.now()}`,
      roomName: '',
      nutriName: String(payload.body || '')
        .replace(/\s+está te ligando.*$/i, '')
        .trim() || 'Sua nutricionista',
      status: 'ringing',
    })
    void refreshIncomingCall()
  }

  nuxtApp.hook('app:mounted', () => {
    void refreshIncomingCall()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshIncomingCall()
    }, 1000)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onPushMessage)
    }
  })

  watch(() => route.fullPath, () => {
    void refreshIncomingCall()
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (timer) clearInterval(timer)
      clearIncomingToast()
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onPushMessage)
      }
    })
  }
})
