<template>
  <Teleport to="body">
    <Transition name="mpnew-pop">
      <div v-if="open" class="modal-overlay mpnew-overlay" @click.self="close">
        <div
          class="modal-card mpnew-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mpnew-title"
          @click.stop
        >
          <header class="mpnew-head">
            <div class="mpnew-head-copy">
              <h2 id="mpnew-title">Nova prescrição alimentar</h2>
              <p>Dê um nome ao plano e escolha como quer prescrever.</p>
            </div>
            <button type="button" class="mpnew-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="mpnew-body">
            <div class="mpnew-step">
              <div class="field field--float mpnew-field" :class="{ 'mpnew-field--invalid': nameInvalid }">
                <label for="mpnew-name">Nome da prescrição</label>
                <input
                  id="mpnew-name"
                  ref="nameInputRef"
                  v-model="name"
                  type="text"
                  maxlength="120"
                  autocomplete="off"
                  placeholder="Ex.: Cardápio semanal"
                  :aria-invalid="nameInvalid"
                  aria-describedby="mpnew-name-hint"
                  @keydown.enter.prevent="submit"
                  @input="onNameInput"
                >
              </div>
              <p id="mpnew-name-hint" class="mpnew-hint" :class="{ 'mpnew-hint--error': nameInvalid }">
                <AlertCircle v-if="nameInvalid" class="mpnew-hint-icon" aria-hidden="true" />
                {{ nameInvalid ? 'Informe um nome para a prescrição.' : 'Fica visível para o paciente no app.' }}
              </p>
            </div>

            <div class="mpnew-step">
              <span id="mpnew-method-label" class="mpnew-step-label">Método de prescrição</span>
              <div class="mpnew-methods" role="radiogroup" aria-labelledby="mpnew-method-label">
                <button
                  v-for="method in MEAL_PLAN_METHODOLOGIES"
                  :key="method.id"
                  type="button"
                  role="radio"
                  class="mpnew-method"
                  :class="{
                    'mpnew-method--active': methodId === method.id,
                    'mpnew-method--disabled': !method.available,
                  }"
                  :aria-checked="methodId === method.id"
                  :disabled="!method.available"
                  @click="methodId = method.id"
                >
                  <span class="mpnew-method-icon" aria-hidden="true">
                    <component :is="methodIcon(method.id)" />
                  </span>
                  <span class="mpnew-method-copy">
                    <span class="mpnew-method-title">
                      {{ method.label }}
                      <small v-if="!method.available" class="mpnew-method-soon">Em breve</small>
                    </span>
                    <span class="mpnew-method-desc">{{ method.description }}</span>
                    <span v-if="methodId === method.id" class="mpnew-method-adv">{{ method.advantages }}</span>
                  </span>
                  <span class="mpnew-method-mark" aria-hidden="true">
                    <Check v-if="methodId === method.id" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <footer class="mpnew-foot">
            <p v-if="error" class="mpnew-error" role="alert">
              <AlertCircle class="mpnew-hint-icon" aria-hidden="true" />
              {{ error }}
            </p>
            <div class="mpnew-foot-actions">
              <button type="button" class="btn-secondary mpnew-btn" @click="close">
                Cancelar
              </button>
              <button type="button" class="btn-primary mpnew-btn" @click="submit">
                Criar prescrição
                <ArrowRight class="mpnew-btn-icon" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { AlertCircle, ArrowRight, Check, LayoutGrid, PenLine, Sparkles, X } from 'lucide-vue-next'
import { MEAL_PLAN_METHODOLOGIES } from '~/utils/meal-plan-prescription.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'submit'])

const METHOD_ICONS = {
  foods: Sparkles,
  equivalents: LayoutGrid,
  qualitative: PenLine,
}

const nameInputRef = ref(null)
const name = ref('')
const methodId = ref('foods')
const error = ref('')
const submitted = ref(false)

const nameInvalid = computed(() => submitted.value && !name.value.trim())

function methodIcon(id) {
  return METHOD_ICONS[id] || Sparkles
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    detachEscListener()
    return
  }
  name.value = ''
  methodId.value = 'foods'
  error.value = ''
  submitted.value = false
  attachEscListener()
  await nextTick()
  nameInputRef.value?.focus?.()
})

function onNameInput() {
  if (error.value && name.value.trim()) error.value = ''
}

function onEscKey(event) {
  if (event.key === 'Escape') close()
}

function attachEscListener() {
  if (!import.meta.client) return
  document.addEventListener('keydown', onEscKey)
}

function detachEscListener() {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onEscKey)
}

onBeforeUnmount(detachEscListener)

function close() {
  emit('update:open', false)
}

function submit() {
  submitted.value = true
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = ''
    nameInputRef.value?.focus?.()
    return
  }
  const method = MEAL_PLAN_METHODOLOGIES.find((item) => item.id === methodId.value)
  if (!method?.available) {
    error.value = 'Esta metodologia ainda não está disponível.'
    return
  }
  error.value = ''
  emit('submit', { title: trimmed, methodology: methodId.value })
  emit('update:open', false)
}
</script>

<style scoped>
.modal-overlay.mpnew-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.mpnew-modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 33rem);
  max-height: min(92dvh, 46rem);
  padding: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ece9;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.16),
    0 8px 20px rgba(15, 23, 42, 0.08);
  transform-origin: center center;
  will-change: transform, opacity;
}

.mpnew-pop-enter-active,
.mpnew-pop-leave-active {
  transition: opacity 0.24s ease;
}

.mpnew-pop-enter-active .mpnew-modal,
.mpnew-pop-leave-active .mpnew-modal {
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.mpnew-pop-enter-from,
.mpnew-pop-leave-to {
  opacity: 0;
}

.mpnew-pop-enter-from .mpnew-modal,
.mpnew-pop-leave-to .mpnew-modal {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

.mpnew-pop-leave-active,
.mpnew-pop-leave-active .mpnew-modal {
  transition-duration: 0.18s;
}

@media (prefers-reduced-motion: reduce) {
  .mpnew-pop-enter-active,
  .mpnew-pop-leave-active,
  .mpnew-pop-enter-active .mpnew-modal,
  .mpnew-pop-leave-active .mpnew-modal {
    transition: opacity 0.12s ease;
  }

  .mpnew-pop-enter-from .mpnew-modal,
  .mpnew-pop-leave-to .mpnew-modal {
    transform: none;
  }
}

/* Head */
.mpnew-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.35rem 0.9rem;
  border-bottom: 1px solid #eef1ee;
  flex-shrink: 0;
}

.mpnew-head-copy {
  flex: 1;
  min-width: 0;
}

.mpnew-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
  letter-spacing: -0.01em;
  text-align: left;
}

.mpnew-head p {
  margin: 0.3rem 0 0;
  font-size: 0.82rem;
  color: #6b7368;
  text-align: left;
}

.mpnew-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #6b7368;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.mpnew-close svg {
  width: 1rem;
  height: 1rem;
}

.mpnew-close:hover {
  color: #2c322c;
  border-color: #cfe3cb;
  background: #f8faf8;
}

/* Body */
.mpnew-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.15rem 1.35rem 1.25rem;
}

.mpnew-step {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mpnew-step-label {
  margin-bottom: 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #2c322c;
}

.mpnew-field {
  margin: 0;
}

.mpnew-field--invalid :deep(input) {
  border-color: #dd8b83 !important;
}

.mpnew-hint {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: #8a9288;
}

.mpnew-hint--error {
  color: #b42318;
}

.mpnew-hint-icon {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

/* Methods */
.mpnew-methods {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.mpnew-method {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.7rem;
  width: 100%;
  padding: 0.75rem 0.8rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.mpnew-method:hover:not(.mpnew-method--active):not(.mpnew-method--disabled) {
  border-color: #cfe3cb;
  background: #fbfcfb;
}

.mpnew-method:focus-visible {
  outline: 2px solid var(--primary, #8b967c);
  outline-offset: 2px;
}

.mpnew-method--active {
  border-color: var(--primary, #8b967c);
  background: #f7f9f5;
  box-shadow: inset 0 0 0 1px var(--primary, #8b967c);
}

.mpnew-method--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mpnew-method-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--cf-radius-control);
  background: #eef1ec;
  color: #6b7368;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.mpnew-method-icon svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.8;
}

.mpnew-method--active .mpnew-method-icon {
  background: var(--primary, #8b967c);
  color: #fff;
}

.mpnew-method-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.mpnew-method-title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c322c;
}

.mpnew-method-soon {
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: #eef1ee;
  color: #6b7368;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mpnew-method-desc {
  font-size: 0.78rem;
  line-height: 1.45;
  color: #5f675f;
}

.mpnew-method-adv {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #6f7a62;
}

.mpnew-method-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  margin-top: 0.4rem;
  border: 1px solid #d7ded8;
  border-radius: 50%;
  color: #fff;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.mpnew-method-mark svg {
  width: 0.7rem;
  height: 0.7rem;
  stroke-width: 3;
}

.mpnew-method--active .mpnew-method-mark {
  background: var(--primary, #8b967c);
  border-color: var(--primary, #8b967c);
}

/* Foot */
.mpnew-foot {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1.35rem 1.1rem;
  border-top: 1px solid #eef1ee;
  background: #fbfcfb;
  flex-shrink: 0;
}

.mpnew-error {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  color: #b42318;
  font-size: 0.8rem;
}

.mpnew-foot-actions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem;
}

.mpnew-btn {
  min-height: 2.7rem !important;
  padding: 0.55rem 1.1rem !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
}

.mpnew-btn-icon {
  width: 0.9rem;
  height: 0.9rem;
}

@supports (corner-shape: squircle) {
  .mpnew-method,
  .mpnew-method-icon,
  .mpnew-close {
    corner-shape: squircle;
  }
}

@media (max-width: 520px) {
  .mpnew-modal {
    max-height: 94dvh;
  }

  .mpnew-head,
  .mpnew-body,
  .mpnew-foot {
    padding-inline: 1.05rem;
  }

  .mpnew-foot-actions {
    grid-template-columns: 1fr;
  }
}
</style>
