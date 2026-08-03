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
    <div class="dieta-tabs" role="tablist" aria-label="Visualização do plano alimentar">
      <button type="button" role="tab" class="dieta-tab" :class="{ active: view === 'today' }" :aria-selected="view === 'today'" @click="setView('today')">
        Hoje
      </button>
      <button type="button" role="tab" class="dieta-tab" :class="{ active: view === 'week' }" :aria-selected="view === 'week'" @click="setView('week')">
        Plano completo
      </button>
    </div>

    <template v-if="view === 'today'">
      <div class="dieta-section-heading">
        <h1 class="dieta-section-title">Refeições de hoje</h1>
        <span class="dieta-section-count">{{ completedMealsCount }}/{{ mealList.length }} concluídas</span>
      </div>

      <button
        v-if="hasMealOptionGroups"
        type="button"
        class="dieta-options-banner"
        @click="openAllMealOptions"
      >
        <Layers class="dieta-options-banner-icon" aria-hidden="true" />
        <span class="dieta-options-banner-copy">
          <strong>{{ needsOptionSelection ? 'Escolher opções do cardápio' : 'Alterar opções do cardápio' }}</strong>
          <span>{{ needsOptionSelection ? 'Seu plano tem alternativas — escolha e salve' : 'Você pode trocar a opção salva quando quiser' }}</span>
        </span>
        <ChevronRight class="dieta-options-banner-chevron" aria-hidden="true" />
      </button>

      <div class="dieta-meals" role="tablist" aria-label="Refeições de hoje">
        <button
          v-for="meal in mealList"
          :key="meal.id"
          type="button"
          role="tab"
          class="dieta-meal-btn"
          :class="{ active: activeMeal === meal.id }"
          :aria-selected="activeMeal === meal.id"
          @click="selectMeal(meal.id)"
        >
          <span class="dieta-meal-icon-wrap">
            <component :is="meal.icon" class="dieta-meal-icon" aria-hidden="true" />
          </span>
          <span class="dieta-meal-short">{{ meal.short }}</span>
          <CircleCheck v-if="isMealComplete(meal.id)" class="dieta-meal-complete" aria-label="Concluída" />
        </button>
      </div>

      <section v-if="currentMeal" class="dieta-card">
        <header class="dieta-card-header">
          <div class="dieta-card-heading">
            <span class="dieta-card-icon">
              <component :is="activeMealDefinition?.icon" aria-hidden="true" />
            </span>
            <div>
              <p class="dieta-meal-label">{{ currentMeal.label }}</p>
              <p class="dieta-meal-meta">{{ currentMeal.time }} · Refeição {{ currentMeal.index }} de {{ currentMeal.total }}</p>
            </div>
          </div>
          <span class="dieta-card-percent">{{ currentMealPercent }}%</span>
        </header>

        <div
          class="dieta-progress-track"
          role="progressbar"
          :aria-label="`Progresso de ${currentMeal.label}`"
          :aria-valuenow="currentMealPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ transform: `scaleX(${currentMealPercent / 100})` }" />
        </div>
        <p v-if="progressLabel" class="dieta-progress">{{ progressLabel }}</p>

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
              <button v-if="item.recipe" type="button" class="dieta-recipe-link" @click="openRecipeDetail(item.recipe)">
                <span :class="{ 'dieta-item-done': checkedItems[index], 'dieta-item-substituted': item.isSubstituted, 'dieta-item-extra': item.isExtra }">
                  {{ item.display || currentMeal.itemLabels[index] }}
                </span>
              </button>
              <span v-else :class="{ 'dieta-item-done': checkedItems[index], 'dieta-item-substituted': item.isSubstituted, 'dieta-item-extra': item.isExtra }">
                {{ item.display || currentMeal.itemLabels[index] }}
              </span>
              <span v-if="item.isSubstituted" class="dieta-item-swap-tag">Substituído</span>
              <span v-else-if="item.isExtra" class="dieta-item-extra-tag">Fora do plano</span>
            </div>
            <button v-if="item.isExtra" type="button" class="dieta-item-remove" aria-label="Remover alimento adicionado" @click="removeExtraItemAt(index, item.id)">
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        </ul>

        <div class="dieta-tools" aria-label="Opções da refeição">
          <button type="button" class="dieta-tool-btn" @click="extraFoodOpen = true">
            <Plus aria-hidden="true" />
            <span>Adicionar alimento</span>
          </button>
          <button v-if="hasSubstitutions" type="button" class="dieta-tool-btn" @click="substitutionsOpen = true">
            <ArrowLeftRight aria-hidden="true" />
            <span>Substituições</span>
          </button>
          <button
            v-if="activeMealHasOptionAlternatives"
            type="button"
            class="dieta-tool-btn"
            @click="openOptionPickerForActiveMeal"
          >
            <Layers aria-hidden="true" />
            <span>Trocar opção</span>
          </button>
          <NuxtLink to="/substituicao" class="dieta-tool-btn">
            <Calculator aria-hidden="true" />
            <span>Calcular troca</span>
          </NuxtLink>
        </div>

        <div class="dieta-register">
          <div class="dieta-register-copy">
            <p>Registrar refeição</p>
            <span>Envie uma foto para a Bella analisar.</span>
          </div>
          <div class="dieta-actions">
            <button type="button" class="dieta-action-btn dieta-action-btn--primary" @click="takePhotoNow">
              <Camera class="dieta-action-icon" aria-hidden="true" />
              Tirar foto
            </button>
            <NuxtLink :to="bellaMealLink" class="dieta-action-btn dieta-action-btn--outline">
              <ImagePlus class="dieta-action-icon" aria-hidden="true" />
              Galeria
            </NuxtLink>
          </div>
        </div>

        <button type="button" class="dieta-plan-link" @click="setView('week')">
          Ver todas as refeições
          <ChevronRight aria-hidden="true" />
        </button>
      </section>
    </template>

    <template v-else>
      <div class="dieta-section-heading dieta-section-heading--week">
        <h1 class="dieta-section-title">Plano do dia</h1>
        <span class="dieta-section-count">{{ completedMealsCount }}/{{ mealList.length }} concluídas</span>
      </div>

      <article v-for="meal in mealList" :key="meal.id" class="dieta-week-card">
        <button type="button" class="dieta-week-head" @click="openMealFromWeek(meal.id)">
          <span class="dieta-week-icon"><component :is="meal.icon" aria-hidden="true" /></span>
          <div class="dieta-week-info">
            <div class="dieta-week-title-row">
              <h2 class="dieta-week-title">{{ mealPlanEntry(meal.id).label }}</h2>
              <span>{{ mealPlanEntry(meal.id).time }}</span>
            </div>
            <p class="dieta-week-progress">{{ weekProgressLabel(meal.id) }}</p>
          </div>
          <ChevronRight class="dieta-week-chevron" aria-hidden="true" />
        </button>
        <div class="dieta-week-track" aria-hidden="true"><span :style="{ transform: `scaleX(${mealProgressPercent(meal.id) / 100})` }" /></div>
      </article>
    </template>

    <div class="dieta-plan-footer">
      <p class="dieta-plan-source">{{ planTitle }}</p>
      <label class="dieta-plan-reupload">
        <Upload class="dieta-plan-reupload-icon" aria-hidden="true" />
        <span>{{ planUploading ? 'Atualizando…' : 'Atualizar PDF' }}</span>
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

    <DietaMealPlanOptionPickerModal
      v-model:open="optionPickerOpen"
      :required="optionPickerRequired"
      :focus-slot-key="optionPickerFocusSlot"
      :title="optionPickerTitle"
      :confirm-label="optionPickerRequired ? 'Continuar' : 'Salvar opção'"
      @saved="onOptionSelectionsSaved"
    />

    <MealPlanOptionsIntroModal
      :open="optionIntroOpen"
      :slots-label="optionSlotsLabel"
      @choose="onOptionIntroChoose"
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
import {
  ArrowLeftRight,
  Calculator,
  Camera,
  ChevronRight,
  CircleCheck,
  ImagePlus,
  Layers,
  Plus,
  Trash2,
  Upload,
} from 'lucide-vue-next'
import DietaAddExtraFoodModal from '~/components/dieta/AddExtraFoodModal.vue'
import MealPlanOptionsIntroModal from '~/components/dieta/MealPlanOptionsIntroModal.vue'
import MealPlanRecipeDetailSheet from '~/components/dieta/MealPlanRecipeDetailSheet.vue'
import { useDietaProgress } from '~/composables/useDietaProgress'
import { useMealExtraItems } from '~/composables/useMealExtraItems'
import { useMealItemOverrides } from '~/composables/useMealItemOverrides'
import { useMealPlan } from '~/composables/useMealPlan'
import { useMealPlanOptionSelections } from '~/composables/useMealPlanOptionSelections'
import { useMealSubstitutions } from '~/composables/useMealSubstitutions'
import { usePatientMealPlan } from '~/composables/usePatientMealPlan'
import { resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'
import { normalizeMealItemsForSave } from '~/utils/meal-diary'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const route = useRoute()
const router = useRouter()
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
const { queueSyncMealCheck, syncMealCheck, resyncAllCheckedMeals } = useDietaDiarySync()
const {
  fetchPlan,
  uploadPdf,
  uploading: planUploading,
  planRecord,
  planChecked,
  loading: planFetchLoading,
} = usePatientMealPlan()
const { mealList, mealOrder, getMealById, getMealIdForTime, hasPlan } = useMealPlan()
const { getSubstitutionGroupsForMeal, mealHasSubstitutions } = useMealSubstitutions()
const {
  needsOptionSelection,
  mealHasOptionAlternatives,
  optionGroupForMeal,
  optionGroups,
} = useMealPlanOptionSelections()

const { patientFetchInit } = usePatientLocalTime()

const planLoading = ref(!planChecked.value)
const substitutionsOpen = ref(false)
const optionPickerOpen = ref(false)
const optionPickerRequired = ref(false)
const optionPickerFocusSlot = ref('')
const optionPickerTitle = ref('Escolha suas opções')
const optionIntroOpen = ref(false)
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
const activeMealDefinition = computed(() => mealList.value.find(meal => meal.id === activeMeal.value))
const planTitle = computed(() => planRecord.value?.title || planRecord.value?.fileName || 'Plano alimentar')
const substitutionGroups = computed(() => getSubstitutionGroupsForMeal(activeMeal.value))
const hasSubstitutions = computed(() => mealHasSubstitutions(activeMeal.value))
const activeMealHasOptionAlternatives = computed(() => mealHasOptionAlternatives(activeMeal.value))
const hasMealOptionGroups = computed(() => optionGroups.value.length > 0)
const optionSlotsLabel = computed(() =>
  optionGroups.value.map((group) => group.label).filter(Boolean).join(', '),
)
const currentMealPercent = computed(() => mealProgressPercent(activeMeal.value))
const completedMealsCount = computed(() => mealList.value.filter(meal => isMealComplete(meal.id)).length)

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

function setView(nextView) {
  const normalized = nextView === 'week' ? 'week' : 'today'
  view.value = normalized
  router.replace({
    query: {
      ...route.query,
      view: normalized === 'week' ? 'week' : undefined,
    },
  })
}

function openRecipeDetail(recipe) {
  selectedRecipe.value = recipe
  recipeDetailOpen.value = true
}

function toggleItem(index) {
  if (!Number.isInteger(index) || index < 0 || index >= checkedItems.value.length) return
  const next = [...checkedItems.value]
  next[index] = !next[index]
  checkedItems.value = next
  saveChecked(activeMeal.value, next)
  const meal = getMealById(activeMeal.value)
  queueSyncMealCheck(activeMeal.value, meal, next, (summary) => {
    if (summary) dailySummary.value = summary
  })
}

function mealProgressPercent(mealId) {
  const meal = getMealById(mealId)
  if (!meal?.itemLabels?.length) return 0
  const states = mealId === activeMeal.value
    ? checkedItems.value
    : loadChecked(mealId, meal.itemLabels.length)
  return Math.round((countDone(states) / meal.itemLabels.length) * 100)
}

function isMealComplete(mealId) {
  const meal = getMealById(mealId)
  return Boolean(meal?.itemLabels?.length && mealProgressPercent(mealId) === 100)
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

  // Push antigo pode apontar para opção inativa — resolve para a ativa do mesmo slot
  if (typeof queryMeal === 'string' && queryMeal) {
    const group = optionGroupForMeal(queryMeal)
    if (group) {
      const selectedId = group.options.find((meal) => mealOrder.value.includes(meal.id))?.id
      if (selectedId) return selectedId
    }
  }

  return getMealIdForTime() || mealOrder.value[0] || ''
}

function onPlanUploaded() {
  const mealId = resolveActiveMealFromRoute()
  if (mealId) {
    activeMeal.value = mealId
    syncChecked(mealId)
  }
  loadDailySummary()
  openOptionIntroIfNeeded()
}

/** Modalzinho explicativo antes do seletor de opções. */
function openOptionIntroIfNeeded() {
  if (!needsOptionSelection.value) return false
  optionIntroOpen.value = true
  return true
}

function onOptionIntroChoose() {
  optionIntroOpen.value = false
  openOptionPicker({ required: true })
}

function openOptionPicker(options = {}) {
  const { required = false, focusSlotKey = '', title = 'Escolha suas opções' } = options
  optionPickerRequired.value = required
  optionPickerFocusSlot.value = focusSlotKey
  optionPickerTitle.value = title
  optionPickerOpen.value = true
}

function openOptionPickerForActiveMeal() {
  const group = optionGroupForMeal(activeMeal.value)
  if (!group) {
    openAllMealOptions()
    return
  }

  openOptionPicker({
    required: false,
    focusSlotKey: group.slotKey,
    title: `Trocar opção · ${group.label}`,
  })
}

function openAllMealOptions() {
  if (!hasMealOptionGroups.value) return
  openOptionPicker({
    required: needsOptionSelection.value,
    focusSlotKey: '',
    title: 'Escolha suas opções',
  })
}

function onOptionSelectionsSaved() {
  optionIntroOpen.value = false
  optionPickerRequired.value = false
  optionPickerFocusSlot.value = ''

  const mealId = resolveActiveMealFromRoute()
  if (mealId) {
    activeMeal.value = mealId
    syncChecked(mealId)
  } else if (mealOrder.value.length) {
    activeMeal.value = mealOrder.value[0]
    syncChecked(activeMeal.value)
  }
}

async function onReupload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.type && file.type !== 'application/pdf') {
    const { showToast } = useAppToast()
    showToast({ type: 'error', title: 'Arquivo inválido', message: 'Escolha um arquivo PDF.' })
    event.target.value = ''
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    const { showToast } = useAppToast()
    showToast({ type: 'error', title: 'PDF muito grande', message: 'Envie um arquivo de até 15 MB.' })
    event.target.value = ''
    return
  }
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
  setView('today')
}

function takePhotoNow() {
  if (!currentMeal.value) return
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

async function syncAllCheckedMealsIfNeeded() {
  try {
    const summary = await resyncAllCheckedMeals(
      getMealById,
      mealOrder.value,
      loadChecked,
      countDone,
    )
    if (summary) dailySummary.value = summary
    else await loadDailySummary()
  } catch {
    await loadDailySummary()
  }
}

function shouldDeferOptionIntro() {
  return typeof route.query.meal === 'string' && route.query.meal.length > 0
}

function hydrateDietaFromPlan() {
  if (!hasPlan.value) return false

  activeMeal.value = resolveActiveMealFromRoute()
  syncChecked(activeMeal.value)
  if (!shouldDeferOptionIntro()) {
    openOptionIntroIfNeeded()
  }
  return true
}

onMounted(async () => {
  view.value = route.query.view === 'week' ? 'week' : 'today'

  if (planChecked.value) {
    if (hydrateDietaFromPlan()) {
      planLoading.value = false
      void syncAllCheckedMealsIfNeeded()
      return
    }
    planLoading.value = false
    void loadDailySummary()
    return
  }

  try {
    await fetchPlan()
    if (hydrateDietaFromPlan()) {
      void syncAllCheckedMealsIfNeeded()
    } else {
      void loadDailySummary()
    }
  } finally {
    planLoading.value = false
  }
})

watch(planChecked, (checked) => {
  if (!checked || planFetchLoading.value || !planLoading.value) return
  if (hydrateDietaFromPlan()) {
    planLoading.value = false
    void syncAllCheckedMealsIfNeeded()
  } else {
    planLoading.value = false
    void loadDailySummary()
  }
})

onUnmounted(() => {
  substitutionsOpen.value = false
  extraFoodOpen.value = false
  optionPickerOpen.value = false
  optionIntroOpen.value = false
  resetPatientScrollLock()
})

watch(overridesRevision, () => {
  syncChecked(activeMeal.value, { preserveChecked: true })
  const meal = getMealById(activeMeal.value)
  if (!meal || !countDone(checkedItems.value)) return
  queueSyncMealCheck(activeMeal.value, meal, checkedItems.value, (summary) => {
    if (summary) dailySummary.value = summary
  })
})

watch(extrasRevision, () => {
  syncChecked(activeMeal.value, { preserveChecked: true })
})

watch(
  () => route.query.meal,
  () => {
    const mealId = resolveActiveMealFromRoute()
    if (!mealId) return
    activeMeal.value = mealId
    syncChecked(mealId)
  },
)

watch(
  () => route.query.view,
  queryView => {
    view.value = queryView === 'week' ? 'week' : 'today'
  },
)

watch(
  [needsOptionSelection, planLoading],
  ([needs, loading]) => {
    if (loading || optionPickerOpen.value || optionIntroOpen.value) return
    if (shouldDeferOptionIntro()) return
    if (needs) openOptionIntroIfNeeded()
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
  flex-direction: row;
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

<style scoped>
.patient-page.dieta-page {
  min-height: 100%;
  padding: 0 1rem calc(var(--cf-tab-clearance) + 1rem);
  background: #fff;
  color: #20221f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dieta-page :where(button, a, label) {
  -webkit-tap-highlight-color: rgba(121, 138, 112, 0.14);
  touch-action: manipulation;
}

.dieta-page :where(button, a, label):focus-visible {
  outline: 2px solid #65785c;
  outline-offset: 2px;
}

.dieta-diary-bar {
  margin: 0 0 0.875rem !important;
}

.dieta-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin: 0 0 1.25rem;
  padding: 0.1875rem;
  border: 1px solid #e4e6e2;
  border-radius: 0.875rem;
  background: #f5f6f4;
  box-shadow: none;
}

.dieta-tab {
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0.6875rem;
  background: transparent;
  color: #777c75;
  font: 500 0.8125rem/1.2 inherit;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.dieta-tab.active {
  background: #fff;
  color: #272a26;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(22, 28, 20, 0.08);
}

.dieta-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.75rem;
}

.dieta-section-heading--week {
  margin-bottom: 0.875rem;
}

.dieta-section-title {
  margin: 0;
  color: #20221f;
  font-size: 1.0625rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.dieta-section-count {
  flex-shrink: 0;
  padding-bottom: 0.125rem;
  color: #7d837a;
  font-size: 0.71875rem;
  font-weight: 400;
}

.dieta-options-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  margin: 0 0 0.9rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid #d5ddd0;
  border-radius: 1rem;
  background: #f3f7f1;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dieta-options-banner:active {
  transform: scale(0.99);
}

.dieta-options-banner-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  color: #62785a;
}

.dieta-options-banner-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1 1 auto;
}

.dieta-options-banner-copy strong {
  color: #2d352b;
  font-size: 0.8125rem;
  font-weight: 650;
}

.dieta-options-banner-copy span {
  color: #6f756d;
  font-size: 0.71875rem;
  line-height: 1.35;
}

.dieta-options-banner-chevron {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  color: #8a9086;
}

.dieta-meals {
  display: flex;
  gap: 0.5rem;
  margin: 0 -1rem 1rem;
  padding: 0 1rem 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.dieta-meals::-webkit-scrollbar {
  display: none;
}

.dieta-meal-btn {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  min-height: 2.75rem;
  min-width: auto;
  padding: 0.375rem 0.6875rem 0.375rem 0.375rem;
  border: 1px solid #e4e6e2;
  border-radius: 0.875rem;
  background: #fff;
  box-shadow: none;
  color: #72776f;
  font: 400 0.75rem/1.15 inherit;
  scroll-snap-align: start;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.dieta-meal-btn.active {
  border-color: #9aa891;
  background: #f5f7f3;
  color: #3f493a;
}

.dieta-meal-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.6875rem;
  background: #f1f3ef;
  color: #7f8d76;
}

.dieta-meal-btn.active .dieta-meal-icon-wrap {
  background: #e7ece3;
  color: #687a5f;
}

.dieta-meal-icon {
  width: 1rem;
  height: 1rem;
}

.dieta-meal-short {
  max-width: 6.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dieta-meal-complete {
  width: 0.875rem;
  height: 0.875rem;
  color: #6f8d65;
}

.dieta-card {
  overflow: hidden;
  margin: 0;
  border: 1px solid #dfe2dd;
  border-radius: 1.125rem;
  background: #fff;
}

.dieta-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
}

.dieta-card-heading {
  display: flex;
  align-items: center;
  gap: 0.6875rem;
  min-width: 0;
}

.dieta-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: 0.8125rem;
  background: #f0f3ed;
  color: #74836c;
}

.dieta-card-icon :deep(svg) {
  width: 1.1875rem;
  height: 1.1875rem;
}

.dieta-meal-label {
  display: block;
  margin: 0;
  color: #20221f;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.25;
}

.dieta-meal-meta {
  display: block;
  margin: 0.1875rem 0 0;
  color: #858a82;
  font-size: 0.71875rem;
  font-weight: 400;
  line-height: 1.3;
}

.dieta-card-percent {
  color: #4f5c49;
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.dieta-progress-track,
.dieta-week-track {
  height: 0.25rem;
  overflow: hidden;
  background: #eceeeb;
}

.dieta-progress-track {
  margin: 0 1rem;
  border-radius: 999px;
}

.dieta-progress-track > span,
.dieta-week-track > span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #839678;
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dieta-progress {
  margin: 0.4375rem 1rem 0.5rem;
  color: #778173;
  font-size: 0.6875rem;
  font-weight: 400;
}

.dieta-checklist {
  display: block;
  margin: 0;
  padding: 0 1rem;
  list-style: none;
}

.dieta-checklist li {
  display: flex;
  align-items: center;
  gap: 0.6875rem;
  min-height: 3.5rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid #eceeeb;
  color: #343733;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.4;
}

.dieta-check-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: -0.375rem;
  padding: 0.375rem;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.dieta-item-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}

.dieta-recipe-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: underline;
  text-decoration-color: #bdc6b8;
  text-underline-offset: 0.1875rem;
  cursor: pointer;
}

.dieta-item-done {
  color: #9a9e98;
  text-decoration: line-through;
  text-decoration-color: #b9bdb7;
}

.dieta-item-substituted {
  color: #5f7556;
}

.dieta-item-extra {
  color: #806c64;
}

.dieta-item-swap-tag,
.dieta-item-extra-tag {
  width: fit-content;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
  background: #eef3eb;
  color: #687b60;
  font-size: 0.625rem;
  font-weight: 500;
}

.dieta-item-extra-tag {
  background: #f6f0ed;
  color: #8a7067;
}

.dieta-item-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: -0.375rem;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #9b8178;
  cursor: pointer;
}

.dieta-tools {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.875rem 1rem 1rem;
}

.dieta-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3125rem;
  min-height: 2.75rem;
  padding: 0.4375rem;
  border: 1px solid #e2e5e0;
  border-radius: 0.75rem;
  background: #fff;
  color: #60665e;
  font: 400 0.6875rem/1.2 inherit;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.dieta-tool-btn :deep(svg) {
  width: 0.875rem;
  height: 0.875rem;
  flex: 0 0 auto;
  color: #7e8b76;
}

.dieta-register {
  padding: 0.875rem 1rem 1rem;
  border-top: 1px solid #e8eae6;
  background: #f8f9f7;
}

.dieta-register-copy p {
  margin: 0;
  color: #2b2e2a;
  font-size: 0.8125rem;
  font-weight: 500;
}

.dieta-register-copy span {
  display: block;
  margin-top: 0.125rem;
  color: #888d85;
  font-size: 0.6875rem;
  font-weight: 400;
}

.dieta-actions {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.dieta-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font: 500 0.75rem/1.2 inherit;
  text-decoration: none;
  cursor: pointer;
}

.dieta-action-btn--primary {
  border: 1px solid #798a70;
  background: #798a70;
  color: #fff;
}

.dieta-action-btn--outline {
  border: 1px solid #dfe2dd;
  background: #fff;
  color: #555b53;
}

.dieta-action-icon {
  width: 0.9375rem;
  height: 0.9375rem;
}

.dieta-plan-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 3rem;
  margin: 0;
  padding: 0 1rem;
  border: 0;
  border-top: 1px solid #e8eae6;
  background: #fff;
  color: #687264;
  font: 400 0.75rem/1.2 inherit;
  text-align: left;
  cursor: pointer;
}

.dieta-plan-link :deep(svg) {
  width: 0.9375rem;
  height: 0.9375rem;
}

.dieta-week-card {
  overflow: hidden;
  margin-bottom: 0.625rem;
  padding: 0;
  border: 1px solid #e0e3de;
  border-radius: 1rem;
  background: #fff;
}

.dieta-week-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 4.5rem;
  margin: 0;
  padding: 0.75rem;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.dieta-week-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.8125rem;
  background: #f0f3ed;
  color: #75846d;
}

.dieta-week-icon :deep(svg) {
  width: 1.125rem;
  height: 1.125rem;
}

.dieta-week-info {
  min-width: 0;
}

.dieta-week-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.dieta-week-title {
  margin: 0;
  overflow: hidden;
  color: #282b27;
  font-size: 0.875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dieta-week-title-row > span,
.dieta-week-progress {
  color: #8b9089;
  font-size: 0.6875rem;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.dieta-week-progress {
  margin: 0.1875rem 0 0;
}

.dieta-week-chevron {
  width: 1rem;
  height: 1rem;
  color: #a0a49e;
}

.dieta-week-track {
  height: 0.1875rem;
  border-radius: 0;
}

.dieta-plan-footer {
  margin-top: 1rem;
  padding: 0.75rem 0.25rem 0.5rem;
  border-top: 1px solid #eceeeb;
}

.dieta-plan-source {
  overflow: hidden;
  color: #949891;
  font-size: 0.6875rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dieta-plan-reupload {
  min-height: 2.75rem;
  padding: 0 0.5rem;
  border-radius: 0.625rem;
  color: #6d7b66;
  font-size: 0.71875rem;
  font-weight: 500;
}

@media (max-width: 360px) {
  .dieta-tools {
    grid-template-columns: 1fr;
  }

  .dieta-tool-btn {
    justify-content: flex-start;
    padding-inline: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dieta-tab,
  .dieta-meal-btn,
  .dieta-progress-track > span,
  .dieta-week-track > span {
    transition: none;
  }
}
</style>
