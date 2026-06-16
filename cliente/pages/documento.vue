<template>
  <div class="patient-page doc-page patient-page--no-tab">
    <PatientHeader
      class="doc-page__header"
      :title="pageTitle"
      show-back
      :back-to="backTo"
      :show-bell="false"
    />

    <div class="doc-page__body">
      <div v-if="loadError" class="doc-state cf-squircle" role="alert">
        <FileWarning class="doc-state-icon" aria-hidden="true" />
        <p>{{ loadError }}</p>
        <button type="button" class="doc-retry-btn" @click="retryLoad">
          Tentar novamente
        </button>
      </div>

      <div v-else-if="!documentSrc" class="doc-state cf-squircle">
        <FileWarning class="doc-state-icon" aria-hidden="true" />
        <p>Documento indisponível.</p>
      </div>

      <template v-else>
        <PatientPageSkeleton
          v-if="loading && !pdfData && !useEmbedFallback"
          layout="plan"
          class="doc-page__viewer doc-page__viewer--loading"
        />

        <PatientPdfViewer
          v-else-if="pdfData && !useEmbedFallback"
          :data="pdfData"
          :title="pageTitle"
          class="doc-page__viewer"
          @ready="onViewerReady"
          @error="onViewerError"
        />

        <iframe
          v-else-if="useEmbedFallback && embedSrc"
          :key="embedSrc"
          :src="embedSrc"
          class="doc-page__viewer doc-page__embed"
          title="Visualizador de PDF"
          @load="onEmbedReady"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { FileWarning } from 'lucide-vue-next'
import { storePdfBytes } from '~/utils/pdf-bytes'

definePageMeta({
  layout: 'patient',
})

const route = useRoute()
const config = useRuntimeConfig()
const { resolveDocumentSrcFromRoute } = usePatientDocument()

const loading = ref(true)
const loadError = ref('')
const pdfData = ref(null)
const useEmbedFallback = ref(false)
const embedSrc = ref('')
let loadRequestId = 0

const backTo = computed(() => {
  const from = route.query.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/cursos'
})

const pageTitle = computed(() => {
  const title = route.query.title
  return typeof title === 'string' && title.trim() ? title.trim() : 'Material PDF'
})

const documentSrc = computed(() => resolveDocumentSrcFromRoute(route.query, config.public.apiBase))

function clearViewerState() {
  pdfData.value = null
  useEmbedFallback.value = false
  embedSrc.value = ''
}

function activateEmbedFallback() {
  const src = documentSrc.value
  if (!src) {
    loadError.value = 'Não foi possível exibir o PDF.'
    loading.value = false
    return
  }

  useEmbedFallback.value = true
  embedSrc.value = `${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
  loading.value = true
  loadError.value = ''
}

async function loadDocument() {
  const src = documentSrc.value
  const requestId = ++loadRequestId
  clearViewerState()

  if (!src) {
    loading.value = false
    loadError.value = 'Link do documento inválido ou expirado.'
    return
  }

  loading.value = true
  loadError.value = ''

  try {
    const response = await fetch(src, { credentials: 'same-origin' })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Não foi possível carregar o PDF (${response.status}).`)
    }

    const contentType = response.headers.get('content-type') || ''
    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) {
      throw new Error('O PDF está vazio ou indisponível.')
    }

    const header = new TextDecoder().decode(buffer.slice(0, 5))
    if (!header.startsWith('%PDF')) {
      throw new Error('O servidor não retornou um PDF válido.')
    }

    if (!contentType.includes('pdf') && !contentType.includes('octet-stream') && !header.startsWith('%PDF')) {
      throw new Error('O servidor não retornou um PDF válido.')
    }

    if (requestId !== loadRequestId) return

    pdfData.value = storePdfBytes(buffer)
  } catch (error) {
    if (requestId !== loadRequestId) return
    loadError.value = error?.message || 'Não foi possível abrir o PDF neste dispositivo.'
    loading.value = false
  }
}

function onViewerReady() {
  loading.value = false
  loadError.value = ''
}

function onViewerError() {
  activateEmbedFallback()
}

function onEmbedReady() {
  loading.value = false
  loadError.value = ''
}

function retryLoad() {
  void loadDocument()
}

watch(documentSrc, () => {
  void loadDocument()
}, { immediate: true })
</script>
