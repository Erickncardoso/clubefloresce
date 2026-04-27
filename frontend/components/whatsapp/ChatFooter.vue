<template>
  <div ref="footerShellEl" class="chat-footer-shell">
    <!-- Barra de resposta (reply) -->
    <div v-if="replyingTo" class="replying-to-bar">
      <div class="replying-to-accent" aria-hidden="true" />
      <div class="replying-to-body">
        <span class="replying-to-author">{{ replyingTo.authorLabel }}</span>
        <p v-if="replyingTo.kind === 'text'" class="replying-to-preview">{{ replyingTo.preview }}</p>
        <p v-else class="replying-to-preview replying-to-preview--media">
          <Image v-if="replyingTo.kind === 'image'" class="replying-to-ico" aria-hidden="true" />
          <Video v-else-if="replyingTo.kind === 'video'" class="replying-to-ico" aria-hidden="true" />
          <Mic v-else-if="replyingTo.kind === 'audio'" class="replying-to-ico" aria-hidden="true" />
          <Smile v-else-if="replyingTo.kind === 'sticker'" class="replying-to-ico" aria-hidden="true" />
          <FileText v-else class="replying-to-ico" aria-hidden="true" />
          <span>{{ replyingTo.mediaLine }}</span>
        </p>
      </div>
      <img
        v-if="replyingTo.thumbUrl"
        :src="replyingTo.thumbUrl"
        class="replying-to-thumb"
        alt=""
      />
      <button type="button" class="replying-to-close" aria-label="Cancelar resposta" @click="$emit('clear-reply')">
        <X class="icon-small" />
      </button>
    </div>

    <!-- Área de input -->
    <footer class="chat-footer">
      <div class="footer-plus-wrap">
        <button class="btn-icon attach-btn" title="Mais opções" @click.stop="togglePlusMenu">
          <Plus class="icon-small" />
        </button>
        <Transition name="footer-menu-fade">
          <div v-if="plusMenuOpen" class="footer-plus-menu" role="menu">
            <button
              v-for="item in plusMenuItems"
              :key="item.id"
              type="button"
              class="footer-plus-item"
              @click="selectPlusMenuItem(item.id)"
            >
              <component :is="item.icon" class="footer-plus-item-icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </Transition>
      </div>
      <button class="btn-icon attach-btn" title="Anexar imagem/áudio" @click="$emit('attach')">
        <Paperclip class="icon-small" />
      </button>
      <input
        ref="mediaInputEl"
        type="file"
        accept="image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv"
        class="hidden-input"
        @change="$emit('media-change', $event)"
      />
      <div class="input-wrapper">
        <input
          ref="messageInputEl"
          type="text"
          :value="modelValue"
          placeholder="Digite uma mensagem..."
          :disabled="sending"
          @input="$emit('update:modelValue', $event.target.value)"
          @keyup.enter="$emit('send')"
        />
      </div>
      <button class="btn-icon attach-btn" title="Emoji" @click.stop="toggleEmojiPicker">
        <Smile class="icon-small" />
      </button>
      <button
        class="btn-primary send-btn"
        :disabled="!modelValue.trim() || sending"
        @click="$emit('send')"
      >
        <Loader v-if="sending" class="spin icon-small" />
        <Send v-else class="icon-small" />
      </button>
    </footer>
    <Transition name="footer-menu-fade">
      <div v-if="emojiPickerOpen" class="footer-emoji-picker-wrap">
        <em-emoji-picker
          locale="pt"
          per-line="12"
          preview-position="none"
          skin-tone-position="none"
          @emoji-select="onEmojiSelect"
          @emoji-click="onEmojiSelect"
          @click="onPickerDomClick"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { init as initEmojiMart } from 'emoji-mart'
import emojiData from '@emoji-mart/data'
import {
  Image,
  Video,
  Mic,
  Smile,
  FileText,
  X,
  Paperclip,
  Loader,
  Send,
  Plus,
  Camera,
  Headphones,
  ContactRound,
  Vote,
  CalendarDays,
  Sticker
} from 'lucide-vue-next'

const props = defineProps({
  replyingTo: { type: Object, default: null },
  modelValue: { type: String, default: '' },
  sending: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'clear-reply', 'attach', 'media-change', 'update:modelValue', 'menu-action'])

const footerShellEl = ref(null)
const mediaInputEl = ref(null)
const messageInputEl = ref(null)
const plusMenuOpen = ref(false)
const emojiPickerOpen = ref(false)
const lastEmojiSelection = ref({ value: '', ts: 0 })

const plusMenuItems = [
  { id: 'document', label: 'Documento', icon: FileText },
  { id: 'photos-videos', label: 'Fotos e vídeos', icon: Image },
  { id: 'camera', label: 'Câmera', icon: Camera },
  { id: 'audio', label: 'Áudio', icon: Headphones },
  { id: 'contact', label: 'Contato', icon: ContactRound },
  { id: 'interactive-button', label: 'Botões', icon: Vote },
  { id: 'interactive-list', label: 'Lista', icon: Vote },
  { id: 'interactive-carousel', label: 'Carrossel', icon: Vote },
  { id: 'poll', label: 'Enquete', icon: Vote },
  { id: 'event', label: 'Evento', icon: CalendarDays },
  { id: 'sticker', label: 'Nova figurinha', icon: Sticker }
]

const togglePlusMenu = () => { plusMenuOpen.value = !plusMenuOpen.value }
const toggleEmojiPicker = () => { emojiPickerOpen.value = !emojiPickerOpen.value }

const selectPlusMenuItem = (id) => {
  plusMenuOpen.value = false
  emit('menu-action', id)
}

const onGlobalPointerDown = (event) => {
  const root = footerShellEl.value
  if (!root) return
  if (!root.contains(event.target)) {
    plusMenuOpen.value = false
    emojiPickerOpen.value = false
  }
}

const onEmojiSelect = (event) => {
  const pickFromSkins = (value) => {
    const skinNative = value?.skins?.[0]?.native
    return String(skinNative || '').trim()
  }
  const unifiedToNative = (value) => String(value || '')
    .split('-')
    .map((hex) => Number.parseInt(hex, 16))
    .filter((code) => Number.isFinite(code))
    .map((code) => String.fromCodePoint(code))
    .join('')

  const detail = event?.detail || event || {}
  const emojiNative = String(
    detail?.native ||
    detail?.emoji?.native ||
    pickFromSkins(detail?.emoji) ||
    detail?.emoji ||
    pickFromSkins(detail) ||
    unifiedToNative(detail?.unified || detail?.emoji?.unified || '') ||
    ''
  ).trim()
  if (!emojiNative) return
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) return
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  emit('update:modelValue', `${String(props.modelValue || '')}${emojiNative}`)
  messageInputEl.value?.focus()
}

const onPickerDomClick = (event) => {
  const path = Array.isArray(event?.composedPath?.()) ? event.composedPath() : []
  let emojiNative = ''
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    const native = node?.getAttribute?.('native')
    if (native) {
      emojiNative = String(native).trim()
      break
    }
    const emoji = node?.getAttribute?.('emoji')
    if (emoji) {
      emojiNative = String(emoji).trim()
      break
    }
  }
  if (!emojiNative) return
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) return
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  emit('update:modelValue', `${String(props.modelValue || '')}${emojiNative}`)
  messageInputEl.value?.focus()
}

onMounted(() => {
  if (typeof window !== 'undefined' && !window.__waEmojiMartInitialized) {
    initEmojiMart({ data: emojiData })
    window.__waEmojiMartInitialized = true
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGlobalPointerDown, true)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  }
})

defineExpose({ mediaInputEl, messageInputEl })
</script>

<style scoped>
.chat-footer-shell { position: relative; }
.footer-emoji-picker-wrap {
  position: absolute;
  left: 14px;
  bottom: 68px;
  z-index: 40;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
}
</style>
