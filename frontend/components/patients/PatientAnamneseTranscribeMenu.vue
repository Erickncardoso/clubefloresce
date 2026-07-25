<template>
  <div ref="rootRef" class="patrans">
    <button
      v-if="!recording && !transcribing"
      type="button"
      class="btn-secondary patrans-trigger"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Mic :size="15" />
      Transcrever
      <ChevronDown :size="14" class="patrans-chevron" :class="{ open }" />
    </button>

    <button
      v-else-if="recording"
      type="button"
      class="btn-secondary patrans-trigger patrans-trigger--stop"
      @click="$emit('stop-record')"
    >
      <Square :size="14" />
      Parar · {{ durationLabel }}
    </button>

    <button
      v-else
      type="button"
      class="btn-secondary patrans-trigger"
      disabled
    >
      Transcrevendo…
    </button>

    <ClientOnly>
    <Teleport to="body">
      <Transition name="patrans-drop">
        <div
          v-if="open && !recording && !transcribing"
          class="patrans-panel"
          :style="panelStyle"
          role="menu"
        >
          <template v-if="recordSetupOpen">
            <button type="button" class="patrans-back" @click="closeRecordSetup">
              ← Voltar
            </button>
            <p class="patrans-panel-title">Gravar consulta</p>
            <p class="patrans-panel-sub">
              Permita o microfone e escolha o dispositivo antes de iniciar.
            </p>

            <p v-if="permissionError" class="patrans-perm-error">{{ permissionError }}</p>

            <div v-if="permissionState === 'unsupported'" class="patrans-setup-block">
              <p class="patrans-setup-copy">Gravação de áudio indisponível neste navegador.</p>
            </div>

            <div v-else-if="permissionState === 'denied'" class="patrans-setup-block">
              <p class="patrans-setup-copy">
                O navegador bloqueou o microfone para este site. Libere nas configurações do site (ícone de cadeado na barra de endereço) e clique em tentar novamente.
              </p>
              <button
                type="button"
                class="btn-primary patrans-setup-btn"
                :disabled="loading"
                @click="onRequestPermission"
              >
                {{ loading ? 'Verificando…' : 'Tentar novamente' }}
              </button>
            </div>

            <div v-else-if="permissionState !== 'granted'" class="patrans-setup-block">
              <p class="patrans-setup-copy">
                O navegador vai pedir permissão para usar o microfone. Você pode escolher o dispositivo em seguida.
              </p>
              <button
                type="button"
                class="btn-primary patrans-setup-btn"
                :disabled="loading"
                @click="onRequestPermission"
              >
                {{ loading ? 'Aguardando permissão…' : 'Permitir microfone' }}
              </button>
            </div>

            <div v-else class="patrans-setup-block">
              <label class="patrans-mic-field">
                <span class="patrans-mic-label">
                  <Mic :size="15" aria-hidden="true" />
                  Microfone
                </span>
                <select
                  v-model="selectedDeviceId"
                  class="patrans-mic-select"
                  :disabled="loading || !microphones.length"
                >
                  <option v-if="!microphones.length" value="">
                    Nenhum microfone encontrado
                  </option>
                  <option
                    v-for="(device, index) in microphones"
                    :key="device.deviceId"
                    :value="device.deviceId"
                  >
                    {{ describeDevice(device, index) }}
                  </option>
                </select>
              </label>

              <button
                type="button"
                class="btn-primary patrans-setup-btn"
                :disabled="loading || !microphones.length"
                @click="confirmRecord"
              >
                Iniciar gravação
              </button>
            </div>
          </template>

          <template v-else>
            <p class="patrans-panel-title">Como deseja transcrever?</p>
            <p class="patrans-panel-sub">Grave uma nova consulta ou importe um arquivo de áudio.</p>

            <button type="button" class="patrans-option" role="menuitem" @click="pick('record')">
              <span class="patrans-option-icon">
                <Mic :size="18" />
              </span>
              <span class="patrans-option-text">
                <strong>Gravar Consulta</strong>
                <small>Gravar um novo áudio durante a consulta.</small>
              </span>
            </button>

            <button type="button" class="patrans-option" role="menuitem" @click="pick('import')">
              <span class="patrans-option-icon">
                <Sparkles :size="18" />
              </span>
              <span class="patrans-option-text">
                <strong>Importar Áudio com IA</strong>
                <small>Enviar um áudio para a Inteligência Artificial transcrever.</small>
              </span>
            </button>

            <button type="button" class="patrans-option patrans-option--disabled" disabled title="Em breve">
              <span class="patrans-option-icon">
                <Video :size="18" />
              </span>
              <span class="patrans-option-text">
                <strong>Gravar Chamada Online</strong>
                <small>Enviar um áudio para transcrição por Inteligência Artificial.</small>
              </span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
    </ClientOnly>

    <input
      ref="fileRef"
      class="patrans-file"
      type="file"
      accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
      @change="onFileChange"
    >
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, Mic, Sparkles, Square, Video } from 'lucide-vue-next'
import { useMicrophoneDevices } from '~/composables/useMicrophoneDevices.js'

defineProps({
  recording: { type: Boolean, default: false },
  transcribing: { type: Boolean, default: false },
  durationLabel: { type: String, default: '0:00' },
})

const emit = defineEmits(['record', 'import-file', 'stop-record'])

const open = ref(false)
const recordSetupOpen = ref(false)
const rootRef = ref(null)
const fileRef = ref(null)
const panelStyle = ref({})

const {
  microphones,
  selectedDeviceId,
  permissionState,
  permissionError,
  loading,
  init,
  refreshDevices,
  requestPermission,
  describeDevice,
} = useMicrophoneDevices()

function updatePanelPosition() {
  if (!rootRef.value || !import.meta.client) return
  const rect = rootRef.value.getBoundingClientRect()
  panelStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${Math.max(12, rect.right - 352)}px`,
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    recordSetupOpen.value = false
    return
  }
  nextTick(updatePanelPosition)
})

async function openRecordSetup() {
  recordSetupOpen.value = true
  await init()
  nextTick(updatePanelPosition)
}

function closeRecordSetup() {
  recordSetupOpen.value = false
}

async function onRequestPermission() {
  await requestPermission()
}

function confirmRecord() {
  if (!selectedDeviceId.value && microphones.value.length) {
    selectedDeviceId.value = microphones.value[0].deviceId
  }
  open.value = false
  recordSetupOpen.value = false
  emit('record', { deviceId: selectedDeviceId.value || '' })
}

function pick(mode) {
  if (mode === 'record') {
    void openRecordSetup()
    return
  }
  open.value = false
  recordSetupOpen.value = false
  if (mode === 'import') {
    fileRef.value?.click?.()
  }
}

function onFileChange(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  emit('import-file', file)
  if (fileRef.value) fileRef.value.value = ''
}

function onDocumentClick(event) {
  if (!open.value) return
  const inPanel = event.target?.closest?.('.patrans-panel')
  if (!rootRef.value?.contains(event.target) && !inPanel) open.value = false
}

function onWindowChange() {
  if (open.value) updatePanelPosition()
}

async function onDeviceChange() {
  if (!recordSetupOpen.value || permissionState.value !== 'granted') return
  await refreshDevices()
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('mousedown', onDocumentClick)
    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('mousedown', onDocumentClick)
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange, true)
    navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
  }
})

defineExpose({
  close: () => {
    open.value = false
    recordSetupOpen.value = false
  },
})
</script>

<style scoped>
.patrans {
  position: relative;
}

.patrans-trigger {
  display: inline-flex !important;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.35rem !important;
  padding: 0.4rem 0.75rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.patrans-trigger--stop {
  color: #b42318 !important;
  border-color: rgba(180, 35, 24, 0.25) !important;
  background: rgba(180, 35, 24, 0.08) !important;
}

.patrans-chevron {
  transition: transform 0.15s ease;
}

.patrans-chevron.open {
  transform: rotate(180deg);
}

.patrans-panel {
  position: fixed;
  z-index: 10250;
  width: min(22rem, calc(100vw - 24px));
  padding: 0.85rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: 0.625rem;
  box-shadow: 0 12px 32px rgba(28, 32, 28, 0.14);
}

.patrans-panel-title {
  margin: 0 0 0.25rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #2c322c;
}

.patrans-panel-sub {
  margin: 0 0 0.65rem;
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.35;
  color: #6b7368;
}

.patrans-back {
  display: inline-flex;
  align-items: center;
  margin: 0 0 0.55rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #6b7368;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
}

.patrans-back:hover {
  color: #2c322c;
}

.patrans-setup-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.patrans-setup-copy {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #5f675f;
}

.patrans-setup-btn {
  width: 100%;
  min-height: 2.35rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.patrans-perm-error {
  margin: 0 0 0.65rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.5rem;
  background: rgba(180, 35, 24, 0.08);
  color: #b42318;
  font-size: 0.76rem;
  line-height: 1.4;
}

.patrans-mic-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.patrans-mic-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: #2c322c;
}

.patrans-mic-select {
  width: 100%;
  min-height: 2.35rem;
  padding: 0.45rem 0.65rem;
  border: 1.5px solid #e0e5e0;
  border-radius: 0.625rem;
  background: #f8f9f8;
  color: #2c322c;
  font: inherit;
  font-size: 0.8rem;
  outline: none;
}

.patrans-mic-select:focus {
  border-color: #8b967c;
}

.patrans-option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  width: 100%;
  margin-bottom: 0.45rem;
  padding: 0.75rem 0.8rem;
  border: 1.5px solid #e0e5e0;
  border-radius: 0.625rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.patrans-option:last-child {
  margin-bottom: 0;
}

.patrans-option:hover:not(:disabled) {
  border-color: #8b967c;
  background: #f8faf8;
}

.patrans-option--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.patrans-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.375rem;
  background: rgba(139, 150, 124, 0.12);
  color: #6b7a62;
}

.patrans-option-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.patrans-option-text strong {
  font-size: 0.84rem;
  font-weight: 600;
  color: #2c322c;
}

.patrans-option-text small {
  font-size: 0.74rem;
  font-weight: 400;
  line-height: 1.35;
  color: #6b7368;
}

.patrans-file {
  display: none;
}

.patrans-drop-enter-active,
.patrans-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.patrans-drop-enter-from,
.patrans-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
