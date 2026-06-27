<template>
  <div v-if="items.length" class="chat-pinned-bar" role="region" aria-label="Mensagens fixadas">
    <button
      type="button"
      class="chat-pinned-item"
      :aria-label="ariaLabel"
      @click="onItemClick"
    >
      <span class="chat-pinned-accent" aria-hidden="true" />
      <Pin class="chat-pinned-pin" aria-hidden="true" />
      <span class="chat-pinned-preview">
        <component
          :is="previewIcon(currentItem)"
          v-if="previewIcon(currentItem)"
          class="chat-pinned-media-icon"
          aria-hidden="true"
        />
        <span class="chat-pinned-text">{{ previewText(currentItem) }}</span>
      </span>
      <span v-if="items.length > 1" class="chat-pinned-counter" aria-hidden="true">
        {{ activeIndex + 1 }}/{{ items.length }}
      </span>
      <ChevronDown class="chat-pinned-chevron" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  Pin,
  ChevronDown,
  Mic,
  Image,
  Video,
  FileText,
  Smile,
  ContactRound,
  MapPin,
  Link2,
} from 'lucide-vue-next'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['jump'])

const activeIndex = ref(0)

watch(
  () => props.items.map((item) => String(item?.id || item?.messageid || '')).join('|'),
  () => { activeIndex.value = 0 },
)

const currentItem = computed(() => {
  const list = props.items
  if (!list.length) return null
  const idx = Math.min(activeIndex.value, list.length - 1)
  return list[idx] || list[list.length - 1]
})

const ariaLabel = computed(() => {
  const text = previewText(currentItem.value)
  if (props.items.length > 1) {
    return `Mensagem fixada ${activeIndex.value + 1} de ${props.items.length}: ${text}`
  }
  return `Mensagem fixada: ${text}`
})

const formatAudioDuration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

const autoMediaLabels = new Set([
  'gif', 'figurinha', '📷 imagem', '🎥 vídeo', '🎵 áudio', '📄 documento', 'mensagem sem texto',
])

const previewIcon = (msg) => {
  if (!msg) return null
  if (msg.mediaType === 'audio') return Mic
  if (msg.mediaType === 'image') return Image
  if (msg.mediaType === 'video') return Video
  if (msg.mediaType === 'document') return FileText
  if (msg.mediaType === 'sticker') return Smile
  if (msg.isContactShare) return ContactRound
  if (msg.interactive?.kind === 'poll') return MapPin
  if (msg.linkPreview) return Link2
  return null
}

const previewText = (msg) => {
  if (!msg) return ''
  const text = String(msg.text || msg.body || msg.caption || '').trim()
  if (text && !autoMediaLabels.has(text.toLowerCase())) {
    return text.length > 120 ? `${text.slice(0, 117)}…` : text
  }
  if (msg.mediaType === 'audio') {
    const dur = Number(msg.audioDurationSeconds || 0)
    return dur > 0 ? formatAudioDuration(dur) : '0:00'
  }
  if (msg.mediaType === 'image') return 'Foto'
  if (msg.mediaType === 'video') return 'Vídeo'
  if (msg.mediaType === 'sticker') return 'Figurinha'
  if (msg.mediaType === 'document') return String(msg.documentFileName || 'Documento').trim()
  if (msg.isContactShare) return String(msg.sharedContact?.name || 'Contato').trim() || 'Contato'
  if (msg.interactive?.kind === 'poll') return String(msg.interactive?.title || 'Enquete').trim() || 'Enquete'
  if (msg.interactive?.kind === 'menu') return 'Lista'
  if (msg.linkPreview?.title) return String(msg.linkPreview.title).trim()
  return 'Mensagem'
}

const onItemClick = () => {
  const item = currentItem.value
  if (!item) return
  emit('jump', item)
  if (props.items.length > 1) {
    activeIndex.value = (activeIndex.value + 1) % props.items.length
  }
}
</script>
