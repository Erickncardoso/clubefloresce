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

    <!-- Grupo restrito: somente admins enviam -->
    <footer v-if="composeLocked" class="chat-footer chat-footer--locked">
      <p class="chat-footer-locked-text">
        Somente <strong>admins</strong> podem enviar mensagens
      </p>
    </footer>

    <!-- Contato bloqueado -->
    <footer v-else-if="contactBlocked" class="chat-footer chat-footer--blocked">
      <button type="button" class="chat-footer-blocked-btn chat-footer-blocked-btn--danger" @click="$emit('delete-chat')">
        <Trash2 class="chat-footer-blocked-btn-icon" aria-hidden="true" />
        Apagar conversa
      </button>
      <button type="button" class="chat-footer-blocked-btn chat-footer-blocked-btn--unblock" @click="$emit('unblock')">
        <Ban class="chat-footer-blocked-btn-icon" aria-hidden="true" />
        Desbloquear
      </button>
    </footer>

    <!-- Área de input -->
    <footer
      v-else
      ref="chatFooterEl"
      class="chat-footer"
      :class="{ 'chat-footer--multiline': messageInputMultiline }"
    >
      <ClientOnly>
        <Transition name="footer-menu-fade">
          <WhatsappEmojiPickerPanel
            v-if="emojiPickerOpen"
            ref="emojiPickerPanelRef"
            @select="onEmojiPicked"
          />
        </Transition>
      </ClientOnly>

      <div v-if="voiceIsRecording" class="voice-compose-bar">
        <button
          type="button"
          class="voice-compose-btn voice-compose-btn--danger"
          title="Descartar"
          aria-label="Descartar gravação"
          @click="onCancelVoice"
        >
          <Trash2 class="voice-compose-icon" />
        </button>

        <div class="voice-compose-center">
          <span class="voice-compose-dot" aria-hidden="true" />
          <span class="voice-compose-timer">{{ voiceDurationLabel }}</span>
          <div class="voice-compose-wave" aria-hidden="true">
            <span
              v-for="(level, index) in voiceWaveformLevels"
              :key="index"
              class="voice-compose-wave-bar"
              :style="{ transform: `scaleY(${0.35 + level * 1.4})` }"
            />
          </div>
        </div>

        <button
          type="button"
          class="voice-compose-btn"
          :title="voiceIsPaused ? 'Continuar' : 'Pausar'"
          :aria-label="voiceIsPaused ? 'Continuar gravação' : 'Pausar gravação'"
          @click="toggleVoicePause()"
        >
          <Pause v-if="!voiceIsPaused" class="voice-compose-icon" />
          <Mic v-else class="voice-compose-icon" />
        </button>

        <button
          type="button"
          class="voice-compose-btn voice-compose-btn--send"
          title="Enviar"
          aria-label="Enviar mensagem de voz"
          :disabled="sending || voiceDurationSeconds < 1"
          @click="onSendVoice"
        >
          <Loader v-if="sending" class="spin voice-compose-icon voice-compose-icon--send" />
          <Send v-else class="voice-compose-icon voice-compose-icon--send" />
        </button>
      </div>

      <div v-else class="compose-pill" :class="{ 'compose-pill--multiline': messageInputMultiline }">
        <div class="footer-plus-wrap">
          <button
            type="button"
            class="compose-pill-btn compose-pill-btn--plus"
            title="Mais opções"
            aria-label="Mais opções"
            @click.stop="togglePlusMenu"
          >
            <Plus class="compose-pill-icon" />
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

        <button
          type="button"
          class="compose-pill-btn compose-pill-btn--emoji"
          :class="{ 'compose-pill-btn--active': emojiPickerOpen }"
          title="Emoji"
          aria-label="Emoji"
          :aria-expanded="emojiPickerOpen ? 'true' : 'false'"
          @click.stop="toggleEmojiPicker"
        >
          <Smile class="compose-pill-icon" />
        </button>

        <div
          class="compose-pill-input"
          :class="{ 'compose-pill-input--multiline': messageInputMultiline }"
          @mousedown="onComposeAreaPointerDown"
        >
          <textarea
            ref="messageInputEl"
            rows="1"
            :value="modelValue"
            placeholder="Digite uma mensagem"
            :disabled="sending"
            @input="onMessageInput"
            @keydown="onInputKeydown"
            @focus="onMessageFocus"
          />
        </div>

        <button
          v-if="modelValue.trim() || sending"
          type="button"
          class="compose-pill-btn compose-pill-btn--send"
          :disabled="!modelValue.trim() || sending"
          title="Enviar"
          aria-label="Enviar"
          @click="$emit('send')"
        >
          <Loader v-if="sending" class="spin compose-pill-icon" />
          <Send v-else class="compose-pill-icon" />
        </button>
        <button
          v-else
          type="button"
          class="compose-pill-btn compose-pill-btn--mic"
          title="Mensagem de voz"
          aria-label="Mensagem de voz"
          :disabled="sending"
          @click="onStartVoice"
        >
          <Mic class="compose-pill-icon" />
        </button>
      </div>

      <input
        ref="mediaInputEl"
        type="file"
        accept="image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv"
        class="hidden-input"
        @change="$emit('media-change', $event)"
      />
    </footer>
    <QuickRepliesPickerPopover
      :open="quickRepliesPickerOpen"
      :items="quickRepliesItems"
      :loading="quickRepliesLoading"
      :active-index="quickRepliesActiveIndex"
      :anchor-el="chatFooterEl || footerShellEl"
      @update:active-index="$emit('update:quickRepliesActiveIndex', $event)"
      @select="$emit('quick-reply-select', $event)"
      @open-manage="$emit('quick-replies-manage')"
      @close="$emit('quick-replies-close')"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Image,
  Video,
  Mic,
  Smile,
  FileText,
  X,
  Loader,
  Send,
  Plus,
  Camera,
  Headphones,
  ContactRound,
  Vote,
  CalendarDays,
  Sticker,
  Trash2,
  Ban,
  Zap,
  Pause,
} from 'lucide-vue-next'

import QuickRepliesPickerPopover from './QuickRepliesPickerPopover.vue'
import WhatsappEmojiPickerPanel from './WhatsappEmojiPickerPanel.vue'
import { ensureEmojiMartReady, insertEmojiIntoTextField } from '~/composables/whatsapp/useEmojiMart.js'
import { useWhatsappVoiceRecorder } from '~/composables/whatsapp/useWhatsappVoiceRecorder.js'

const props = defineProps({
  replyingTo: { type: Object, default: null },
  modelValue: { type: String, default: '' },
  sending: { type: Boolean, default: false },
  composeLocked: { type: Boolean, default: false },
  contactBlocked: { type: Boolean, default: false },
  quickRepliesPickerOpen: { type: Boolean, default: false },
  quickRepliesItems: { type: Array, default: () => [] },
  quickRepliesLoading: { type: Boolean, default: false },
  quickRepliesActiveIndex: { type: Number, default: 0 },
})

const emit = defineEmits([
  'send', 'clear-reply', 'attach', 'media-change', 'update:modelValue',
  'menu-action', 'unblock', 'delete-chat', 'quick-reply-select', 'quick-replies-manage',
  'quick-replies-keydown', 'update:quickRepliesActiveIndex', 'quick-replies-focus', 'quick-replies-close',
  'send-voice', 'voice-error',
])

const {
  isRecording: voiceIsRecording,
  isPaused: voiceIsPaused,
  durationSeconds: voiceDurationSeconds,
  durationLabel: voiceDurationLabel,
  waveformLevels: voiceWaveformLevels,
  errorMessage: voiceErrorMessage,
  startRecording: startVoiceRecording,
  togglePause: toggleVoicePause,
  cancelRecording: cancelVoiceRecording,
  finishRecording: finishVoiceRecording,
} = useWhatsappVoiceRecorder()

const footerShellEl = ref(null)
const chatFooterEl = ref(null)
const mediaInputEl = ref(null)
const messageInputEl = ref(null)
const emojiPickerPanelRef = ref(null)
const messageInputMultiline = ref(false)
const MESSAGE_INPUT_MAX_HEIGHT = 120
const plusMenuOpen = ref(false)
const emojiPickerOpen = ref(false)
let footerPickerGuardUntil = 0

const isInsideFooterPickerUi = (event) => {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    if (node.classList?.contains?.('footer-emoji-picker-wrap')) return true
    if (node.classList?.contains?.('footer-plus-menu')) return true
    if (String(node.tagName || '').toUpperCase() === 'EM-EMOJI-PICKER') return true
  }
  const target = event?.target
  if (target?.closest?.('[data-wa-footer-emoji-picker]')) return true
  if (target?.closest?.('.footer-plus-menu')) return true
  if (target?.closest?.('.compose-pill-btn--emoji')) return true
  if (target?.closest?.('.compose-pill-btn--plus')) return true
  return false
}

const togglePlusMenu = () => {
  plusMenuOpen.value = !plusMenuOpen.value
  if (plusMenuOpen.value) emojiPickerOpen.value = false
}
const toggleEmojiPicker = async () => {
  if (!emojiPickerOpen.value) {
    await ensureEmojiMartReady()
  }
  emojiPickerOpen.value = !emojiPickerOpen.value
  if (emojiPickerOpen.value) {
    plusMenuOpen.value = false
    footerPickerGuardUntil = Date.now() + 400
  }
}

const plusMenuItems = [
  { id: 'quick-replies', label: 'Respostas rápidas', icon: Zap },
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

const selectPlusMenuItem = (id) => {
  plusMenuOpen.value = false
  emit('menu-action', id)
}

const resizeMessageInput = () => {
  const el = messageInputEl.value
  if (!el) return
  el.style.height = 'auto'
  const nextHeight = Math.min(el.scrollHeight, MESSAGE_INPUT_MAX_HEIGHT)
  el.style.height = `${Math.max(24, nextHeight)}px`
  el.style.overflowY = el.scrollHeight > MESSAGE_INPUT_MAX_HEIGHT ? 'auto' : 'hidden'
  const value = String(props.modelValue || '')
  messageInputMultiline.value = nextHeight > 30 || value.includes('\n')
}

const focusMessageInput = (position = 'end') => {
  const el = messageInputEl.value
  if (!el || typeof el.focus !== 'function') return
  el.focus()
  if (position !== 'end' || typeof el.setSelectionRange !== 'function') return
  const len = String(props.modelValue || '').length
  el.setSelectionRange(len, len)
}

const onMessageInput = (event) => {
  emit('update:modelValue', event.target.value)
  nextTick(resizeMessageInput)
}

const shouldOpenQuickRepliesFromComposer = () => {
  const text = String(props.modelValue || '')
  if (!text.startsWith('/')) return false
  return !text.slice(1).includes(' ')
}

const openQuickRepliesFromComposer = () => {
  if (!shouldOpenQuickRepliesFromComposer()) return
  emit('quick-replies-focus')
}

const onComposeAreaPointerDown = (event) => {
  if (event.button !== 0) return
  messageInputEl.value?.focus()
  openQuickRepliesFromComposer()
}

const onMessageFocus = () => {
  openQuickRepliesFromComposer()
}

watch(
  () => props.modelValue,
  () => nextTick(resizeMessageInput)
)

const onInputKeydown = (event) => {
  if (props.quickRepliesPickerOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) {
    emit('quick-replies-keydown', event)
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('send')
  }
}

const onGlobalPointerDown = (event) => {
  if (Date.now() < footerPickerGuardUntil) return
  if (isInsideFooterPickerUi(event)) return
  plusMenuOpen.value = false
  emojiPickerOpen.value = false
}

const onEmojiPicked = async (emojiNative) => {
  await insertEmojiIntoTextField({
    inputEl: messageInputEl.value,
    currentValue: props.modelValue,
    emojiNative,
    onUpdate: (value) => emit('update:modelValue', value),
  })
  nextTick(resizeMessageInput)
}

const onStartVoice = async () => {
  plusMenuOpen.value = false
  emojiPickerOpen.value = false
  const ok = await startVoiceRecording()
  if (!ok && voiceErrorMessage.value) {
    emit('voice-error', voiceErrorMessage.value)
  }
}

const onCancelVoice = () => {
  cancelVoiceRecording()
}

const onSendVoice = async () => {
  const result = await finishVoiceRecording()
  if (!result?.blob) return
  emit('send-voice', result)
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGlobalPointerDown, false)
  }
  nextTick(resizeMessageInput)
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onGlobalPointerDown, false)
  }
  cancelVoiceRecording()
})

defineExpose({ mediaInputEl, messageInputEl, resizeMessageInput, focusMessageInput })
</script>

