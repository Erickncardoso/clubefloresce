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
              <h2 id="mpnew-title">Escolha um nome e o método de escrita</h2>
              <p>Inteligente, Tradicional ou Qualitativo — escolha o que combina com a conduta de cada paciente.</p>
            </div>
            <button type="button" class="mpnew-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="field field--float mpnew-field">
            <label for="mpnew-name">Nome da prescrição</label>
            <input
              id="mpnew-name"
              ref="nameInputRef"
              v-model="name"
              type="text"
              maxlength="120"
              placeholder="Ex.: Cardápio semanal"
              @keydown.enter.prevent="submit"
            >
          </div>

          <div class="mpnew-tabs" role="tablist" aria-label="Metodologia">
            <button
              v-for="method in MEAL_PLAN_METHODOLOGIES"
              :key="method.id"
              type="button"
              role="tab"
              class="mpnew-tab"
              :class="{
                'mpnew-tab--active': methodId === method.id,
                'mpnew-tab--disabled': !method.available,
              }"
              :aria-selected="methodId === method.id"
              :disabled="!method.available"
              @click="methodId = method.id"
            >
              {{ method.label }}
              <small v-if="!method.available">Em breve</small>
            </button>
          </div>

          <div class="mpnew-desc">
            <Transition name="mpnew-desc" mode="out-in">
              <div :key="methodId">
                <p>{{ activeMethod.description }}</p>
                <p class="mpnew-advantages">{{ activeMethod.advantages }}</p>
              </div>
            </Transition>
          </div>

          <p v-if="error" class="mpnew-error">{{ error }}</p>

          <button type="button" class="btn-primary mpnew-submit" @click="submit">
            Avançar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { MEAL_PLAN_METHODOLOGIES } from '~/utils/meal-plan-prescription.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'submit'])

const nameInputRef = ref(null)
const name = ref('')
const methodId = ref('foods')
const error = ref('')

const activeMethod = computed(() => {
  return MEAL_PLAN_METHODOLOGIES.find((item) => item.id === methodId.value)
    || MEAL_PLAN_METHODOLOGIES[0]
})

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    detachEscListener()
    return
  }
  name.value = ''
  methodId.value = 'foods'
  error.value = ''
  attachEscListener()
  await nextTick()
  nameInputRef.value?.focus?.()
})

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
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = 'Informe um nome para a prescrição.'
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
  width: min(100%, 32rem);
  padding: 1.5rem;
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

.mpnew-pop-leave-active {
  transition-duration: 0.18s;
}

.mpnew-pop-leave-active .mpnew-modal {
  transition-duration: 0.18s;
}

@media (prefers-reduced-motion: reduce) {
  .mpnew-pop-enter-active,
  .mpnew-pop-leave-active,
  .mpnew-pop-enter-active .mpnew-modal,
  .mpnew-pop-leave-active .mpnew-modal {
    transition: none;
  }

  .mpnew-pop-enter-from .mpnew-modal,
  .mpnew-pop-leave-to .mpnew-modal {
    transform: none;
  }
}

.mpnew-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.15rem;
}

.mpnew-head-copy {
  flex: 1;
  min-width: 0;
}

.mpnew-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
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

.mpnew-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
  text-align: left;
}

.mpnew-head p {
  margin: 0.35rem 0 0;
  font-size: 0.84rem;
  color: #6b7368;
  text-align: left;
}

.mpnew-field {
  margin: 0.85rem 0 1rem;
}

.mpnew-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.mpnew-tab {
  min-height: 2.5rem;
  padding: 0.45rem 0.35rem;
  border: 1px solid #e2e8e4;
  background: #f4f6f4;
  color: #374151;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.mpnew-tab:not(.mpnew-tab--active):not(.mpnew-tab--disabled):hover {
  border-color: #cfe3cb;
  background: #f8faf8;
}

.mpnew-tab--active {
  background: #8b967c;
  border-color: #8b967c;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 150, 124, 0.22);
}

.mpnew-tab--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mpnew-desc {
  min-height: 5.5rem;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #4b5563;
}

.mpnew-desc-enter-active,
.mpnew-desc-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.mpnew-desc-enter-from,
.mpnew-desc-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.mpnew-tab small {
  font-size: 0.58rem;
  font-weight: 500;
  opacity: 0.75;
}

.mpnew-advantages {
  margin-top: 0.5rem;
  color: #6b7368;
}

.mpnew-error {
  margin: 0 0 0.75rem;
  color: #b42318;
  font-size: 0.82rem;
}

.mpnew-submit {
  width: 100%;
  min-height: 2.75rem !important;
}

@media (max-width: 520px) {
  .mpnew-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
