<template>
  <div class="call-page" :class="{ 'call-page--live': phase === 'live' }">
    <header v-if="phase !== 'live'" class="call-top">
      <div class="call-top-copy">
        <p class="call-kicker">Consulta por vídeo</p>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="call-sub">{{ subtitle }}</p>
      </div>
      <NuxtLink to="/inicio" class="call-back">Voltar</NuxtLink>
    </header>

    <div class="call-body">
      <div v-if="phase === 'loading'" class="call-state">
        <PatientLoadingLogo size="md" animated />
        <p>Preparando a chamada…</p>
      </div>

      <div v-else-if="phase === 'error'" class="call-state call-state--error">
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" @click="loadCall">Tentar de novo</button>
        <NuxtLink to="/inicio" class="btn-secondary">Ir para o início</NuxtLink>
      </div>

      <div v-else-if="phase === 'gate'" class="call-gate">
        <div class="call-gate-card">
          <div class="call-gate-icon" aria-hidden="true">
            <Video />
          </div>
          <h2>Entrar na consulta</h2>
          <p>
            Você vai entrar como <strong>{{ displayName }}</strong>.
            Permita <strong>câmera</strong> e <strong>microfone</strong> quando o celular pedir.
          </p>

          <p v-if="permissionHint" class="call-gate-hint">{{ permissionHint }}</p>

          <button
            type="button"
            class="call-gate-primary"
            :disabled="requestingMedia"
            @click="enterCall"
          >
            {{ requestingMedia ? 'Abrindo…' : 'Permitir câmera e entrar' }}
          </button>

          <button
            v-if="directRoomUrl"
            type="button"
            class="call-gate-secondary"
            @click="openDirectRoom"
          >
            Abrir em tela cheia
          </button>
        </div>
      </div>

      <PatientsCfVideoCall
        v-else-if="phase === 'live' && roomUrl"
        ref="jitsiRef"
        :room-url="roomUrl"
        :room-name="roomName"
        :jitsi-domain="jitsiDomain"
        :display-name="displayName"
        :prepared-tracks="preparedTracks"
        :prepared-warning="preparedWarning"
        role="guest"
        @ready="onCallReady"
        @error="onJitsiError"
        @left="onGuestLeft"
      />
    </div>
  </div>
</template>

<script setup>
// pwa-cache-bust: 2026-07-10-mobile-meet
import { markRaw } from 'vue'
import { Video } from 'lucide-vue-next'
import { usePatientTabBar } from '~/composables/usePatientTabBar'
import {
  preloadJitsiLib,
  prepareJitsiLocalTracks,
} from '~/composables/useJitsiMediaCall.js'
import { preloadVirtualBackgroundEngine } from '~/utils/jitsi-background-blur.js'

definePageMeta({
  layout: false,
  middleware: 'patient-only',
  pageTransition: false,
})

useSeoMeta({
  title: 'Chamada de vídeo — Clube Florescer',
})

const { suppress: suppressTabBar, release: releaseTabBar } = usePatientTabBar()

const route = useRoute()
const router = useRouter()
const apiBase = useApiBase()
const { patientFetchInit } = usePatientLocalTime()
const { userFullName } = usePatientApp()

const phase = ref('loading')
const error = ref('')
const callId = ref('')
const roomUrl = ref('')
const roomName = ref('')
const jitsiDomain = ref('meet.nutrisabellajardim.com.br')
const title = ref('Chamada de vídeo')
const subtitle = ref('')
const permissionHint = ref('')
const requestingMedia = ref(false)
const jitsiRef = ref(null)
const leaving = ref(false)
const preparedTracks = ref(null)
const preparedWarning = ref('')
/** Depois que o CfVideoCall assume as tracks, o parent não pode dispose. */
let tracksHandedOff = false

const displayName = computed(() => {
  const full = String(userFullName?.() || '').trim()
  if (full && full !== 'Paciente') return full
  return 'Paciente'
})

function buildDirectRoomUrl() {
  if (!roomUrl.value) return ''
  const domain = String(jitsiDomain.value || 'meet.nutrisabellajardim.com.br')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
  const room = String(roomName.value || '').trim()
  if (!domain || !room) return roomUrl.value

  const name = encodeURIComponent(displayName.value || 'Paciente')
  const hash = [
    `userInfo.displayName="${name}"`,
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.deeplinking.disabled=true',
    'interfaceConfig.MOBILE_APP_PROMO=false',
  ].join('&')
  return `https://${domain}/${encodeURIComponent(room)}#${hash}`
}

const directRoomUrl = computed(() => buildDirectRoomUrl())

function queryValue(key) {
  const raw = route.query[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function isSecureMediaContext() {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function clearPreparedTracksRef() {
  preparedTracks.value = null
  preparedWarning.value = ''
}

function disposePreparedTracks() {
  const tracks = preparedTracks.value
  clearPreparedTracksRef()
  if (tracksHandedOff) return
  if (!Array.isArray(tracks)) return
  for (const track of tracks) {
    try { track.dispose?.() } catch { /* ignore */ }
  }
}

async function enterCall() {
  requestingMedia.value = true
  permissionHint.value = ''
  try {
    if (!isSecureMediaContext()) {
      permissionHint.value = 'Use o app em HTTPS (ou o tunnel) para a câmera funcionar.'
      return
    }

    // Tracks + motor VB no toque — no iOS o gesto morre se abrir a câmera depois.
    const [, prepared] = await Promise.all([
      preloadVirtualBackgroundEngine().catch(() => false),
      prepareJitsiLocalTracks(jitsiDomain.value),
    ])
    if (!prepared.tracks.length) {
      permissionHint.value = prepared.warning || 'Não foi possível acessar câmera/microfone.'
      return
    }

    tracksHandedOff = false
    disposePreparedTracks()
    preparedTracks.value = markRaw(prepared.tracks)
    preparedWarning.value = prepared.warning || ''
    phase.value = 'live'
    subtitle.value = 'Conectando…'
  } catch (err) {
    const msg = String(err?.message || err || '').trim()
    permissionHint.value = (!msg || msg === 'undefined')
      ? 'Não foi possível ativar câmera/microfone.'
      : msg
  } finally {
    requestingMedia.value = false
  }
}

async function loadCall() {
  phase.value = 'loading'
  error.value = ''
  roomUrl.value = ''
  roomName.value = ''
  permissionHint.value = ''
  tracksHandedOff = false
  disposePreparedTracks()

  const fromQuery = String(queryValue('callId') || '').trim()

  try {
    let call = null
    if (fromQuery) {
      const data = await $fetch(
        `${apiBase.value}/patients/me/video-call/${fromQuery}`,
        patientFetchInit(),
      )
      call = data?.call
    } else {
      const active = await $fetch(`${apiBase.value}/patients/me/video-call`, patientFetchInit())
      if (!active?.call?.id) {
        throw new Error('Nenhuma chamada ativa no momento. Peça para sua nutricionista ligar novamente.')
      }
      const data = await $fetch(
        `${apiBase.value}/patients/me/video-call/${active.call.id}`,
        patientFetchInit(),
      )
      call = data?.call
    }

    if (!call?.roomUrl || !call?.id) {
      throw new Error('Nenhuma chamada ativa no momento. Peça para sua nutricionista ligar novamente.')
    }

    callId.value = call.id
    roomUrl.value = call.roomUrl
    roomName.value = call.roomName || ''
    jitsiDomain.value = call.jitsiDomain || 'meet.nutrisabellajardim.com.br'
    title.value = call.nutriName ? `Com ${call.nutriName}` : 'Chamada de vídeo'
    subtitle.value = `Entrando como ${displayName.value}`
    phase.value = 'gate'

    // Pré-carrega lib + motor de fundo virtual enquanto o usuário lê o gate.
    void preloadJitsiLib(jitsiDomain.value).catch(() => {})
    void preloadVirtualBackgroundEngine().catch(() => {})

    if (!fromQuery || fromQuery !== call.id) {
      await router.replace({
        path: '/chamada',
        query: { callId: call.id, room: call.roomName },
      })
    }
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Não foi possível entrar na chamada.'
    phase.value = 'error'
  }
}

function openDirectRoom() {
  if (!directRoomUrl.value) return
  window.location.href = directRoomUrl.value
}

function onJitsiError(message) {
  const msg = String(message || '').trim()
  if (!msg || msg === 'undefined') {
    error.value = 'Não foi possível ativar câmera/microfone. Tente de novo.'
  } else {
    error.value = msg
  }
  // Não derruba a tela inteira se já estiver ao vivo
  if (phase.value !== 'live') phase.value = 'error'
}

function onCallReady() {
  // CfVideoCall já assumiu as tracks — parent só limpa a ref
  tracksHandedOff = true
  clearPreparedTracksRef()
}

async function leaveCall({ jitsiAlreadyLeft = false } = {}) {
  if (leaving.value) return
  leaving.value = true
  const id = callId.value
  if (!jitsiAlreadyLeft) {
    try {
      await jitsiRef.value?.leaveLocally?.()
    } catch {
      // ignore
    }
  }
  roomUrl.value = ''
  callId.value = ''
  if (id) {
    try {
      // Paciente só sai — não encerra a sala da nutri (backend: { left: true })
      await $fetch(
        `${apiBase.value}/patients/me/video-call/${id}/end`,
        patientFetchInit({ method: 'POST' }),
      )
    } catch {
      // segue mesmo se o aviso falhar
    }
  }
  try {
    await navigateTo('/inicio')
  } catch {
    if (typeof window !== 'undefined') window.location.href = '/inicio'
  }
}

function onGuestLeft() {
  if (leaving.value) return
  void leaveCall({ jitsiAlreadyLeft: true })
}

onMounted(() => {
  suppressTabBar()
  loadCall()
})
onBeforeUnmount(() => {
  disposePreparedTracks()
  releaseTabBar()
})
watch(() => route.query.callId, () => {
  if (route.path.startsWith('/chamada')) loadCall()
})
</script>

<style scoped>
.call-page {
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #0f1210;
  color: #f4f6f3;
  overflow: hidden;
}

.call-page--live {
  background: #000;
}

.call-page--live .call-body {
  background: #000;
}

.call-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  padding-top: max(0.75rem, env(safe-area-inset-top));
  background: #171b17;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.call-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8b967c;
}

.call-top-copy h1 {
  margin: 0.15rem 0 0;
  font-size: 1.05rem;
  font-weight: 800;
}

.call-sub {
  margin: 0.2rem 0 0;
  color: #a8b0a6;
  font-size: 0.82rem;
}

.call-end,
.call-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.2rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  border: 0;
  cursor: pointer;
}

.call-end {
  background: #b42318;
  color: #fff;
}

.call-back {
  background: rgba(255, 255, 255, 0.08);
  color: #f4f6f3;
}

.call-body {
  flex: 1;
  min-height: 0;
  height: 0;
  position: relative;
  background: #000;
}

.call-state {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 1.5rem;
  text-align: center;
}

.call-state--error {
  color: #fecaca;
}

.call-state .btn-primary,
.call-state .btn-secondary {
  min-width: 10rem;
}

.call-gate {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: #0f1210;
}

.call-gate-card {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.5rem 1.25rem;
  border-radius: 1.25rem;
  background: #1a1f1a;
  text-align: center;
}

.call-gate-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(139, 150, 124, 0.2);
  color: #c5d0b8;
}

.call-gate-icon :deep(svg) {
  width: 1.6rem;
  height: 1.6rem;
}

.call-gate-card h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.call-gate-card p {
  margin: 0;
  color: #b8c0b5;
  font-size: 0.92rem;
  line-height: 1.45;
}

.call-gate-hint {
  color: #fbbf24 !important;
  font-size: 0.84rem !important;
}

.call-gate-primary,
.call-gate-secondary {
  width: 100%;
  min-height: 3rem;
  border: 0;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
}

.call-gate-primary {
  margin-top: 0.35rem;
  background: #8b967c;
  color: #fff;
}

.call-gate-primary:disabled {
  opacity: 0.65;
  cursor: wait;
}

.call-gate-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f4f6f3;
}
</style>
