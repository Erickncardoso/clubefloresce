<template>
  <Teleport to="body">
    <Transition name="cfconfirm">
      <div v-if="open" class="cfconfirm-overlay" @click.self="cancel">
        <div
          class="cfconfirm-card"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div class="cfconfirm-visual" :class="`cfconfirm-visual--${tone}`" aria-hidden="true">
            <component :is="toneIcon" />
          </div>

          <div class="cfconfirm-copy">
            <h2 :id="titleId">{{ title }}</h2>
            <p :id="descriptionId">{{ description }}</p>
          </div>

          <div class="cfconfirm-actions">
            <button
              type="button"
              class="btn-secondary cfconfirm-btn"
              :disabled="busy"
              @click="cancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              ref="confirmBtnRef"
              type="button"
              class="cfconfirm-btn cfconfirm-btn--confirm"
              :class="`cfconfirm-btn--${tone}`"
              :disabled="busy"
              @click="confirm"
            >
              {{ busy ? busyLabel : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, Trash2 } from 'lucide-vue-next'

let dialogSeq = 0

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  busyLabel: { type: String, default: 'Aguarde…' },
  busy: { type: Boolean, default: false },
  tone: { type: String, default: 'danger' }, // danger | warning
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const uid = `d${(dialogSeq += 1)}`
const titleId = `cfconfirm-title-${uid}`
const descriptionId = `cfconfirm-desc-${uid}`
const confirmBtnRef = ref(null)

const toneIcon = computed(() => (props.tone === 'danger' ? Trash2 : AlertTriangle))

watch(
  () => props.open,
  async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      confirmBtnRef.value?.focus?.()
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onKeydown)
})

function onKeydown(event) {
  if (event.key === 'Escape') cancel()
}

function cancel() {
  if (props.busy) return
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  if (props.busy) return
  emit('confirm')
}
</script>

<style scoped>
.cfconfirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.cfconfirm-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  width: min(100%, 24rem);
  padding: 1.5rem 1.35rem 1.25rem;
  text-align: center;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
}

.cfconfirm-visual {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
}

.cfconfirm-visual svg {
  width: 1.35rem;
  height: 1.35rem;
  stroke-width: 1.8;
}

.cfconfirm-visual--danger {
  background: #fdeceb;
  color: #b42318;
}

.cfconfirm-visual--warning {
  background: #fef4e6;
  color: #b45309;
}

.cfconfirm-copy h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c322c;
}

.cfconfirm-copy p {
  margin: 0.35rem 0 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: #6b7368;
}

.cfconfirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.35rem;
}

.cfconfirm-btn {
  min-height: 2.6rem !important;
  padding: 0.5rem 0.9rem !important;
  font-size: 0.84rem !important;
  font-weight: 600 !important;
  width: 100%;
}

.cfconfirm-btn--confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  line-height: 1;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cfconfirm-btn--danger {
  background: #b42318;
}

.cfconfirm-btn--danger:hover:not(:disabled) {
  background: #912016;
}

.cfconfirm-btn--warning {
  background: #b45309;
}

.cfconfirm-btn--warning:hover:not(:disabled) {
  background: #96450a;
}

.cfconfirm-btn--confirm:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.cfconfirm-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@supports (corner-shape: squircle) {
  .cfconfirm-card,
  .cfconfirm-btn--confirm {
    corner-shape: squircle;
  }
}

.cfconfirm-enter-active,
.cfconfirm-leave-active {
  transition: opacity 0.2s ease;
}

.cfconfirm-enter-active .cfconfirm-card,
.cfconfirm-leave-active .cfconfirm-card {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
}

.cfconfirm-enter-from,
.cfconfirm-leave-to {
  opacity: 0;
}

.cfconfirm-enter-from .cfconfirm-card,
.cfconfirm-leave-to .cfconfirm-card {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .cfconfirm-enter-active,
  .cfconfirm-leave-active,
  .cfconfirm-enter-active .cfconfirm-card,
  .cfconfirm-leave-active .cfconfirm-card {
    transition: opacity 0.12s ease;
  }

  .cfconfirm-enter-from .cfconfirm-card,
  .cfconfirm-leave-to .cfconfirm-card {
    transform: none;
  }
}

@media (max-width: 420px) {
  .cfconfirm-actions {
    grid-template-columns: 1fr;
  }
}
</style>
