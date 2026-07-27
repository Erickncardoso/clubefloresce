<template>
  <Teleport to="body">
    <Transition name="dieta-extra-fade">
      <button
        v-if="open"
        type="button"
        class="dieta-extra-backdrop"
        aria-label="Fechar"
        @click="close"
      />
    </Transition>

    <Transition name="dieta-extra-slide">
      <section
        v-if="open"
        class="dieta-extra-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dieta-extra-title"
      >
        <div class="dieta-extra-handle-zone" aria-hidden="true">
          <div class="dieta-extra-handle" />
        </div>

        <header class="dieta-extra-head">
          <div class="dieta-extra-title-wrap">
            <span class="dieta-extra-title-icon">
              <Utensils aria-hidden="true" />
            </span>
            <div>
              <h2 id="dieta-extra-title">Adicionar alimento</h2>
              <p class="dieta-extra-meal">{{ mealLabel }}</p>
            </div>
          </div>
          <button type="button" class="dieta-extra-close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="dieta-extra-body">
          <p class="dieta-extra-intro">
            Busque o alimento consumido e ajuste a quantidade.
          </p>

          <label class="dieta-extra-field dieta-extra-search-zone">
            <span class="dieta-extra-field-label">Qual alimento você consumiu?</span>
            <BellaFoodSearchPicker
              v-model="foodQuery"
              placeholder="Busque por nome…"
              :show-panel-search="false"
              @select="onFoodSelect"
            />
          </label>

          <div v-if="selectedFood" class="dieta-extra-selected">
            <span class="dieta-extra-selected-check"><Check aria-hidden="true" /></span>
            <div>
              <strong>{{ selectedFood.name }}</strong>
              <span v-if="selectedFood.per100g?.caloriesKcal">
                {{ selectedFood.per100g.caloriesKcal }} kcal a cada 100 g
              </span>
            </div>
          </div>

          <div v-if="selectedFood" class="dieta-extra-row">
            <label class="dieta-extra-field dieta-extra-field--grow">
              <span class="dieta-extra-field-label">Quantidade</span>
              <input
                v-model.number="amount"
                type="number"
                name="extra-food-amount"
                min="0.1"
                step="any"
                class="dieta-extra-input"
                inputmode="decimal"
                autocomplete="off"
              />
            </label>

            <label class="dieta-extra-field dieta-extra-field--unit">
              <span class="dieta-extra-field-label">Unidade</span>
              <select v-model="unit" name="extra-food-unit" class="dieta-extra-select">
                <option v-for="option in unitOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div v-if="previewLabel" class="dieta-extra-preview">
            <span>Será adicionado</span>
            <strong>{{ previewLabel }}</strong>
          </div>
          <p v-if="error" class="dieta-extra-error" role="alert">{{ error }}</p>
        </div>

        <footer class="dieta-extra-foot">
          <button type="button" class="dieta-extra-submit" :disabled="!canSubmit" @click="submit">
            <Plus aria-hidden="true" />
            Adicionar à refeição
          </button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Check, Plus, Utensils, X } from 'lucide-vue-next'
import { lockPatientScroll, unlockPatientScroll, resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'
import { EXTRA_QUANTITY_UNITS, defaultExtraQuantityForUnit, formatExtraItemLabel } from '~/utils/meal-extra-quantity'

const props = defineProps({
  open: { type: Boolean, default: false },
  mealLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'added'])

const foodQuery = ref('')
const selectedFood = ref(null)
const amount = ref(null)
const unit = ref('unidade')
const error = ref('')
let previousFocus = null

const unitOptions = EXTRA_QUANTITY_UNITS

const previewLabel = computed(() => {
  if (!selectedFood.value) return ''
  const qty = Number(amount.value)
  if (!Number.isFinite(qty) || qty <= 0) return ''
  return formatExtraItemLabel(selectedFood.value.name, qty, unit.value)
})

const canSubmit = computed(() => {
  if (!selectedFood.value) return false
  const qty = Number(amount.value)
  return Number.isFinite(qty) && qty > 0
})

function resetForm() {
  foodQuery.value = ''
  selectedFood.value = null
  amount.value = null
  unit.value = 'unidade'
  error.value = ''
}

function applyDefaultQuantity(food, unitId = unit.value) {
  if (!food?.name) return
  const defaults = defaultExtraQuantityForUnit(food.name, unitId)
  amount.value = defaults.amount
  unit.value = defaults.unit
}

function close() {
  emit('update:open', false)
}

function setModalDocumentState(active) {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('dieta-extra-modal-open', active)
}

function onWindowKeydown(event) {
  if (event.key === 'Escape' && props.open) close()
}

function onFoodSelect(food) {
  selectedFood.value = food
  foodQuery.value = food?.name || ''
  error.value = ''
  applyDefaultQuantity(food, unit.value)
}

watch(unit, (nextUnit) => {
  if (!selectedFood.value) return
  applyDefaultQuantity(selectedFood.value, nextUnit)
})

function submit() {
  if (!canSubmit.value) {
    error.value = 'Selecione um alimento e informe a quantidade.'
    return
  }

  emit('added', {
    food: selectedFood.value,
    amount: Number(amount.value),
    unit: unit.value,
  })
  resetForm()
  close()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (import.meta.client) previousFocus = document.activeElement
      setModalDocumentState(true)
      resetForm()
      lockPatientScroll()
      return
    }
    setModalDocumentState(false)
    unlockPatientScroll()
    nextTick(() => previousFocus?.focus?.())
  },
)

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  setModalDocumentState(false)
  resetPatientScrollLock()
})
</script>

<style scoped>
.dieta-extra-backdrop {
  position: fixed;
  inset: 0;
  z-index: 25010;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(21, 24, 20, 0.38);
  cursor: pointer;
}

.dieta-extra-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 25011;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: min(82dvh, 700px);
  min-height: 32rem;
  max-height: calc(100dvh - max(0.75rem, env(safe-area-inset-top)));
  overflow: hidden;
  padding: 0 1rem max(0.875rem, env(safe-area-inset-bottom));
  border-radius: 1.5rem 1.5rem 0 0;
  background: #fff;
  box-shadow: 0 -8px 24px rgba(18, 22, 17, 0.12);
  box-sizing: border-box;
}

.dieta-extra-handle-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.5rem;
  margin: 0.375rem 0 0.25rem;
  flex-shrink: 0;
}

.dieta-extra-handle {
  width: 2.25rem;
  height: 0.21875rem;
  border-radius: 999px;
  background: var(--cf-track, #e4e4e0);
}

.dieta-extra-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.625rem;
  flex-shrink: 0;
}

.dieta-extra-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.dieta-extra-title-wrap > div {
  min-width: 0;
}

.dieta-extra-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: 0.8125rem;
  background: #f0f3ed;
  color: #718069;
}

.dieta-extra-title-icon :deep(svg) {
  width: 1.125rem;
  height: 1.125rem;
}

.dieta-extra-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--cf-text);
  text-wrap: balance;
}

.dieta-extra-meal {
  margin: 0.2rem 0 0;
  font-size: 0.71875rem;
  font-weight: 400;
  color: #70756e;
}

.dieta-extra-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 999px;
  background: #f2f3f1;
  color: #70756e;
  cursor: pointer;
  flex-shrink: 0;
}

.dieta-extra-close :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.dieta-extra-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 0.5rem;
}

.dieta-extra-body::-webkit-scrollbar {
  display: none;
}

.dieta-extra-intro {
  margin: 0 0 0.875rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #686d66;
}

.dieta-extra-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.dieta-extra-search-zone {
  min-height: 0;
  margin-bottom: 0.75rem;
}

.dieta-extra-search-zone :deep(.food-picker) {
  min-height: 0;
}

.dieta-extra-search-zone :deep(.food-picker--open) {
  min-height: 0;
}

.dieta-extra-search-zone :deep(.food-picker-panel) {
  position: relative;
  top: 0.5rem;
  min-height: 0;
  max-height: min(31dvh, 17rem);
  border-color: #e2e5e0;
  border-radius: 0.75rem;
  box-shadow: none;
}

.dieta-extra-search-zone :deep(.food-picker-results) {
  max-height: min(31dvh, 17rem);
}

.dieta-extra-field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #393c38;
}

.dieta-extra-row {
  display: flex;
  gap: 0.65rem;
  align-items: flex-end;
}

.dieta-extra-field--grow {
  flex: 1;
  min-width: 0;
}

.dieta-extra-field--unit {
  flex: 0 0 9.5rem;
}

.dieta-extra-input,
.dieta-extra-select {
  min-height: 2.875rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #dfe2dd;
  border-radius: 0.75rem;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--cf-text);
  background: #fff;
  box-sizing: border-box;
}

.dieta-extra-selected {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0.25rem 0 0.875rem;
  padding: 0.6875rem 0.75rem;
  border: 1px solid #e1e6de;
  border-radius: 0.75rem;
  background: #f7f9f6;
}

.dieta-extra-selected-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #dfe9da;
  color: #62775a;
}

.dieta-extra-selected-check :deep(svg) {
  width: 0.875rem;
  height: 0.875rem;
}

.dieta-extra-selected strong,
.dieta-extra-selected > div > span {
  display: block;
}

.dieta-extra-selected strong {
  color: #30332f;
  font-size: 0.75rem;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.dieta-extra-selected > div > span {
  margin-top: 0.125rem;
  color: #70756e;
  font-size: 0.65625rem;
  font-weight: 400;
}

.dieta-extra-preview {
  margin: 0 0 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  background: #f5f6f4;
}

.dieta-extra-preview span,
.dieta-extra-preview strong {
  display: block;
}

.dieta-extra-preview span {
  color: #70756e;
  font-size: 0.625rem;
  font-weight: 400;
}

.dieta-extra-preview strong {
  margin-top: 0.125rem;
  color: #343733;
  font-size: 0.75rem;
  font-weight: 500;
}

.dieta-extra-error {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: #b42318;
}

.dieta-extra-foot {
  display: block;
  margin-top: 0;
  padding-top: 0.75rem;
  border-top: 1px solid #eceeeb;
  flex-shrink: 0;
}

.dieta-extra-cancel,
.dieta-extra-submit {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.75rem;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: rgba(111, 132, 101, 0.14);
  touch-action: manipulation;
}

.dieta-extra-cancel {
  border: 1.5px solid var(--cf-border);
  background: #fff;
  color: var(--cf-text);
}

.dieta-extra-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border: 1px solid #77886e;
  background: #77886e;
  color: #fff;
}

.dieta-extra-submit :deep(svg) {
  width: 0.9375rem;
  height: 0.9375rem;
}

.dieta-extra-close:hover {
  background: #e9ebe7;
  color: #4e534c;
}

.dieta-extra-close {
  -webkit-tap-highlight-color: rgba(111, 132, 101, 0.14);
  touch-action: manipulation;
}

.dieta-extra-submit:not(:disabled):hover {
  border-color: #687a5f;
  background: #687a5f;
}

.dieta-extra-submit:not(:disabled):active {
  transform: scale(0.985);
}

.dieta-extra-submit:disabled {
  border-color: #e2e4e0;
  background: #e2e4e0;
  color: #a1a59e;
  cursor: not-allowed;
}

.dieta-extra-fade-enter-active,
.dieta-extra-fade-leave-active {
  transition: opacity 0.22s ease;
}

.dieta-extra-fade-enter-from,
.dieta-extra-fade-leave-to {
  opacity: 0;
}

.dieta-extra-slide-enter-active,
.dieta-extra-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.dieta-extra-slide-enter-from,
.dieta-extra-slide-leave-to {
  transform: translateY(100%);
}

:global(html.dieta-extra-modal-open .patient-screen-dim),
:global(html.dieta-extra-modal-open .patient-quick-fab),
:global(html.dieta-extra-modal-open .patient-quick-dial) {
  display: none !important;
}

.dieta-extra-close:focus-visible,
.dieta-extra-input:focus-visible,
.dieta-extra-select:focus-visible,
.dieta-extra-submit:focus-visible {
  outline: 2px solid #66785e;
  outline-offset: 2px;
}

@media (max-height: 620px) {
  .dieta-extra-sheet {
    height: calc(100dvh - max(0.25rem, env(safe-area-inset-top)));
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dieta-extra-fade-enter-active,
  .dieta-extra-fade-leave-active,
  .dieta-extra-slide-enter-active,
  .dieta-extra-slide-leave-active {
    transition: none;
  }
}
</style>
