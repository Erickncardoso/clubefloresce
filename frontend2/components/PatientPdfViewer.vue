<template>
  <div ref="viewerEl" class="patient-pdf-viewer" role="document" :aria-label="title">
    <div
      v-for="pageNum in pageCount"
      :key="pageNum"
      class="patient-pdf-viewer__page"
      :data-page="pageNum"
    />
  </div>
</template>

<script setup>
import { toPdfByteArray } from '~/utils/pdf-bytes'

const props = defineProps({
  data: {
    type: [ArrayBuffer, Object],
    default: null,
  },
  title: {
    type: String,
    default: 'Documento PDF',
  },
})

const emit = defineEmits(['ready', 'error'])

const viewerEl = ref(null)
const pageCount = ref(0)
const renderedPages = new Set()
const isMounted = ref(false)

let pdfDoc = null
let observer = null
let resizeObserver = null
let resizeFrame = 0
let renderGeneration = 0
let getDocumentFn = null
let lastContainerWidth = 0

function getOutputScale() {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, 2)
}

function getPageViewports(page, containerWidth) {
  const baseViewport = page.getViewport({ scale: 1 })
  const cssScale = baseViewport.width > 0 ? containerWidth / baseViewport.width : 1
  const outputScale = getOutputScale()
  return {
    render: page.getViewport({ scale: cssScale * outputScale }),
    display: page.getViewport({ scale: cssScale }),
  }
}

async function ensurePdfJs() {
  if (getDocumentFn) return getDocumentFn

  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])

  const { getDocument, GlobalWorkerOptions } = pdfjs
  GlobalWorkerOptions.workerSrc = workerModule.default
  getDocumentFn = getDocument
  return getDocumentFn
}

function getContainerWidth(root) {
  if (!root) return Math.max(1, window.innerWidth)
  const rect = root.getBoundingClientRect()
  return Math.max(1, rect.width || root.clientWidth || window.innerWidth)
}

async function renderPage(pageNum, generation) {
  if (!pdfDoc || renderedPages.has(pageNum) || generation !== renderGeneration) return

  const root = viewerEl.value
  const slot = root?.querySelector(`[data-page="${pageNum}"]`)
  if (!slot) return

  renderedPages.add(pageNum)

  try {
    const page = await pdfDoc.getPage(pageNum)
    if (generation !== renderGeneration) return

    const containerWidth = getContainerWidth(root)
    const { render: renderViewport, display: displayViewport } = getPageViewports(page, containerWidth)

    const canvas = document.createElement('canvas')
    canvas.className = 'patient-pdf-viewer__canvas'
    canvas.width = Math.max(1, Math.floor(renderViewport.width))
    canvas.height = Math.max(1, Math.floor(renderViewport.height))
    canvas.style.width = `${Math.floor(displayViewport.width)}px`
    canvas.style.height = `${Math.floor(displayViewport.height)}px`
    canvas.setAttribute('aria-label', `Página ${pageNum} de ${pageCount.value}`)

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Não foi possível preparar o visualizador de PDF.')

    slot.replaceChildren(canvas)
    await page.render({ canvasContext: context, viewport: renderViewport }).promise

    if (pageNum === 1 && generation === renderGeneration) {
      emit('ready')
    }
  } catch (error) {
    renderedPages.delete(pageNum)
    if (pageNum === 1) {
      emit('error', error)
    }
  }
}

function setupObserver(generation) {
  observer?.disconnect()

  const root = viewerEl.value
  if (!root) return

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const pageNum = Number(entry.target.dataset.page)
      if (!Number.isFinite(pageNum)) continue
      void renderPage(pageNum, generation)
    }
  }, {
    root,
    rootMargin: '320px 0px',
    threshold: 0.01,
  })

  root.querySelectorAll('[data-page]').forEach((element) => observer.observe(element))
}

async function renderInitialPages(generation) {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  lastContainerWidth = getContainerWidth(viewerEl.value)
  setupObserver(generation)
  setupResizeObserver(generation)
  await renderPage(1, generation)
}

function setupResizeObserver(generation) {
  resizeObserver?.disconnect()
  resizeObserver = null

  const root = viewerEl.value
  if (!root || typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (generation !== renderGeneration || !pdfDoc) return
      const width = getContainerWidth(root)
      if (Math.abs(width - lastContainerWidth) < 4) return
      lastContainerWidth = width
      renderedPages.clear()
      root.querySelectorAll('[data-page]').forEach((slot) => slot.replaceChildren())
      void renderPage(1, generation)
    })
  })

  resizeObserver.observe(root)
}

async function loadPdf(source) {
  if (!isMounted.value) return

  renderGeneration += 1
  const generation = renderGeneration

  observer?.disconnect()
  observer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  renderedPages.clear()
  pageCount.value = 0

  if (pdfDoc) {
    try { await pdfDoc.destroy() } catch { /* ignora */ }
    pdfDoc = null
  }

  const bytes = toPdfByteArray(source)
  if (!bytes?.length) {
    emit('error', new Error('Arquivo PDF inválido.'))
    return
  }

  try {
    const getDocument = await ensurePdfJs()
    pdfDoc = await getDocument({ data: bytes }).promise

    if (generation !== renderGeneration) return

    pageCount.value = pdfDoc.numPages
    await renderInitialPages(generation)
  } catch (error) {
    emit('error', error)
  }
}

watch(() => props.data, (source) => {
  if (!source || !isMounted.value) return
  void loadPdf(source)
})

onMounted(() => {
  isMounted.value = true
  if (props.data) {
    void loadPdf(props.data)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  cancelAnimationFrame(resizeFrame)
  if (pdfDoc) {
    try { pdfDoc.destroy() } catch { /* ignora */ }
    pdfDoc = null
  }
})
</script>

<style scoped>
.patient-pdf-viewer {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: #ecefee;
  box-sizing: border-box;
}

.patient-pdf-viewer__page {
  width: 100%;
  min-height: 120px;
  background: #fff;
}

.patient-pdf-viewer__page + .patient-pdf-viewer__page {
  margin-top: 2px;
}

:deep(.patient-pdf-viewer__canvas) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  background: #fff;
}
</style>
