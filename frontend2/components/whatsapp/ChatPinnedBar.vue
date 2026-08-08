<template>
  <div v-if="items.length" class="chat-pinned-bar" role="region" aria-label="Mensagens fixadas">
    <div v-if="items.length > 1" class="chat-pinned-rail" aria-hidden="true">
      <button
        v-for="(_, idx) in items"
        :key="`pinned-rail-${idx}`"
        type="button"
        class="chat-pinned-rail-segment"
        :class="{ 'is-active': activeIndex === idx }"
        :aria-label="`Mensagem fixada ${idx + 1} de ${items.length}`"
        :aria-current="activeIndex === idx ? 'true' : undefined"
        @click.stop="selectIndex(idx)"
      />
    </div>

    <span v-else class="chat-pinned-accent" aria-hidden="true" />

    <button
      type="button"
      class="chat-pinned-main"
      :aria-label="ariaLabel"
      @click="onMainClick"
    >
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
    </button>

    <div ref="menuRoot" class="chat-pinned-menu-wrap">
      <button
        type="button"
        class="chat-pinned-menu-trigger"
        aria-label="Opções da mensagem fixada"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        @click.stop="toggleMenu"
      >
        <ChevronDown class="chat-pinned-chevron" aria-hidden="true" />
      </button>

      <div
        v-if="menuOpen"
        class="chat-pinned-menu"
        role="menu"
        @click.stop
        @mousedown.stop
      >
        <button
          type="button"
          class="chat-pinned-menu-item"
          role="menuitem"
          @click="onUnpin"
        >
          <PinOff class="chat-pinned-menu-icon" aria-hidden="true" />
          <span>Desafixar</span>
        </button>
        <button
          type="button"
          class="chat-pinned-menu-item"
          role="menuitem"
          @click="onGoToMessage"
        >
          <CornerUpRight class="chat-pinned-menu-icon" aria-hidden="true" />
          <span>Ir para a mensagem</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import {
  Pin,
  PinOff,
  ChevronDown,
  CornerUpRight,
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

const emit = defineEmits(['jump', 'unpin'])

const activeIndex = ref(0)
const menuOpen = ref(false)
const menuRoot = ref(null)

watch(
  () => props.items.map((item) => String(item?.id || item?.messageid || item?.normalizedMessageId || '')).join('|'),
  () => { activeIndex.value = 0 },
)

watch(
  () => props.items.length,
  (len) => {
    if (!len) {
      activeIndex.value = 0
      menuOpen.value = false
      return
    }
    if (activeIndex.value >= len) activeIndex.value = len - 1
  },
)

const currentItem = computed(() => {
  const list = props.items
  if (!list.length) return null
  const idx = Math.min(Math.max(activeIndex.value, 0), list.length - 1)
  return list[idx] || list[list.length - 1]
})

const ariaLabel = computed(() => {
  const text = previewText(currentItem.value)
  if (props.items.length > 1) {
    return `Mensagem fixada ${activeIndex.value + 1} de ${props.items.length}: ${text}. Clique para ir até a mensagem.`
  }
  return `Mensagem fixada: ${text}. Clique para ir até a mensagem.`
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

const selectIndex = (idx) => {
  if (idx < 0 || idx >= props.items.length) return
  activeIndex.value = idx
}

const closeMenu = () => {
  menuOpen.value = false
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const onMainClick = () => {
  const item = currentItem.value
  if (!item) return
  emit('jump', item)
}

const onGoToMessage = () => {
  const item = currentItem.value
  closeMenu()
  if (!item) return
  emit('jump', item)
}

const onUnpin = () => {
  const item = currentItem.value
  closeMenu()
  if (!item) return
  emit('unpin', item)
}

const onGlobalPointerDown = (event) => {
  if (!menuOpen.value) return
  const root = menuRoot.value
  if (root?.contains(event.target)) return
  closeMenu()
}

const onGlobalKeydown = (event) => {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
  document.addEventListener('keydown', onGlobalKeydown, true)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  document.removeEventListener('keydown', onGlobalKeydown, true)
})
</script>
