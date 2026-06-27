<template>
  <div
    ref="panelEl"
    class="footer-emoji-picker-wrap"
    data-wa-footer-emoji-picker
    @wheel.stop
  >
    <div v-if="!ready" class="footer-emoji-picker-loading" aria-hidden="true">
      <Loader class="spin footer-emoji-picker-loading-icon" />
    </div>
    <em-emoji-picker
      v-else
      ref="pickerEl"
      theme="light"
      locale="pt"
      set="native"
      nav-position="top"
      search-position="sticky"
      preview-position="none"
      skin-tone-position="none"
      :per-line="9"
      :emoji-size="22"
      :emoji-button-size="36"
      :max-frequent-rows="2"
      @emoji-select="onEmojiSelect"
      @click="onPickerClick"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Loader } from 'lucide-vue-next'
import {
  ensureEmojiMartReady,
  extractEmojiNativeFromEvent,
  extractEmojiNativeFromPickerClick,
} from '~/composables/whatsapp/useEmojiMart.js'

const emit = defineEmits(['select'])

const panelEl = ref(null)
const pickerEl = ref(null)
const ready = ref(false)
const lastSelection = ref({ value: '', ts: 0 })

const shouldSkipDuplicate = (emojiNative) => {
  const now = Date.now()
  if (lastSelection.value.value === emojiNative && now - lastSelection.value.ts < 80) {
    return true
  }
  lastSelection.value = { value: emojiNative, ts: now }
  return false
}

const emitEmoji = (emojiNative) => {
  const value = String(emojiNative || '').trim()
  if (!value || shouldSkipDuplicate(value)) return
  emit('select', value)
}

const onEmojiSelect = (event) => {
  emitEmoji(extractEmojiNativeFromEvent(event))
}

const onPickerClick = (event) => {
  emitEmoji(extractEmojiNativeFromPickerClick(event))
}

onMounted(async () => {
  ready.value = await ensureEmojiMartReady()
})

defineExpose({ panelEl, pickerEl })
</script>
