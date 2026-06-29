<template>
  <Teleport to="body">
    <Transition name="meal-sheet-fade">
      <button
        v-if="open"
        type="button"
        class="meal-sheet-backdrop"
        :style="backdropStyle"
        aria-label="Fechar confirmação do prato"
        @click="emit('cancel')"
      />
    </Transition>

    <Transition name="meal-sheet-slide" @after-enter="onSheetEnter">
      <section
        v-if="open"
        ref="sheetRef"
        class="meal-sheet"
        :class="{
          'meal-sheet--dragging': isDragging,
          'meal-sheet--animating': isAnimatingClose,
          'meal-sheet--keyboard': keyboardOpen,
        }"
        :style="sheetLayoutStyle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-sheet-title"
      >
        <div
          class="meal-sheet-drag-zone"
          aria-label="Arrastar para fechar"
          @pointerdown="onDragStart"
        >
          <div class="meal-sheet-handle" aria-hidden="true" />
        </div>

        <div ref="sheetBodyRef" class="meal-sheet-body" @focusin="onSheetFocusIn">
          <header class="bite-header">
            <div class="bite-header-meta">
              <span class="bite-header-time">{{ timeLabel }}</span>
              <span class="bite-header-meal">{{ draft?.mealLabel || 'Refeição' }}</span>
            </div>
            <button type="button" class="bite-header-close" aria-label="Fechar" @click="emit('cancel')">
              <X class="bite-header-close-icon" />
            </button>
          </header>

          <div class="bite-title-block">
            <h2 id="meal-sheet-title" class="bite-title">
              <span v-if="!mealTitleNames.length">Refeição identificada</span>
              <template v-else-if="mealTitleNames.length === 1">{{ mealTitlePrimary }}</template>
              <template v-else-if="mealTitleNames.length === 2">
                {{ mealTitlePrimary }} & {{ mealTitleSecondary }}
              </template>
              <template v-else>
                <span>{{ mealTitlePrimary }}</span>
                <button
                  v-if="!titleExpanded"
                  type="button"
                  class="bite-title-more"
                  :aria-expanded="false"
                  aria-label="Ver mais ingredientes"
                  @click="titleExpanded = true"
                >
                  +{{ mealTitleExtraCount }}
                </button>
                <button
                  v-else
                  type="button"
                  class="bite-title-more bite-title-more--less"
                  :aria-expanded="true"
                  aria-label="Ocultar ingredientes"
                  @click="titleExpanded = false"
                >
                  −
                </button>
              </template>
            </h2>
            <p v-if="titleExpanded && mealTitleExtraCount" class="bite-title-rest">
              {{ mealTitleRestText }}
            </p>
          </div>

          <div v-if="draft?.imageUrl" class="bite-photo">
            <img :src="draft.imageUrl" alt="Foto do prato" />
          </div>

          <div class="bite-serving field--float">
            <label for="meal-servings">Porção(ões)</label>
            <input
              id="meal-servings"
              v-model.number="servings"
              class="bite-serving-input"
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              inputmode="decimal"
              @change="applyServings"
            />
          </div>

          <div class="bite-section-head">
            <span class="bite-section-label">
              Ingredientes detectados pela IA
              <Info class="bite-section-info" aria-hidden="true" />
            </span>
          </div>

          <div v-if="uncountedItems.length" class="bite-alert" role="alert">
            <AlertTriangle class="bite-alert-icon" aria-hidden="true" />
            <p>
              {{ uncountedNames }} usa{{ uncountedItems.length > 1 ? 'm' : '' }} estimativa da IA.
              Toque no lápis para buscar na base.
            </p>
          </div>

          <ul class="bite-ingredients">
            <li
              v-for="(item, index) in items"
              :key="item.id || index"
              class="bite-ingredient"
              :class="{ 'bite-ingredient--expanded': editingIndex === index }"
            >
              <div class="bite-ingredient-row">
                <button
                  type="button"
                  class="bite-ingredient-edit-btn"
                  :aria-expanded="editingIndex === index"
                  :aria-label="`Editar ${item.name || 'ingrediente'}`"
                  @click="toggleEdit(index)"
                >
                  <Pencil class="bite-ingredient-edit-icon" />
                </button>

                <button
                  type="button"
                  class="bite-ingredient-name"
                  @click="toggleEdit(index)"
                >
                  {{ item.name || 'Sem nome' }}
                </button>

                <label class="bite-ingredient-grams">
                  <input
                    :value="item.grams"
                    type="number"
                    min="1"
                    max="2000"
                    inputmode="numeric"
                    aria-label="Gramas"
                    @input="updateGrams(index, $event.target.value)"
                  />
                  <span>g</span>
                </label>
              </div>

              <div v-if="editingIndex === index" class="bite-ingredient-panel">
                <div class="bite-panel-field field--float">
                  <label :for="`meal-food-${index}`">Alimento</label>
                  <BellaFoodSearchPicker
                    :model-value="item.name"
                    placeholder="Buscar na base"
                    @update:model-value="updateName(index, $event)"
                    @select="selectFood(index, $event)"
                    @blur-commit="commitName(index, $event)"
                  />
                </div>

                <p v-if="item.originalName && item.name !== item.originalName" class="bite-panel-hint">
                  IA sugeriu: {{ item.originalName }}
                </p>

                <p v-if="isItemCounted(item)" class="bite-panel-tag bite-panel-tag--ok">
                  Base de alimentos
                </p>
                <p v-else class="bite-panel-tag bite-panel-tag--warn">
                  Estimativa da IA
                </p>

                <div class="bite-panel-mode" role="group" aria-label="Tipo de porção">
                  <button
                    type="button"
                    class="bite-panel-mode-btn"
                    :class="{ 'bite-panel-mode-btn--active': portionState[index]?.portionMode === 'grams' }"
                    @click="setPortionMode(index, 'grams')"
                  >
                    Gramas
                  </button>
                  <button
                    type="button"
                    class="bite-panel-mode-btn"
                    :class="{ 'bite-panel-mode-btn--active': portionState[index]?.portionMode === 'measure' }"
                    @click="setPortionMode(index, 'measure')"
                  >
                    Medida caseira
                  </button>
                </div>

                <div v-if="portionState[index]?.portionMode === 'measure'" class="bite-panel-measure">
                  <div class="bite-panel-field bite-panel-field--half field--float">
                    <label :for="`meal-measure-${index}`">Medida</label>
                    <SharedCfSelect
                      :id="`meal-measure-${index}`"
                      :model-value="portionState[index]?.portionMeasure || 'unidade'"
                      :options="portionMeasureOptions"
                      @update:model-value="updateMeasure(index, $event)"
                    />
                  </div>
                  <div class="bite-panel-field bite-panel-field--half field--float">
                    <label :for="`meal-qty-${index}`">Qtd.</label>
                    <input
                      :id="`meal-qty-${index}`"
                      :value="portionState[index]?.portionAmount ?? 1"
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.1"
                      inputmode="decimal"
                      @input="updateMeasureAmount(index, $event.target.value)"
                    />
                  </div>
                </div>

                <p class="bite-panel-macros">
                  {{ item.caloriesKcal }} kcal · C {{ item.carbsG }} g · P {{ item.proteinG }} g · G {{ item.fatG }} g
                </p>

                <button type="button" class="bite-panel-remove" @click="removeItem(index)">
                  Remover ingrediente
                </button>
              </div>
            </li>
          </ul>

          <button type="button" class="bite-add" @click="addItem">
            <Plus class="bite-add-icon" aria-hidden="true" />
            Adicionar ingrediente
          </button>

          <div class="bite-totals">
            <p class="bite-totals-main">
              <strong>{{ mealTotals.caloriesKcal }} kcal</strong>
              nesta refeição
            </p>
            <p class="bite-totals-macros">
              C {{ mealTotals.carbsG }} g · P {{ mealTotals.proteinG }} g · G {{ mealTotals.fatG }} g
            </p>
            <p v-if="dailySummary" class="bite-totals-day">
              {{ isEditing ? 'Após salvar' : 'Após confirmar' }}: {{ projectedCalories }} / {{ dailySummary.targets.caloriesKcal }} kcal no dia
            </p>
          </div>

          <p v-if="localError" class="bite-error">{{ localError }}</p>
          <p v-if="error" class="bite-error">{{ error }}</p>
        </div>

        <footer class="bite-footer">
          <button
            type="button"
            class="bite-confirm"
            :disabled="saving || !items.length"
            @click="confirm"
          >
            {{ saving ? 'Salvando…' : (isEditing ? 'Salvar alterações' : 'Confirmar') }}
            <ChevronRight class="bite-confirm-icon" aria-hidden="true" />
          </button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, ChevronRight, Info, Pencil, Plus, X } from 'lucide-vue-next'
import { lockPatientScroll, unlockPatientScroll, resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'
import {
  applyFoodMatch,
  createMealItem,
  isItemCounted,
  normalizeItemFromAi,
  normalizeMealItemsForSave,
  scaleMealItem,
  sumMealItems,
} from '~/utils/meal-diary'
import {
  PORTION_MEASURES,
  amountToGrams,
  createPortionState,
  guessGramsPerUnit,
} from '~/utils/meal-portion-measures'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  dailySummary: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const portionMeasureOptions = PORTION_MEASURES.map((measure) => ({
  value: measure.id,
  label: measure.label,
}))

const items = ref([])
const portionState = ref([])
const baseGrams = ref([])
const localError = ref('')
const foodCache = ref(new Map())
const editingIndex = ref(-1)
const titleExpanded = ref(false)
const servings = ref(1)
const { matchFoodByName, getFoodById } = useFoodBank()

const sheetRef = ref(null)
const sheetBodyRef = ref(null)
const dragOffset = ref(0)
const isDragging = ref(false)
const isAnimatingClose = ref(false)
const sheetEntered = ref(false)
const keyboardInset = ref(0)
const visibleViewportHeight = ref(0)

let dragStartY = 0
let activePointerId = null
let viewportCleanup = null

const keyboardOpen = computed(() => keyboardInset.value > 72)

const sheetLayoutStyle = computed(() => {
  const style = {}

  if (keyboardOpen.value && visibleViewportHeight.value > 0) {
    style.maxHeight = `${Math.max(260, visibleViewportHeight.value - 8)}px`
    style.bottom = `${keyboardInset.value}px`
  }

  if (dragOffset.value > 0) {
    style.transform = `translateY(${dragOffset.value}px)`
  }

  return style
})

const backdropStyle = computed(() => {
  if (dragOffset.value <= 0) return {}
  const sheetHeight = sheetRef.value?.offsetHeight || 420
  const progress = Math.min(1, dragOffset.value / (sheetHeight * 0.55))
  return { opacity: String(Math.max(0, 0.42 * (1 - progress))) }
})

const mealTotals = computed(() => sumMealItems(items.value))

const isEditing = computed(() => Boolean(props.draft?.editingEntryId))

const uncountedItems = computed(() => items.value.filter((item) => !isItemCounted(item)))

const uncountedNames = computed(() => {
  const names = uncountedItems.value.map((item) => item.name).filter(Boolean)
  if (names.length <= 2) return names.join(' e ')
  return `${names.slice(0, 2).join(', ')} e mais ${names.length - 2}`
})

const projectedCalories = computed(() => {
  if (!props.dailySummary) return mealTotals.value.caloriesKcal
  const consumed = Number(props.dailySummary.consumed.caloriesKcal) || 0
  const previous = props.draft?.previousTotals?.caloriesKcal
  if (isEditing.value && previous != null) {
    return Math.max(0, consumed - Number(previous) + mealTotals.value.caloriesKcal)
  }
  return consumed + mealTotals.value.caloriesKcal
})

const timeLabel = computed(() => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `Hoje, ${hours}:${minutes}`
})

const mealTitleNames = computed(() =>
  items.value.map((item) => String(item.name || '').trim()).filter(Boolean),
)

const mealTitlePrimary = computed(() => {
  const primary = mealTitleNames.value[0] || ''
  if (!primary) return 'Refeição identificada'
  return primary.length > 42 ? `${primary.slice(0, 39).trim()}…` : primary
})

const mealTitleSecondary = computed(() => {
  const secondary = mealTitleNames.value[1] || ''
  if (!secondary) return ''
  return secondary.length > 28 ? `${secondary.slice(0, 25).trim()}…` : secondary
})

const mealTitleExtraCount = computed(() => {
  const count = mealTitleNames.value.length
  return count > 2 ? count - 1 : 0
})

const mealTitleRestText = computed(() => mealTitleNames.value.slice(1).join(', '))

watch(
  () => props.open,
  (open) => {
    if (open) titleExpanded.value = false
  },
)

watch(mealTitleExtraCount, () => {
  titleExpanded.value = false
})

function toggleEdit(index) {
  editingIndex.value = editingIndex.value === index ? -1 : index
}

function syncPortionState(index, item, overrides = {}) {
  const current = portionState.value[index] || {}
  portionState.value[index] = {
    ...createPortionState(item, { ...current, ...overrides }),
    ...overrides,
  }
}

async function hydrateItemsFromDraft(draft) {
  const rawItems = draft?.items || []
  const hydrated = []
  const states = []
  const gramsBase = []
  editingIndex.value = -1
  servings.value = 1

  for (const item of rawItems) {
    const matched = item.name ? await matchFoodByName(item.name) : null
    if (matched) foodCache.value.set(matched.id, matched)
    const normalized = normalizeItemFromAi(item, matched)
    hydrated.push(normalized)
    states.push(createPortionState(normalized))
    gramsBase.push(normalized.grams)
  }

  items.value = hydrated
  portionState.value = states
  baseGrams.value = gramsBase
}

async function applyServings() {
  const factor = Math.max(0.5, Number(servings.value) || 1)
  servings.value = factor

  for (let index = 0; index < items.value.length; index += 1) {
    const base = baseGrams.value[index] ?? items.value[index]?.grams ?? 0
    await applyGramsChange(index, Math.max(1, Math.round(base * factor)))
  }
}

watch(
  () => props.draft,
  async (draft) => {
    localError.value = ''
    await hydrateItemsFromDraft(draft)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      lockPatientScroll()
      sheetEntered.value = false
      resetDragState()
      bindViewportSync()
      return
    }
    unbindViewportSync()
    unlockPatientScroll()
    window.setTimeout(resetDragState, 320)
  },
)

function getKeyboardInset() {
  if (!import.meta.client) return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
}

function syncSheetViewport() {
  if (!import.meta.client) return
  const vv = window.visualViewport
  if (!vv) return

  const inset = getKeyboardInset()
  keyboardInset.value = inset
  visibleViewportHeight.value = vv.height

  const root = document.documentElement
  const open = inset > 72
  root.classList.toggle('meal-sheet-keyboard', open)
}

function bindViewportSync() {
  unbindViewportSync()
  syncSheetViewport()

  const vv = window.visualViewport
  if (!vv) return

  const onChange = () => syncSheetViewport()
  vv.addEventListener('resize', onChange, { passive: true })
  vv.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('orientationchange', onChange, { passive: true })

  viewportCleanup = () => {
    vv.removeEventListener('resize', onChange)
    vv.removeEventListener('scroll', onChange)
    window.removeEventListener('orientationchange', onChange)
  }
}

function unbindViewportSync() {
  viewportCleanup?.()
  viewportCleanup = null
  keyboardInset.value = 0
  visibleViewportHeight.value = 0
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('meal-sheet-keyboard')
  }
}

function onSheetFocusIn(event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.matches('input, select, textarea')) return

  window.setTimeout(() => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, keyboardOpen.value ? 80 : 280)
}

function updateName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  items.value[index] = { ...current, name: rawValue }
}

function selectFood(index, food) {
  const current = items.value[index]
  if (!current || !food) return
  foodCache.value.set(food.id, food)
  items.value[index] = applyFoodMatch(current, food.name, food)
  syncPortionState(index, items.value[index])
  baseGrams.value[index] = items.value[index].grams
}

async function commitName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  if (current.foodId && current.name === rawValue?.trim()) return
  const matched = rawValue?.trim() ? await matchFoodByName(rawValue) : null
  if (matched) foodCache.value.set(matched.id, matched)
  items.value[index] = applyFoodMatch(current, rawValue, matched)
  syncPortionState(index, items.value[index])
  baseGrams.value[index] = items.value[index].grams
}

async function applyGramsChange(index, grams) {
  const current = items.value[index]
  if (!current) return
  const matched = current.foodId
    ? foodCache.value.get(current.foodId) || await getFoodById(current.foodId)
    : null
  if (matched) foodCache.value.set(matched.id, matched)
  items.value[index] = scaleMealItem(current, grams, matched)
  syncPortionState(index, items.value[index])
  baseGrams.value[index] = items.value[index].grams
}

async function updateGrams(index, rawValue) {
  await applyGramsChange(index, rawValue)
  baseGrams.value[index] = Number(rawValue) || items.value[index]?.grams || 0
  servings.value = 1
}

function setPortionMode(index, mode) {
  const item = items.value[index]
  if (!item) return
  const state = portionState.value[index] || createPortionState(item)
  portionState.value[index] = { ...state, portionMode: mode }
  if (mode === 'measure') {
    const grams = amountToGrams(state.portionAmount || 1, state.portionMeasure, item.name)
    applyGramsChange(index, grams)
  }
}

function updateMeasure(index, measureId) {
  const item = items.value[index]
  if (!item) return
  const state = portionState.value[index] || createPortionState(item)
  const gramsPerUnit = guessGramsPerUnit(item.name, measureId)
  portionState.value[index] = {
    ...state,
    portionMeasure: measureId,
    gramsPerUnit,
    portionMode: 'measure',
  }
  applyGramsChange(index, amountToGrams(state.portionAmount || 1, measureId, item.name))
}

function updateMeasureAmount(index, rawValue) {
  const item = items.value[index]
  if (!item) return
  const state = portionState.value[index] || createPortionState(item)
  const amount = Math.max(0.1, Number(rawValue) || 1)
  portionState.value[index] = { ...state, portionAmount: amount, portionMode: 'measure' }
  applyGramsChange(index, amountToGrams(amount, state.portionMeasure, item.name))
}

function removeItem(index) {
  items.value = items.value.filter((_, i) => i !== index)
  portionState.value = portionState.value.filter((_, i) => i !== index)
  baseGrams.value = baseGrams.value.filter((_, i) => i !== index)
  if (editingIndex.value === index) editingIndex.value = -1
}

function addItem() {
  const item = createMealItem()
  items.value.push(item)
  portionState.value.push(createPortionState(item))
  baseGrams.value.push(item.grams)
  editingIndex.value = items.value.length - 1
}

async function confirm() {
  localError.value = ''
  const prepared = []
  for (const item of items.value) {
    let matched = null
    if (item.foodId) {
      matched = foodCache.value.get(item.foodId) || await getFoodById(item.foodId)
    }
    if (!matched && item.name) {
      matched = await matchFoodByName(item.name)
    }
    if (matched) foodCache.value.set(matched.id, matched)
    prepared.push(applyFoodMatch(item, item.name, matched))
  }
  const normalized = normalizeMealItemsForSave(prepared)

  if (!normalized.length) {
    localError.value = 'Adicione pelo menos um ingrediente.'
    return
  }

  if (normalized.some((item) => !item.name)) {
    localError.value = 'Preencha o nome de todos os ingredientes.'
    return
  }

  emit('confirm', normalized)
}

function resetDragState() {
  dragOffset.value = 0
  isDragging.value = false
  isAnimatingClose.value = false
  activePointerId = null
  removeDragListeners()
}

function onSheetEnter() {
  sheetEntered.value = true
}

function getCloseThreshold() {
  const height = sheetRef.value?.offsetHeight || 420
  return Math.min(140, Math.max(72, height * 0.18))
}

function onDragStart(event) {
  if (isAnimatingClose.value || !sheetEntered.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  activePointerId = event.pointerId
  isDragging.value = true
  dragStartY = event.clientY
  dragOffset.value = 0

  event.currentTarget.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(event) {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  const delta = event.clientY - dragStartY
  if (delta > 0) event.preventDefault()
  dragOffset.value = Math.max(0, delta)
}

function onDragEnd(event) {
  if (!isDragging.value || event.pointerId !== activePointerId) return

  isDragging.value = false
  removeDragListeners()

  if (dragOffset.value >= getCloseThreshold()) {
    finishDragClose()
    return
  }

  isAnimatingClose.value = true
  dragOffset.value = 0
  window.setTimeout(() => {
    isAnimatingClose.value = false
  }, 280)
}

async function finishDragClose() {
  isAnimatingClose.value = true
  isDragging.value = false

  const height = sheetRef.value?.offsetHeight || 420
  dragOffset.value = height + 48

  await new Promise((resolve) => window.setTimeout(resolve, 260))
  emit('cancel')
}

function removeDragListeners() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('cancel')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  removeDragListeners()
  unbindViewportSync()
  resetPatientScrollLock()
})
</script>

<style scoped>
.meal-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(20, 20, 20, 0.38);
  cursor: pointer;
}

.meal-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 130;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: min(92dvh, 760px);
  overflow: hidden;
  padding: 0 1.15rem;
  border-radius: 1.35rem 1.35rem 0 0;
  background: #fff;
  box-sizing: border-box;
  will-change: transform, max-height, bottom;
  transition: max-height 0.2s ease, bottom 0.2s ease;
}

.meal-sheet--dragging,
.meal-sheet--keyboard {
  transition: none;
}

.meal-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 0.5rem;
}

.meal-sheet-body::-webkit-scrollbar {
  display: none;
}

.meal-sheet--animating:not(.meal-sheet--dragging) {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.meal-sheet-drag-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.5rem;
  margin: 0.55rem 0 0.65rem;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.meal-sheet-handle {
  width: 2.35rem;
  height: 0.22rem;
  border-radius: 999px;
  background: #e8e8e8;
}

.bite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.bite-header-meta {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.bite-header-time {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text);
}

.bite-header-meal {
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--cf-green) 22%, var(--cf-border));
  background: var(--cf-green-soft);
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--cf-green-dark);
  white-space: nowrap;
}

.bite-header-close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: #f3f3f3;
  color: #666;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.bite-header-close-icon {
  width: 1rem;
  height: 1rem;
}

.bite-title-block {
  margin-bottom: 0.55rem;
}

.bite-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text, #1a1a1a);
}

.bite-title-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.85rem;
  padding: 0.14rem 0.5rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green-soft, #edf2e8);
  color: var(--cf-green-dark, #5c6652);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.bite-title-more:hover {
  background: color-mix(in srgb, var(--cf-green, #8b967c) 18%, #fff);
}

.bite-title-more:active {
  transform: scale(0.96);
}

.bite-title-more--less {
  min-width: 1.55rem;
  padding-inline: 0.4rem;
}

.bite-title-rest {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  font-weight: 500;
  color: #555;
}

.bite-photo {
  width: 100%;
  height: 7.25rem;
  max-height: 7.25rem;
  margin-bottom: 0.75rem;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eee;
  background: #f3f3f3;
}

.bite-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.bite-serving.field--float {
  position: relative;
  margin-top: 0.35rem;
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #f0f0f0;
}

.bite-serving-input {
  width: 100%;
  padding: 0.85rem 0.9rem;
  padding-top: 0.95rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control, 14px);
  background: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  text-align: left;
  color: var(--cf-green-dark);
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.bite-serving-input:focus {
  outline: none;
  border-color: var(--cf-green);
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.12);
}

.bite-section-head {
  margin-bottom: 0.55rem;
}

.bite-section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #666;
}

.bite-section-info {
  width: 0.85rem;
  height: 0.85rem;
}

.bite-alert {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
  margin-bottom: 0.65rem;
  padding: 0.6rem 0.65rem;
  border-radius: 10px;
  background: #fff8f0;
  border: 1px solid #fde6c8;
}

.bite-alert-icon {
  width: 0.95rem;
  height: 0.95rem;
  color: #c4842e;
  flex-shrink: 0;
  margin-top: 0.05rem;
}

.bite-alert p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: #8a5a12;
}

.bite-ingredients {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bite-ingredient {
  border-bottom: 1px solid #f2f2f2;
}

.bite-ingredient-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 3.1rem;
}

.bite-ingredient--expanded .bite-ingredient-edit-btn {
  color: var(--cf-green);
}

.bite-ingredient--expanded .bite-ingredient-name {
  color: var(--cf-green-dark);
}

.bite-ingredient-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #bbb;
  cursor: pointer;
}

.bite-ingredient-edit-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.bite-ingredient-name {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--cf-text);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bite-ingredient-grams {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.bite-ingredient-grams input {
  width: 3.1rem;
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  text-align: right;
  color: var(--cf-green-dark);
}

.bite-ingredient-grams input:focus {
  outline: none;
  border-color: var(--cf-green);
}

.bite-ingredient-grams span {
  font-size: 0.78rem;
  font-weight: 600;
  color: #999;
}

.bite-ingredient-panel {
  padding: 0 0 0.85rem 2.3rem;
}

.bite-panel-field {
  min-width: 0;
}

.bite-panel-field--half {
  flex: 1;
}

.bite-panel-field.field--float,
.bite-serving.field--float {
  position: relative;
}

.bite-panel-field.field--float {
  margin-top: 0.35rem;
  margin-bottom: 0.65rem;
}

.bite-panel-field.field--float > label,
.bite-serving.field--float > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  color: #555;
  pointer-events: none;
}

.bite-panel-field.field--float input[type='number'],
.bite-panel-field.field--float input[type='text'] {
  width: 100%;
  padding: 0.85rem 0.9rem;
  padding-top: 0.95rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control, 14px);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--cf-text, #1a1a1a);
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.bite-panel-field.field--float input:focus {
  outline: none;
  border-color: var(--cf-green, #8b967c);
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.12);
}

.bite-panel-field.field--float :deep(.cf-select) {
  width: 100%;
}

.bite-panel-field.field--float :deep(.cf-select-trigger) {
  min-height: 2.85rem;
  padding-top: 0.95rem;
  border-radius: var(--cf-radius-control, 14px);
  border-color: #e8ece9;
  font-size: 0.88rem;
}

.bite-panel-field.field--float :deep(.cf-select-trigger:focus-visible),
.bite-panel-field.field--float :deep(.cf-select--open .cf-select-trigger) {
  border-color: var(--cf-green, #8b967c);
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.12);
}

.bite-panel-field.field--float :deep(.food-picker-input-wrap) {
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control, 14px);
  min-height: 2.85rem;
  align-items: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.bite-panel-field.field--float :deep(.food-picker-input) {
  padding: 0.95rem 0.55rem 0.75rem 0.9rem;
}

.bite-panel-field.field--float :deep(.food-picker-input-wrap:focus-within),
.bite-panel-field.field--float :deep(.food-picker--open .food-picker-input-wrap) {
  border-color: var(--cf-green, #8b967c);
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.12);
}

.bite-panel-measure {
  display: flex;
  gap: 0.55rem;
  margin-bottom: 0.45rem;
  align-items: flex-start;
}

.bite-panel-measure .bite-panel-field.field--float {
  margin-bottom: 0;
}

.bite-panel-hint {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  color: #888;
}

.bite-panel-tag {
  margin: 0 0 0.45rem;
  font-size: 0.66rem;
  font-weight: 700;
}

.bite-panel-tag--ok {
  color: var(--cf-green-dark);
}

.bite-panel-tag--warn {
  color: #c4842e;
}

.bite-panel-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
  padding: 0.18rem;
  border-radius: 10px;
  background: var(--cf-green-soft);
}

.bite-panel-mode-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  min-height: 1.9rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.bite-panel-mode-btn--active {
  background: #fff;
  color: var(--cf-green-dark);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.bite-panel-macros {
  margin: 0 0 0.45rem;
  font-size: 0.68rem;
  color: #888;
}

.bite-panel-remove {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;
}

.bite-add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
  padding: 0.55rem 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-green-dark);
  cursor: pointer;
}

.bite-add-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.bite-totals {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid #f0f0f0;
}

.bite-totals-main {
  margin: 0;
  font-size: 0.88rem;
  color: var(--cf-text);
}

.bite-totals-main strong {
  font-size: 1rem;
  color: var(--cf-green-dark);
}

.bite-totals-macros,
.bite-totals-day {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: #888;
}

.bite-error {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: #dc2626;
}

.bite-footer {
  flex-shrink: 0;
  padding: 0.65rem 0 calc(0.75rem + env(safe-area-inset-bottom, 0px));
  background: #fff;
}

.bite-confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  min-height: 3rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green);
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
}

.bite-confirm:active:not(:disabled) {
  background: var(--cf-green-dark);
}

.bite-confirm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bite-confirm-icon {
  width: 1rem;
  height: 1rem;
}

.meal-sheet-fade-enter-active,
.meal-sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}

.meal-sheet-fade-enter-from,
.meal-sheet-fade-leave-to {
  opacity: 0;
}

.meal-sheet-slide-enter-active,
.meal-sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease;
}

.meal-sheet-slide-enter-from,
.meal-sheet-slide-leave-to {
  transform: translateY(100%);
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .meal-sheet-fade-enter-active,
  .meal-sheet-fade-leave-active,
  .meal-sheet-slide-enter-active,
  .meal-sheet-slide-leave-active,
  .meal-sheet--animating {
    transition: none !important;
  }
}
</style>
