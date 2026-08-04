<template>
  <Teleport to="body">
    <Transition name="mped-sheet">
      <div v-if="open" class="modal-overlay mped-sheet-overlay" @click.self="emitClose">
        <div
          class="modal-card mped-sheet"
          :class="{ 'mped-sheet--dragging': drag.active }"
          :style="sheetStyle"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mped-sheet-title"
          @click.stop
        >
          <button
            type="button"
            class="mped-sheet-handle-hit"
            aria-label="Fechar"
            @click="onHandleClick"
            @pointerdown="onDragStart"
          >
            <span class="mped-sheet-handle" aria-hidden="true" />
          </button>

          <header class="mped-sheet-head">
            <button
              type="button"
              class="mped-sheet-back"
              aria-label="Voltar para a lista de planos"
              @click="tryClose"
            >
              <ArrowLeft aria-hidden="true" />
              <span>Planos</span>
            </button>

            <div class="mped-sheet-head-copy">
              <div class="mped-sheet-title-row">
                <h2 id="mped-sheet-title">{{ sheetTitle }}</h2>
                <span
                  v-if="statusBadge"
                  class="mped-sheet-badge"
                  :class="`mped-sheet-badge--${statusBadge.tone}`"
                >
                  <i v-if="statusBadge.tone === 'active'" class="mped-sheet-badge-dot" aria-hidden="true" />
                  {{ statusBadge.label }}
                </span>
              </div>
              <p>{{ sheetSubtitle }}</p>
            </div>

            <div class="mped-sheet-head-actions">
              <button
                type="button"
                class="btn-secondary mped-sheet-btn"
                aria-label="Nova prescrição"
                @click="tryNewPlan"
              >
                <Plus aria-hidden="true" />
                <span>Nova prescrição</span>
              </button>
              <button type="button" class="mped-sheet-close" aria-label="Fechar" @click="emitClose">
                <X aria-hidden="true" />
              </button>
            </div>
          </header>

          <div class="mped-sheet-body">
            <PatientMealPlanEditor
              v-if="open"
              ref="editorRef"
              :key="editorKey"
              in-sheet
              :user="user"
              :profile="profile"
              :prescription="prescription"
              :saving="saving"
              :publishing="publishing"
              :save-message="saveMessage"
              :save-error="saveError"
              @save="emit('save', $event)"
              @publish="emit('publish', $event)"
              @open-history="tryClose"
              @new-plan="tryNewPlan"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ArrowLeft, Plus, X } from 'lucide-vue-next'
import PatientMealPlanEditor from '~/components/patients/PatientMealPlanEditor.vue'
import { methodologyLabel, statusLabel } from '~/utils/meal-plan-prescription.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  prescription: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  publishing: { type: Boolean, default: false },
  saveMessage: { type: String, default: '' },
  saveError: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'close', 'save', 'publish', 'new-plan'])

const editorRef = ref(null)

const dragOffset = ref(0)
const drag = reactive({
  active: false,
  startY: 0,
  moved: false,
})

const editorKey = computed(() => props.prescription?.id || 'new-meal-plan')

const sheetTitle = computed(() => {
  const title = String(props.prescription?.title || '').trim()
  return title || 'Plano alimentar'
})

const sheetSubtitle = computed(() => {
  const parts = []
  const name = String(props.user?.name || '').trim()
  if (name) parts.push(name)
  const method = props.prescription?.methodology
  if (method) parts.push(methodologyLabel(method))
  return parts.join(' · ') || 'Prescrição alimentar'
})

const STATUS_TONES = {
  active: 'active',
  archived: 'archived',
  draft: 'draft',
}

const statusBadge = computed(() => {
  const status = props.prescription?.status
  if (!status) return null
  return {
    tone: STATUS_TONES[status] || 'draft',
    label: statusLabel(status),
  }
})

const sheetStyle = computed(() => {
  if (!drag.active && dragOffset.value === 0) return undefined
  return {
    transform: `translateY(${dragOffset.value}px)`,
    transition: drag.active ? 'none' : 'transform 0.22s ease',
  }
})

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
    dragOffset.value = 0
    drag.active = false
    drag.moved = false
    if (isOpen && import.meta.client) {
      document.addEventListener('keydown', onEscKey)
      window.addEventListener('beforeunload', onBeforeUnload)
    } else {
      document.removeEventListener('keydown', onEscKey)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  },
)

onBeforeUnmount(() => {
  detachDragListeners()
  document.removeEventListener('keydown', onEscKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

function onBeforeUnload(event) {
  if (!props.open) return
  const editor = editorRef.value
  if (!editor?.hasUnsavedChanges?.value) return
  event.preventDefault()
  event.returnValue = ''
}

function canLeaveEditor() {
  const editor = editorRef.value
  if (!editor?.confirmLeave) return true
  return editor.confirmLeave()
}

function tryClose() {
  if (props.saving || props.publishing) return
  if (!canLeaveEditor()) return
  emit('update:open', false)
  emit('close')
}

function tryNewPlan() {
  if (props.saving || props.publishing) return
  if (!canLeaveEditor()) return
  emit('new-plan')
}

function onEscKey(event) {
  if (event.key === 'Escape') tryClose()
}

function emitClose() {
  tryClose()
}

function detachDragListeners() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onHandleClick(event) {
  if (drag.moved) {
    event.preventDefault()
    event.stopPropagation()
    drag.moved = false
    return
  }
  emitClose()
}

function onDragStart(event) {
  if (props.saving || props.publishing) return
  if (event.button != null && event.button !== 0) return
  drag.active = true
  drag.moved = false
  drag.startY = event.clientY
  dragOffset.value = 0
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(event) {
  if (!drag.active) return
  const delta = Math.max(0, event.clientY - drag.startY)
  if (delta > 6) drag.moved = true
  dragOffset.value = delta
}

function onDragEnd() {
  if (!drag.active) return
  const shouldClose = dragOffset.value > 110
  drag.active = false
  detachDragListeners()

  if (shouldClose) {
    dragOffset.value = Math.max(dragOffset.value, window.innerHeight * 0.5)
    window.setTimeout(() => {
      dragOffset.value = 0
      emitClose()
    }, 160)
    return
  }

  dragOffset.value = 0
}
</script>

<style scoped>
.modal-overlay.mped-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  padding: 0;
  background: rgba(0, 0, 0, 0.4);
}

.modal-card.mped-sheet {
  width: 100%;
  max-width: none;
  height: min(96dvh, 100%);
  max-height: 96dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
  background: #f7f8f6;
  border-radius: var(--cf-radius-control) var(--cf-radius-control) 0 0 !important;
  box-shadow: 0 -12px 40px rgba(28, 32, 28, 0.14);
  will-change: transform;
}

.mped-sheet--dragging {
  transition: none !important;
  user-select: none;
}

.mped-sheet-handle-hit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 1.75rem;
  padding: 0.55rem 0 0.2rem;
  border: none;
  background: #fff;
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
}

.mped-sheet-handle-hit:active {
  cursor: grabbing;
}

.mped-sheet-handle {
  width: 2.75rem;
  height: 0.28rem;
  border-radius: 999px;
  background: #d5d8d0;
  pointer-events: none;
}

.mped-sheet-head {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem clamp(1rem, 3vw, 2rem) 0.8rem;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  flex-shrink: 0;
}

.mped-sheet-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem 0.35rem 0.45rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #6b7368;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.mped-sheet-back svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mped-sheet-back:hover {
  background: #f8faf8;
  border-color: #c8dcc4;
  color: #2c322c;
}

.mped-sheet-head-copy {
  flex: 1;
  min-width: 0;
}

.mped-sheet-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.mped-sheet-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mped-sheet-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  flex-shrink: 0;
}

.mped-sheet-badge--draft {
  background: #f1f3f0;
  color: #6b7368;
}

.mped-sheet-badge--active {
  background: #e7f6ec;
  color: #15803d;
}

.mped-sheet-badge--archived {
  background: #f1f3f0;
  color: #8a9288;
}

.mped-sheet-badge-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: #22c55e;
}

.mped-sheet-head p {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mped-sheet-head-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.mped-sheet-btn {
  min-height: 2.1rem !important;
  padding: 0.3rem 0.7rem !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  width: auto !important;
}

.mped-sheet-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mped-sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  color: #6b7368;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
}

.mped-sheet-close svg {
  width: 1.1rem;
  height: 1.1rem;
}

.mped-sheet-close:hover {
  background: rgba(139, 150, 124, 0.12);
  color: #2c322c;
}

.mped-sheet-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0.85rem clamp(0.85rem, 2.5vw, 1.5rem) calc(1rem + env(safe-area-inset-bottom, 0px));
}

.mped-sheet-body :deep(.mped--sheet) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.modal-card.mped-sheet :deep(.btn-primary),
.modal-card.mped-sheet :deep(.btn-secondary) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0.55rem 1rem;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: var(--admin-font-btn, 0.875rem);
  font-weight: var(--admin-font-btn-weight, 500);
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  width: auto;
}

/* Só as ações de salvar/publicar do rodapé lateral ocupam a linha inteira. */
.modal-card.mped-sheet :deep(.mped-sidebar-btn) {
  width: 100%;
}

.modal-card.mped-sheet :deep(.btn-primary) {
  border: none;
  background: var(--primary, #8b967c);
  color: #fff;
}

.modal-card.mped-sheet :deep(.btn-primary:hover:not(:disabled)) {
  background: var(--primary-light, #a3ad98);
}

.modal-card.mped-sheet :deep(.btn-secondary) {
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
  color: #555;
}

.modal-card.mped-sheet :deep(.btn-secondary:hover:not(:disabled)) {
  background: #f8faf8;
  border-color: #c8dcc4;
}

.modal-card.mped-sheet :deep(.btn-primary:disabled),
.modal-card.mped-sheet :deep(.btn-secondary:disabled) {
  opacity: 0.65;
  cursor: not-allowed;
}

.mped-sheet-enter-active,
.mped-sheet-leave-active {
  transition: background-color 0.28s ease;
}

.mped-sheet-enter-active .mped-sheet,
.mped-sheet-leave-active .mped-sheet {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.mped-sheet-enter-from,
.mped-sheet-leave-to {
  background-color: rgba(0, 0, 0, 0);
}

.mped-sheet-enter-from .mped-sheet,
.mped-sheet-leave-to .mped-sheet {
  transform: translateY(100%);
}

@media (max-width: 720px) {
  .modal-card.mped-sheet {
    height: 100dvh;
    max-height: 100dvh;
  }

  .mped-sheet-head {
    gap: 0.55rem;
  }

  /* Ícones sozinhos: o header continua em uma linha, sem quebrar o título. */
  .mped-sheet-back span,
  .mped-sheet-btn span {
    display: none;
  }

  .mped-sheet-back,
  .mped-sheet-btn {
    padding: 0.35rem 0.5rem !important;
  }

  .mped-sheet-head p {
    font-size: 0.72rem;
  }
}
</style>
