<template>
  <div ref="rootEl" class="jitsi-embed" />
</template>

<script setup>
const props = defineProps({
  roomUrl: { type: String, required: true },
  roomName: { type: String, default: '' },
  jitsiDomain: { type: String, default: 'meet.nutrisabellajardim.com.br' },
  displayName: { type: String, default: 'Participante' },
  /** host = nutri; guest = paciente */
  role: { type: String, default: 'guest' },
})

const emit = defineEmits(['ready', 'error', 'left'])

const rootEl = ref(null)
let api = null
let disposed = false
let leavingLocally = false
let iframeFallback = null

function resolveDomain() {
  const fromProp = String(props.jitsiDomain || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (fromProp) return fromProp
  try {
    return new URL(props.roomUrl).hostname
  } catch {
    return 'meet.nutrisabellajardim.com.br'
  }
}

function resolveRoomName() {
  const fromProp = String(props.roomName || '').trim()
  if (fromProp) return fromProp
  try {
    const path = new URL(props.roomUrl).pathname.replace(/^\/+/, '')
    return decodeURIComponent(path.split('/')[0] || '')
  } catch {
    return ''
  }
}

function buildHash(displayName) {
  return [
    `userInfo.displayName="${encodeURIComponent(displayName)}"`,
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.deeplinking.disabled=true',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'config.disableInviteFunctions=true',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_BRAND_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.SHOW_POWERED_BY=false',
    'interfaceConfig.MOBILE_APP_PROMO=false',
    'interfaceConfig.HIDE_DEEP_LINKING_LOGO=true',
    'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
  ].join('&')
}

function loadExternalApi(domain) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Jitsi só funciona no navegador.'))
  }
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI)
  }

  const src = `https://${domain}/external_api.js`
  const existing = document.querySelector(`script[data-jitsi-api="${domain}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI)
      existing.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI))
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Jitsi.')))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.jitsiApi = domain
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI)
      else reject(new Error('API do Jitsi indisponível.'))
    }
    script.onerror = () => reject(new Error('Não foi possível carregar o Jitsi.'))
    document.head.appendChild(script)
  })
}

function clearRoot() {
  if (rootEl.value) rootEl.value.innerHTML = ''
  iframeFallback = null
}

function mountIframeFallback(domain, roomName, displayName) {
  if (!rootEl.value) return
  clearRoot()
  const iframe = document.createElement('iframe')
  iframe.className = 'jitsi-iframe'
  iframe.allow = 'camera *; microphone *; display-capture *; autoplay *; fullscreen *; clipboard-write *'
  iframe.allowFullscreen = true
  iframe.title = 'Consulta por vídeo'
  iframe.referrerPolicy = 'origin'
  iframe.src = `https://${domain}/${encodeURIComponent(roomName)}#${buildHash(displayName)}`
  iframe.addEventListener('load', () => emit('ready'))
  rootEl.value.appendChild(iframe)
  iframeFallback = iframe
}

function disposeApi() {
  if (api) {
    try { api.removeListener?.('readyToClose') } catch { /* ignore */ }
    try { api.dispose() } catch { /* ignore */ }
    api = null
  }
  if (iframeFallback) {
    try { iframeFallback.src = 'about:blank' } catch { /* ignore */ }
    iframeFallback = null
  }
  clearRoot()
}

async function mountMeeting() {
  disposed = false
  leavingLocally = false
  disposeApi()
  if (!rootEl.value) return

  const domain = resolveDomain()
  const roomName = resolveRoomName()
  if (!domain || !roomName) {
    emit('error', 'Sala de vídeo inválida.')
    return
  }

  const displayName = String(props.displayName || '').trim()
    || (props.role === 'host' ? 'Nutricionista' : 'Paciente')

  await nextTick()

  // No mobile, iframe direto é mais estável para câmera/mic
  const isMobile = typeof navigator !== 'undefined'
    && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

  if (isMobile) {
    mountIframeFallback(domain, roomName, displayName)
    return
  }

  try {
    const JitsiMeetExternalAPI = await loadExternalApi(domain)
    if (disposed || !rootEl.value) return

    api = new JitsiMeetExternalAPI(domain, {
      roomName,
      parentNode: rootEl.value,
      width: '100%',
      height: '100%',
      userInfo: { displayName },
      configOverwrite: {
        prejoinConfig: { enabled: false },
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        deeplinking: { disabled: true },
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableInviteFunctions: true,
        enableWelcomePage: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false,
        HIDE_DEEP_LINKING_LOGO: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DEFAULT_LOGO_URL: '',
        DEFAULT_WELCOME_PAGE_LOGO_URL: '',
        PROVIDER_NAME: 'Clube Florescer',
        APP_NAME: 'Clube Florescer',
        NATIVE_APP_NAME: 'Clube Florescer',
      },
    })

    api.addListener('videoConferenceJoined', () => emit('ready'))
    api.addListener('readyToClose', () => {
      if (!leavingLocally) emit('left')
    })
    api.addListener('videoConferenceLeft', () => {
      if (!leavingLocally) emit('left')
    })
  } catch {
    if (disposed || !rootEl.value) return
    mountIframeFallback(domain, roomName, displayName)
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function leaveLocally() {
  leavingLocally = true
  if (api) {
    try { api.executeCommand('hangup') } catch { /* ignore */ }
    // dá tempo do XMPP/WebRTC avisar a sala antes de destruir
    await wait(700)
    try { api.dispose() } catch { /* ignore */ }
    api = null
  }
  if (iframeFallback) {
    try { iframeFallback.src = 'about:blank' } catch { /* ignore */ }
    iframeFallback = null
  }
  clearRoot()
  emit('left')
}

watch(
  () => [props.roomUrl, props.roomName, props.jitsiDomain, props.displayName, props.role],
  () => { void mountMeeting() },
)

onMounted(() => { void mountMeeting() })
onBeforeUnmount(() => {
  disposed = true
  leavingLocally = true
  disposeApi()
})

defineExpose({ remount: mountMeeting, leaveLocally })
</script>

<style scoped>
.jitsi-embed {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #000;
  position: relative;
  overflow: hidden;
}

.jitsi-embed :deep(iframe),
.jitsi-embed :deep(.jitsi-iframe) {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  background: #000;
}
</style>
