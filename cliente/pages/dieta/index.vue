<template>
  <div class="patient-page dieta-page">
    <PatientHeader title="Minha dieta" show-back back-to="/inicio" :show-bell="false" />

    <BellaDailyDiaryBar
      v-if="dailySummary"
      :summary="dailySummary"
      manageable
      class="dieta-diary-bar"
      @edit-entry="editDiaryEntry"
      @delete-entry="deleteDiaryEntry"
    />

    <PatientPageSkeleton v-if="planLoading" layout="plan" />

    <DietaMealPlanUploadCard v-else-if="!hasPlan" @uploaded="onPlanUploaded" />

    <template v-else>
    <div class="dieta-tabs">
      <button type="button" class="dieta-tab" :class="{ active: view === 'today' }" @click="view = 'today'">
        Hoje
      </button>
      <button type="button" class="dieta-tab" :class="{ active: view === 'week' }" @click="view = 'week'">
        Plano semanal
      </button>
    </div>

    <!-- Hoje: refeição selecionada -->
    <template v-if="view === 'today'">
      <div class="dieta-meals">
        <button
          v-for="meal in mealList"
          :key="meal.id"
          type="button"
          class="dieta-meal-btn"
          :class="{ active: activeMeal === meal.id }"
          @click="selectMeal(meal.id)"
        >
          <component :is="meal.icon" class="dieta-meal-icon" />
          <span>{{ meal.short }}</span>
        </button>
      </div>

      <section class="cf-card dieta-card">
        <p class="dieta-meal-label">
          {{ currentMeal.label }}
          <span class="dieta-meal-meta">{{ currentMeal.time }} · Refeição {{ currentMeal.index }} de {{ currentMeal.total }}</span>
        </p>

        <div v-if="progressLabel" class="dieta-progress">{{ progressLabel }}</div>

        <ul class="dieta-checklist">
          <li v-for="(item, index) in currentMeal.items" :key="item.key || `${activeMeal}-${index}`">
            <button
              type="button"
              class="dieta-check-btn"
              :aria-pressed="checkedItems[index]"
              :aria-label="checkedItems[index] ? `Desmarcar ${item.display || currentMeal.itemLabels[index]}` : `Marcar ${item.display || currentMeal.itemLabels[index]}`"
              @click="toggleItem(index)"
            >
              <DietaCheckIcon :completed="checkedItems[index]" />
            </button>
            <div class="dieta-item-copy">
              <button
                v-if="item.recipe"
                type="button"
                class="dieta-recipe-link"
                @click="openRecipeDetail(item.recipe)"
              >
                <span
                  :class="{
                    'dieta-item-done': checkedItems[index],
                    'dieta-item-substituted': item.isSubstituted,
                    'dieta-item-extra': item.isExtra,
                  }"
                >
                  {{ item.display || currentMeal.itemLabels[index] }}
                </span>
              </button>
              <span
                v-else
                :class="{
                  'dieta-item-done': checkedItems[index],
                  'dieta-item-substituted': item.isSubstituted,
                  'dieta-item-extra': item.isExtra,
                }"
              >
                {{ item.display || currentMeal.itemLabels[index] }}
              </span>
              <span v-if="item.isSubstituted" class="dieta-item-swap-tag">Substituído</span>
              <span v-else-if="item.isExtra" class="dieta-item-extra-tag">Fora do plano</span>
            </div>
            <button
              v-if="item.isExtra"
              type="button"
              class="dieta-item-remove"
              aria-label="Remover alimento adicionado"
              @click="removeExtraItemAt(index, item.id)"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        </ul>

        <button type="button" class="dieta-add-extra-btn" @click="extraFoodOpen = true">
          <Plus class="dieta-add-extra-icon" aria-hidden="true" />
          Adicionar outro alimento
        </button>

        <button
          v-if="hasSubstitutions"
          type="button"
          class="dieta-subs-btn"
          @click="substitutionsOpen = true"
        >
          <ArrowLeftRight class="dieta-subs-btn-icon" aria-hidden="true" />
          Ver opções de substituições
        </button>
        <NuxtLink to="/substituicao" class="dieta-subs-link">
          <ArrowLeftRight class="dieta-subs-btn-icon" aria-hidden="true" />
          Calculadora de substituição
        </NuxtLink>

        <div class="dieta-actions">
          <button type="button" class="dieta-action-btn dieta-action-btn--primary" @click="takePhotoNow">
            <Camera class="dieta-action-icon" aria-hidden="true" />
            Tirar foto agora
          </button>

          <NuxtLink
            :to="bellaMealLink"
            class="dieta-action-btn dieta-action-btn--outline"
          >
            Escolher da galeria
          </NuxtLink>
        </div>

        <button type="button" class="dieta-plan-link" @click="view = 'week'">
          Ver plano completo
        </button>
      </section>
    </template>

    <!-- Plano semanal: todas as refeições -->
    <template v-else>
      <p class="dieta-week-intro">Seu plano alimentar de hoje, refeição por refeição.</p>

      <article
        v-for="meal in mealList"
        :key="meal.id"
        class="cf-card dieta-week-card"
      >
        <button type="button" class="dieta-week-head" @click="openMealFromWeek(meal.id)">
          <div class="dieta-week-info">
            <h2 class="dieta-week-title">{{ mealPlanEntry(meal.id).label }}</h2>
            <p class="dieta-week-meta">{{ mealPlanEntry(meal.id).time }} · {{ mealPlanEntry(meal.id).index }} de {{ mealPlanEntry(meal.id).total }}</p>
            <p class="dieta-week-progress">{{ weekProgressLabel(meal.id) }}</p>
          </div>
        </button>

        <ul class="dieta-week-items">
          <li v-for="(item, index) in mealPlanEntry(meal.id).itemLabels" :key="`${meal.id}-${index}`">{{ item }}</li>
        </ul>
      </article>
    </template>

    <div class="dieta-plan-footer">
      <p class="dieta-plan-source">{{ planTitle }}</p>
      <label class="dieta-plan-reupload">
        <Upload class="dieta-plan-reupload-icon" aria-hidden="true" />
        <span>{{ planUploading ? 'Atualizando...' : 'Atualizar PDF' }}</span>
        <input type="file" accept="application/pdf,.pdf" class="dieta-upload-input" :disabled="planUploading" @change="onReupload" />
      </label>
    </div>
    </template>

    <DietaMealSubstitutionsModal
      v-if="currentMeal"
      v-model:open="substitutionsOpen"
      :meal-id="activeMeal"
      :meal-label="currentMeal.label"
      :groups="substitutionGroups"
    />

    <DietaAddExtraFoodModal
      v-if="currentMeal"
      v-model:open="extraFoodOpen"
      :meal-label="currentMeal.label"
      @added="onExtraFoodAdded"
    />

    <BellaMealConfirmModal
      :open="showMealModal"
      :draft="mealDraft"
      :daily-summary="dailySummary"
      :saving="confirmingMeal"
      :error="mealConfirmError"
      @cancel="cancelMealConfirm"
      @confirm="confirmMealEdit"
    />

    <MealPlanRecipeDetailSheet
      :open="recipeDetailOpen"
      :recipe="selectedRecipe"
      @close="recipeDetailOpen = false"
    />
  </div>
</template>

<script setup>
import { ArrowLeftRight, Camera, Plus, Trash2, Upload } from 'lucide-vue-next'
import DietaAddExtraFoodModal from '~/components/dieta/AddExtraFoodModal.vue'
import MealPlanRecipeDetailSheet from '~/components/dieta/MealPlanRecipeDetailSheet.vue'
import { useDietaProgress } from '~/composables/useDietaProgress'
import { useMealExtraItems } from '~/composables/useMealExtraItems'
import { useMealItemOverrides } from '~/composables/useMealItemOverrides'
import { useMealPlan } from '~/composables/useMealPlan'
import { useMealSubstitutions } from '~/composables/useMealSubstitutions'
import { usePatientMealPlan } from '~/composables/usePatientMealPlan'
import { resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'
import { normalizeMealItemsForSave } from '~/utils/meal-diary'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const route = useRoute()
const view = ref('today')
const activeMeal = ref('lunch')
const checkedItems = ref([])
const dailySummary = ref(null)
const showMealModal = ref(false)
const mealDraft = ref(null)
const confirmingMeal = ref(false)
const mealConfirmError = ref('')

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const { loadChecked, saveChecked, countDone } = useDietaProgress()
const { queueSyncMealCheck, syncMealCheck } = useDietaDiarySync()
const { fetchPlan, uploadPdf, uploading: planUploading, planRecord } = usePatientMealPlan()
const { mealList, mealOrder, getMealById, getMealIdForTime, hasPlan } = useMealPlan()
const { getSubstitutionGroupsForMeal, mealHasSubstitutions } = useMealSubstitutions()

const { patientFetchInit } = usePatientLocalTime()

const planLoading = ref(true)
const substitutionsOpen = ref(false)
const extraFoodOpen = ref(false)
const recipeDetailOpen = ref(false)
const selectedRecipe = ref(null)
const { overridesRevision } = useMealItemOverrides()
const { extrasRevision, addExtraItem, removeExtraItem } = useMealExtraItems()
const mealPlanEntry = (mealId) => getMealById(mealId)
const currentMeal = computed(() => {
  overridesRevision.value
  return getMealById(activeMeal.value)
})
const planTitle = computed(() => planRecord.value?.title || planRecord.value?.fileName || 'Plano alimentar')
const substitutionGroups = computed(() => getSubstitutionGroupsForMeal(activeMeal.value))
const hasSubstitutions = computed(() => mealHasSubstitutions(activeMeal.value))

const progressLabel = computed(() => {
  if (!currentMeal.value) return ''
  const total = currentMeal.value.itemLabels.length
  const done = countDone(checkedItems.value)
  if (!total) return ''
  if (done === total) return 'Refeição concluída hoje'
  return `${done} de ${total} itens marcados`
})

const bellaMealLink = computed(() => ({
  path: '/bella/chat/meal',
  query: {
    from: 'dieta',
    meal: activeMeal.value,
    label: currentMeal.value?.label || 'Refeição',
  },
}))

function syncChecked(mealId, options = {}) {
  const { preserveChecked = false } = options
  const meal = getMealById(mealId)
  if (!meal) {
    checkedItems.value = []
    return
  }

  const count = meal.itemLabels.length
  const previous = preserveChecked ? checkedItems.value : loadChecked(mealId, count)
  const next = Array(count).fill(false)

  for (let i = 0; i < Math.min(previous.length, count); i += 1) {
    next[i] = Boolean(previous[i])
  }

  checkedItems.value = next
  saveChecked(mealId, next)
}

function onExtraFoodAdded({ food, amount, unit }) {
  const added = addExtraItem(activeMeal.value, food, amount, unit)
  if (!added) return

  syncChecked(activeMeal.value, { preserveChecked: true })
  const next = [...checkedItems.value]
  next[next.length - 1] = true
  checkedItems.value = next
  saveChecked(activeMeal.value, next)

  const meal = getMealById(activeMeal.value)
  queueSyncMealCheck(activeMeal.value, meal, next, (summary) => {
    if (summary) dailySummary.value = summary
  })
}

function removeExtraItemAt(index, itemId) {
  removeExtraItem(activeMeal.value, itemId)

  const next = checkedItems.value.filter((_, itemIndex) => itemIndex !== index)
  checkedItems.value = next
  saveChecked(activeMeal.value, next)

  const meal = getMealById(activeMeal.value)
  queueSyncMealCheck(activeMeal.value, meal, next, (summary) => {
    if (summary) dailySummary.value = summary
  })
}

function selectMeal(mealId) {
  activeMeal.value = mealId
  syncChecked(mealId)
  substitutionsOpen.value = false
}

function openRecipeDetail(recipe) {
  selectedRecipe.value = recipe
  recipeDetailOpen.value = true
}

function toggleItem(index) {
  const next = [...checkedItems.value]
  next[index] = !next[index]
  checkedItems.value = next
  saveChecked(activeMeal.value, next)
  queueSyncMealCheck(activeMeal.value, currentMeal.value, next, (summary) => {
    if (summary) dailySummary.value = summary
  })
}

function weekProgressLabel(mealId) {
  const meal = getMealById(mealId)
  if (!meal) return ''
  const items = meal.itemLabels
  const states = loadChecked(mealId, items.length)
  const done = countDone(states)
  if (done === items.length) return 'Concluída hoje'
  return `${done}/${items.length} itens marcados`
}

function resolveActiveMealFromRoute() {
  const queryMeal = route.query.meal
  if (typeof queryMeal === 'string' && mealOrder.value.includes(queryMeal)) return queryMeal
  return getMealIdForTime() || mealOrder.value[0] || ''
}

function onPlanUploaded() {
  const mealId = resolveActiveMealFromRoute()
  if (mealId) {
    activeMeal.value = mealId
    syncChecked(mealId)
  }
  loadDailySummary()
}

async function onReupload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    await uploadPdf(file)
    onPlanUploaded()
  } catch {
    /* feedback no composable */
  } finally {
    event.target.value = ''
  }
}

function openMealFromWeek(mealId) {
  activeMeal.value = mealId
  syncChecked(mealId)
  view.value = 'today'
}

function takePhotoNow() {
  navigateTo({
    path: '/bella/chat/meal',
    query: {
      from: 'dieta',
      meal: activeMeal.value,
      label: currentMeal.value.label,
      camera: '1',
    },
  })
}

async function loadDailySummary() {
  try {
    dailySummary.value = await $fetch(`${apiBase}/food-diary/today`, patientFetchInit())
  } catch {
    dailySummary.value = null
  }
}

function cancelMealConfirm() {
  showMealModal.value = false
  mealDraft.value = null
  mealConfirmError.value = ''
}

function editDiaryEntry(entry) {
  if (!entry?.id) return
  mealDraft.value = {
    mealType: entry.mealType,
    mealLabel: entry.mealLabel,
    imageUrl: entry.imageUrl,
    items: entry.items || [],
    editingEntryId: entry.id,
    previousTotals: {
      caloriesKcal: entry.caloriesKcal,
      carbsG: entry.carbsG,
      proteinG: entry.proteinG,
      fatG: entry.fatG,
    },
  }
  mealConfirmError.value = ''
  showMealModal.value = true
}

async function deleteDiaryEntry(entry) {
  if (!entry?.id || confirmingMeal.value) return
  const { confirm } = useConfirm()
  const accepted = await confirm({
    title: 'Remover refeição?',
    message: `Deseja remover ${entry.mealLabel || 'esta refeição'} do diário? As calorias do dia serão recalculadas.`,
    confirmLabel: 'Remover',
    variant: 'danger',
  })
  if (!accepted) return

  try {
    const res = await $fetch(`${apiBase}/food-diary/entries/${entry.id}`, patientFetchInit({ method: 'DELETE' }))
    if (res.dailySummary) dailySummary.value = res.dailySummary
    nutritionRefresh.value += 1
  } catch (err) {
    mealConfirmError.value = err.data?.message || 'Não foi possível remover a refeição.'
  }
}

async function confirmMealEdit(items) {
  if (!mealDraft.value?.editingEntryId || confirmingMeal.value) return
  confirmingMeal.value = true
  mealConfirmError.value = ''

  try {
    const res = await $fetch(`${apiBase}/food-diary/entries/${mealDraft.value.editingEntryId}`, patientFetchInit({
      method: 'PUT',
      body: {
        items: normalizeMealItemsForSave(items),
        mealType: mealDraft.value.mealType,
        mealLabel: mealDraft.value.mealLabel,
        imageUrl: mealDraft.value.imageUrl,
      },
    }))
    if (res.dailySummary) dailySummary.value = res.dailySummary
    nutritionRefresh.value += 1
    cancelMealConfirm()
  } catch (err) {
    mealConfirmError.value = err.data?.message || 'Não foi possível atualizar a refeição.'
  } finally {
    confirmingMeal.value = false
  }
}

const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)

watch(nutritionRefresh, () => {
  loadDailySummary()
})

async function syncActiveMealIfNeeded() {
  const meal = getMealById(activeMeal.value)
  if (!meal?.itemLabels?.length) {
    await loadDailySummary()
    return
  }

  const states = loadChecked(activeMeal.value, meal.itemLabels.length)
  if (!countDone(states)) {
    await loadDailySummary()
    return
  }

  const summary = await syncMealCheck(activeMeal.value, meal, states, { bumpRefresh: false })
  if (summary) dailySummary.value = summary
  else await loadDailySummary()
}

onMounted(async () => {
  await fetchPlan()
  planLoading.value = false
  if (hasPlan.value) {
    activeMeal.value = resolveActiveMealFromRoute()
    syncChecked(activeMeal.value)
    await syncActiveMealIfNeeded()
  } else {
    loadDailySummary()
  }
})

onUnmounted(() => {
  substitutionsOpen.value = false
  extraFoodOpen.value = false
  resetPatientScrollLock()
})

watch(overridesRevision, () => {
  syncChecked(activeMeal.value, { preserveChecked: true })
})

watch(extrasRevision, () => {
  syncChecked(activeMeal.value, { preserveChecked: true })
})

watch(
  () => route.query.meal,
  (queryMeal) => {
    if (typeof queryMeal === 'string' && mealOrder.value.includes(queryMeal)) {
      activeMeal.value = queryMeal
      syncChecked(queryMeal)
    }
  },
)
</script>

<style scoped>
.patient-page.dieta-page {
  padding-inline: 1.25rem;
  padding-top: 0;
  padding-bottom: calc(var(--cf-tab-clearance) + 0.25rem);
  box-sizing: border-box;
}

.dieta-plan-loading {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--cf-text-muted);
  text-align: center;
}

.dieta-plan-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0 0.5rem;
}

.dieta-plan-source {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
  line-height: 1.3;
  flex: 1;
}

.dieta-plan-reupload {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-pink);
  cursor: pointer;
  flex-shrink: 0;
}

.dieta-plan-reupload-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.dieta-upload-input {
  display: none;
}

.dieta-diary-bar {
  margin: 0 0 0.85rem !important;
}

.dieta-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: var(--cf-surface);
  border-radius: var(--cf-radius-sm);
  box-shadow: var(--cf-shadow);
}

.dieta-tab {
  border: none;
  background: transparent;
  padding: 0.65rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.dieta-tab.active {
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
  font-weight: 600;
}

.dieta-meals {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  margin-bottom: 1rem;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.dieta-meals::-webkit-scrollbar {
  display: none;
}

.dieta-meal-btn {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 3.5rem;
  padding: 0.55rem 0.45rem;
  border: none;
  border-radius: 12px;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 0.62rem;
  color: var(--cf-text-muted);
  cursor: pointer;
  box-shadow: var(--cf-shadow);
}

.dieta-meal-btn.active {
  background: var(--cf-green-soft);
  color: var(--cf-green-dark);
}

.dieta-meal-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.dieta-meal-label {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--cf-text);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dieta-meal-meta {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.dieta-progress {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--cf-green-dark);
}

.dieta-checklist {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dieta-checklist li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.88rem;
  color: var(--cf-text);
}

.dieta-item-extra {
  color: var(--cf-pink-dark);
}

.dieta-item-extra-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-pink);
  letter-spacing: 0.01em;
}

.dieta-item-remove {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.dieta-item-remove :deep(svg) {
  width: 0.95rem;
  height: 0.95rem;
}

.dieta-add-extra-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px dashed var(--cf-pink-soft);
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dieta-add-extra-btn:active {
  background: var(--cf-pink-soft);
}

.dieta-add-extra-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.dieta-item-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.dieta-recipe-link {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(217, 119, 6, 0.45);
}

.dieta-item-substituted {
  color: var(--cf-green-dark);
}

.dieta-item-swap-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-green);
  letter-spacing: 0.01em;
}

.dieta-check-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
}

.dieta-item-done {
  color: var(--cf-text-muted);
  text-decoration: line-through;
  text-decoration-color: rgba(0, 0, 0, 0.2);
}

.dieta-subs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--cf-green-soft);
  border-radius: 10px;
  background: var(--cf-green-soft);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-green-dark);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dieta-subs-btn:active {
  background: #e3ebdf;
}

.dieta-subs-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 10px;
  background: var(--cf-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-text);
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dieta-subs-link:active {
  background: var(--cf-track);
}

.dieta-subs-btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.dieta-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.dieta-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  min-height: 2.35rem;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.dieta-action-btn--primary {
  border: none;
  background: var(--cf-pink);
  color: #fff;
}

.dieta-action-btn--primary:hover {
  background: var(--cf-pink-dark);
}

.dieta-action-btn--outline {
  background: var(--cf-surface);
  color: var(--cf-pink);
  border: 1.5px solid var(--cf-pink-soft);
}

.dieta-action-btn--outline:hover {
  background: var(--cf-pink-soft);
}

.dieta-action-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.dieta-plan-link {
  display: block;
  width: 100%;
  margin-top: 0.85rem;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-pink);
  text-align: center;
  cursor: pointer;
}

.dieta-plan-link:hover {
  color: var(--cf-pink-dark);
}

.dieta-week-intro {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.dieta-week-card {
  margin-bottom: 0.85rem;
  padding: 0.85rem;
}

.dieta-week-head {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  margin-bottom: 0.75rem;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.dieta-week-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--cf-text);
}

.dieta-week-meta,
.dieta-week-progress {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: var(--cf-text-muted);
}

.dieta-week-progress {
  color: var(--cf-green-dark);
  font-weight: 500;
}

.dieta-week-items {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--cf-text);
}
</style>
