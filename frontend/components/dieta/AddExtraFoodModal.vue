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
          <div>
            <h2 id="dieta-extra-title">Adicionar alimento</h2>
            <p class="dieta-extra-meal">{{ mealLabel }}</p>
          </div>
          <button type="button" class="dieta-extra-close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="dieta-extra-body">
          <p class="dieta-extra-intro">
            Comeu algo que não estava no plano? Busque na nossa tabela (TBCA/TACO) e informe a quantidade.
          </p>

          <label class="dieta-extra-field dieta-extra-search-zone">
            <span>Alimento</span>
            <BellaFoodSearchPicker
              v-model="foodQuery"
              placeholder="Ex.: arroz, branco, cozido"
              @select="onFoodSelect"
            />
          </label>

          <p v-if="selectedFood" class="dieta-extra-selected">
            Selecionado: <strong>{{ selectedFood.name }}</strong>
            <span v-if="selectedFood.per100g?.caloriesKcal">
              · {{ selectedFood.per100g.caloriesKcal }} kcal / 100 g
            </span>
          </p>

          <div v-if="selectedFood" class="dieta-extra-row">
            <label class="dieta-extra-field dieta-extra-field--grow">
              <span>Quantidade</span>
              <input
                v-model.number="amount"
                type="number"
                min="0.1"
                step="any"
                class="dieta-extra-input"
                inputmode="decimal"
              />
            </label>

            <label class="dieta-extra-field dieta-extra-field--unit">
              <span>Unidade</span>
              <select v-model="unit" class="dieta-extra-select">
                <option v-for="option in unitOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <p v-if="previewLabel" class="dieta-extra-preview">{{ previewLabel }}</p>
          <p v-if="error" class="dieta-extra-error" role="alert">{{ error }}</p>
        </div>

        <footer class="dieta-extra-foot">
          <button type="button" class="dieta-extra-cancel" @click="close">Cancelar</button>
          <button type="button" class="dieta-extra-submit" :disabled="!canSubmit" @click="submit">
            Adicionar à refeição
          </button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'
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
      resetForm()
      lockPatientScroll()
      return
    }
    unlockPatientScroll()
  },
)

onUnmounted(() => {
  resetPatientScrollLock()
})
</script>

<style scoped>
.dieta-extra-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(20, 20, 20, 0.42);
  cursor: pointer;
}

.dieta-extra-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1201;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-height: min(78dvh, 680px);
  max-height: min(88dvh, 760px);
  overflow: hidden;
  padding: 0 1.25rem var(--cf-tab-clearance);
  border-radius: var(--cf-radius-xl, 1.875rem) var(--cf-radius-xl, 1.875rem) 0 0;
  background: var(--cf-surface, #fff);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}

.dieta-extra-handle-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  margin: 0.65rem 0 0.5rem;
  flex-shrink: 0;
}

.dieta-extra-handle {
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--cf-track, #e4e4e0);
}

.dieta-extra-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.dieta-extra-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.dieta-extra-meal {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-pink);
}

.dieta-extra-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-track);
  color: var(--cf-text-muted);
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
  margin: 0 0 1rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.dieta-extra-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.dieta-extra-search-zone {
  flex: 1 1 auto;
  min-height: 14rem;
  margin-bottom: 0.65rem;
}

.dieta-extra-search-zone :deep(.food-picker) {
  display: flex;
  flex-direction: column;
  min-height: 12rem;
}

.dieta-extra-search-zone :deep(.food-picker--open) {
  flex: 1;
  min-height: 18rem;
}

.dieta-extra-search-zone :deep(.food-picker-panel) {
  position: relative;
  top: 0.35rem;
  flex: 1 1 auto;
  min-height: 11rem;
  max-height: none;
}

.dieta-extra-search-zone :deep(.food-picker-results) {
  max-height: none;
}

.dieta-extra-field span {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text);
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
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--cf-text);
  background: #fff;
  box-sizing: border-box;
}

.dieta-extra-selected {
  margin: -0.35rem 0 0.85rem;
  font-size: 0.78rem;
  color: var(--cf-green-dark);
}

.dieta-extra-preview {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text);
}

.dieta-extra-error {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: #b42318;
}

.dieta-extra-foot {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.55rem;
  margin-top: 0.35rem;
  padding-top: 0.65rem;
  flex-shrink: 0;
}

.dieta-extra-cancel,
.dieta-extra-submit {
  min-height: 2.75rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.dieta-extra-cancel {
  border: 1.5px solid var(--cf-border);
  background: #fff;
  color: var(--cf-text);
}

.dieta-extra-submit {
  border: none;
  background: var(--cf-green);
  color: #fff;
}

.dieta-extra-submit:disabled {
  opacity: 0.55;
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
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease;
}

.dieta-extra-slide-enter-from,
.dieta-extra-slide-leave-to {
  transform: translateY(100%);
  opacity: 0.85;
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
