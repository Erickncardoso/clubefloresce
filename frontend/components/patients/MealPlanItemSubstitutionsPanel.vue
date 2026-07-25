<template>
  <div class="mpis">
    <div class="mpis-head">
      <strong>Opções de substituição</strong>
      <span v-if="counts.total" class="mpis-total">{{ counts.total }} selecionada(s)</span>
    </div>

    <div class="mpis-tabs" role="tablist" aria-label="Tipo de substituição">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="mpis-tab"
        :class="{ 'mpis-tab--active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id ? 'true' : 'false'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span class="mpis-tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'food'" class="mpis-pane">
      <div class="mpis-actions">
        <button type="button" class="btn-primary mpis-add mpis-add--multi" @click="multiPickerOpen = true">
          Selecionar equivalentes
        </button>
        <button type="button" class="btn-secondary mpis-add" @click="addFoodSub">
          + Alimento manual
        </button>
      </div>

      <MealPlanSubstitutionMultiPicker
        v-if="multiPickerOpen"
        :reference-item="item"
        :existing-food-subs="foodSubs"
        @close="multiPickerOpen = false"
        @confirm="onMultiSubstitutionsConfirm"
      />

      <div v-if="!foodSubs.length && !multiPickerOpen" class="mpis-empty">
        Nenhum alimento alternativo ainda. Use <strong>Selecionar equivalentes</strong> ou adicione manualmente.
      </div>
      <article v-for="sub in foodSubs" :key="sub.id" class="mpis-row">
        <div class="mpis-row-main">
          <MealPlanFoodSearchPicker
            v-model="sub.name"
            placeholder="Buscar alimento substituto…"
            @select="onFoodSelect(sub, $event)"
          />
          <MealPlanPortionMeasurePicker
            v-if="sub.name?.trim()"
            :food-name="sub.name"
            :per100g="sub.per100g"
            :amount="Number(sub.portionAmount) || 1"
            :measure-id="sub.portionMeasure || 'unidade'"
            @change="onFoodPortionChange(sub, $event)"
          />
        </div>
        <button type="button" class="mpis-remove" aria-label="Remover alternativa" @click="removeSub(sub.id)">
          <Trash2 aria-hidden="true" />
        </button>
      </article>
    </div>

    <div v-else-if="activeTab === 'group'" class="mpis-pane">
      <div v-if="!groupSubs.length" class="mpis-empty">Nenhum grupo alternativo ainda.</div>
      <article v-for="sub in groupSubs" :key="sub.id" class="mpis-row">
        <div class="mpis-row-main mpis-row-main--group">
          <div class="field field--float mpis-field">
            <label :for="`mpis-group-${sub.id}`">Grupo alimentar</label>
            <select
              :id="`mpis-group-${sub.id}`"
              class="mpis-select"
              :value="sub.groupId"
              @change="onGroupChange(sub, $event.target.value)"
            >
              <option v-for="group in FOOD_EQUIVALENT_GROUPS" :key="group.id" :value="group.id">
                {{ group.label }}
              </option>
            </select>
          </div>
          <div class="field field--float mpis-field mpis-field--qty">
            <label :for="`mpis-group-qty-${sub.id}`">Quantidade</label>
            <input
              :id="`mpis-group-qty-${sub.id}`"
              v-model="sub.amount"
              type="text"
              inputmode="decimal"
              @input="onGroupAmountChange(sub)"
            >
          </div>
          <span class="mpis-unit">{{ sub.unit || 'porção' }}</span>
          <p v-if="sub.groupExamples" class="mpis-examples">{{ sub.groupExamples }}</p>
        </div>
        <button type="button" class="mpis-remove" aria-label="Remover alternativa" @click="removeSub(sub.id)">
          <Trash2 aria-hidden="true" />
        </button>
      </article>
      <button type="button" class="btn-secondary mpis-add" @click="addGroupSub">
        + Grupo alimentar
      </button>
    </div>

    <div v-else class="mpis-pane">
      <div v-if="!recipeSubs.length" class="mpis-empty">Nenhuma receita alternativa ainda.</div>
      <article v-for="sub in recipeSubs" :key="sub.id" class="mpis-row">
        <div class="mpis-row-main mpis-row-main--recipe">
          <div class="field field--float mpis-field">
            <label :for="`mpis-recipe-${sub.id}`">Receita</label>
            <select
              :id="`mpis-recipe-${sub.id}`"
              class="mpis-select"
              :value="sub.recipeId"
              @change="onRecipeChange(sub, $event.target.value)"
            >
              <option value="">Selecione uma receita</option>
              <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
                {{ recipe.title }}
              </option>
            </select>
          </div>
          <div class="field field--float mpis-field mpis-field--qty">
            <label :for="`mpis-recipe-qty-${sub.id}`">Porções</label>
            <input
              :id="`mpis-recipe-qty-${sub.id}`"
              v-model="sub.amount"
              type="text"
              inputmode="decimal"
              @input="onRecipeAmountChange(sub)"
            >
          </div>
          <span class="mpis-unit">{{ sub.servingLabel || sub.unit || 'porção' }}</span>
        </div>
        <button type="button" class="mpis-remove" aria-label="Remover alternativa" @click="removeSub(sub.id)">
          <Trash2 aria-hidden="true" />
        </button>
      </article>
      <button type="button" class="btn-secondary mpis-add" @click="addRecipeSub">
        + Receita
      </button>
      <p v-if="recipesLoading" class="mpis-hint">Carregando receitas…</p>
      <p v-else-if="!recipes.length" class="mpis-hint">
        Crie receitas no plano alimentar com <strong>+ Inserir receita ($)</strong> para usá-las aqui.
      </p>
    </div>

    <p v-if="counts.total" class="mpis-preview">
      {{ counts.total }} opção(ões) visíveis para o paciente
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import MealPlanFoodSearchPicker from '~/components/patients/MealPlanFoodSearchPicker.vue'
import MealPlanPortionMeasurePicker from '~/components/patients/MealPlanPortionMeasurePicker.vue'
import MealPlanSubstitutionMultiPicker from '~/components/patients/MealPlanSubstitutionMultiPicker.vue'
import { useMealPlanRecipes } from '~/composables/useMealPlanRecipes.js'
import { FOOD_EQUIVALENT_GROUPS, applyFoodItemMeasure } from '~/utils/meal-plan-prescription.js'
import {
  appendFoodSubstitutions,
  applyFoodToSubstitution,
  applyGroupToSubstitution,
  applyRecipeToSubstitution,
  countSubstitutionsByType,
  createFoodSubstitution,
  createGroupSubstitution,
  createRecipeSubstitution,
  ensureStructuredSubstitutions,
  syncItemSubstitutionsToLegacy,
} from '~/utils/meal-plan-substitutions.js'

const props = defineProps({
  item: { type: Object, required: true },
})

const emit = defineEmits(['change'])

const { listRecipes } = useMealPlanRecipes()
const activeTab = ref('food')
const multiPickerOpen = ref(false)
const recipes = ref([])
const recipesLoading = ref(false)

const counts = computed(() => countSubstitutionsByType(props.item))

const tabs = computed(() => [
  { id: 'food', label: 'Alimento', count: counts.value.food },
  { id: 'group', label: 'Grupo', count: counts.value.group },
  { id: 'recipe', label: 'Receita', count: counts.value.recipe },
])

const foodSubs = computed(() =>
  (props.item.substitutions || []).filter((sub) => (sub.type || 'food') === 'food'),
)
const groupSubs = computed(() =>
  (props.item.substitutions || []).filter((sub) => sub.type === 'group'),
)
const recipeSubs = computed(() =>
  (props.item.substitutions || []).filter((sub) => sub.type === 'recipe'),
)

function syncChanges() {
  syncItemSubstitutionsToLegacy(props.item)
  emit('change')
}

function addFoodSub() {
  ensureStructuredSubstitutions(props.item)
  props.item.substitutions.push(createFoodSubstitution())
  activeTab.value = 'food'
  multiPickerOpen.value = false
  syncChanges()
}

function onMultiSubstitutionsConfirm(selectedSuggestions) {
  const added = appendFoodSubstitutions(props.item, selectedSuggestions)
  multiPickerOpen.value = false
  activeTab.value = 'food'
  if (added) syncChanges()
}

function addGroupSub() {
  ensureStructuredSubstitutions(props.item)
  props.item.substitutions.push(createGroupSubstitution())
  activeTab.value = 'group'
  syncChanges()
}

function addRecipeSub() {
  ensureStructuredSubstitutions(props.item)
  props.item.substitutions.push(createRecipeSubstitution())
  activeTab.value = 'recipe'
  syncChanges()
}

function removeSub(id) {
  props.item.substitutions = (props.item.substitutions || []).filter((sub) => sub.id !== id)
  syncChanges()
}

function onFoodSelect(sub, food) {
  applyFoodToSubstitution(sub, food)
  syncChanges()
}

function onFoodPortionChange(sub, payload) {
  applyFoodItemMeasure(sub, payload)
  syncChanges()
}

function onGroupChange(sub, groupId) {
  applyGroupToSubstitution(sub, groupId)
  syncChanges()
}

function onGroupAmountChange(sub) {
  sub.unit = sub.amount && Number(sub.amount) > 1 ? 'porções' : 'porção'
  syncChanges()
}

function onRecipeChange(sub, recipeId) {
  const recipe = recipes.value.find((entry) => entry.id === recipeId)
  if (!recipe) {
    sub.recipeId = ''
    sub.recipeSnapshot = null
    sub.name = 'Receita'
    syncChanges()
    return
  }
  applyRecipeToSubstitution(sub, recipe)
  syncChanges()
}

function onRecipeAmountChange(sub) {
  sub.portionAmount = Number(String(sub.amount || '').replace(',', '.')) || 1
  syncChanges()
}

async function loadRecipes() {
  recipesLoading.value = true
  try {
    recipes.value = await listRecipes()
  } catch {
    recipes.value = []
  } finally {
    recipesLoading.value = false
  }
}

watch(
  () => props.item?.id,
  () => {
    ensureStructuredSubstitutions(props.item)
    syncItemSubstitutionsToLegacy(props.item)
    multiPickerOpen.value = false
  },
  { immediate: true },
)

onMounted(() => {
  void loadRecipes()
})
</script>

<style scoped>
.mpis {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.mpis-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mpis-head strong {
  font-size: 0.78rem;
  font-weight: 600;
  color: #4b5563;
}

.mpis-total {
  font-size: 0.72rem;
  color: #6b7368;
}

.mpis-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mpis-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.85rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #4b5563;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
}

.mpis-tab--active {
  border-color: rgba(139, 150, 124, 0.55);
  background: rgba(139, 150, 124, 0.12);
  color: #3f4a38;
}

.mpis-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: var(--cf-radius-pill, 999px);
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.68rem;
  font-weight: 600;
}

.mpis-tab--active .mpis-tab-count {
  background: rgba(63, 74, 56, 0.12);
}

.mpis-pane {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.mpis-empty {
  font-size: 0.76rem;
  color: #94a3b8;
}

.mpis-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: start;
  padding: 0.55rem;
  border: 1px solid #edf0ec;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mpis-row-main {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.mpis-row-main--group,
.mpis-row-main--recipe {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(5rem, 0.6fr) auto;
  gap: 0.45rem;
  align-items: end;
}

.mpis-field {
  margin: 0;
  min-width: 0;
}

.mpis-field--qty {
  max-width: 6rem;
}

.mpis-select,
.mpis-field input {
  width: 100%;
  min-height: 2.35rem;
}

.mpis-unit {
  font-size: 0.76rem;
  color: #6b7368;
  padding-bottom: 0.45rem;
  white-space: nowrap;
}

.mpis-examples {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.35;
}

.mpis-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.mpis-remove:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #b42318;
}

.mpis-remove svg {
  width: 0.95rem;
  height: 0.95rem;
}

.mpis-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mpis-add {
  align-self: flex-start;
  min-height: 2rem !important;
  padding: 0.35rem 0.7rem !important;
  font-size: 0.76rem !important;
}

.mpis-add--multi {
  font-weight: 500 !important;
}

.mpis-hint,
.mpis-preview {
  margin: 0;
  font-size: 0.72rem;
  color: #6b7368;
  line-height: 1.35;
}

@media (max-width: 820px) {
  .mpis-row-main--group,
  .mpis-row-main--recipe {
    grid-template-columns: 1fr;
  }

  .mpis-unit {
    padding-bottom: 0;
  }
}
</style>
