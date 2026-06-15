<template>
  <Teleport to="body">
    <div v-if="open" class="lesson-modal-overlay" @click.self="requestClose">
      <div class="lesson-modal" role="dialog" aria-modal="true" :aria-label="mode === 'create' ? 'Nova aula' : 'Editar aula'">
        <header class="lesson-modal-head">
          <div>
            <p v-if="context?.courseTitle" class="lesson-modal-breadcrumb">
              {{ context.courseTitle }}
              <span v-if="context.moduleTitle"> / {{ context.moduleTitle }}</span>
            </p>
            <h2>{{ mode === 'create' ? 'Nova aula' : 'Editar aula' }}</h2>
            <p class="lesson-modal-sub">
              <template v-if="mode === 'create'">
                Aula {{ (context?.lessonCount || 0) + 1 }} neste módulo
              </template>
              <template v-else>Atualize vídeo, capa e informações da aula</template>
            </p>
          </div>
          <button type="button" class="lesson-modal-close" aria-label="Fechar" @click="requestClose">
            <X class="icon-sm" />
          </button>
        </header>

        <div class="lesson-steps" aria-label="Progresso do formulário">
          <button
            v-for="step in steps"
            :key="step.id"
            type="button"
            class="lesson-step"
            :class="{
              'lesson-step--active': currentStep === step.id,
              'lesson-step--done': currentStep > step.id,
            }"
            @click="goToStep(step.id)"
          >
            <span class="lesson-step-num">{{ step.id }}</span>
            <span class="lesson-step-label">{{ step.label }}</span>
          </button>
        </div>

        <div class="lesson-modal-body">
          <!-- Passo 1: Vídeo -->
          <section v-show="currentStep === 1" class="lesson-pane">
            <div class="field field--float field--group">
              <label>Fonte do vídeo</label>
              <div class="source-pills">
                <button
                  type="button"
                  class="source-pill"
                  :class="{ active: videoSourceTab === 'link' }"
                  @click="videoSourceTab = 'link'"
                >
                  <Link class="icon-xs" /> YouTube / link
                </button>
                <button
                  type="button"
                  class="source-pill"
                  :class="{ active: videoSourceTab === 'upload' }"
                  @click="videoSourceTab = 'upload'"
                >
                  <Upload class="icon-xs" /> Upload
                </button>
              </div>
            </div>

            <div v-if="videoSourceTab === 'link'" class="field field--float">
              <label for="lesson-video-url">Link do vídeo</label>
              <input
                id="lesson-video-url"
                v-model="form.videoUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                @paste="onVideoUrlPaste"
              >
              <p v-if="isYoutube(form.videoUrl)" class="field-hint field-hint--ok">
                Link do YouTube detectado — a capa será sugerida no próximo passo.
              </p>
            </div>

            <div v-else class="field field--float">
              <label>Arquivo de vídeo</label>
              <input
                ref="videoFileInput"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv"
                class="sr-only"
                @change="handleVideoFileSelect"
              >
              <div
                v-if="!videoFileLocal"
                class="drop-zone"
                @click="videoFileInput?.click()"
                @dragover.prevent
                @drop.prevent="handleVideoDrop"
              >
                <Film class="drop-icon" />
                <span>Clique ou arraste o vídeo aqui</span>
                <small>MP4, MOV ou WEBM · acima de 95 MB será comprimido automaticamente</small>
              </div>
              <div v-else class="file-selected">
                <Film class="icon-xs" />
                <span>{{ videoFileLocal.name }}</span>
                <button type="button" class="btn-text" @click="videoFileInput?.click()">Trocar</button>
              </div>
              <p v-if="videoUploadStatus === 'uploading'" class="field-hint">
                Enviando em segundo plano — acompanhe à direita da tela.
              </p>
              <p v-else-if="videoUploadStatus === 'processing'" class="field-hint">
                Finalizando envio em segundo plano…
              </p>
              <p v-else-if="videoUploadStatus === 'done'" class="field-hint field-hint--ok">Vídeo pronto — pode continuar e salvar a aula.</p>
              <p v-else-if="videoUploadStatus === 'error'" class="field-hint field-hint--err">Erro no upload. Tente selecionar o arquivo novamente.</p>
            </div>

            <div class="field field--float">
              <label for="lesson-duration">Duração</label>
              <input
                id="lesson-duration"
                v-model="form.duration"
                type="text"
                :readonly="durationFromVideo && !durationManualEdit"
                :placeholder="durationFromVideo ? '' : 'Detectada ao carregar o vídeo'"
                @focus="durationManualEdit = true"
              >
              <p v-if="durationFromVideo && !durationManualEdit" class="field-hint field-hint--ok">
                Preenchida automaticamente a partir do vídeo.
              </p>
              <button
                v-else-if="durationFromVideo && durationManualEdit"
                type="button"
                class="btn-text"
                @click="resetDurationFromVideo"
              >
                Usar duração do vídeo
              </button>
            </div>

            <video
              v-if="frameVideoObjectUrl"
              ref="durationProbeRef"
              :src="frameVideoObjectUrl"
              class="sr-only"
              preload="metadata"
              muted
              @loadedmetadata="onDurationProbeLoaded"
              @durationchange="onDurationProbeLoaded"
            />
          </section>

          <!-- Passo 2: Capa -->
          <section v-show="currentStep === 2" class="lesson-pane">
            <div class="field field--float field--group">
              <label>Miniatura da aula</label>
              <div class="source-pills source-pills--thumb">
                <button
                  type="button"
                  class="source-pill"
                  :class="{ active: thumbSourceTab === 'upload' }"
                  @click="thumbSourceTab = 'upload'"
                >
                  <ImageIcon class="icon-xs" /> Imagem
                </button>
                <button
                  type="button"
                  class="source-pill"
                  :class="{ active: thumbSourceTab === 'frame' }"
                  :disabled="!frameVideoObjectUrl"
                  :title="frameVideoObjectUrl ? '' : 'Disponível após upload de vídeo'"
                  @click="thumbSourceTab = 'frame'"
                >
                  <Camera class="icon-xs" /> Frame
                </button>
                <button
                  v-if="isYoutube(form.videoUrl)"
                  type="button"
                  class="source-pill"
                  :class="{ active: thumbSourceTab === 'youtube' }"
                  @click="selectYoutubeThumb"
                >
                  <Play class="icon-xs" /> YouTube
                </button>
              </div>
            </div>

            <div v-if="thumbSourceTab === 'upload'" class="field">
              <input ref="thumbFileInput" type="file" accept="image/*" class="sr-only" @change="handleThumbSelect">
              <div class="thumb-picker" :class="{ 'has-preview': thumbPreview }" @click="thumbFileInput?.click()">
                <img v-if="thumbPreview" :src="thumbPreview" alt="Preview da capa" class="thumb-preview">
                <div v-else class="thumb-empty">
                  <ImageIcon class="drop-icon" />
                  <span>Escolher imagem de capa</span>
                </div>
              </div>
            </div>

            <div v-else-if="thumbSourceTab === 'frame'" class="field">
              <div v-if="frameVideoObjectUrl" class="frame-box">
                <video
                  ref="frameVideoRef"
                  :src="frameVideoObjectUrl"
                  class="frame-video"
                  preload="metadata"
                  muted
                  @loadedmetadata="onFrameVideoLoaded"
                />
                <input
                  type="range"
                  min="0"
                  :max="frameVideoDuration"
                  step="0.1"
                  :value="frameSeekTime"
                  class="frame-slider"
                  @input="onFrameSeekInput"
                >
                <button type="button" class="btn-secondary" @click="captureVideoFrame">
                  <Camera class="icon-xs" /> Capturar frame
                </button>
                <img v-if="thumbPreview && thumbSourceTab === 'frame'" :src="thumbPreview" alt="Frame capturado" class="thumb-preview thumb-preview--inline">
              </div>
              <p v-else class="field-hint">Faça upload do vídeo no passo Vídeo para capturar um frame.</p>
            </div>

            <div v-else class="field">
              <div v-if="thumbPreview" class="thumb-picker has-preview">
                <img :src="thumbPreview" alt="Capa do YouTube" class="thumb-preview">
              </div>
              <p class="field-hint">Capa extraída automaticamente do YouTube.</p>
            </div>
          </section>

          <!-- Passo 3: Informações -->
          <section v-show="currentStep === 3" class="lesson-pane">
            <div class="field field--float">
              <label for="lesson-title">Título da aula</label>
              <input
                id="lesson-title"
                v-model="form.title"
                type="text"
                placeholder="Ex: A importância das proteínas"
                maxlength="160"
                @keydown.enter.prevent="submit(false)"
              >
            </div>
            <div class="field field--float">
              <label for="lesson-summary">Resumo da aula <span class="field-optional">(opcional)</span></label>
              <textarea
                id="lesson-summary"
                v-model="form.content"
                rows="4"
                placeholder="Texto exibido na aba Resumo do player — o que a aluna vai aprender nesta aula..."
                maxlength="2000"
              />
            </div>
            <p class="field-hint">O resumo aparece para a aluna na aba Resumo enquanto assiste à aula.</p>

            <div class="field lesson-links-field">
              <div class="lesson-links-head">
                <label>Links da aula <span class="field-optional">(opcional)</span></label>
                <button type="button" class="lesson-links-add" @click="addLessonLink">
                  <Plus class="icon-xs" /> Adicionar link
                </button>
              </div>
              <p class="field-hint">Aparecem na aba Links do player — Figma, PDFs externos, planilhas, etc.</p>

              <div v-if="lessonLinks.length" class="lesson-links-list">
                <div
                  v-for="(link, index) in lessonLinks"
                  :key="`lesson-link-${index}`"
                  class="lesson-link-row"
                >
                  <div class="lesson-link-row__fields">
                    <input
                      v-model="link.name"
                      type="text"
                      placeholder="Título (ex: Figma da Aula 3)"
                      maxlength="120"
                    >
                    <input
                      v-model="link.url"
                      type="url"
                      placeholder="https://..."
                    >
                  </div>
                  <button
                    type="button"
                    class="lesson-link-row__remove"
                    aria-label="Remover link"
                    @click="removeLessonLink(index)"
                  >
                    <Trash2 class="icon-xs" />
                  </button>
                </div>
              </div>

              <p v-else class="lesson-links-empty">Nenhum link adicionado.</p>
            </div>
          </section>

          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        </div>

        <footer class="lesson-modal-foot">
          <button v-if="currentStep > 1" type="button" class="btn-ghost" :disabled="saving" @click="prevStep">
            Voltar
          </button>
          <button type="button" class="btn-ghost" :disabled="saving" @click="requestClose">Cancelar</button>
          <button
            v-if="currentStep < 3"
            type="button"
            class="btn-primary"
            @click="nextStep"
          >
            Continuar
          </button>
          <button
            v-if="currentStep === 2 && mode === 'create'"
            type="button"
            class="btn-ghost"
            :disabled="saving"
            @click="submit(true)"
          >
            Pular capa
          </button>
          <button
            v-if="currentStep === 3 || mode === 'edit'"
            type="button"
            class="btn-primary"
            :disabled="saving"
            @click="submit(false)"
          >
            <span v-if="saving">Salvando aula...</span>
            <span v-else>{{ mode === 'create' ? 'Criar aula' : 'Salvar alterações' }}</span>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import {
  Camera,
  Film,
  Image as ImageIcon,
  Link,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import { buildLessonLocationPath, formatCloudinaryVideoPath } from '~/utils/video-upload-path'
import { isVideoFile } from '~/utils/upload-file-kind'
import { normalizeFileUploadError, normalizeVideoUploadError, resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  moduleId: { type: String, default: '' },
  lesson: { type: Object, default: null },
  context: {
    type: Object,
    default: () => ({ courseTitle: '', moduleTitle: '', lessonCount: 0 }),
  },
})

const emit = defineEmits(['update:open', 'saved'])

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { showToast } = useAppToast()
const { jobs, enqueueVideoUpload, markJobSaving, completeUploadJob, failUploadJob } = useVideoUploadQueue()

const steps = [
  { id: 1, label: 'Vídeo' },
  { id: 2, label: 'Capa' },
  { id: 3, label: 'Informações' },
]

const currentStep = ref(1)
const formError = ref('')
const saving = ref(false)

const form = reactive({
  id: '',
  title: '',
  content: '',
  duration: '',
  videoUrl: '',
  thumbnail: '',
})

const videoSourceTab = ref('link')
const thumbSourceTab = ref('upload')
const videoFileLocal = ref(null)
const videoUploadStatus = ref('')
const currentUploadJobId = ref(null)
let currentUploadPromise = null
const thumbPreview = ref(null)
const thumbFile = ref(null)
const frameVideoRef = ref(null)
const durationProbeRef = ref(null)
const frameSeekTime = ref(0)
const frameVideoDuration = ref(0)
const frameVideoObjectUrl = ref(null)
const videoFileInput = ref(null)
const thumbFileInput = ref(null)
const durationFromVideo = ref(false)
const durationManualEdit = ref(false)
const detectedDurationSeconds = ref(0)
const lessonLinks = ref([])

function normalizeLessonLinksInput(materials) {
  if (!Array.isArray(materials)) return []
  return materials
    .map((item) => ({
      name: String(item?.name || item?.title || '').trim(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => item.name || item.url)
}

function serializeLessonLinks() {
  return lessonLinks.value
    .map((item) => ({
      name: String(item.name || '').trim(),
      url: String(item.url || '').trim(),
    }))
    .filter((item) => item.name && item.url)
}

function addLessonLink() {
  lessonLinks.value.push({ name: '', url: '' })
}

function removeLessonLink(index) {
  lessonLinks.value.splice(index, 1)
}

function resetState() {
  currentStep.value = 1
  formError.value = ''
  saving.value = false
  form.id = ''
  form.title = ''
  form.content = ''
  form.duration = ''
  form.videoUrl = ''
  form.thumbnail = ''
  videoSourceTab.value = 'upload'
  thumbSourceTab.value = 'upload'
  videoFileLocal.value = null
  videoUploadStatus.value = ''
  currentUploadJobId.value = null
  currentUploadPromise = null
  thumbPreview.value = null
  thumbFile.value = null
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  durationFromVideo.value = false
  durationManualEdit.value = false
  detectedDurationSeconds.value = 0
  lessonLinks.value = []
  if (frameVideoObjectUrl.value) {
    URL.revokeObjectURL(frameVideoObjectUrl.value)
    frameVideoObjectUrl.value = null
  }
}

function populateFromLesson(lesson) {
  if (!lesson) return
  form.id = lesson.id || ''
  form.title = lesson.title || ''
  form.content = lesson.content || ''
  form.duration = lesson.duration || ''
  form.videoUrl = lesson.videoUrl || ''
  form.thumbnail = lesson.thumbnail || ''
  thumbPreview.value = lesson.thumbnail || null
  thumbFile.value = null
  videoSourceTab.value = lesson.videoUrl && !isYoutube(lesson.videoUrl) ? 'link' : 'link'
  thumbSourceTab.value = lesson.thumbnail ? 'upload' : 'upload'
  durationFromVideo.value = false
  durationManualEdit.value = Boolean(lesson.duration)
  lessonLinks.value = normalizeLessonLinksInput(lesson.materials)
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetState()
    if (props.mode === 'edit' && props.lesson) {
      populateFromLesson(props.lesson)
      currentStep.value = 1
    }
  },
)

watch(
  () => form.videoUrl,
  (url) => {
    if (!props.open || videoSourceTab.value !== 'link') return
    if (isYoutube(url)) selectYoutubeThumb()
  },
)

watch(
  () => jobs.value.find((job) => job.id === currentUploadJobId.value),
  (job) => {
    if (!job || form.videoUrl) return
    if (job.status === 'uploading' || job.status === 'processing') {
      videoUploadStatus.value = job.status
    }
  },
)

function requestClose() {
  if (saving.value) return
  emit('update:open', false)
}

function goToStep(step) {
  if (step < currentStep.value) {
    currentStep.value = step
    formError.value = ''
    return
  }
  for (let s = currentStep.value; s < step; s += 1) {
    if (!validateStep(s)) return
  }
  currentStep.value = step
  formError.value = ''
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value -= 1
  formError.value = ''
}

function validateStep(step) {
  if (step === 1) {
    if (videoSourceTab.value === 'link' && !form.videoUrl.trim()) {
      formError.value = 'Cole o link do vídeo ou use a aba Upload.'
      return false
    }
    if (videoSourceTab.value === 'upload' && !videoFileLocal.value && !form.videoUrl.trim()) {
      formError.value = 'Selecione um arquivo de vídeo.'
      return false
    }
    return true
  }
  if (step === 3) {
    if (!form.title.trim()) {
      formError.value = 'Informe o título da aula.'
      return false
    }
    return true
  }
  return true
}

function nextStep() {
  if (!validateStep(currentStep.value)) return
  formError.value = ''
  if (currentStep.value < 3) {
    currentStep.value += 1
  }
}

function isYoutube(url) {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function extractYoutubeId(url) {
  if (!url) return ''
  if (url.includes('v=')) return url.split('v=')[1].split('&')[0]
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
  return ''
}

function selectYoutubeThumb() {
  const videoId = extractYoutubeId(form.videoUrl)
  if (!videoId) return
  thumbSourceTab.value = 'youtube'
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  thumbPreview.value = thumbUrl
  form.thumbnail = thumbUrl
  thumbFile.value = null
}

function onVideoUrlPaste() {
  nextTick(() => {
    if (isYoutube(form.videoUrl)) selectYoutubeThumb()
  })
}

function inferTitleFromFileName(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!base) return ''
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function applyVideoFile(file) {
  if (!file) return
  if (!isVideoFile(file)) {
    formError.value = 'Selecione um arquivo de vídeo (MP4, MOV ou WEBM). PDF e outros documentos não são aceitos aqui.'
    showToast({ type: 'error', title: 'Arquivo inválido', message: formError.value })
    return
  }
  videoSourceTab.value = 'upload'
  videoFileLocal.value = file
  if (frameVideoObjectUrl.value) URL.revokeObjectURL(frameVideoObjectUrl.value)
  frameVideoObjectUrl.value = URL.createObjectURL(file)
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  durationFromVideo.value = false
  durationManualEdit.value = false
  detectedDurationSeconds.value = 0
  form.duration = ''
  thumbSourceTab.value = 'frame'
  const inferred = inferTitleFromFileName(file.name)
  if (!form.title.trim() && inferred) form.title = inferred
  form.videoUrl = ''
  videoUploadStatus.value = ''
  currentUploadJobId.value = null
  currentUploadPromise = null
  startQueuedUpload(file)
}

function startQueuedUpload(file) {
  if (!file) return

  const { id, promise } = enqueueVideoUpload({
    file,
    label: form.title.trim() || inferTitleFromFileName(file.name),
    apiBase,
    persistAfterUpload: true,
    previewUrl: thumbPreview.value || null,
  })

  currentUploadJobId.value = id
  currentUploadPromise = promise
  videoUploadStatus.value = 'uploading'
  formError.value = ''

  promise
    .then((url) => {
      if (currentUploadJobId.value !== id) return url
      form.videoUrl = url
      videoUploadStatus.value = 'done'
      return url
    })
    .catch((error) => {
      if (currentUploadJobId.value !== id) return
      const message = normalizeVideoUploadError(error)
      videoUploadStatus.value = 'error'
      formError.value = message
      showToast({ type: 'error', title: 'Erro no upload do vídeo.', message })
      throw error
    })
}

function handleVideoFileSelect(event) {
  applyVideoFile(event.target.files?.[0])
}

function handleVideoDrop(event) {
  applyVideoFile(event.dataTransfer?.files?.[0])
}

function handleThumbSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return
  thumbFile.value = file
  thumbPreview.value = URL.createObjectURL(file)
  thumbSourceTab.value = 'upload'
}

function formatSecondsToDuration(totalSeconds) {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return ''
  const total = Math.round(totalSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (hours > 0) {
    const parts = [`${hours}h`, `${minutes}min`]
    if (seconds > 0) parts.push(`${seconds}s`)
    return parts.join(' ')
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} min ${seconds} seg` : `${minutes} min`
  }
  return `${seconds} seg`
}

function applyDetectedDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return
  detectedDurationSeconds.value = seconds
  durationFromVideo.value = true
  durationManualEdit.value = false
  form.duration = formatSecondsToDuration(seconds)
}

function resetDurationFromVideo() {
  durationManualEdit.value = false
  if (detectedDurationSeconds.value) {
    form.duration = formatSecondsToDuration(detectedDurationSeconds.value)
  }
}

function onDurationProbeLoaded() {
  const seconds = durationProbeRef.value?.duration || frameVideoRef.value?.duration || 0
  frameVideoDuration.value = seconds
  applyDetectedDuration(seconds)
}

function onFrameVideoLoaded() {
  const duration = frameVideoRef.value?.duration || 0
  frameVideoDuration.value = duration
  applyDetectedDuration(duration)
}

function onFrameSeekInput(event) {
  const time = parseFloat(event.target.value)
  frameSeekTime.value = time
  if (frameVideoRef.value) frameVideoRef.value.currentTime = time
}

function captureVideoFrame() {
  const video = frameVideoRef.value
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 360
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => {
    if (!blob) return
    thumbFile.value = new File([blob], 'frame_capture.jpg', { type: 'image/jpeg' })
    thumbPreview.value = URL.createObjectURL(blob)
  }, 'image/jpeg', 0.92)
}

function ensureVideoUploaded() {
  if (form.videoUrl) return Promise.resolve(form.videoUrl)
  if (currentUploadPromise) return currentUploadPromise
  if (!videoFileLocal.value) return Promise.reject(new Error('Selecione um arquivo de vídeo.'))
  startQueuedUpload(videoFileLocal.value)
  if (!currentUploadPromise) return Promise.reject(new Error('Não foi possível iniciar o envio do vídeo.'))
  return currentUploadPromise
}

async function uploadThumbFile(thumbFile, token) {
  if (!thumbFile) return null
  const formData = new FormData()
  formData.append('file', thumbFile)
  const uploadRes = await $fetch(resolveUploadApiUrl('/upload', apiBase), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return uploadRes.url
}

function buildSubmitSnapshot(skipThumb) {
  return {
    skipThumb,
    moduleId: props.moduleId,
    title: form.title.trim(),
    content: form.content?.trim() || null,
    duration: form.duration?.trim() || null,
    videoUrl: form.videoUrl.trim(),
    thumbnail: skipThumb ? null : (form.thumbnail || null),
    materials: serializeLessonLinks(),
    thumbFile: skipThumb ? null : thumbFile.value,
    videoSourceTab: videoSourceTab.value,
    videoFileLocal: videoFileLocal.value,
    uploadJobId: currentUploadJobId.value,
    uploadPromise: currentUploadPromise,
    previewUrl: thumbPreview.value || null,
    context: {
      courseTitle: props.context?.courseTitle || '',
      moduleTitle: props.context?.moduleTitle || '',
      lessonCount: props.context?.lessonCount || 0,
    },
  }
}

async function saveLessonInBackground(snapshot) {
  const token = localStorage.getItem('auth_token')
  const jobId = snapshot.uploadJobId

  try {
    let videoUrl = snapshot.videoUrl
    if (!videoUrl && snapshot.videoSourceTab === 'upload') {
      if (snapshot.uploadPromise) {
        videoUrl = await snapshot.uploadPromise
      } else if (snapshot.videoFileLocal) {
        const { promise } = enqueueVideoUpload({
          file: snapshot.videoFileLocal,
          label: snapshot.title,
          apiBase,
          persistAfterUpload: true,
          previewUrl: snapshot.previewUrl || null,
        })
        videoUrl = await promise
      }
    }
    if (!videoUrl?.trim()) throw new Error('Não foi possível obter a URL do vídeo.')

    if (jobId) markJobSaving(jobId, snapshot.title)

    let thumbnail = snapshot.thumbnail
    if (!snapshot.skipThumb && snapshot.thumbFile) {
      thumbnail = await uploadThumbFile(snapshot.thumbFile, token)
    }

    const body = {
      title: snapshot.title,
      content: snapshot.content,
      videoUrl: videoUrl.trim(),
      duration: snapshot.duration,
      thumbnail,
      materials: snapshot.materials || [],
    }

    await $fetch(resolveUploadApiUrl('/courses/lessons', apiBase), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        ...body,
        moduleId: snapshot.moduleId,
        order: snapshot.context.lessonCount || 0,
      },
    })

    const locationPath = buildLessonLocationPath(
      snapshot.context.courseTitle,
      snapshot.context.moduleTitle,
      body.title,
    )
    const cloudPath = formatCloudinaryVideoPath(body.videoUrl)

    if (jobId) completeUploadJob(jobId, { label: body.title })

    showToast({
      type: 'success',
      title: 'Vídeo adicionado com sucesso!',
      message: locationPath || '',
      detail: cloudPath || '',
    })

    emit('saved', { title: body.title, videoUrl: body.videoUrl, path: locationPath })
  } catch (err) {
    const message = normalizeFileUploadError(err)
    if (jobId) failUploadJob(jobId, message, snapshot.title)
    showToast({ type: 'error', title: 'Erro ao salvar aula.', message })
  }
}

async function uploadThumbIfNeeded() {
  if (!thumbFile.value) return form.thumbnail || null
  const token = localStorage.getItem('auth_token')
  return uploadThumbFile(thumbFile.value, token)
}

async function submit(skipThumb = false) {
  formError.value = ''
  if (!validateStep(1) || !validateStep(3)) {
    currentStep.value = formError.value.includes('título') ? 3 : 1
    return
  }

  if (props.mode === 'create') {
    saveLessonInBackground(buildSubmitSnapshot(skipThumb))
    emit('update:open', false)
    return
  }

  saving.value = true
  try {
    const token = localStorage.getItem('auth_token')
    if (videoSourceTab.value === 'upload' && videoFileLocal.value && !form.videoUrl) {
      await ensureVideoUploaded()
    }
    if (!form.videoUrl.trim()) throw new Error('Não foi possível obter a URL do vídeo.')

    let thumbnail = skipThumb ? null : form.thumbnail
    if (!skipThumb) thumbnail = await uploadThumbIfNeeded()

    const body = {
      title: form.title.trim(),
      content: form.content?.trim() || null,
      videoUrl: form.videoUrl.trim(),
      duration: form.duration?.trim() || null,
      thumbnail,
      materials: serializeLessonLinks(),
    }

    await $fetch(resolveUploadApiUrl(`/courses/lessons/${form.id}`, apiBase), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })

    const locationPath = buildLessonLocationPath(
      props.context?.courseTitle,
      props.context?.moduleTitle,
      body.title,
    )
    const cloudPath = formatCloudinaryVideoPath(body.videoUrl)

    showToast({
      type: 'success',
      title: 'Aula atualizada com sucesso!',
      message: locationPath || '',
      detail: cloudPath || '',
    })

    emit('saved', { title: body.title, videoUrl: body.videoUrl, path: locationPath })
    emit('update:open', false)
  } catch (err) {
    const message = normalizeFileUploadError(err)
    formError.value = message
    showToast({ type: 'error', title: 'Erro ao salvar aula.', message })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.lesson-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
}

.lesson-modal {
  width: min(100%, 26rem);
  max-height: min(40rem, calc(100dvh - 2rem));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--cf-radius-surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.lesson-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.15rem 0.75rem;
  border-bottom: 1px solid #eef1ef;
}

.lesson-modal-breadcrumb {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #7a8a82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-modal-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #141414;
}

.lesson-modal-sub {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #888;
}

.lesson-modal-close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: #f3f5f4;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lesson-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  padding: 0.65rem 1rem;
  background: #fafcfb;
  border-bottom: 1px solid #eef1ef;
}

.lesson-step {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: transparent;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  color: #999;
  cursor: pointer;
}

.lesson-step--active {
  background: #fff;
  color: var(--primary, #2d5a27);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  outline: 1.5px solid rgba(45, 90, 39, 0.2);
}

.lesson-step--done .lesson-step-num {
  background: #e8f5e9;
  color: var(--primary, #2d5a27);
}

.lesson-step-num {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: var(--cf-radius-control);
  background: #ececec;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
}

.lesson-step-label {
  display: none;
}

@media (min-width: 420px) {
  .lesson-step-label {
    display: inline;
  }
}

.lesson-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.15rem;
}

.lesson-pane {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field--float {
  position: relative;
  margin-top: 0.35rem;
}

.field--float label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 700;
  color: #444;
  line-height: 1;
}

.field--group > label {
  z-index: 3;
}

.field-optional {
  font-weight: 500;
  color: #aaa;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.field input[readonly] {
  background: #f8faf8;
  color: #2e7d32;
  font-weight: 600;
  cursor: default;
}

.field textarea {
  resize: vertical;
  min-height: 4.75rem;
  padding-top: 1rem;
}

.field--float input {
  padding-top: 0.95rem;
}

.field--float .drop-zone,
.field--float .file-selected,
.field--float .source-pills {
  margin-top: 0.2rem;
}

.field-hint {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: #888;
}

.field-hint--ok { color: #2e7d32; }
.field-hint--err { color: #c62828; }

.source-pills {
  display: flex;
  gap: 0.35rem;
  padding: 4px;
  background: #f3f5f4;
  border-radius: var(--cf-radius-control);
  border: 1.5px solid #e8ece9;
  margin-top: 0.15rem;
}

.source-pills--thumb {
  flex-wrap: wrap;
}

.source-pill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.52rem 0.65rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: transparent;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: #888;
  cursor: pointer;
}

.source-pill.active {
  background: #fff;
  color: #141414;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.source-pill:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.drop-zone {
  border: 1.5px dashed #d5ddd8;
  border-radius: var(--cf-radius-control);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  cursor: pointer;
  background: #fafcfb;
  color: #666;
  font-size: 0.85rem;
}

.drop-zone:hover {
  border-color: var(--primary, #2d5a27);
  background: #f4faf4;
}

.drop-zone small {
  font-size: 0.72rem;
  color: #aaa;
}

.drop-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #aaa;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--cf-radius-control);
  background: #f0f9f0;
  border: 1px solid #c8e6c9;
  font-size: 0.84rem;
  color: #2e7d32;
  font-weight: 600;
}

.file-selected span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-text {
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary, #2d5a27);
  cursor: pointer;
}

.progress-wrap {
  margin-top: 0.5rem;
}

.progress-bar {
  height: 6px;
  border-radius: var(--cf-radius-control);
  background: #ececec;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary, #2d5a27), #6ab04c);
  transition: width 0.25s ease;
}

.progress-wrap span {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary, #2d5a27);
  text-align: right;
}

.upload-status-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid #d7e8d5;
  border-radius: 12px;
  background: #f5faf5;
}

.upload-status-banner p {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #3d5c39;
  line-height: 1.45;
}

.progress-bar--banner {
  height: 8px;
}

.progress-fill--processing {
  background: linear-gradient(
    90deg,
    #2d5a27 0%,
    #6ab04c 50%,
    #2d5a27 100%
  );
  background-size: 200% 100%;
  animation: lesson-upload-pulse 1.4s ease-in-out infinite;
}

@keyframes lesson-upload-pulse {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.thumb-picker {
  border: 1.5px dashed #d5ddd8;
  border-radius: var(--cf-radius-control);
  min-height: 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #fafcfb;
}

.thumb-picker.has-preview {
  border-style: solid;
  padding: 0;
}

.thumb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  color: #888;
  font-size: 0.82rem;
}

.thumb-preview {
  width: 100%;
  max-height: 10rem;
  object-fit: cover;
  display: block;
}

.thumb-preview--inline {
  margin-top: 0.5rem;
  border-radius: var(--cf-radius-sm);
}

.frame-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.frame-video {
  width: 100%;
  max-height: 9rem;
  border-radius: var(--cf-radius-control);
  background: #111;
  object-fit: cover;
}

.frame-slider {
  width: 100%;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.form-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c62828;
}

.lesson-links-field {
  margin-top: 0.35rem;
}

.lesson-links-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.lesson-links-head label {
  margin: 0;
}

.lesson-links-add {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-pill);
  background: #fff;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  flex-shrink: 0;
}

.lesson-links-add:hover {
  background: #f8faf9;
  border-color: #d1d5db;
}

.lesson-links-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.65rem;
}

.lesson-link-row {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.lesson-link-row__fields {
  flex: 1;
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.lesson-link-row__fields input {
  width: 100%;
  padding: 0.62rem 0.75rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.82rem;
  color: #141414;
  background: #fff;
}

.lesson-link-row__fields input:focus {
  outline: none;
  border-color: #9ab89a;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.lesson-link-row__remove {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  margin-top: 0.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fecaca;
  border-radius: 0.55rem;
  background: #fff;
  color: #b91c1c;
  cursor: pointer;
}

.lesson-link-row__remove:hover {
  background: #fef2f2;
}

.lesson-links-empty {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: #9ca3af;
}

.lesson-modal-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.15rem 1rem;
  border-top: 1px solid #eef1ef;
  background: #fafcfb;
}

.btn-ghost,
.btn-primary {
  padding: 0.65rem 1.35rem;
  border-radius: var(--cf-radius-pill);
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.btn-ghost {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  color: #555;
}

.btn-ghost:hover:not(:disabled) {
  background: #f8faf8;
}

.btn-primary {
  background: var(--primary, #2d5a27);
  color: #fff;
  box-shadow: 0 2px 8px rgba(45, 90, 39, 0.18);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.22);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.icon-xs,
.icon-sm {
  width: 0.95rem;
  height: 0.95rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
