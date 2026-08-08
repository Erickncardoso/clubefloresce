<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="msg-image-viewer msg-image-viewer--light"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de mídia"
      @click.self="emit('close')"
    >
      <header class="msg-image-viewer-top">
        <div class="msg-image-viewer-identity">
          <img
            v-if="senderAvatar"
            :src="senderAvatar"
            class="msg-image-viewer-avatar"
            alt=""
          />
          <span v-else class="msg-image-viewer-avatar msg-image-viewer-avatar--fallback" aria-hidden="true">
            {{ senderInitial }}
          </span>
          <div class="msg-image-viewer-identity-text">
            <div class="msg-image-viewer-sender">{{ senderName || 'Contato' }}</div>
            <div v-if="timestampLabel" class="msg-image-viewer-meta">{{ timestampLabel }}</div>
          </div>
        </div>

        <div class="msg-image-viewer-toolbar">
          <button type="button" class="msg-image-viewer-tool" title="Diminuir zoom" @click="zoomOut">
            <ZoomOut class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Aumentar zoom" @click="zoomIn">
            <ZoomIn class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Girar" @click="rotate">
            <RotateCcw class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Favoritar" disabled>
            <Star class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Reagir" disabled>
            <Smile class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Encaminhar" disabled>
            <Forward class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Baixar" @click="downloadCurrent">
            <Download class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-tool" title="Mais opções" disabled>
            <MoreVertical class="msg-image-viewer-tool-icon" aria-hidden="true" />
          </button>
          <button type="button" class="msg-image-viewer-close" title="Fechar" @click="emit('close')">
            <X class="msg-image-viewer-close-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="msg-image-viewer-body">
        <div class="msg-image-viewer-stage">
          <button
            v-if="items.length > 1"
            type="button"
            class="msg-image-viewer-nav msg-image-viewer-nav--prev"
            title="Anterior"
            @click="emit('prev')"
          >
            ‹
          </button>

          <video
            v-if="isVideo && displayUrl"
            :key="`viewer-video-${current?.id || index}`"
            :src="displayUrl"
            class="msg-image-viewer-photo msg-image-viewer-video"
            controls
            playsinline
          />
          <img
            v-else-if="displayUrl && !isDocument"
            :src="displayUrl"
            class="msg-image-viewer-photo"
            :style="photoStyle"
            alt="Imagem ampliada"
          />
          <div v-else-if="isDocument" class="msg-image-viewer-doc-stage">
            <img
              v-if="displayUrl"
              :src="displayUrl"
              class="msg-image-viewer-photo msg-image-viewer-doc-preview"
              :style="photoStyle"
              alt="Prévia do documento"
            />
            <div v-else class="msg-image-viewer-doc-fallback">
              <span class="msg-image-viewer-doc-badge">{{ documentBadge }}</span>
              <p class="msg-image-viewer-doc-name">{{ documentName }}</p>
            </div>
          </div>

          <button
            v-if="items.length > 1"
            type="button"
            class="msg-image-viewer-nav msg-image-viewer-nav--next"
            title="Próximo"
            @click="emit('next')"
          >
            ›
          </button>
        </div>

        <p v-if="caption" class="msg-image-viewer-caption">{{ caption }}</p>
      </div>

      <div v-if="items.length > 1" ref="stripRef" class="msg-image-viewer-strip">
        <button
          v-for="(item, idx) in items"
          :key="`viewer-thumb-${item.id || idx}`"
          :ref="(el) => setThumbRef(el, idx)"
          type="button"
          class="msg-image-viewer-thumb"
          :class="{ 'is-active': idx === index }"
          @click="emit('select', idx)"
        >
          <img
            v-if="stripThumbUrl(item)"
            :src="stripThumbUrl(item)"
            alt=""
            decoding="async"
            loading="lazy"
          />
          <span v-else class="msg-image-viewer-thumb-fallback">{{ stripFallbackLabel(item) }}</span>
          <span v-if="isStripVideo(item)" class="msg-image-viewer-thumb-badge" aria-hidden="true">▶</span>
          <span v-else-if="isStripDocument(item)" class="msg-image-viewer-thumb-badge msg-image-viewer-thumb-badge--doc" aria-hidden="true">
            {{ stripDocBadge(item) }}
          </span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Star,
  Smile,
  Forward,
  Download,
  MoreVertical,
  X,
} from 'lucide-vue-next'
import { formatConversationDateLabel, formatTime } from '~/composables/whatsapp/useWhatsappUtils.js'
import {
  imageViewerDisplayUrl,
  imageViewerThumbUrl,
} from '~/composables/whatsapp/useWhatsappImageViewer.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  senderName: { type: String, default: '' },
  senderAvatar: { type: String, default: '' },
  caption: { type: String, default: '' },
  current: { type: Object, default: null },
})

const emit = defineEmits(['close', 'prev', 'next', 'select'])

const zoom = ref(1)
const rotation = ref(0)
const stripRef = ref(null)
const thumbRefs = ref([])

const setThumbRef = (el, idx) => {
  if (el) thumbRefs.value[idx] = el
}

watch(
  () => [props.open, props.index],
  () => {
    zoom.value = 1
    rotation.value = 0
  },
)

watch(
  () => [props.open, props.index, props.items.length],
  async () => {
    if (!props.open) return
    await nextTick()
    const active = thumbRefs.value[props.index]
    active?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  },
)

const mediaType = computed(() => String(props.current?.mediaType || '').toLowerCase())
const isVideo = computed(() => mediaType.value === 'video')
const isDocument = computed(() => mediaType.value === 'document')
const displayUrl = computed(() => imageViewerDisplayUrl(props.current))

const stripThumbUrl = (item) => imageViewerThumbUrl(item) || imageViewerDisplayUrl(item)
const isStripVideo = (item) => String(item?.mediaType || '').toLowerCase() === 'video'
const isStripDocument = (item) => String(item?.mediaType || '').toLowerCase() === 'document'

const stripFallbackLabel = (item) => {
  if (isStripVideo(item)) return 'Vídeo'
  if (isStripDocument(item)) return 'PDF'
  return 'Img'
}

const stripDocBadge = (item) => {
  const name = String(item?.text || item?.content?.documentMessage?.fileName || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'DOC'
  return 'DOC'
}

const documentName = computed(() => {
  const node = props.current?.content?.documentMessage
  return String(node?.fileName || props.current?.text || 'Documento').trim()
})

const documentBadge = computed(() => {
  const name = documentName.value.toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'DOC'
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'XLS'
  return 'DOC'
})

const senderInitial = computed(() => {
  const name = String(props.senderName || '').trim()
  return (name.charAt(0) || '?').toUpperCase()
})

const timestampLabel = computed(() => {
  const ts = props.current?.timestamp
  if (!ts) return ''
  const dateLabel = formatConversationDateLabel(ts)
  const timeLabel = formatTime(ts)
  if (!timeLabel) return dateLabel
  if (dateLabel === 'Hoje') return `Hoje às ${timeLabel}`
  if (dateLabel === 'Ontem') return `Ontem às ${timeLabel}`
  return `${dateLabel} às ${timeLabel}`
})

const photoStyle = computed(() => ({
  transform: `scale(${zoom.value}) rotate(${rotation.value}deg)`,
}))

const zoomIn = () => {
  if (isVideo.value) return
  zoom.value = Math.min(3, Number((zoom.value + 0.25).toFixed(2)))
}

const zoomOut = () => {
  if (isVideo.value) return
  zoom.value = Math.max(0.5, Number((zoom.value - 0.25).toFixed(2)))
}

const rotate = () => {
  if (isVideo.value) return
  rotation.value = (rotation.value - 90 + 360) % 360
}

const downloadCurrent = () => {
  const url = displayUrl.value
  if (!url || url.startsWith('data:image/')) {
    if (isDocument.value && props.current?.mediaUrl) {
      window.open(props.current.mediaUrl, '_blank', 'noopener,noreferrer')
    }
    return
  }
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = ''
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const onKeydown = (event) => {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    emit('prev')
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    emit('next')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>
