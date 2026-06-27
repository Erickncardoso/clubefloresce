<template>
  <Teleport to="body">
    <Transition name="quick-replies-picker-fade">
      <div
        v-if="open"
        ref="pickerEl"
        class="quick-replies-picker"
        :style="panelStyle"
        role="listbox"
        aria-label="Respostas rápidas"
      >
        <header class="quick-replies-picker-header">
          <span class="quick-replies-picker-title">Respostas rápidas</span>
          <button
            type="button"
            class="quick-replies-picker-edit-btn"
            aria-label="Gerenciar respostas rápidas"
            @click="$emit('open-manage')"
          >
            <Pencil class="quick-replies-picker-edit-icon" />
          </button>
        </header>

        <div v-if="loading" class="quick-replies-picker-state">
          <Loader class="spin quick-replies-picker-loader" />
        </div>

        <div v-else-if="!items.length" class="quick-replies-picker-state">
          <p class="quick-replies-picker-empty">Nenhuma resposta rápida encontrada.</p>
        </div>

        <div v-else ref="listEl" class="quick-replies-picker-list" :style="listStyle">
          <button
            v-for="(reply, index) in items"
            :key="reply.id || reply.shortCut"
            type="button"
            class="quick-replies-picker-item"
            :class="{ 'is-active': index === activeIndex }"
            role="option"
            :aria-selected="index === activeIndex ? 'true' : 'false'"
            @mouseenter="$emit('update:activeIndex', index)"
            @click="$emit('select', reply)"
          >
            <div class="quick-replies-picker-card">
              <span class="quick-replies-picker-item-title">{{ reply.shortCut }}</span>
              <span class="quick-replies-picker-item-preview">{{ preview(reply) }}</span>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Pencil, Loader } from 'lucide-vue-next'
import { quickReplyPreviewText } from '~/composables/whatsapp/useWhatsappQuickReplies.js'

const PANEL_HEADER_PX = 58
const PANEL_MIN_PX = 180
const PANEL_MAX_PX = 340
const PANEL_MAX_WIDTH = 480

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  activeIndex: { type: Number, default: 0 },
  anchorEl: { type: Object, default: null },
})

const emit = defineEmits(['select', 'open-manage', 'update:activeIndex', 'close'])

const pickerEl = ref(null)
const listEl = ref(null)
const panelStyle = ref({ display: 'none' })
const listStyle = ref({})
const preview = (reply) => quickReplyPreviewText(reply)

const resolveAnchorElement = (raw) => {
  if (!raw || typeof Element === 'undefined') return null
  if (raw instanceof Element) return raw
  if (raw.value instanceof Element) return raw.value
  if (raw.$el instanceof Element) return raw.$el
  return null
}

const isEventInside = (event, element) => {
  if (!element) return false
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  if (path.includes(element)) return true
  const target = event.target
  return Boolean(target && element.contains?.(target))
}

const isInsideComposeInput = (event) => {
  const anchor = resolveAnchorElement(props.anchorEl)
  const footer = anchor?.closest?.('.chat-footer')
  const inputWrap =
    footer?.querySelector?.('.compose-pill-input') ||
    footer?.querySelector?.('.input-wrapper')
  return isEventInside(event, inputWrap)
}

const onDocumentPointerDown = (event) => {
  if (!props.open) return
  if (isEventInside(event, pickerEl.value)) return
  if (isInsideComposeInput(event)) return
  emit('close')
}

const setOutsideClickListener = (active) => {
  if (typeof document === 'undefined') return
  if (active) {
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
}

const resolveAnchorRect = () => {
  const anchor = resolveAnchorElement(props.anchorEl)
  if (!anchor) return null
  const footer = anchor.closest('.chat-footer') || anchor
  const inputWrap =
    footer.querySelector?.('.compose-pill-input') ||
    footer.querySelector?.('.input-wrapper')
  const footerRect = footer.getBoundingClientRect()
  const inputRect = inputWrap?.getBoundingClientRect?.() || footerRect
  const rawWidth = inputRect.width + 56
  const width = Math.min(PANEL_MAX_WIDTH, Math.max(280, rawWidth))
  const left = Math.max(12, footerRect.left + 14)
  return {
    left,
    width,
    bottom: window.innerHeight - footerRect.top + 8,
    maxHeight: Math.min(
      PANEL_MAX_PX,
      Math.max(PANEL_MIN_PX, footerRect.top - 24)
    ),
  }
}

const updateFloatingPosition = () => {
  const rect = resolveAnchorRect()
  if (!rect) {
    panelStyle.value = { display: 'none' }
    listStyle.value = {}
    return
  }

  const listMax = Math.max(100, rect.maxHeight - PANEL_HEADER_PX)
  panelStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    bottom: `${rect.bottom}px`,
    height: `${rect.maxHeight}px`,
    maxHeight: `${rect.maxHeight}px`,
    display: 'flex',
    flexDirection: 'column',
  }
  listStyle.value = {
    maxHeight: `${listMax}px`,
    height: `${listMax}px`,
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    setOutsideClickListener(isOpen)
    if (!isOpen) return
    await nextTick()
    updateFloatingPosition()
    requestAnimationFrame(updateFloatingPosition)
  }
)

watch(
  () => props.activeIndex,
  async (index) => {
    if (!props.open || index < 0) return
    await nextTick()
    const root = listEl.value
    if (!root) return
    const row = root.children[index]
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'nearest' })
    }
  }
)

watch(
  () => props.items.length,
  () => {
    if (props.open) nextTick(() => updateFloatingPosition())
  }
)

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('resize', updateFloatingPosition)
  window.addEventListener('scroll', updateFloatingPosition, true)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  setOutsideClickListener(false)
  window.removeEventListener('resize', updateFloatingPosition)
  window.removeEventListener('scroll', updateFloatingPosition, true)
})
</script>

<style scoped>
.quick-replies-picker {
  box-sizing: border-box;
  max-width: 480px;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 1px 3px rgba(11, 20, 26, 0.08),
    0 4px 24px rgba(11, 20, 26, 0.14);
  overflow: hidden;
  z-index: 1200;
}

.quick-replies-picker-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
}

.quick-replies-picker-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #111b21;
}

.quick-replies-picker-edit-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.quick-replies-picker-edit-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.quick-replies-picker-edit-icon {
  width: 18px;
  height: 18px;
}

.quick-replies-picker-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-replies-picker-item {
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  flex: 0 0 auto;
}

.quick-replies-picker-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 11px 13px;
  border-radius: 10px;
  background: #f0f2f5;
  transition: background 0.12s ease;
}

.quick-replies-picker-item:hover .quick-replies-picker-card,
.quick-replies-picker-item.is-active .quick-replies-picker-card {
  background: #e9edef;
}

.quick-replies-picker-item-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111b21;
  line-height: 1.25;
}

.quick-replies-picker-item-preview {
  font-size: 0.8125rem;
  color: #667781;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quick-replies-picker-state {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.quick-replies-picker-empty {
  margin: 0;
  color: #667781;
  font-size: 0.875rem;
  text-align: center;
}

.quick-replies-picker-loader {
  width: 24px;
  height: 24px;
  color: #00a884;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.quick-replies-picker-fade-enter-active,
.quick-replies-picker-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.quick-replies-picker-fade-enter-from,
.quick-replies-picker-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
