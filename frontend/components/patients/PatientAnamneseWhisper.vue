<template>
  <div class="paw">
    <div class="paw-toolbar">
      <div class="paw-create">
        <button
          type="button"
          class="btn-primary paw-create-btn"
          @click="menuOpen = !menuOpen"
        >
          Nova Anamnese +
        </button>
        <span class="paw-counter">{{ counterLabel }}</span>

        <div v-if="menuOpen" class="paw-menu" role="menu">
          <button type="button" class="paw-menu-item" role="menuitem" @click="onNewForm">
            <Plus class="paw-menu-icon" />
            <span>Nova anamnese</span>
          </button>
          <button type="button" class="paw-menu-item" role="menuitem" @click="startBackgroundSession">
            <Layers class="paw-menu-icon" />
            <span>Segundo plano</span>
          </button>
          <button type="button" class="paw-menu-item" role="menuitem" @click="startRecordSession">
            <Mic class="paw-menu-icon" />
            <span>Gravar e transcrever</span>
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="sessionVisible"
        class="paw-bar"
        :class="{ 'paw-bar--recording': isRecording }"
      >
        <div class="paw-bar-left">
          <GripVertical class="paw-bar-grip" aria-hidden="true" />
          <div class="paw-bar-copy">
            <strong>Nova anamnese</strong>
            <small>{{ sessionSubtitle }}</small>
          </div>
          <button
            v-if="sessionMode === 'background'"
            type="button"
            class="btn-primary paw-bar-open"
            @click="openFormFromBar"
          >
            Abrir
          </button>
        </div>

        <div class="paw-bar-center">
          <button
            v-if="!isRecording && !isTranscribing"
            type="button"
            class="paw-bar-action"
            @click="startRecording"
          >
            Iniciar gravação
          </button>
          <button
            v-else-if="isRecording"
            type="button"
            class="paw-bar-action paw-bar-action--stop"
            @click="stopAndTranscribe"
          >
            Parar e transcrever · {{ durationLabel }}
          </button>
          <span v-else class="paw-bar-action paw-bar-action--busy">
            Transcrevendo com Whisper…
          </span>
        </div>

        <div class="paw-bar-right">
          <label class="paw-mic">
            <Mic class="paw-mic-icon" aria-hidden="true" />
            <select v-model="selectedDeviceId" :disabled="isRecording || isTranscribing">
              <option
                v-for="device in microphones"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label || 'Microfone' }}
              </option>
            </select>
          </label>
          <button type="button" class="paw-bar-close" aria-label="Fechar" @click="closeSession">
            <X :size="16" />
          </button>
        </div>
      </div>
    </Teleport>

    <p v-if="errorMessage" class="paw-error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { GripVertical, Layers, Mic, Plus, X } from 'lucide-vue-next'
import { useGlobalTranscription } from '~/composables/useGlobalTranscription.js'

const props = defineProps({
  patientId: { type: String, required: true },
  patientName: { type: String, default: '' },
  notesCount: { type: Number, default: 0 },
})

const emit = defineEmits(['transcript', 'focus-form'])

const apiBase = useApiBase()
const { enqueueTranscription, isPatientTranscribing } = useGlobalTranscription()
const menuOpen = ref(false)
const sessionVisible = ref(false)
const sessionMode = ref('record') // record | background
const isRecording = ref(false)
const durationSeconds = ref(0)
const errorMessage = ref('')
const microphones = ref([])
const selectedDeviceId = ref('')

let mediaStream = null
let mediaRecorder = null
let chunks = []
let durationTimer = null

const counterLabel = computed(() => `${Math.min(props.notesCount, 5)}/5`)
const isTranscribing = computed(() => isPatientTranscribing(props.patientId))
const durationLabel = computed(() => {
  const secs = Math.max(0, Math.floor(durationSeconds.value))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
const sessionSubtitle = computed(() => {
  if (isTranscribing.value) return 'Whisper processando áudio'
  if (isRecording.value) return 'Gravando…'
  if (sessionMode.value === 'background') return 'Em segundo plano'
  return 'Pronto para gravar'
})

async function loadMicrophones() {
  if (!navigator?.mediaDevices?.enumerateDevices) return
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    microphones.value = devices.filter((d) => d.kind === 'audioinput')
    if (!selectedDeviceId.value && microphones.value[0]) {
      selectedDeviceId.value = microphones.value[0].deviceId
    }
  } catch {
    /* ignore */
  }
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    } catch {
      /* ignore */
    }
  }
  return ''
}

function cleanupStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      try { track.stop() } catch { /* ignore */ }
    })
  }
  mediaStream = null
  mediaRecorder = null
  chunks = []
}

function stopDurationTimer() {
  if (durationTimer) clearInterval(durationTimer)
  durationTimer = null
}

function onNewForm() {
  menuOpen.value = false
  emit('focus-form')
}

function startBackgroundSession() {
  menuOpen.value = false
  sessionMode.value = 'background'
  sessionVisible.value = true
  errorMessage.value = ''
  void loadMicrophones()
}

function startRecordSession() {
  menuOpen.value = false
  sessionMode.value = 'record'
  sessionVisible.value = true
  errorMessage.value = ''
  void loadMicrophones()
}

function openFormFromBar() {
  emit('focus-form')
}

async function startRecording() {
  errorMessage.value = ''
  if (typeof MediaRecorder === 'undefined') {
    errorMessage.value = 'Seu navegador não suporta gravação de áudio.'
    return
  }

  try {
    const constraints = {
      audio: selectedDeviceId.value
        ? { deviceId: { exact: selectedDeviceId.value } }
        : true,
    }
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    await loadMicrophones()

    const mimeType = pickMimeType()
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream)

    chunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data)
    }

    mediaRecorder.start(250)
    isRecording.value = true
    durationSeconds.value = 0
    stopDurationTimer()
    durationTimer = setInterval(() => {
      durationSeconds.value += 1
    }, 1000)
  } catch (err) {
    cleanupStream()
    errorMessage.value = /NotAllowedError|Permission/i.test(String(err?.name || err))
      ? 'Permita o microfone para gravar a anamnese.'
      : 'Não foi possível iniciar a gravação.'
  }
}

function stopRecorder() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null)
      return
    }
    mediaRecorder.onstop = () => {
      const mime = mediaRecorder?.mimeType || 'audio/webm'
      const blob = new Blob(chunks, { type: mime })
      cleanupStream()
      resolve(blob)
    }
    try {
      mediaRecorder.stop()
    } catch {
      cleanupStream()
      resolve(null)
    }
  })
}

async function stopAndTranscribe() {
  stopDurationTimer()
  isRecording.value = false
  errorMessage.value = ''

  try {
    const blob = await stopRecorder()
    if (!blob || !blob.size) {
      throw new Error('Áudio vazio. Grave novamente.')
    }

    const extension = blob.type.includes('ogg')
      ? 'ogg'
      : blob.type.includes('mp4')
        ? 'm4a'
        : 'webm'

    enqueueTranscription({
      patientId: props.patientId,
      patientName: props.patientName,
      blob,
      filename: `anamnese.${extension}`,
      apiBase: apiBase.value,
      onSuccess: (text) => {
        emit('transcript', text)
      },
    })
    sessionMode.value = 'background'
    sessionVisible.value = false
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao iniciar a transcrição.'
  }
}

function closeSession() {
  stopDurationTimer()
  if (isRecording.value) {
    try { mediaRecorder?.stop() } catch { /* ignore */ }
  }
  cleanupStream()
  isRecording.value = false
  sessionVisible.value = false
  menuOpen.value = false
  durationSeconds.value = 0
}

function onDocClick(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.paw-create')) menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  void loadMicrophones()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  closeSession()
})
</script>

<style scoped>
.paw {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.paw-toolbar {
  display: flex;
  align-items: center;
}

.paw-create {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.paw-create-btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.95rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.paw-counter {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: var(--cf-radius-control);
  background: #eef1ee;
  color: #6b7368;
  font-size: 0.75rem;
  font-weight: 500;
}

.paw-menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: 40;
  min-width: 15rem;
  padding: 0.35rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 28px rgba(44, 50, 44, 0.12);
}

.paw-menu-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.6rem 0.7rem;
  border-radius: 0.7rem;
  color: #3f4a3a;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
}

.paw-menu-item:hover {
  background: #eef1ee;
}

.paw-menu-icon {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.7;
  color: #8b967c;
  flex-shrink: 0;
}

.paw-error {
  margin: 0;
  color: #b42318;
  font-size: 0.8rem;
  font-weight: 400;
}

.paw-bar {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  z-index: 120;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: min(920px, calc(100vw - 2rem));
  padding: 0.7rem 0.85rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 14px 36px rgba(44, 50, 44, 0.14);
}

.paw-bar--recording {
  border-color: rgba(139, 150, 124, 0.55);
}

.paw-bar-left,
.paw-bar-right,
.paw-bar-center {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.paw-bar-left {
  min-width: 0;
  flex: 1.2;
}

.paw-bar-center {
  flex: 1;
  justify-content: center;
}

.paw-bar-right {
  flex: 1;
  justify-content: flex-end;
}

.paw-bar-grip {
  width: 1rem;
  height: 1rem;
  color: #a8b0a6;
  flex-shrink: 0;
}

.paw-bar-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.paw-bar-copy strong {
  font-size: 0.84rem;
  font-weight: 600;
  color: #2c322c;
}

.paw-bar-copy small {
  font-size: 0.72rem;
  font-weight: 400;
  color: #8a9288;
}

.paw-bar-open {
  min-height: 2rem !important;
  padding: 0.3rem 0.75rem !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
}

.paw-bar-action {
  border: none;
  background: transparent;
  color: #3f4a3a;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 0.55rem;
}

.paw-bar-action:hover {
  background: #eef1ee;
}

.paw-bar-action--stop {
  color: #b42318;
}

.paw-bar-action--busy {
  cursor: default;
  color: #8b967c;
}

.paw-mic {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  max-width: 12rem;
  padding: 0.25rem 0.45rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #f8f9f8;
}

.paw-mic-icon {
  width: 0.9rem;
  height: 0.9rem;
  color: #8b967c;
  flex-shrink: 0;
}

.paw-mic select {
  min-width: 0;
  width: 100%;
  border: none;
  background: transparent;
  color: #4a524c;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 400;
  outline: none;
}

.paw-bar-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #6b7368;
  cursor: pointer;
}

.paw-bar-close:hover {
  background: #eef1ee;
}

@media (max-width: 820px) {
  .paw-bar {
    flex-direction: column;
    align-items: stretch;
    bottom: 0.75rem;
  }

  .paw-bar-left,
  .paw-bar-center,
  .paw-bar-right {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
