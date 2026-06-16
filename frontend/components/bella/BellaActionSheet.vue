<template>
  <Teleport to="body">
    <Transition name="bella-sheet-fade">
      <button
        v-if="modelValue"
        type="button"
        class="bella-sheet-backdrop"
        :style="backdropStyle"
        aria-label="Fechar menu da Bella"
        @click="close"
      />
    </Transition>

    <Transition name="bella-sheet-slide" @after-enter="onSheetEnter">
      <section
        v-if="modelValue"
        ref="sheetRef"
        class="bella-sheet"
        :class="{
          'bella-sheet--dragging': isDragging,
          'bella-sheet--animating': isAnimatingClose,
        }"
        :style="sheetStyle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bella-sheet-title"
      >
        <div
          class="bella-sheet-drag-zone"
          aria-label="Arrastar para fechar"
          @pointerdown="onDragStart"
        >
          <div class="bella-sheet-handle" aria-hidden="true" />
        </div>

        <header class="bella-sheet-head">
          <div class="bella-sheet-hero" aria-hidden="true">
            <Sparkles class="bella-sheet-hero-icon" />
          </div>
          <div class="bella-sheet-copy">
            <h2 id="bella-sheet-title" class="bella-sheet-title">Bella IA</h2>
            <p class="bella-sheet-subtitle">Como posso te ajudar hoje?</p>
          </div>
          <button type="button" class="bella-sheet-close" aria-label="Fechar" @click="close">
            <X class="bella-sheet-close-icon" />
          </button>
        </header>

        <div class="bella-sheet-grid" role="list" aria-label="Atalhos da Bella">
          <button
            v-for="action in BELLA_ACTIONS"
            :key="action.id"
            type="button"
            class="bella-sheet-action cf-squircle cf-squircle--tile"
            role="listitem"
            @click="selectAction(action)"
          >
            <span class="bella-sheet-action-icon-wrap" aria-hidden="true">
              <component :is="action.icon" class="bella-sheet-action-icon" />
            </span>
            <span class="bella-sheet-action-label">{{ action.label }}</span>
          </button>
        </div>

        <button type="button" class="bella-sheet-chat cf-btn cf-btn--pink" @click="startChat">
          Iniciar conversa
        </button>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Sparkles, X } from 'lucide-vue-next'
import { BELLA_ACTIONS, navigateBellaAction } from '~/utils/bella-actions'
import { lockPatientScroll, unlockPatientScroll } from '~/composables/useVerticalWheelPassthrough'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const sheetRef = ref(null)
const dragOffset = ref(0)
const isDragging = ref(false)
const isAnimatingClose = ref(false)
const sheetEntered = ref(false)

let dragStartY = 0
let activePointerId = null

const sheetStyle = computed(() => {
  if (dragOffset.value <= 0) return {}
  return { transform: `translateY(${dragOffset.value}px)` }
})

const backdropStyle = computed(() => {
  if (dragOffset.value <= 0) return {}
  const sheetHeight = sheetRef.value?.offsetHeight || 420
  const progress = Math.min(1, dragOffset.value / (sheetHeight * 0.55))
  return { opacity: String(Math.max(0, 0.42 * (1 - progress))) }
})

function close() {
  emit('update:modelValue', false)
}

function resetDragState() {
  dragOffset.value = 0
  isDragging.value = false
  isAnimatingClose.value = false
  activePointerId = null
  removeDragListeners()
}

function selectAction(action) {
  close()
  navigateBellaAction(action)
}

function startChat() {
  close()
  navigateTo('/bella/chat/general')
}

function onSheetEnter() {
  sheetEntered.value = true
}

function getCloseThreshold() {
  const height = sheetRef.value?.offsetHeight || 420
  return Math.min(140, Math.max(72, height * 0.18))
}

function onDragStart(event) {
  if (isAnimatingClose.value || !sheetEntered.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  activePointerId = event.pointerId
  isDragging.value = true
  dragStartY = event.clientY
  dragOffset.value = 0

  event.currentTarget.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(event) {
  if (!isDragging.value || event.pointerId !== activePointerId) return

  const delta = event.clientY - dragStartY
  if (delta > 0) event.preventDefault()
  dragOffset.value = Math.max(0, delta)
}

function onDragEnd(event) {
  if (!isDragging.value || event.pointerId !== activePointerId) return

  isDragging.value = false
  removeDragListeners()

  if (dragOffset.value >= getCloseThreshold()) {
    finishDragClose()
    return
  }

  isAnimatingClose.value = true
  dragOffset.value = 0
  window.setTimeout(() => {
    isAnimatingClose.value = false
  }, 280)
}

async function finishDragClose() {
  isAnimatingClose.value = true
  isDragging.value = false

  const height = sheetRef.value?.offsetHeight || 420
  dragOffset.value = height + 48

  await new Promise((resolve) => window.setTimeout(resolve, 260))
  close()
}

function removeDragListeners() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) close()
}

function setScrollLock(open) {
  if (typeof document === 'undefined') return
  if (open) lockPatientScroll()
  else unlockPatientScroll()
}

watch(
  () => props.modelValue,
  (open) => {
    setScrollLock(open)
    if (open) {
      sheetEntered.value = false
      resetDragState()
      return
    }
    window.setTimeout(resetDragState, 320)
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  removeDragListeners()
  unlockPatientScroll()
})
</script>

<style scoped>
.bella-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(20, 20, 20, 0.42);
  cursor: pointer;
}

.bella-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 130;
  width: 100%;
  max-width: 100%;
  max-height: min(82vh, 680px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 1.25rem var(--cf-tab-clearance);
  border-radius: var(--cf-radius-xl, 1.875rem) var(--cf-radius-xl, 1.875rem) 0 0;
  background: var(--cf-surface);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  will-change: transform;
}

.bella-sheet--dragging {
  transition: none !important;
}

.bella-sheet--animating:not(.bella-sheet--dragging) {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.bella-sheet::-webkit-scrollbar {
  display: none;
}

.bella-sheet-drag-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  margin: 0.65rem 0 0.85rem;
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.bella-sheet-drag-zone:active {
  cursor: grabbing;
}

.bella-sheet-handle {
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--cf-track, #e4e4e0);
  pointer-events: none;
}

.bella-sheet-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.bella-sheet-hero {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  border: 1px solid #f5dfe1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bella-sheet-hero-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--cf-pink);
}

.bella-sheet-copy {
  min-width: 0;
}

.bella-sheet-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.bella-sheet-subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--cf-text-muted);
}

.bella-sheet-close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-track, #f3f3f0);
  color: var(--cf-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.bella-sheet-close-icon {
  width: 1rem;
  height: 1rem;
}

.bella-sheet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.bella-sheet-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 5.5rem;
  padding: 0.85rem 0.65rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.bella-sheet-action:active {
  transform: scale(0.98);
  background: var(--cf-pink-soft);
}

.bella-sheet-action-icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-sheet-action-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--cf-pink-dark);
}

.bella-sheet-action-label {
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--cf-text);
}

.bella-sheet-chat {
  width: 100%;
  border: none;
  cursor: pointer;
}

.bella-sheet-fade-enter-active,
.bella-sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}

.bella-sheet-fade-enter-from,
.bella-sheet-fade-leave-to {
  opacity: 0;
}

.bella-sheet-slide-enter-active,
.bella-sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease;
}

.bella-sheet-slide-enter-from,
.bella-sheet-slide-leave-to {
  transform: translateY(100%);
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .bella-sheet-action,
  .bella-sheet-fade-enter-active,
  .bella-sheet-fade-leave-active,
  .bella-sheet-slide-enter-active,
  .bella-sheet-slide-leave-active,
  .bella-sheet--animating {
    transition: none !important;
  }

  .bella-sheet-action:active {
    transform: none;
  }
}
</style>
