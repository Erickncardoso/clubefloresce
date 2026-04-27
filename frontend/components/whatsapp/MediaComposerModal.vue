<template>
  <Teleport to="body">
    <div v-if="open" class="media-composer-backdrop" @click.self="$emit('close')">
      <div class="media-composer-modal">
        <header class="media-composer-header">
          <button type="button" class="media-composer-close" @click="$emit('close')">✕</button>
          <h3>{{ currentFile?.name || 'Prévia indisponível' }}</h3>
        </header>

        <section class="media-composer-preview">
          <img
            v-if="currentFile?.previewUrl && currentFile?.type === 'image'"
            :src="currentFile.previewUrl"
            alt="Prévia do arquivo"
            class="media-composer-preview-image"
          />
          <video
            v-else-if="currentFile?.previewUrl && currentFile?.type === 'video'"
            :src="currentFile.previewUrl"
            controls
            class="media-composer-preview-image"
          />
          <iframe
            v-else-if="currentFile?.previewUrl && currentFile?.type === 'document' && currentFile?.extensionLabel === 'PDF'"
            :src="currentFile.previewUrl"
            class="media-composer-preview-pdf"
            title="Prévia do PDF"
          />
          <div v-else class="media-composer-preview-fallback">
            <div class="media-composer-preview-icon">{{ currentFile?.extensionLabel || 'DOC' }}</div>
            <strong>Prévia indisponível</strong>
            <small>{{ currentFile?.sizeLabel || '' }} {{ currentFile?.extensionLabel || '' }}</small>
          </div>
        </section>

        <footer class="media-composer-footer">
          <div class="media-composer-caption-row">
            <input
              ref="captionInputEl"
              :value="caption"
              type="text"
              class="media-composer-caption"
              placeholder="Digite uma mensagem"
              :disabled="sending"
              @input="$emit('update:caption', $event.target.value)"
            />
            <button type="button" class="media-composer-emoji-btn" :disabled="sending" @click="emojiPickerOpen = !emojiPickerOpen">☺</button>
          </div>
          <div v-if="emojiPickerOpen" class="media-composer-emoji-picker">
            <em-emoji-picker
              locale="pt"
              per-line="10"
              preview-position="none"
              skin-tone-position="none"
              @emoji-select="onEmojiSelect"
              @emoji-click="onEmojiSelect"
              @click="onPickerDomClick"
            />
          </div>

          <div class="media-composer-actions">
            <div class="media-composer-file-strip">
              <button
                v-for="(item, idx) in files"
                :key="item.id"
                type="button"
                class="media-composer-file-pill"
                :class="{ 'is-active': idx === activeIndex }"
                @click="$emit('select-file', idx)"
              >
                {{ item.extensionLabel || 'ARQ' }}
              </button>
              <button type="button" class="media-composer-file-pill media-composer-file-pill--plus" @click="$emit('add-more')">＋</button>
            </div>

            <button
              type="button"
              class="media-composer-send"
              :disabled="sending || !files.length"
              :aria-label="sending ? 'Enviando arquivo' : 'Enviar arquivo'"
              @click="$emit('send')"
            >
              <span v-if="sending" class="media-composer-send-loading" aria-hidden="true" />
              <span v-else class="media-composer-send-icon" aria-hidden="true">➤</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { init as initEmojiMart } from 'emoji-mart'
import emojiData from '@emoji-mart/data'

const props = defineProps({
  open: { type: Boolean, default: false },
  files: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  caption: { type: String, default: '' },
  sending: { type: Boolean, default: false }
})

const currentFile = computed(() => props.files[props.activeIndex] || props.files[0] || null)
const emojiPickerOpen = ref(false)
const captionInputEl = ref(null)
const lastEmojiSelection = ref({ value: '', ts: 0 })

const emit = defineEmits(['close', 'add-more', 'send', 'update:caption', 'insert-emoji', 'select-file'])

const shouldSkipDuplicateSelection = (emojiNative) => {
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) {
    return true
  }
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  return false
}

const getEmojiFromPickerClick = (event) => {
  const path = Array.isArray(event?.composedPath?.()) ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    const native = node?.getAttribute?.('native')
    if (native) return String(native).trim()
    const emoji = node?.getAttribute?.('emoji')
    if (emoji) return String(emoji).trim()
    const ariaLabel = node?.getAttribute?.('aria-label')
    if (ariaLabel && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ariaLabel)) {
      const match = ariaLabel.match(/([\p{Extended_Pictographic}\u{2600}-\u{27BF}])/u)
      if (match?.[1]) return match[1]
    }
  }
  return ''
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
  if (shouldSkipDuplicateSelection(emojiNative)) return
  const currentValue = String(props.caption || '')
  const cursorPos = captionInputEl.value?.selectionStart ?? currentValue.length
  const nextValue = `${currentValue.slice(0, cursorPos)}${emojiNative}${currentValue.slice(cursorPos)}`
  emit('insert-emoji', nextValue)
}

const onPickerDomClick = (event) => {
  const emojiNative = getEmojiFromPickerClick(event)
  if (!emojiNative) return
  if (shouldSkipDuplicateSelection(emojiNative)) return
  const currentValue = String(props.caption || '')
  const cursorPos = captionInputEl.value?.selectionStart ?? currentValue.length
  const nextValue = `${currentValue.slice(0, cursorPos)}${emojiNative}${currentValue.slice(cursorPos)}`
  emit('insert-emoji', nextValue)
}

onMounted(() => {
  if (typeof window !== 'undefined' && !window.__waEmojiMartInitialized) {
    initEmojiMart({ data: emojiData })
    window.__waEmojiMartInitialized = true
  }
})
</script>

<style scoped>
.media-composer-backdrop { position: fixed; inset: 0; z-index: 140; background: rgba(0, 0, 0, 0.8); display: flex; align-items: stretch; justify-content: center; }
.media-composer-modal { width: 100vw; max-width: 100vw; height: 100dvh; background: #111b21; color: #e9edef; display: flex; flex-direction: column; }
.media-composer-header { min-height: 56px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.09); }
.media-composer-close { border: none; background: transparent; color: #e9edef; font-size: 1.4rem; cursor: pointer; }
.media-composer-header h3 { margin: 0; font-size: 1rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-composer-preview { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 20px 24px; }
.media-composer-preview-image { max-width: min(640px, 90vw); max-height: 58vh; border-radius: 8px; object-fit: contain; background: #0f172a; }
.media-composer-preview-pdf { width: min(980px, 92vw); height: min(72vh, 860px); border: 0; border-radius: 10px; background: #fff; }
.media-composer-preview-fallback { width: min(320px, 86vw); min-height: 220px; border-radius: 10px; background: #12202b; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
.media-composer-preview-icon { width: 48px; height: 48px; border-radius: 10px; background: #e11d48; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.media-composer-preview-fallback small { color: #aebac1; }
.media-composer-footer { padding: 10px 14px 14px; border-top: 1px solid rgba(255, 255, 255, 0.09); display: flex; flex-direction: column; gap: 10px; background: #111b21; }
.media-composer-caption-row { display: flex; align-items: center; gap: 8px; }
.media-composer-caption { flex: 1; height: 40px; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 0 12px; background: #1f2c34; color: #e9edef; }
.media-composer-emoji-btn { width: 40px; height: 40px; border: none; border-radius: 8px; background: #1f2c34; color: #e9edef; cursor: pointer; }
.media-composer-emoji-picker { border-radius: 10px; overflow: hidden; max-width: min(360px, 92vw); }
.media-composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.media-composer-file-strip { display: flex; align-items: center; gap: 8px; overflow-x: auto; max-width: calc(100% - 84px); padding-bottom: 2px; }
.media-composer-file-pill { min-width: 48px; height: 48px; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; background: #202c33; color: #e9edef; font-size: 0.76rem; font-weight: 700; cursor: pointer; }
.media-composer-file-pill.is-active { border-color: #00a884; box-shadow: inset 0 0 0 1px #00a88466; }
.media-composer-file-pill--plus { font-size: 1.2rem; }
.media-composer-send { width: 56px; height: 56px; border: none; border-radius: 999px; background: #00a884; color: #042f2e; font-size: 1.2rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.media-composer-send-icon { transform: translateX(1px); line-height: 1; font-size: 1.25rem; font-weight: 800; }
.media-composer-send-loading { width: 20px; height: 20px; border: 2px solid rgba(4, 47, 46, 0.25); border-top-color: #042f2e; border-radius: 999px; animation: media-composer-spin 0.75s linear infinite; }
.media-composer-send:disabled { opacity: 0.6; cursor: not-allowed; }
@keyframes media-composer-spin { to { transform: rotate(360deg); } }
</style>
