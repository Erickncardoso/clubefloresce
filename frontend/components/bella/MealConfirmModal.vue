<template>
  <Teleport to="body">
    <div v-if="open" class="meal-modal-overlay" @click.self="emit('cancel')">
      <div class="meal-modal" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title">
        <header class="meal-modal-header">
          <h2 id="meal-modal-title">Confirme os itens do prato</h2>
          <p class="meal-modal-sub">
            Corrija o nome ou as gramas se a IA errar. Quando o alimento existir na nossa base, os nutrientes atualizam sozinhos.
          </p>
        </header>

        <div v-if="draft?.imageUrl" class="meal-modal-photo">
          <img :src="draft.imageUrl" alt="Foto do prato" />
        </div>

        <p v-if="draft?.mealLabel" class="meal-modal-meal">{{ draft.mealLabel }}</p>

        <datalist id="food-suggestions-list">
          <option v-for="food in foodCatalog" :key="food.id" :value="food.name" />
        </datalist>

        <ul class="meal-modal-list">
          <li v-for="(item, index) in items" :key="item.id || index" class="meal-modal-item">
            <div class="meal-modal-item-head">
              <label class="meal-modal-name-field">
                <span>Alimento</span>
                <input
                  :value="item.name"
                  type="text"
                  list="food-suggestions-list"
                  placeholder="Ex.: Frango grelhado"
                  autocomplete="off"
                  @input="updateName(index, $event.target.value)"
                  @change="commitName(index, $event.target.value)"
                />
              </label>
              <button
                type="button"
                class="meal-modal-remove"
                aria-label="Remover item"
                @click="removeItem(index)"
              >
                ×
              </button>
            </div>

            <p v-if="item.originalName && item.name !== item.originalName" class="meal-modal-ai-hint">
              IA sugeriu: {{ item.originalName }}
            </p>
            <p v-if="item.source === 'food_bank'" class="meal-modal-bank-tag">Base de alimentos</p>

            <div class="meal-modal-fields">
              <label class="meal-modal-grams">
                <span>Gramas</span>
                <input
                  :value="item.grams"
                  type="number"
                  min="1"
                  max="2000"
                  inputmode="numeric"
                  @input="updateGrams(index, $event.target.value)"
                />
              </label>
              <div class="meal-modal-macros">
                <span>{{ item.caloriesKcal }} kcal</span>
                <span>C {{ item.carbsG }} g</span>
                <span>P {{ item.proteinG }} g</span>
                <span>G {{ item.fatG }} g</span>
              </div>
            </div>
          </li>
        </ul>

        <button type="button" class="meal-modal-add" @click="addItem">
          + Adicionar alimento
        </button>

        <div class="meal-modal-totals">
          <p><strong>Total desta refeição:</strong> {{ mealTotals.caloriesKcal }} kcal</p>
          <p class="meal-modal-totals-macros">
            C {{ mealTotals.carbsG }} g · P {{ mealTotals.proteinG }} g · G {{ mealTotals.fatG }} g
          </p>
        </div>

        <div v-if="dailySummary" class="meal-modal-day">
          <p>
            Após confirmar: <strong>{{ projectedCalories }}</strong> / {{ dailySummary.targets.caloriesKcal }} kcal no dia
          </p>
        </div>

        <p v-if="localError" class="meal-modal-error">{{ localError }}</p>
        <p v-if="error" class="meal-modal-error">{{ error }}</p>

        <footer class="meal-modal-actions">
          <button type="button" class="meal-modal-btn meal-modal-btn--ghost" :disabled="saving" @click="emit('cancel')">
            Cancelar
          </button>
          <button type="button" class="meal-modal-btn meal-modal-btn--primary" :disabled="saving || !items.length" @click="confirm">
            {{ saving ? 'Salvando...' : 'Confirmar e registrar' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { FOOD_CATALOG } from '~/config/food-suggestions'
import {
  applyFoodMatch,
  createMealItem,
  normalizeItemFromAi,
  normalizeMealItemsForSave,
  scaleMealItem,
  sumMealItems,
} from '~/utils/meal-diary'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  dailySummary: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const items = ref([])
const localError = ref('')
const foodCatalog = FOOD_CATALOG

watch(
  () => props.draft,
  (draft) => {
    items.value = (draft?.items || []).map((item) => normalizeItemFromAi(item))
    localError.value = ''
  },
  { immediate: true, deep: true },
)

const mealTotals = computed(() => sumMealItems(items.value))

const projectedCalories = computed(() => {
  if (!props.dailySummary) return mealTotals.value.caloriesKcal
  return props.dailySummary.consumed.caloriesKcal + mealTotals.value.caloriesKcal
})

function updateName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  items.value[index] = { ...current, name: rawValue }
}

function commitName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  items.value[index] = applyFoodMatch(current, rawValue)
}

function updateGrams(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  items.value[index] = scaleMealItem(current, rawValue)
}

function removeItem(index) {
  items.value = items.value.filter((_, i) => i !== index)
}

function addItem() {
  items.value.push(createMealItem())
}

function confirm() {
  localError.value = ''
  const prepared = items.value.map((item) => applyFoodMatch(item, item.name))
  const normalized = normalizeMealItemsForSave(prepared)

  if (!normalized.length) {
    localError.value = 'Adicione pelo menos um alimento.'
    return
  }

  if (normalized.some((item) => !item.name)) {
    localError.value = 'Preencha o nome de todos os alimentos.'
    return
  }

  emit('confirm', normalized)
}
</script>

<style scoped>
.meal-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem 0.75rem calc(1rem + env(safe-area-inset-bottom));
}

.meal-modal {
  width: min(100%, 480px);
  max-height: min(88dvh, 720px);
  overflow-y: auto;
  background: #fff;
  border-radius: 16px 16px 12px 12px;
  padding: 1rem 1rem 0.85rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.meal-modal-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--pa-text);
}

.meal-modal-sub {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--pa-text-muted);
}

.meal-modal-photo {
  margin-top: 0.85rem;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
}

.meal-modal-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meal-modal-meal {
  margin: 0.75rem 0 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pa-green-dark);
}

.meal-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meal-modal-item {
  padding: 0.65rem 0.7rem;
  border: 1px solid var(--pa-border);
  border-radius: 10px;
  background: #fafafa;
}

.meal-modal-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.meal-modal-name-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted);
  min-width: 0;
}

.meal-modal-name-field input {
  width: 100%;
  padding: 0.45rem 0.55rem;
  border: 1.5px solid var(--pa-border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--pa-text);
  box-sizing: border-box;
}

.meal-modal-ai-hint {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted);
}

.meal-modal-bank-tag {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--pa-green-dark);
}

.meal-modal-remove {
  border: none;
  background: transparent;
  color: var(--pa-text-muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem;
  flex-shrink: 0;
}

.meal-modal-fields {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.meal-modal-grams {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted);
}

.meal-modal-grams input {
  width: 5rem;
  padding: 0.4rem 0.5rem;
  border: 1.5px solid var(--pa-border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.88rem;
}

.meal-modal-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted);
}

.meal-modal-add {
  width: 100%;
  margin-top: 0.55rem;
  padding: 0.55rem 0.75rem;
  border: 1.5px dashed var(--pa-border);
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pa-green-dark);
  cursor: pointer;
}

.meal-modal-totals {
  margin-top: 0.85rem;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  background: var(--cf-green-soft, #eef7f1);
  font-size: 0.82rem;
  color: var(--pa-text);
}

.meal-modal-totals p {
  margin: 0;
}

.meal-modal-totals-macros {
  margin-top: 0.25rem !important;
  font-size: 0.75rem;
  color: var(--pa-text-muted);
}

.meal-modal-day {
  margin-top: 0.55rem;
  font-size: 0.78rem;
  color: var(--pa-text-muted);
}

.meal-modal-day p {
  margin: 0;
}

.meal-modal-error {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: var(--pa-red);
}

.meal-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.5rem;
  margin-top: 0.85rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--pa-border);
  position: sticky;
  bottom: 0;
  background: #fff;
}

.meal-modal-btn {
  min-height: 2.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.meal-modal-btn--ghost {
  background: #f3f4f6;
  color: var(--pa-text);
}

.meal-modal-btn--primary {
  background: var(--pa-green);
  color: #fff;
}

.meal-modal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
