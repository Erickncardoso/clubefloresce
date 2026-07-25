<template>
  <Transition name="cfvc-settings">
    <div
      v-if="open"
      class="cfvc-settings-root"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações"
      @pointerdown.stop
    >
      <button type="button" class="cfvc-settings-scrim" aria-label="Fechar" @click="$emit('close')" />
      <div class="cfvc-settings-modal">
        <aside class="cfvc-settings-nav">
          <h2>Configurações</h2>
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="cfvc-settings-nav-btn"
            :class="{ 'is-active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="18" aria-hidden="true" />
            <span>{{ tab.label }}</span>
          </button>
        </aside>

        <section class="cfvc-settings-body">
          <header class="cfvc-settings-head">
            <strong>{{ currentTabLabel }}</strong>
            <button type="button" class="cfvc-settings-x" aria-label="Fechar" @click="$emit('close')">
              <X :size="18" />
            </button>
          </header>

          <!-- Áudio -->
          <div v-show="activeTab === 'audio'" class="cfvc-settings-pane">
            <div class="cfvc-settings-field">
              <label>Microfone</label>
              <select
                class="cfvc-settings-select"
                :value="selectedMicId"
                :disabled="!audioInputs.length"
                @change="onMicChange"
              >
                <option v-if="!audioInputs.length" value="">Nenhum microfone</option>
                <option
                  v-for="d in audioInputs"
                  :key="d.deviceId"
                  :value="d.deviceId"
                >
                  {{ d.label }}
                </option>
              </select>
              <div class="cfvc-settings-meter" aria-hidden="true">
                <span
                  v-for="i in 10"
                  :key="i"
                  class="cfvc-settings-meter-bar"
                  :class="{ 'is-on': micLevel * 10 >= i }"
                />
              </div>
            </div>

            <label class="cfvc-settings-check">
              <input
                type="checkbox"
                :checked="noiseSuppression"
                @change="$emit('toggle-noise', $event.target.checked)"
              >
              <span>Habilitar supressão de ruído</span>
            </label>

            <div class="cfvc-settings-field">
              <label>Saída de áudio</label>
              <div class="cfvc-settings-row">
                <select
                  class="cfvc-settings-select"
                  :value="selectedSpeakerId"
                  :disabled="!audioOutputSupported || !audioOutputs.length"
                  @change="onSpeakerChange"
                >
                  <option v-if="!audioOutputs.length" value="">Padrão do sistema</option>
                  <option
                    v-for="d in audioOutputs"
                    :key="d.deviceId"
                    :value="d.deviceId"
                  >
                    {{ d.label }}
                  </option>
                </select>
                <button type="button" class="cfvc-settings-test" @click="$emit('test-sound')">
                  Tocar um som de teste
                </button>
              </div>
              <p v-if="!audioOutputSupported" class="cfvc-settings-hint">
                Troca de saída de áudio não suportada neste navegador.
              </p>
            </div>
          </div>

          <!-- Vídeo -->
          <div v-show="activeTab === 'video'" class="cfvc-settings-pane">
            <div class="cfvc-settings-field">
              <label>Câmera</label>
              <select
                class="cfvc-settings-select"
                :value="selectedCamId"
                :disabled="!videoInputs.length || isSharingScreen"
                @change="onCamChange"
              >
                <option v-if="!videoInputs.length" value="">Nenhuma câmera</option>
                <option
                  v-for="d in videoInputs"
                  :key="d.deviceId"
                  :value="d.deviceId"
                >
                  {{ d.label }}
                </option>
              </select>
              <p v-if="isSharingScreen" class="cfvc-settings-hint">
                Pare o compartilhamento de tela para trocar a câmera.
              </p>
            </div>

            <div class="cfvc-settings-preview">
              <video
                v-if="previewStream"
                ref="previewEl"
                class="cfvc-settings-preview-video"
                autoplay
                playsinline
                muted
              />
              <div v-else class="cfvc-settings-preview-empty">
                {{ cameraOff ? 'Câmera desligada' : 'Pré-visualização indisponível' }}
              </div>
            </div>

            <button
              type="button"
              class="cfvc-settings-secondary"
              :disabled="cameraOff || isSharingScreen"
              @click="$emit('flip-camera')"
            >
              Inverter câmera
            </button>
          </div>

          <!-- Fundos virtuais -->
          <div v-show="activeTab === 'backgrounds'" class="cfvc-settings-pane">
            <div class="cfvc-settings-field">
              <label>Desfoque</label>
              <div class="cfvc-settings-chips">
                <button
                  type="button"
                  class="cfvc-settings-chip"
                  :class="{ 'is-on': backgroundMode === 'none' }"
                  @click="$emit('set-background', 'none')"
                >
                  Nenhum
                </button>
                <button
                  type="button"
                  class="cfvc-settings-chip"
                  :class="{ 'is-on': backgroundMode === 'soft' }"
                  @click="$emit('set-background', 'soft')"
                >
                  Suave
                </button>
                <button
                  type="button"
                  class="cfvc-settings-chip"
                  :class="{ 'is-on': backgroundMode === 'blur' }"
                  @click="$emit('set-background', 'blur')"
                >
                  Forte
                </button>
              </div>
            </div>

            <div class="cfvc-settings-field">
              <label>Planos de fundo</label>
              <div class="cfvc-settings-bg-grid">
                <button
                  v-for="bg in presets"
                  :key="bg.id"
                  type="button"
                  class="cfvc-settings-bg"
                  :class="{ 'is-on': backgroundMode === ('image:' + bg.id) }"
                  :title="bg.label"
                  :style="{ backgroundImage: 'url(' + bg.url + ')' }"
                  @click="$emit('set-background-image', bg)"
                >
                  <span>{{ bg.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Moderador -->
          <div v-if="showModerator" v-show="activeTab === 'moderator'" class="cfvc-settings-pane">
            <p class="cfvc-settings-desc">
              Com a sala de espera ativa, novos participantes aguardam sua aprovação antes de entrar.
            </p>
            <label class="cfvc-settings-check">
              <input
                type="checkbox"
                :checked="lobbyEnabled"
                :disabled="!lobbySupported && !lobbyEnabled"
                @change="$emit('toggle-lobby', $event.target.checked)"
              >
              <span>Habilitar sala de espera</span>
            </label>
            <p v-if="lobbyEnabled" class="cfvc-settings-hint">
              {{ lobbyPendingCount ? `${lobbyPendingCount} aguardando aprovação.` : 'Ninguém na sala de espera.' }}
            </p>
          </div>

          <footer class="cfvc-settings-foot">
            <button type="button" class="cfvc-settings-cancel" @click="$emit('close')">Cancelar</button>
            <button type="button" class="cfvc-settings-ok" @click="$emit('close')">OK</button>
          </footer>
        </section>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import {
  Image,
  Mic,
  Shield,
  Video,
  X,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialTab: { type: String, default: 'audio' },
  audioInputs: { type: Array, default: () => [] },
  videoInputs: { type: Array, default: () => [] },
  audioOutputs: { type: Array, default: () => [] },
  selectedMicId: { type: String, default: '' },
  selectedCamId: { type: String, default: '' },
  selectedSpeakerId: { type: String, default: '' },
  audioOutputSupported: { type: Boolean, default: false },
  noiseSuppression: { type: Boolean, default: false },
  micLevel: { type: Number, default: 0 },
  backgroundMode: { type: String, default: 'none' },
  presets: { type: Array, default: () => [] },
  isSharingScreen: { type: Boolean, default: false },
  cameraOff: { type: Boolean, default: false },
  previewStream: { type: Object, default: null },
  showModerator: { type: Boolean, default: false },
  lobbyEnabled: { type: Boolean, default: false },
  lobbySupported: { type: Boolean, default: false },
  lobbyPendingCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'close',
  'set-mic',
  'set-cam',
  'set-speaker',
  'toggle-noise',
  'test-sound',
  'flip-camera',
  'set-background',
  'set-background-image',
  'toggle-lobby',
])

const activeTab = ref('audio')
const previewEl = ref(null)

const tabs = computed(() => {
  const list = [
    { id: 'audio', label: 'Áudio', icon: Mic },
    { id: 'video', label: 'Vídeo', icon: Video },
    { id: 'backgrounds', label: 'Fundos virtuais', icon: Image },
  ]
  if (props.showModerator) {
    list.push({ id: 'moderator', label: 'Moderador', icon: Shield })
  }
  return list
})

const currentTabLabel = computed(() => {
  return tabs.value.find((t) => t.id === activeTab.value)?.label || 'Configurações'
})

watch(
  () => props.open,
  (open) => {
    if (open) activeTab.value = props.initialTab || 'audio'
  },
)

watch(
  () => props.previewStream,
  (stream) => {
    nextTick(() => {
      const el = previewEl.value
      if (!el) return
      try {
        el.srcObject = stream || null
        if (stream) el.play?.().catch?.(() => {})
      } catch { /* ignore */ }
    })
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  if (tab !== 'video') return
  nextTick(() => {
    const el = previewEl.value
    if (el && props.previewStream) {
      try {
        el.srcObject = props.previewStream
        el.play?.().catch?.(() => {})
      } catch { /* ignore */ }
    }
  })
})

function onMicChange(ev) {
  const id = ev?.target?.value
  if (id) emit('set-mic', id)
}

function onCamChange(ev) {
  const id = ev?.target?.value
  if (id) emit('set-cam', id)
}

function onSpeakerChange(ev) {
  const id = ev?.target?.value
  if (id) emit('set-speaker', id)
}
</script>

<style scoped>
.cfvc-settings-root {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  pointer-events: auto;
}

.cfvc-settings-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.cfvc-settings-modal {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  width: min(760px, calc(100vw - 2rem));
  max-height: min(560px, calc(100vh - 2rem));
  border-radius: 12px;
  overflow: hidden;
  background: #292a2d;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  color: #e8eaed;
}

.cfvc-settings-nav {
  background: #1e1f20;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: auto;
}

.cfvc-settings-nav h2 {
  margin: 0 0.5rem 0.85rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
}

.cfvc-settings-nav-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #e8eaed;
  padding: 0.65rem 0.75rem;
  font-size: 0.92rem;
  text-align: left;
  cursor: pointer;
  position: relative;
}

.cfvc-settings-nav-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cfvc-settings-nav-btn.is-active {
  background: rgba(138, 180, 248, 0.14);
  color: #aecbfa;
}

.cfvc-settings-nav-btn.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #8ab4f8;
}

.cfvc-settings-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #292a2d;
}

.cfvc-settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.1rem 0.5rem;
}

.cfvc-settings-head strong {
  font-size: 1.05rem;
}

.cfvc-settings-x {
  border: 0;
  background: transparent;
  color: #e8eaed;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.cfvc-settings-x:hover {
  background: rgba(255, 255, 255, 0.08);
}

.cfvc-settings-pane {
  flex: 1;
  overflow: auto;
  padding: 0.5rem 1.1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cfvc-settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.cfvc-settings-field > label {
  font-size: 0.85rem;
  color: #9aa0a6;
}

.cfvc-settings-select {
  width: 100%;
  border: 1px solid #5f6368;
  border-radius: 8px;
  background: #1e1f20;
  color: #e8eaed;
  padding: 0.65rem 0.75rem;
  font-size: 0.92rem;
}

.cfvc-settings-select:disabled {
  opacity: 0.55;
}

.cfvc-settings-row {
  display: flex;
  gap: 0.6rem;
  align-items: stretch;
}

.cfvc-settings-row .cfvc-settings-select {
  flex: 1;
  min-width: 0;
}

.cfvc-settings-test,
.cfvc-settings-secondary {
  border: 0;
  border-radius: 999px;
  background: #3c4043;
  color: #e8eaed;
  padding: 0.55rem 0.95rem;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
}

.cfvc-settings-test:hover,
.cfvc-settings-secondary:hover {
  background: #5f6368;
}

.cfvc-settings-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cfvc-settings-meter {
  display: flex;
  gap: 3px;
  height: 10px;
  align-items: flex-end;
}

.cfvc-settings-meter-bar {
  flex: 1;
  height: 100%;
  border-radius: 2px;
  background: #5f6368;
  opacity: 0.35;
}

.cfvc-settings-meter-bar.is-on {
  background: #81c995;
  opacity: 1;
}

.cfvc-settings-check {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
  cursor: pointer;
  user-select: none;
}

.cfvc-settings-check input {
  width: 16px;
  height: 16px;
  accent-color: #8ab4f8;
}

.cfvc-settings-hint,
.cfvc-settings-desc {
  margin: 0;
  font-size: 0.82rem;
  color: #9aa0a6;
  line-height: 1.4;
}

.cfvc-settings-preview {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  overflow: hidden;
  background: #1e1f20;
}

.cfvc-settings-preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.cfvc-settings-preview-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #9aa0a6;
  font-size: 0.9rem;
}

.cfvc-settings-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.cfvc-settings-chip {
  border: 0;
  border-radius: 999px;
  background: #3c4043;
  color: #e8eaed;
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.cfvc-settings-chip.is-on {
  background: rgba(138, 180, 248, 0.22);
  color: #aecbfa;
}

.cfvc-settings-bg-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.cfvc-settings-bg {
  position: relative;
  border: 2px solid transparent;
  border-radius: 10px;
  aspect-ratio: 16 / 10;
  background: #3c4043 center / cover no-repeat;
  cursor: pointer;
  overflow: hidden;
}

.cfvc-settings-bg.is-on {
  border-color: #8ab4f8;
}

.cfvc-settings-bg span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.35rem 0.45rem;
  background: rgba(32, 33, 36, 0.82);
  color: #fff;
  font-size: 0.75rem;
  text-align: left;
}

.cfvc-settings-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.cfvc-settings-cancel {
  border: 0;
  background: transparent;
  color: #aecbfa;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.9rem;
}

.cfvc-settings-cancel:hover {
  background: rgba(138, 180, 248, 0.12);
}

.cfvc-settings-ok {
  border: 0;
  background: #8ab4f8;
  color: #202124;
  padding: 0.55rem 1.15rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.cfvc-settings-ok:hover {
  background: #aecbfa;
}

.cfvc-settings-enter-active,
.cfvc-settings-leave-active {
  transition: opacity 0.16s ease;
}

.cfvc-settings-enter-active .cfvc-settings-modal,
.cfvc-settings-leave-active .cfvc-settings-modal {
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.cfvc-settings-enter-from,
.cfvc-settings-leave-to {
  opacity: 0;
}

.cfvc-settings-enter-from .cfvc-settings-modal,
.cfvc-settings-leave-to .cfvc-settings-modal {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}

@media (max-width: 720px) {
  .cfvc-settings-modal {
    grid-template-columns: 1fr;
    width: min(100vw - 1rem, 520px);
    max-height: min(90vh, 640px);
  }

  .cfvc-settings-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.65rem;
    gap: 0.35rem;
  }

  .cfvc-settings-nav h2 {
    display: none;
  }

  .cfvc-settings-nav-btn {
    flex: 0 0 auto;
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
  }

  .cfvc-settings-nav-btn span {
    white-space: nowrap;
  }

  .cfvc-settings-nav-btn.is-active::before {
    display: none;
  }

  .cfvc-settings-row {
    flex-direction: column;
  }

  .cfvc-settings-bg-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
