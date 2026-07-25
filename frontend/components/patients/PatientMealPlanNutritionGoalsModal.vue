<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mpng-modal"
      :class="{ 'mpng-modal--docked': docked }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpng-title"
    >
      <div class="mpng-modal__backdrop" aria-hidden="true" @click="close" />
      <div class="modal-card mpng-modal__panel admin-shell admin-shell-card" @click.stop>
        <header class="mpng-modal__head">
          <div class="mpng-modal__title-wrap">
            <Target class="mpng-modal__icon" aria-hidden="true" />
            <h2 id="mpng-title">Metas Nutricionais</h2>
          </div>
          <button type="button" class="mpng-modal__close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="mpng-modal__body">
          <div class="mpng-field">
            <span class="mpng-field__label">Tipo de meta</span>
            <div class="mpng-segment" role="group" aria-label="Tipo de meta">
              <button
                v-for="option in goalTypeOptions"
                :key="option.id"
                type="button"
                class="mpng-segment__btn"
                :class="{ 'mpng-segment__btn--active': draft.goalType === option.id }"
                @click="setGoalType(option.id)"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="mpng-field__hint">{{ goalTypeHint }}</p>
          </div>

          <div v-if="draft.goalType === 'percent'" class="field field--float mpng-macro-field mpng-macro-field--kcal">
            <label for="mpng-kcal-pct">Valor energético total (kcal)</label>
            <input
              id="mpng-kcal-pct"
              v-model="draft.caloriesKcal"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
            >
          </div>

          <div class="mpng-macros">
            <div class="field field--float mpng-macro-field">
              <label for="mpng-carbs">{{ macroLabels.carbs }}</label>
              <input
                v-if="draft.goalType === 'percent'"
                id="mpng-carbs"
                v-model="draft.carbsPct"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else-if="draft.goalType === 'per_kg'"
                id="mpng-carbs"
                v-model="draft.carbsGPerKg"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else
                id="mpng-carbs"
                v-model="draft.carbsG"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <small v-if="macroHints.carbs" class="mpng-macro-hint">{{ macroHints.carbs }}</small>
            </div>
            <div class="field field--float mpng-macro-field">
              <label for="mpng-protein">{{ macroLabels.protein }}</label>
              <input
                v-if="draft.goalType === 'percent'"
                id="mpng-protein"
                v-model="draft.proteinPct"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else-if="draft.goalType === 'per_kg'"
                id="mpng-protein"
                v-model="draft.proteinGPerKg"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else
                id="mpng-protein"
                v-model="draft.proteinG"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <small v-if="macroHints.protein" class="mpng-macro-hint">{{ macroHints.protein }}</small>
            </div>
            <div class="field field--float mpng-macro-field">
              <label for="mpng-fat">{{ macroLabels.fat }}</label>
              <input
                v-if="draft.goalType === 'percent'"
                id="mpng-fat"
                v-model="draft.fatPct"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else-if="draft.goalType === 'per_kg'"
                id="mpng-fat"
                v-model="draft.fatGPerKg"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <input
                v-else
                id="mpng-fat"
                v-model="draft.fatG"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              >
              <small v-if="macroHints.fat" class="mpng-macro-hint">{{ macroHints.fat }}</small>
            </div>

            <div
              v-if="draft.goalType === 'general'"
              class="field field--float mpng-macro-field mpng-macro-field--kcal"
            >
              <div class="mpng-kcal-head">
                <label for="mpng-kcal">Calorias</label>
                <label class="mpng-kcal-check">
                  <input v-model="draft.includeCalories" type="checkbox">
                  <span>Incluir</span>
                </label>
              </div>
              <input
                id="mpng-kcal"
                v-model="draft.caloriesKcal"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                :disabled="!draft.includeCalories"
              >
              <small v-if="generalCaloriesHint" class="mpng-macro-hint">{{ generalCaloriesHint }}</small>
            </div>
          </div>

          <p
            v-if="draft.goalType === 'percent'"
            class="mpng-pct-total"
            :class="{ 'mpng-pct-total--warn': percentTotal !== 100 }"
          >
            Total distribuído: {{ percentTotal }}%
            <span v-if="percentTotal !== 100"> · ideal: 100%</span>
          </p>

          <p v-if="draft.goalType === 'per_kg' && !patientWeightKg" class="mpng-weight-warn">
            Informe o peso da paciente na antropometria para calcular as metas em gramas.
          </p>

          <div class="mpng-energy">
            <span>{{ energySummary }}</span>
            <button type="button" class="mpng-energy__btn" @click="applyLiveTotals">
              <Calculator aria-hidden="true" />
              Usar totais do plano
            </button>
          </div>
        </div>

        <footer class="mpng-modal__foot">
          <button type="button" class="mpng-micro-link" @click="emit('open-full')">
            <Target aria-hidden="true" />
            Metas de micronutrientes
            <ChevronRight aria-hidden="true" />
          </button>
          <div class="mpng-modal__actions">
            <button type="button" class="btn-secondary mpng-modal__btn" @click="close">Cancelar</button>
            <button type="button" class="btn-primary mpng-modal__btn" @click="save">Salvar</button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { Calculator, ChevronRight, Target, X } from 'lucide-vue-next'
import {
  caloriesFromMacroGrams,
  gramsFromMacroPercents,
  gramsFromPerKg,
  hydrateMacroGoalsDraft,
  macroGoalTypeLabel,
  macroPercentTotal,
  normalizeMacroGoalsForSave,
  percentsFromMacroGrams,
  perKgFromMacroGrams,
  roundMacroGoal,
} from '~/utils/meal-plan-nutrition-goals.js'

const goalTypeOptions = [
  { id: 'general', label: 'Gramas' },
  { id: 'percent', label: 'Percentual' },
  { id: 'per_kg', label: 'Por peso' },
]

const props = defineProps({
  open: { type: Boolean, default: false },
  goals: { type: Object, default: null },
  liveTotals: { type: Object, default: null },
  profileDefaults: { type: Object, default: () => ({}) },
  docked: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'save', 'open-full'])

const draft = reactive(hydrateMacroGoalsDraft(null))

const patientWeightKg = computed(() => {
  const weight = props.profileDefaults?.weightKg
  const parsed = Number(weight)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const goalTypeHint = computed(() => {
  if (draft.goalType === 'percent') {
    return 'Informe o VET e a distribuição percentual — convertemos para gramas automaticamente.'
  }
  if (draft.goalType === 'per_kg') {
    return patientWeightKg.value
      ? `Metas proporcionais ao peso (${patientWeightKg.value} kg).`
      : 'Metas em g/kg de peso corporal.'
  }
  return 'Informe proteínas, carboidratos e gorduras em gramas.'
})

const macroLabels = computed(() => {
  if (draft.goalType === 'percent') {
    return {
      carbs: 'Carboidratos (%)',
      protein: 'Proteínas (%)',
      fat: 'Lipídios (%)',
    }
  }
  if (draft.goalType === 'per_kg') {
    return {
      carbs: 'Carboidratos (g/kg)',
      protein: 'Proteínas (g/kg)',
      fat: 'Lipídios (g/kg)',
    }
  }
  return {
    carbs: 'Carboidratos (g)',
    protein: 'Proteínas (g)',
    fat: 'Lipídios (g)',
  }
})

const computedGrams = computed(() => {
  if (draft.goalType === 'percent') {
    return gramsFromMacroPercents(draft.caloriesKcal, {
      proteinPct: draft.proteinPct,
      carbsPct: draft.carbsPct,
      fatPct: draft.fatPct,
    })
  }
  if (draft.goalType === 'per_kg') {
    return {
      ...gramsFromPerKg(patientWeightKg.value, {
        proteinGPerKg: draft.proteinGPerKg,
        carbsGPerKg: draft.carbsGPerKg,
        fatGPerKg: draft.fatGPerKg,
      }),
      caloriesKcal: 0,
    }
  }
  return {
    proteinG: Number(draft.proteinG) || 0,
    carbsG: Number(draft.carbsG) || 0,
    fatG: Number(draft.fatG) || 0,
    caloriesKcal: draft.includeCalories
      ? Math.round(Number(draft.caloriesKcal) || 0)
      : caloriesFromMacroGrams(draft),
  }
})

const macroHints = computed(() => {
  if (draft.goalType === 'percent' || draft.goalType === 'per_kg') {
    const grams = computedGrams.value
    return {
      carbs: `≈ ${roundMacroGoal(grams.carbsG)} g`,
      protein: `≈ ${roundMacroGoal(grams.proteinG)} g`,
      fat: `≈ ${roundMacroGoal(grams.fatG)} g`,
    }
  }
  if (draft.goalType === 'general') {
    const kcal = Number(draft.caloriesKcal) || caloriesFromMacroGrams(draft)
    const pct = percentsFromMacroGrams(kcal, draft)
    return {
      carbs: kcal ? `≈ ${pct.carbsPct}% do VET` : '',
      protein: kcal ? `≈ ${pct.proteinPct}% do VET` : '',
      fat: kcal ? `≈ ${pct.fatPct}% do VET` : '',
    }
  }
  return { carbs: '', protein: '', fat: '' }
})

const percentTotal = computed(() => macroPercentTotal({
  proteinPct: draft.proteinPct,
  carbsPct: draft.carbsPct,
  fatPct: draft.fatPct,
}))

const generalCaloriesHint = computed(() => {
  if (!draft.includeCalories) {
    return `Calculado dos macros: ${caloriesFromMacroGrams(draft)} kcal`
  }
  return ''
})

const energySummary = computed(() => {
  const grams = computedGrams.value
  const kcal = draft.goalType === 'percent'
    ? Math.round(Number(draft.caloriesKcal) || 0)
    : (grams.caloriesKcal || caloriesFromMacroGrams(grams))
  if (!kcal) return 'Defina as metas para ver o valor energético'
  return `${kcal} kcal · ${macroGoalTypeLabel(draft.goalType)}`
})

function syncDraft() {
  Object.assign(
    draft,
    hydrateMacroGoalsDraft(props.goals, { weightKg: patientWeightKg.value }),
  )
}

watch(() => props.open, (value) => {
  if (value) syncDraft()
}, { immediate: true })

function setGoalType(nextType) {
  if (draft.goalType === nextType) return
  const kcal = Number(draft.caloriesKcal) || caloriesFromMacroGrams(draft)
  const grams = {
    proteinG: Number(draft.proteinG) || computedGrams.value.proteinG || 0,
    carbsG: Number(draft.carbsG) || computedGrams.value.carbsG || 0,
    fatG: Number(draft.fatG) || computedGrams.value.fatG || 0,
  }
  const percents = percentsFromMacroGrams(kcal, grams)
  const perKg = perKgFromMacroGrams(patientWeightKg.value, grams)

  draft.goalType = nextType
  draft.caloriesKcal = kcal || draft.caloriesKcal
  draft.proteinG = grams.proteinG
  draft.carbsG = grams.carbsG
  draft.fatG = grams.fatG
  draft.proteinPct = percents.proteinPct
  draft.carbsPct = percents.carbsPct
  draft.fatPct = percents.fatPct
  draft.proteinGPerKg = perKg.proteinGPerKg
  draft.carbsGPerKg = perKg.carbsGPerKg
  draft.fatGPerKg = perKg.fatGPerKg
}

function close() {
  emit('update:open', false)
}

function applyLiveTotals() {
  const block = props.liveTotals
  if (!block) return
  draft.includeCalories = true
  draft.caloriesKcal = Math.round(Number(block.caloriesKcal) || 0) || ''
  draft.proteinG = roundMacroGoal(block.proteinG) ?? ''
  draft.carbsG = roundMacroGoal(block.carbsG) ?? ''
  draft.fatG = roundMacroGoal(block.fatG) ?? ''
  const pct = percentsFromMacroGrams(draft.caloriesKcal, draft)
  draft.proteinPct = pct.proteinPct
  draft.carbsPct = pct.carbsPct
  draft.fatPct = pct.fatPct
  const perKg = perKgFromMacroGrams(patientWeightKg.value, draft)
  draft.proteinGPerKg = perKg.proteinGPerKg
  draft.carbsGPerKg = perKg.carbsGPerKg
  draft.fatGPerKg = perKg.fatGPerKg
}

function save() {
  emit('save', normalizeMacroGoalsForSave(draft, { weightKg: patientWeightKg.value }))
  close()
}
</script>

<style scoped>
.mpng-modal {
  position: fixed;
  inset: 0;
  z-index: 6101;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mpng-modal--docked {
  justify-content: flex-start;
  padding-left: max(1rem, calc(50vw - min(480px, 50vw - 1rem) - 22rem));
  pointer-events: none;
}

.mpng-modal--docked .mpng-modal__panel {
  pointer-events: auto;
  border-right: none;
  border-radius: var(--cf-radius-control) 0 0 var(--cf-radius-control);
  max-height: min(92vh, 920px);
}

.mpng-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
}

.mpng-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 22rem);
  display: grid;
  grid-template-rows: auto 1fr auto;
  max-height: min(92vh, 920px);
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
}

.mpng-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
}

.mpng-modal__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.mpng-modal__icon {
  width: 1.15rem;
  height: 1.15rem;
  color: #f97316;
  flex-shrink: 0;
}

.mpng-modal__head h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #374151;
}

.mpng-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.mpng-modal__close svg {
  width: 1rem;
  height: 1rem;
}

.mpng-modal__close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.mpng-modal__body {
  display: grid;
  gap: 0.85rem;
  padding: 0 1rem;
  overflow: auto;
}

.mpng-field__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
}

.mpng-field__hint {
  margin: 0.35rem 0 0;
  font-size: 0.68rem;
  line-height: 1.35;
  color: #9ca3af;
}

.mpng-segment {
  display: flex;
  gap: 0.15rem;
  padding: 0.2rem;
  border-radius: var(--cf-radius-control);
  background: #f3f4f6;
}

.mpng-segment__btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.4rem 0.35rem;
  border-radius: calc(var(--cf-radius-control) - 2px);
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.mpng-segment__btn--active {
  background: #fff;
  color: #374151;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.mpng-macros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.mpng-macro-field--kcal {
  grid-column: 1 / -1;
}

.mpng-macro-hint {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.65rem;
  color: #9ca3af;
}

.mpng-kcal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mpng-kcal-check {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #6b7280;
  cursor: pointer;
}

.mpng-kcal-check input {
  width: 0.85rem;
  height: 0.85rem;
  accent-color: #f97316;
}

.mpng-pct-total {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
}

.mpng-pct-total--warn {
  color: #b45309;
}

.mpng-weight-warn {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: #b45309;
}

.mpng-energy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--cf-radius-control);
  background: #f9fafb;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #6b7280;
}

.mpng-energy__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #f97316;
  cursor: pointer;
  white-space: nowrap;
}

.mpng-energy__btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mpng-modal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid #f0f1f3;
}

.mpng-micro-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #9ca3af;
  cursor: pointer;
}

.mpng-micro-link svg:first-child {
  width: 0.8rem;
  height: 0.8rem;
}

.mpng-micro-link svg:last-child {
  width: 0.75rem;
  height: 0.75rem;
}

.mpng-micro-link:hover {
  color: #6b7280;
}

.mpng-modal__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
}

.mpng-modal__btn {
  min-height: 2.25rem !important;
  padding: 0.35rem 0.85rem !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
}

@media (max-width: 900px) {
  .mpng-modal--docked {
    padding-left: 1rem;
    justify-content: center;
  }

  .mpng-modal--docked .mpng-modal__panel {
    border-right: 1px solid #e5e7eb;
    border-radius: var(--cf-radius-control);
  }
}
</style>
