<template>
  <div class="patient-page subst-page">
    <PatientHeader />

    <p class="subst-lead">
      Escolha o que gostaria de mudar e por qual alimento quer trocar. Calculamos a quantidade equivalente em calorias no mesmo tipo de alimento (TBCA/TACO).
    </p>

    <section class="cf-card subst-form">
      <h2 class="subst-form-title">Troca por calorias</h2>

      <label class="subst-label">
        Alimento que gostaria de mudar
        <input
          v-model="foodQuery"
          type="search"
          class="subst-input"
          placeholder="Ex.: arroz branco cozido"
          autocomplete="off"
          @input="onFoodQueryInput"
        />
      </label>

      <ul v-if="foodResults.length" class="subst-suggestions">
        <li v-for="item in foodResults" :key="item.id">
          <button type="button" class="subst-suggestion-btn" @click="selectFood(item)">
            <strong>{{ item.name }}</strong>
            <span v-if="item.category">{{ item.category }}</span>
          </button>
        </li>
      </ul>

      <p v-if="selectedFood" class="subst-selected">
        Selecionado: <strong>{{ selectedFood.name }}</strong>
      </p>

      <label class="subst-label">
        Quantidade a mudar (g)
        <input v-model.number="grams" type="number" min="1" step="1" class="subst-input" />
      </label>

      <label class="subst-label">
        Trocar por
        <input
          v-model="replacementQuery"
          type="search"
          class="subst-input"
          placeholder="Ex.: batata inglesa cozida"
          autocomplete="off"
          @input="onReplacementQueryInput"
        />
      </label>

      <ul v-if="replacementResults.length" class="subst-suggestions">
        <li v-for="item in replacementResults" :key="item.id">
          <button type="button" class="subst-suggestion-btn" @click="selectReplacement(item)">
            <strong>{{ item.name }}</strong>
            <span v-if="item.category">{{ item.category }}</span>
          </button>
        </li>
      </ul>

      <p v-if="selectedReplacement" class="subst-selected">
        Substituto: <strong>{{ selectedReplacement.name }}</strong>
      </p>

      <p v-if="error" class="subst-error" role="alert">{{ error }}</p>

      <button
        type="button"
        class="subst-submit"
        :disabled="loading || !canSubmit"
        @click="handleCalculate"
      >
        {{ loading ? 'Calculando…' : 'Calcular troca em kcal' }}
      </button>
    </section>

    <section v-if="result" class="subst-results">
      <article class="cf-card subst-result-card subst-result-card--original">
        <p class="subst-result-kicker">Você quer mudar</p>
        <strong>{{ result.original.name }}</strong>
        <p class="subst-result-macros">{{ formatMacros(result.original.macros) }}</p>
      </article>

      <article v-if="result.suggestions[0]" class="cf-card subst-result-card subst-result-card--swap">
        <p class="subst-result-kicker">Equivalente em calorias</p>
        <strong>{{ result.suggestions[0].name }}</strong>
        <p class="subst-result-highlight">
          Use <strong>{{ result.suggestions[0].macros.grams }} g</strong>
          para ficar com
          <strong>{{ result.suggestions[0].macros.caloriesKcal }} kcal</strong>
          (mesma energia do alimento original).
        </p>
        <p class="subst-result-macros">{{ formatMacros(result.suggestions[0].macros) }}</p>
      </article>

      <p v-else class="subst-empty">
        Não encontramos equivalência no mesmo tipo de alimento. Tente outro substituto (ex.: cereal por cereal).
      </p>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { searchFoods, calculateSubstitution } = useFoodSubstitution()

const grams = ref(100)
const foodQuery = ref('')
const replacementQuery = ref('')
const selectedFood = ref(null)
const selectedReplacement = ref(null)
const foodResults = ref([])
const replacementResults = ref([])
const result = ref(null)
const loading = ref(false)
const error = ref('')

let foodSearchTimer = null
let replacementSearchTimer = null

const canSubmit = computed(() => {
  return Boolean(
    selectedFood.value
    && selectedReplacement.value
    && grams.value
    && grams.value > 0,
  )
})

function formatMacros(macros) {
  return `${macros.grams} g · ${macros.caloriesKcal} kcal · C ${macros.carbsG} g · P ${macros.proteinG} g · G ${macros.fatG} g`
}

function onFoodQueryInput() {
  selectedFood.value = null
  clearTimeout(foodSearchTimer)
  foodSearchTimer = setTimeout(async () => {
    try {
      foodResults.value = await searchFoods(foodQuery.value)
    } catch {
      foodResults.value = []
    }
  }, 280)
}

function onReplacementQueryInput() {
  selectedReplacement.value = null
  clearTimeout(replacementSearchTimer)
  replacementSearchTimer = setTimeout(async () => {
    try {
      replacementResults.value = await searchFoods(replacementQuery.value)
    } catch {
      replacementResults.value = []
    }
  }, 280)
}

function selectFood(item) {
  selectedFood.value = item
  foodQuery.value = item.name
  foodResults.value = []
}

function selectReplacement(item) {
  selectedReplacement.value = item
  replacementQuery.value = item.name
  replacementResults.value = []
}

async function handleCalculate() {
  if (!canSubmit.value || loading.value) return

  error.value = ''
  loading.value = true
  result.value = null

  try {
    result.value = await calculateSubstitution({
      foodId: selectedFood.value.id,
      grams: grams.value,
      mode: 'specific',
      criterion: 'calories',
      groupFilter: 'all',
      replacementId: selectedReplacement.value.id,
      limit: 1,
      mealLabel: 'Calculadora de trocas',
    })
    if (!result.value?.suggestions?.length) {
      error.value =
        'Essa troca não faz sentido no mesmo tipo de alimento (ex.: cereal com cereal). Escolha outro substituto.'
      result.value = null
    }
  } catch (err) {
    error.value = err?.data?.message || 'Não foi possível calcular a substituição.'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  clearTimeout(foodSearchTimer)
  clearTimeout(replacementSearchTimer)
})
</script>
<style scoped>
.subst-page {
  padding-top: 0;
}

.subst-lead {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.subst-form {
  margin-bottom: 1.25rem;
  padding: 1rem;
}

.subst-form-title {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--cf-text);
}

.subst-field {
  margin: 0 0 1rem;
  padding: 0;
  border: none;
}

.subst-field legend {
  margin-bottom: 0.45rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.subst-segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 10px;
  background: var(--cf-track);
}

.subst-segment {
  border: none;
  border-radius: 8px;
  padding: 0.55rem 0.45rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--cf-text-muted);
  background: transparent;
  cursor: pointer;
}

.subst-segment.active {
  background: var(--cf-surface);
  color: var(--cf-text);
  box-shadow: var(--cf-shadow);
}

.subst-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.subst-chip {
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  background: var(--cf-surface);
  cursor: pointer;
}

.subst-chip.active {
  border-color: var(--cf-green);
  background: var(--cf-green-soft);
  color: var(--cf-green-dark);
}

.subst-select,
.subst-input {
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--cf-text);
  background: var(--cf-surface);
}

.subst-label {
  display: block;
  margin-bottom: 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.subst-suggestions {
  list-style: none;
  margin: -0.5rem 0 0.85rem;
  padding: 0;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  overflow: hidden;
  max-height: 12rem;
  overflow-y: auto;
}

.subst-suggestion-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: none;
  border-bottom: 1px solid var(--cf-border);
  background: var(--cf-surface);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.subst-suggestion-btn strong {
  font-size: 0.82rem;
  color: var(--cf-text);
}

.subst-suggestion-btn span {
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.subst-selected {
  margin: -0.35rem 0 0.85rem;
  font-size: 0.78rem;
  color: var(--cf-text-muted);
}

.subst-error {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: #d64545;
}

.subst-submit {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 0.8rem;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  background: var(--cf-pink);
  cursor: pointer;
}

.subst-submit:disabled {
  opacity: 0.55;
  cursor: default;
}

.subst-results-title {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.subst-result-card {
  margin-bottom: 0.65rem;
  padding: 0.85rem;
}

.subst-result-card--original {
  border: 1px solid var(--cf-pink-soft, var(--cf-border));
}

.subst-result-card--swap {
  border: 1px solid var(--cf-green-soft, var(--cf-border));
  background: color-mix(in srgb, var(--cf-green-soft, #eef4ea) 40%, var(--cf-surface) 60%);
}

.subst-result-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.subst-result-highlight {
  margin: 0.55rem 0 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--cf-text);
}

.subst-result-head {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.subst-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cf-green-dark);
  background: var(--cf-green-soft);
  flex-shrink: 0;
}

.subst-similarity {
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--cf-green-dark);
}

.subst-result-cat {
  margin: 0.1rem 0 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.subst-result-macros {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.subst-empty {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}
</style>
