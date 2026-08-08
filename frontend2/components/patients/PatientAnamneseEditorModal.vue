<template>
  <ClientOnly>
  <Teleport to="body">
    <div
      v-if="sheetOpen"
      class="pa-float"
      :class="{
        'pa-float--collapsed': collapsed,
        'pa-float--recording': isRecording,
      }"
    >
      <div
        v-if="collapsed"
        class="pa-float-mini"
        role="status"
        aria-live="polite"
        @click="collapsed = false"
      >
        <span class="pa-float-mini__pulse" :class="{ 'pa-float-mini__pulse--live': isRecording }" />
        <div class="pa-float-mini__copy">
          <strong>{{ draft.title || 'Anamnese' }}</strong>
          <small>{{ miniStatusLabel }}</small>
        </div>
        <button type="button" class="pa-float-mini__expand" aria-label="Expandir anamnese" @click.stop="collapsed = false">
          Expandir
        </button>
      </div>

      <aside
        v-else
        class="pa-float-panel"
        role="dialog"
        aria-labelledby="pa-float-title"
        @click.stop
      >
        <div v-if="statusStripVisible" class="pa-float-status" role="status" aria-live="polite">
          <span class="pa-float-status__dot" :class="statusDotClass" />
          <span class="pa-float-status__text">{{ statusStripLabel }}</span>
          <span v-if="!online" class="pa-float-status__warn">Sem conexão — a gravação continua localmente</span>
        </div>

        <header class="pa-float-head">
          <div class="pa-float-head-main">
            <input
              id="pa-float-title"
              ref="titleRef"
              v-model="draft.title"
              class="pa-float-title"
              type="text"
              maxlength="160"
              placeholder="Título da anamnese"
              aria-label="Título da anamnese"
            >
            <p class="pa-float-hint">Navegue pelas abas do prontuário — a gravação continua em segundo plano.</p>
          </div>
          <div class="pa-float-head-actions">
            <button
              v-if="lastRecordingBlob"
              type="button"
              class="btn-secondary pa-head-btn"
              title="Baixar áudio gravado"
              @click="downloadLastRecording"
            >
              <Download :size="15" />
              Áudio
            </button>
            <button type="button" class="pa-head-btn pa-head-btn--ghost" aria-label="Minimizar" @click="collapsed = true">
              <Minus :size="16" />
            </button>
            <button type="button" class="pa-head-btn pa-head-btn--ghost" aria-label="Fechar" @click="tryClose">
              <X :size="16" />
            </button>
          </div>
        </header>

        <div class="pa-float-body">
          <div class="pa-main">
            <PatientAnamneseRichEditor
              ref="editorRef"
              v-model="draft.content"
            >
              <template #actions>
                <PatientAnamneseTranscribeMenu
                  ref="transcribeMenuRef"
                  :recording="isRecording"
                  :transcribing="isTranscribing"
                  :duration-label="durationLabel"
                  @record="startRecording"
                  @import-file="transcribeAudioFile"
                  @stop-record="stopAndTranscribe"
                />
                <button
                  type="button"
                  class="btn-primary pa-action-btn"
                  :disabled="interpreting || !plainContent.trim()"
                  @click="interpretDraft"
                >
                  <Sparkles :size="15" />
                  {{ interpreting ? 'Interpretando…' : 'Interpretar' }}
                </button>
              </template>
            </PatientAnamneseRichEditor>

            <div v-if="draft.interpretation" class="pa-interpretation">
              <div class="pa-interpretation-head">
                <Sparkles :size="14" />
                <strong>Interpretação</strong>
              </div>
              <p>{{ draft.interpretation }}</p>
            </div>
          </div>

          <aside class="pa-aside">
            <div class="pa-aside-block">
              <label for="pa-restrictions">Restrições alimentares</label>
              <textarea
                id="pa-restrictions"
                v-model="draft.foodRestrictions"
                rows="3"
                placeholder="Separe por vírgulas. Ex: lactose, glúten, amendoim"
              />
            </div>

            <div class="pa-aside-block">
              <span class="pa-aside-label">Guias clínicos</span>
              <div class="pa-guide">
                <strong>Escala Bristol</strong>
                <p>Classificação das fezes para avaliar trânsito intestinal.</p>
                <button type="button" class="btn-secondary pa-guide-btn" disabled title="Em breve">
                  Ver escala Bristol
                </button>
              </div>
              <div class="pa-guide">
                <strong>Escala de urina</strong>
                <p>Referência visual para hidratação e coloração urinária.</p>
                <button type="button" class="btn-secondary pa-guide-btn" disabled title="Em breve">
                  Ver escala de urina
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer class="pa-float-foot">
          <p v-if="errorMessage" class="pa-msg pa-msg--error">{{ errorMessage }}</p>
          <p v-else-if="successMessage" class="pa-msg pa-msg--ok">{{ successMessage }}</p>
          <span v-else class="pa-foot-spacer" />
          <button
            type="button"
            class="btn-secondary pa-foot-btn"
            :disabled="!plainContent.trim()"
            @click="downloadDraftTranscript"
          >
            <Download :size="15" />
            Baixar texto
          </button>
          <button
            type="button"
            class="btn-primary pa-save"
            :disabled="saving || !canSave"
            @click="saveDraft"
          >
            {{ saving ? 'Salvando…' : 'Salvar alterações' }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
  </ClientOnly>
</template>

<script setup>
import { computed, defineModel, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Download, Minus, Sparkles, X } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { micPermissionErrorMessage, pickRecorderMimeType } from '~/composables/useMicrophoneDevices.js'
import { useGlobalTranscription } from '~/composables/useGlobalTranscription.js'
import { useNetworkStatus } from '~/composables/useNetworkStatus.js'
import { downloadBlob, downloadTextFile } from '~/utils/download-blob.js'
import { htmlToPlainTextWithTables } from '~/utils/html-table.js'
import PatientAnamneseRichEditor from '~/components/patients/PatientAnamneseRichEditor.vue'
import PatientAnamneseTranscribeMenu from '~/components/patients/PatientAnamneseTranscribeMenu.vue'

const DEFAULT_CONTENT = [
  '<p><strong>Rotina de Refeição</strong></p>',
  '<p><br></p>',
  '<p><strong>Apetite</strong></p>',
  '<p><br></p>',
  '<p><strong>Sono</strong></p>',
  '<p><br></p>',
  '<p><strong>Ingestão de Água</strong></p>',
  '<p><br></p>',
  '<p><strong>Frequência de Evacuação</strong></p>',
  '<p><br></p>',
  '<p><strong>Hábito Urinário</strong></p>',
  '<p><br></p>',
  '<p><strong>Patologias</strong></p>',
  '<p><br></p>',
  '<p><strong>Uso de Medicamentos</strong></p>',
  '<p><br></p>',
  '<p><strong>Histórico Familiar</strong></p>',
  '<p><br></p>',
].join('')

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  seed: { type: Object, default: null },
})

const emit = defineEmits(['saved', 'closed'])
const sheetOpen = defineModel('sheetOpen', { type: Boolean, default: false })
const collapsed = defineModel('collapsed', { type: Boolean, default: false })

const apiBase = useApiBase()
const { online } = useNetworkStatus()
const {
  enqueueTranscription,
  consumePendingForPatient,
  isPatientTranscribing,
} = useGlobalTranscription()
const editingId = ref('')
const saving = ref(false)
const interpreting = ref(false)
const isRecording = ref(false)
const durationSeconds = ref(0)
const errorMessage = ref('')
const successMessage = ref('')
const editorRef = ref(null)
const titleRef = ref(null)
const transcribeMenuRef = ref(null)
const lastRecordingBlob = ref(null)
const lastRecordingFilename = ref('anamnese.webm')

const draft = reactive({
  title: '',
  content: '',
  interpretation: '',
  foodRestrictions: '',
})

let mediaStream = null
let mediaRecorder = null
let chunks = []
let durationTimer = null

const anamneses = computed(() => {
  const list = Array.isArray(props.profile?.anamneses) ? props.profile.anamneses : []
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const plainContent = computed(() => htmlToPlain(draft.content))
const canSave = computed(() => Boolean(draft.title.trim() || plainContent.value.trim()))
const isTranscribing = computed(() => isPatientTranscribing(props.user?.id))
const durationLabel = computed(() => {
  const secs = Math.max(0, Math.floor(durationSeconds.value))
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
})

const statusStripVisible = computed(() => isRecording.value || isTranscribing.value || !online.value)

const statusStripLabel = computed(() => {
  if (isRecording.value) return `Gravando consulta · ${durationLabel.value}`
  if (isTranscribing.value) return 'Transcrevendo áudio — você pode continuar no prontuário'
  if (!online.value) return 'Conexão instável'
  return ''
})

const statusDotClass = computed(() => {
  if (isRecording.value) return 'pa-float-status__dot--recording'
  if (isTranscribing.value) return 'pa-float-status__dot--processing'
  if (!online.value) return 'pa-float-status__dot--offline'
  return ''
})

const miniStatusLabel = computed(() => {
  if (isRecording.value) return `Gravando · ${durationLabel.value}`
  if (isTranscribing.value) return 'Transcrevendo…'
  return 'Anamnese em segundo plano'
})

function htmlToPlain(html) {
  const value = htmlToPlainTextWithTables(html)
  if (!value.trim()) return ''
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toEditorHtml(raw) {
  const value = String(raw || '').trim()
  if (!value) return DEFAULT_CONTENT
  if (/<[a-z][\s\S]*>/i.test(value)) return value
  return value
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      if (!lines.length) return '<p><br></p>'
      if (lines.length === 1) return `<p><strong>${escapeHtml(lines[0])}</strong></p><p><br></p>`
      return `<p><strong>${escapeHtml(lines[0])}</strong></p><p>${escapeHtml(lines.slice(1).join(' '))}</p>`
    })
    .join('')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function lockScroll() {
  /* camada flutuante — não bloqueia scroll do prontuário */
}

function applySeed() {
  const s = props.seed
  errorMessage.value = ''
  successMessage.value = ''
  lastRecordingBlob.value = null
  if (!s || s.type === 'new') {
    editingId.value = ''
    draft.title = `Anamnese sem título ${Number(s?.count ?? 0) + 1}`
    draft.content = DEFAULT_CONTENT
    draft.interpretation = ''
    draft.foodRestrictions = ''
    return
  }
  if (s.type === 'edit' && s.item) {
    editingId.value = s.item.id
    draft.title = s.item.title || 'Anamnese'
    draft.content = toEditorHtml(s.item.content || '')
    draft.interpretation = s.item.interpretation || ''
    draft.foodRestrictions = s.item.foodRestrictions || ''
  }
}

function applyTranscript(text) {
  const value = String(text || '').trim()
  if (!value) return
  if (/\[(Paciente|Nutricionista)\]:/i.test(value)) {
    editorRef.value?.appendTranscript?.(value)
  } else {
    editorRef.value?.appendText?.(value)
  }
  successMessage.value = 'Consulta transcrita com identificação de falantes.'
  nextTick(() => editorRef.value?.focus?.())
}

function consumePendingTranscription() {
  const pending = consumePendingForPatient(props.user?.id)
  if (!pending?.text) return
  applyTranscript(pending.text)
}

watch(sheetOpen, (isOpen) => {
  if (isOpen) {
    applySeed()
    nextTick(() => {
      editorRef.value?.setHtml?.(draft.content || DEFAULT_CONTENT)
      titleRef.value?.focus?.()
      consumePendingTranscription()
    })
    return
  }
  transcribeMenuRef.value?.close?.()
  stopRecordingCleanup()
})

function close() {
  sheetOpen.value = false
  collapsed.value = false
  emit('closed')
}

function tryClose() {
  if (isRecording.value) {
    const ok = confirm('Há uma gravação em andamento. Deseja fechar a anamnese mesmo assim?')
    if (!ok) return
    stopRecordingCleanup()
  }
  close()
}

async function transcribeAudioBlob(blob, filename = 'anamnese.webm') {
  if (!blob?.size) throw new Error('Áudio vazio.')
  lastRecordingBlob.value = blob
  lastRecordingFilename.value = filename
  enqueueTranscription({
    patientId: props.user.id,
    patientName: props.user?.name || '',
    anamneseTitle: draft.title,
    blob,
    filename,
    apiBase: apiBase.value,
    onSuccess: (text) => applyTranscript(text),
  })
  successMessage.value = 'Transcrição em andamento. Você pode navegar — acompanhe pelo indicador no canto da tela.'
}

async function transcribeAudioFile(file) {
  errorMessage.value = ''
  successMessage.value = ''
  transcribeMenuRef.value?.close?.()
  try {
    const name = String(file?.name || 'anamnese.webm')
    await transcribeAudioBlob(file, name)
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao iniciar a transcrição. O áudio foi preservado — use Baixar áudio no indicador.'
  }
}

function nextAnamneseList(nextItem, removeId = '') {
  const current = Array.isArray(props.profile?.anamneses) ? [...props.profile.anamneses] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, 5)
}

async function patchAnamneses(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        anamneses: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function saveDraft() {
  if (!canSave.value || !props.user?.id) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const now = new Date().toISOString()
    const existing = anamneses.value.find((item) => item.id === editingId.value)
    const item = {
      id: editingId.value || crypto.randomUUID(),
      title: draft.title.trim() || 'Anamnese',
      content: draft.content,
      interpretation: draft.interpretation?.trim() || null,
      foodRestrictions: draft.foodRestrictions?.trim() || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await patchAnamneses(nextAnamneseList(item))
    editingId.value = item.id
    successMessage.value = 'Anamnese salva. Você pode continuar no prontuário.'
  } catch (err) {
    errorMessage.value = err?.data?.error || err?.data?.message || 'Erro ao salvar anamnese.'
  } finally {
    saving.value = false
  }
}

function pickMimeType() {
  return pickRecorderMimeType()
}

function stopRecordingCleanup() {
  if (durationTimer) clearInterval(durationTimer)
  durationTimer = null
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      try { track.stop() } catch { /* ignore */ }
    })
  }
  mediaStream = null
  mediaRecorder = null
  chunks = []
  isRecording.value = false
  durationSeconds.value = 0
}

async function startRecording(options = {}) {
  errorMessage.value = ''
  successMessage.value = ''
  transcribeMenuRef.value?.close?.()

  if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    errorMessage.value = 'Seu navegador não suporta gravação de áudio.'
    return
  }
  if (typeof MediaRecorder === 'undefined') {
    errorMessage.value = 'Seu navegador não suporta gravação de áudio.'
    return
  }

  const deviceId = String(options?.deviceId || '').trim()
  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio })
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
    durationTimer = setInterval(() => { durationSeconds.value += 1 }, 1000)
  } catch (err) {
    stopRecordingCleanup()
    errorMessage.value = micPermissionErrorMessage(err)
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
      stopRecordingCleanup()
      resolve(blob)
    }
    try { mediaRecorder.stop() } catch {
      stopRecordingCleanup()
      resolve(null)
    }
  })
}

async function stopAndTranscribe() {
  isRecording.value = false
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const blob = await stopRecorder()
    const extension = blob?.type?.includes('ogg') ? 'ogg' : blob?.type?.includes('mp4') ? 'm4a' : 'webm'
    await transcribeAudioBlob(blob, `anamnese.${extension}`)
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao iniciar a transcrição. O áudio foi preservado — use Baixar áudio no indicador.'
  }
}

function downloadLastRecording() {
  if (!lastRecordingBlob.value) return
  downloadBlob(lastRecordingBlob.value, lastRecordingFilename.value)
}

function downloadDraftTranscript() {
  const text = plainContent.value.trim()
  if (!text) return
  const base = sanitizeFilename(draft.title || 'anamnese')
  downloadTextFile(text, `${base}.txt`)
}

function sanitizeFilename(value) {
  return String(value || 'anamnese')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'anamnese'
}

async function interpretDraft() {
  if (!plainContent.value.trim()) return
  interpreting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const data = await $fetch(
      `${apiBase.value}/patients/${props.user.id}/anamnese/interpret`,
      authFetchInit({
        method: 'POST',
        body: {
          title: draft.title,
          content: plainContent.value,
        },
      }),
    )
    draft.interpretation = String(data?.interpretation || '').trim()
    successMessage.value = 'Interpretação gerada. Salve para guardar no prontuário.'
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao interpretar anamnese.'
  } finally {
    interpreting.value = false
  }
}

function onKeydown(event) {
  if (event.key === 'Escape' && sheetOpen.value && !collapsed.value) {
    collapsed.value = true
  }
}

onMounted(() => {
  if (import.meta.client) window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
  stopRecordingCleanup()
})
</script>

<style scoped>
.pa-float {
  position: fixed;
  inset: 0;
  z-index: 10100;
  pointer-events: none;
}

.pa-float-panel,
.pa-float-mini {
  pointer-events: auto;
}

.pa-float-panel {
  position: fixed;
  top: 4.75rem;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  width: min(34rem, calc(100vw - 2rem));
  background: #f7f8f6;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.pa-float--recording .pa-float-panel {
  border-color: rgba(180, 35, 24, 0.35);
  box-shadow: 0 18px 48px rgba(180, 35, 24, 0.12);
}

.pa-float-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 0.65rem;
  padding: 0.55rem 0.85rem;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  font-size: 0.76rem;
  font-weight: 600;
  color: #3f4a3a;
}

.pa-float-status__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: #8b967c;
  flex-shrink: 0;
}

.pa-float-status__dot--recording {
  background: #dc2626;
  animation: pa-pulse 1.2s ease-in-out infinite;
}

.pa-float-status__dot--processing {
  background: #8b967c;
  animation: pa-pulse 1.4s ease-in-out infinite;
}

.pa-float-status__dot--offline {
  background: #f59e0b;
}

.pa-float-status__warn {
  color: #b45309;
  font-weight: 500;
}

.pa-float-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.95rem 0.75rem;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  flex-shrink: 0;
}

.pa-float-head-main {
  flex: 1;
  min-width: 0;
}

.pa-float-title {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
  outline: none;
}

.pa-float-title::placeholder {
  color: #9aa39a;
  font-weight: 500;
}

.pa-float-hint {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: #8a9288;
}

.pa-float-head-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.pa-head-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #6b7368;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 500;
  cursor: pointer;
}

.pa-head-btn--ghost {
  width: 2rem;
  padding: 0;
}

.pa-head-btn:hover {
  background: #f3f5f3;
}

.pa-float-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 0.85rem;
  padding: 0.85rem;
  overflow: auto;
}

.pa-float-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
  padding: 0.75rem 0.95rem;
  background: #fff;
  border-top: 1px solid #e8ece9;
  flex-shrink: 0;
}

.pa-float-mini {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 10101;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: min(22rem, calc(100vw - 2rem));
  padding: 0.65rem 0.75rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  cursor: pointer;
}

.pa-float--recording .pa-float-mini {
  border-color: rgba(180, 35, 24, 0.35);
}

.pa-float-mini__pulse {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: #8b967c;
  flex-shrink: 0;
}

.pa-float-mini__pulse--live {
  background: #dc2626;
  animation: pa-pulse 1.2s ease-in-out infinite;
}

.pa-float-mini__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.pa-float-mini__copy strong {
  font-size: 0.82rem;
  color: #2c322c;
}

.pa-float-mini__copy small {
  font-size: 0.72rem;
  color: #8a9288;
}

.pa-float-mini__expand {
  border: none;
  background: rgba(139, 150, 124, 0.12);
  color: #5f6b55;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
}

.pa-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.pa-main :deep(.pare) {
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  min-height: 16rem;
}

.pa-action-btn,
.pa-guide-btn,
.pa-foot-btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.pa-foot-btn {
  display: inline-flex !important;
  align-items: center;
  gap: 0.35rem;
}

.pa-interpretation {
  box-sizing: border-box;
  width: 100%;
  padding: 0.9rem 1rem;
  background: #fff;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
}

.pa-interpretation-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  color: #8b967c;
}

.pa-interpretation-head strong {
  font-size: 0.84rem;
  color: #2c322c;
}

.pa-interpretation p {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.86rem;
  line-height: 1.5;
  color: #3f4a3a;
}

.pa-aside {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pa-aside-block {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.85rem;
  background: #fff;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
}

.pa-aside-block label,
.pa-aside-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2c322c;
}

.pa-aside-block textarea {
  width: 100%;
  resize: vertical;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #f8f9f8;
  padding: 0.7rem 0.8rem;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #2c322c;
  box-sizing: border-box;
}

.pa-guide {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  background: #f8f9f8;
  border-radius: var(--cf-radius-control);
}

.pa-guide strong {
  font-size: 0.82rem;
  color: #2c322c;
}

.pa-guide p {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.4;
  color: #6b7368;
}

.pa-guide-btn {
  align-self: flex-start;
  margin-top: 0.25rem;
  background: #fff;
}

.pa-foot-spacer {
  flex: 1;
}

.pa-save {
  min-width: 10rem !important;
  min-height: 2.55rem !important;
  font-size: 0.88rem !important;
  font-weight: 500 !important;
}

.pa-msg {
  flex: 1;
  min-width: 0;
  margin: 0;
  margin-right: auto;
  font-size: 0.82rem;
  line-height: 1.4;
}

.pa-msg--error {
  color: #b42318;
}

.pa-msg--ok {
  color: #2f6b3a;
}

@keyframes pa-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.92); }
}

@media (max-width: 960px) {
  .pa-float-body {
    grid-template-columns: 1fr;
  }

  .pa-float-panel {
    top: auto;
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    width: auto;
  }
}

@media (max-width: 720px) {
  .pa-float-mini {
    left: 0.75rem;
    right: 0.75rem;
    min-width: 0;
  }
}
</style>
