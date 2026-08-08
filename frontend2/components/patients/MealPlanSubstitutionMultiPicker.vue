<template>
  <section class="mpism admin-shell-card" aria-label="Seleção múltipla de substitutos">
    <header class="mpism-head">
      <div>
        <strong>Equivalentes disponíveis</strong>
        <p>Marque os substitutos e confirme para adicionar todos de uma vez.</p>
      </div>
      <button type="button" class="mpism-close" aria-label="Fechar seletor" @click="$emit('close')">
        Fechar
      </button>
    </header>

    <p v-if="referenceHint" class="mpism-hint">{{ referenceHint }}</p>
    <p v-if="loading" class="mpism-status">Buscando equivalentes na TBCA/TACO…</p>
    <p v-else-if="error" class="mpism-status mpism-status--error">{{ error }}</p>
    <p v-else-if="!suggestions.length" class="mpism-status">
      Nenhum equivalente encontrado para este alimento com os filtros atuais.
    </p>

    <template v-else>
      <div class="mpism-toolbar">
        <span>{{ selectableCount }} disponível(is) · {{ selectedCount }} selecionado(s)</span>
        <div class="mpism-toolbar-actions">
          <button type="button" class="btn-secondary mpism-btn-sm" @click="selectAllSelectable">
            Marcar todos
          </button>
          <button type="button" class="btn-secondary mpism-btn-sm" @click="clearSelection">
            Limpar
          </button>
        </div>
      </div>

      <ul class="mpism-list">
        <li
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="mpism-item"
          :class="{
            'mpism-item--selected': isSelected(suggestion.id),
            'mpism-item--added': isAlreadyAdded(suggestion),
          }"
        >
          <label class="mpism-item-label">
            <input
              type="checkbox"
              class="mpism-checkbox"
              :checked="isSelected(suggestion.id)"
              :disabled="isAlreadyAdded(suggestion)"
              @change="toggleSelection(suggestion.id, $event.target.checked)"
            >
            <span class="mpism-item-copy">
              <strong>{{ suggestion.name }}</strong>
              <small>
                {{ formatSuggestedPortion(suggestion) }}
                · {{ suggestion.similarityPercent ?? '—' }}% similar
              </small>
            </span>
          </label>
          <span v-if="isAlreadyAdded(suggestion)" class="mpism-badge">Na lista</span>
        </li>
      </ul>
    </template>

    <footer class="mpism-foot">
      <button type="button" class="btn-secondary" @click="$emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="btn-primary"
        :disabled="!selectedCount || loading"
        @click="confirmSelection"
      >
        Adicionar {{ selectedCount || '' }} selecionado(s)
      </button>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useFoodSubstitution } from '~/composables/useFoodSubstitution.js'
import {
  filterSelectableSubstitutionSuggestions,
  isDuplicateFoodSubstitution,
  suggestionFoodIdentity,
} from '~/utils/meal-plan-substitutions.js'

const props = defineProps({
  referenceItem: { type: Object, required: true },
  existingFoodSubs: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'confirm'])

const { calculateSubstitution } = useFoodSubstitution()

const loading = ref(false)
const error = ref('')
const suggestions = ref([])
const selectedIds = ref(new Set())

const referenceHint = computed(() => {
  const name = String(props.referenceItem?.name || '').trim()
  const grams = Math.max(1, Number(props.referenceItem?.grams) || 100)
  if (!name) return 'Vincule o alimento prescrito à TBCA/TACO para sugerir equivalentes.'
  return `Referência: ${name} · ${grams}g`
})

const selectableSuggestions = computed(() =>
  filterSelectableSubstitutionSuggestions(props.existingFoodSubs, suggestions.value),
)

const selectableCount = computed(() => selectableSuggestions.value.length)

const selectedCount = computed(() => {
  let count = 0
  for (const id of selectedIds.value) {
    if (selectableSuggestions.value.some((item) => item.id === id)) count += 1
  }
  return count
})

function formatSuggestedPortion(suggestion) {
  const grams = Math.max(1, Math.round(Number(suggestion?.grams) || 100))
  return `${grams}g sugeridos`
}

function isAlreadyAdded(suggestion) {
  const identity = suggestionFoodIdentity(suggestion)
  return identity ? isDuplicateFoodSubstitution(props.existingFoodSubs, identity) : false
}

function isSelected(id) {
  return selectedIds.value.has(id)
}

function toggleSelection(id, checked) {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function selectAllSelectable() {
  selectedIds.value = new Set(selectableSuggestions.value.map((item) => item.id))
}

function clearSelection() {
  selectedIds.value = new Set()
}

function confirmSelection() {
  const selected = suggestions.value.filter((item) => selectedIds.value.has(item.id))
  emit('confirm', selected)
}

async function loadSuggestions() {
  const name = String(props.referenceItem?.name || '').trim()
  const foodId = String(props.referenceItem?.foodId || '').trim()
  if (!name && !foodId) {
    suggestions.value = []
    error.value = 'Vincule o alimento prescrito à TBCA/TACO antes de buscar equivalentes.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await calculateSubstitution({
      foodId: foodId || undefined,
      foodName: foodId ? undefined : name,
      grams: Math.max(1, Number(props.referenceItem?.grams) || 100),
      mode: 'multiple',
      criterion: 'calories',
      groupFilter: 'all',
      limit: 20,
    })
    suggestions.value = Array.isArray(result?.suggestions) ? result.suggestions : []
    selectedIds.value = new Set()
  } catch {
    suggestions.value = []
    error.value = 'Não foi possível carregar equivalentes. Tente novamente.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.referenceItem?.id, props.referenceItem?.foodId, props.referenceItem?.name, props.referenceItem?.grams],
  () => {
    void loadSuggestions()
  },
  { immediate: true },
)
</script>

<style scoped>
.mpism {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fafbfa;
}

.mpism-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
}

.mpism-head strong {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.mpism-head p {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: #6b7280;
  line-height: 1.35;
}

.mpism-close {
  border: none;
  background: transparent;
  color: #6b7280;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
}

.mpism-close:hover {
  color: #374151;
}

.mpism-hint,
.mpism-status {
  margin: 0;
  font-size: 0.74rem;
  color: #6b7280;
  line-height: 1.35;
}

.mpism-status--error {
  color: #b42318;
}

.mpism-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #6b7280;
}

.mpism-toolbar-actions {
  display: flex;
  gap: 0.35rem;
}

.mpism-btn-sm {
  min-height: 1.85rem !important;
  padding: 0.2rem 0.55rem !important;
  font-size: 0.72rem !important;
}

.mpism-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 16rem;
  overflow-y: auto;
}

.mpism-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #edf0ec;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mpism-item--selected {
  border-color: rgba(139, 150, 124, 0.55);
  background: rgba(139, 150, 124, 0.08);
}

.mpism-item--added {
  opacity: 0.72;
}

.mpism-item-label {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
  cursor: pointer;
}

.mpism-checkbox {
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.mpism-item-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.mpism-item-copy strong {
  font-size: 0.78rem;
  font-weight: 500;
  color: #2c322c;
  line-height: 1.3;
}

.mpism-item-copy small {
  font-size: 0.68rem;
  color: #8a9288;
}

.mpism-badge {
  flex-shrink: 0;
  padding: 0.12rem 0.45rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b7280;
}

.mpism-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  flex-wrap: wrap;
}
</style>
