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
        <header class="meal-sheet-head">
          <div class="meal-sheet-hero" aria-hidden="true">
            <Camera class="meal-sheet-hero-icon" />
          </div>
          <div class="meal-sheet-copy">
            <h2 id="meal-sheet-title" class="meal-sheet-title">Confirme os itens</h2>
            <p class="meal-sheet-subtitle">
              Ajuste nome e porção. Troque gramas por medidas caseiras quando fizer sentido.
            </p>
          </div>
          <button type="button" class="meal-sheet-close" aria-label="Fechar" @click="emit('cancel')">
            <X class="meal-sheet-close-icon" />
          </button>
        </header>

        <div v-if="draft?.imageUrl" class="meal-sheet-photo cf-squircle cf-squircle--attach">
          <img :src="draft.imageUrl" alt="Foto do prato" />
        </div>

        <p v-if="draft?.mealLabel" class="meal-sheet-meal">{{ draft.mealLabel }}</p>

        <div v-if="uncountedItems.length" class="meal-sheet-alert" role="alert">
          <AlertTriangle class="meal-sheet-alert-icon" aria-hidden="true" />
          <div>
            <p class="meal-sheet-alert-title">Alguns itens usam estimativa da IA</p>
            <p class="meal-sheet-alert-text">
              {{ uncountedNames }} entra{{ uncountedItems.length > 1 ? 'm' : '' }} no diário com valores estimados.
              Para maior precisão, busque o alimento na base. Receitas: cadastre ingrediente por ingrediente.
            </p>
          </div>
        </div>

        <ul class="meal-sheet-list">
          <li
            v-for="(item, index) in items"
            :key="item.id || index"
            class="meal-sheet-item"
            :class="{ 'meal-sheet-item--uncounted': !isItemCounted(item) }"
          >
            <div class="meal-sheet-item-head">
              <label class="meal-sheet-name-field">
                <span>Alimento</span>
                <BellaFoodSearchPicker
                  :model-value="item.name"
                  placeholder="Ex.: Frango grelhado"
                  @update:model-value="updateName(index, $event)"
                  @select="selectFood(index, $event)"
                  @blur-commit="commitName(index, $event)"
                />
              </label>
              <button
                type="button"
                class="meal-sheet-remove"
                aria-label="Remover item"
                @click="removeItem(index)"
              >
                <X class="meal-sheet-remove-icon" />
              </button>
            </div>

            <p v-if="item.originalName && item.name !== item.originalName" class="meal-sheet-ai-hint">
              IA sugeriu: {{ item.originalName }}
            </p>

            <p v-if="isItemCounted(item)" class="meal-sheet-tag meal-sheet-tag--ok">
              Base de alimentos
            </p>
            <p v-else class="meal-sheet-tag meal-sheet-tag--warn">
              Estimativa da IA — busque na base para maior precisão
            </p>

            <p v-if="looksLikeRecipe(item.name)" class="meal-sheet-recipe-hint">
              Parece um prato preparado: separe em ingredientes (ex.: arroz, feijão, frango) para contabilizar corretamente.
            </p>

            <div class="meal-sheet-mode-toggle" role="group" aria-label="Tipo de porção">
              <button
                type="button"
                class="meal-sheet-mode-btn"
                :class="{ 'meal-sheet-mode-btn--active': portionState[index]?.portionMode === 'grams' }"
                @click="setPortionMode(index, 'grams')"
              >
                Gramas
              </button>
              <button
                type="button"
                class="meal-sheet-mode-btn"
                :class="{ 'meal-sheet-mode-btn--active': portionState[index]?.portionMode === 'measure' }"
                @click="setPortionMode(index, 'measure')"
              >
                Medida caseira
              </button>
            </div>

            <div class="meal-sheet-fields">
              <template v-if="portionState[index]?.portionMode === 'measure'">
                <label class="meal-sheet-field">
                  <span>Medida</span>
                  <select
                    :value="portionState[index]?.portionMeasure || 'unidade'"
                    @change="updateMeasure(index, $event.target.value)"
                  >
                    <option
                      v-for="measure in PORTION_MEASURES"
                      :key="measure.id"
                      :value="measure.id"
                    >
                      {{ measure.label }}
                    </option>
                  </select>
                </label>
                <label class="meal-sheet-field">
                  <span>Quantidade</span>
                  <input
                    :value="portionState[index]?.portionAmount ?? 1"
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    inputmode="decimal"
                    @input="updateMeasureAmount(index, $event.target.value)"
                  />
                </label>
                <p class="meal-sheet-equiv">
                  ≈ {{ item.grams }} g ·
                  {{ formatMeasureHint(item.name, portionState[index]?.portionMeasure, portionState[index]?.gramsPerUnit) }}
                </p>
              </template>
              <template v-else>
                <label class="meal-sheet-field">
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
                <p class="meal-sheet-equiv">
                  ≈ {{ gramsToAmount(item.grams, 'unidade', item.name) }} unidade(s)
                </p>
              </template>

              <div class="meal-sheet-macros">
                <span>{{ item.caloriesKcal }} kcal</span>
                <span>C {{ item.carbsG }} g</span>
                <span>P {{ item.proteinG }} g</span>
                <span>G {{ item.fatG }} g</span>
              </div>
            </div>
          </li>
        </ul>

        <button type="button" class="meal-sheet-add" @click="addItem">
          + Adicionar alimento
        </button>

        <div class="meal-sheet-totals">
          <p><strong>Total desta refeição:</strong> {{ mealTotals.caloriesKcal }} kcal</p>
          <p class="meal-sheet-totals-macros">
            C {{ mealTotals.carbsG }} g · P {{ mealTotals.proteinG }} g · G {{ mealTotals.fatG }} g
          </p>
          <p v-if="uncountedItems.length" class="meal-sheet-totals-note">
            Itens fora da base usam estimativa da IA; escolha na base para refinar os valores.
          </p>
        </div>

        <div v-if="dailySummary" class="meal-sheet-day">
          <p>
            Após confirmar: <strong>{{ projectedCalories }}</strong> / {{ dailySummary.targets.caloriesKcal }} kcal no dia
          </p>
        </div>

        <p v-if="localError" class="meal-sheet-error">{{ localError }}</p>
        <p v-if="error" class="meal-sheet-error">{{ error }}</p>
        </div>

        <footer class="meal-sheet-actions">
          <button type="button" class="meal-sheet-btn meal-sheet-btn--ghost" :disabled="saving" @click="emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="meal-sheet-btn cf-btn cf-btn--pink"
            :disabled="saving || !items.length"
            @click="confirm"
          >
            {{ saving ? 'Salvando...' : 'Confirmar e registrar' }}
          </button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, Camera, X } from 'lucide-vue-next'
import { lockPatientScroll, unlockPatientScroll } from '~/composables/useVerticalWheelPassthrough'
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
  formatMeasureHint,
  gramsToAmount,
  guessGramsPerUnit,
  looksLikeRecipe,
} from '~/utils/meal-portion-measures'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  dailySummary: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const items = ref([])
const portionState = ref([])
const localError = ref('')
const foodCache = ref(new Map())
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

const uncountedItems = computed(() => items.value.filter((item) => !isItemCounted(item)))

const uncountedNames = computed(() => {
  const names = uncountedItems.value.map((item) => item.name).filter(Boolean)
  if (names.length <= 2) return names.join(' e ')
  return `${names.slice(0, 2).join(', ')} e mais ${names.length - 2}`
})

const projectedCalories = computed(() => {
  if (!props.dailySummary) return mealTotals.value.caloriesKcal
  return props.dailySummary.consumed.caloriesKcal + mealTotals.value.caloriesKcal
})

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
  for (const item of rawItems) {
    const matched = item.name ? await matchFoodByName(item.name) : null
    if (matched) foodCache.value.set(matched.id, matched)
    const normalized = normalizeItemFromAi(item, matched)
    hydrated.push(normalized)
    states.push(createPortionState(normalized))
  }
  items.value = hydrated
  portionState.value = states
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
}

async function commitName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  if (current.foodId && current.name === rawValue?.trim()) return
  const matched = rawValue?.trim() ? await matchFoodByName(rawValue) : null
  if (matched) foodCache.value.set(matched.id, matched)
  items.value[index] = applyFoodMatch(current, rawValue, matched)
  syncPortionState(index, items.value[index])
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
}

async function updateGrams(index, rawValue) {
  await applyGramsChange(index, rawValue)
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
}

function addItem() {
  const item = createMealItem()
  items.value.push(item)
  portionState.value.push(createPortionState(item))
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
    localError.value = 'Adicione pelo menos um alimento.'
    return
  }

  if (normalized.some((item) => !item.name)) {
    localError.value = 'Preencha o nome de todos os alimentos.'
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
  unlockPatientScroll()
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
  background: rgba(20, 20, 20, 0.42);
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
  max-height: min(88dvh, 720px);
  overflow: hidden;
  padding: 0 1.25rem;
  border-radius: var(--cf-radius-xl, 1.875rem) var(--cf-radius-xl, 1.875rem) 0 0;
  background: var(--cf-surface);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
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
  padding-bottom: 0.35rem;
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
  min-height: 1.75rem;
  margin: 0.65rem 0 0.85rem;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.meal-sheet-handle {
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--cf-track, #e4e4e0);
}

.meal-sheet-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.meal-sheet-hero {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  border: 1px solid #f5dfe1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meal-sheet-hero-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--cf-pink);
}

.meal-sheet-copy {
  min-width: 0;
}

.meal-sheet-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.meal-sheet-subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--cf-text-muted);
}

.meal-sheet-close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-track, #f3f3f0);
  color: var(--cf-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.meal-sheet-close-icon {
  width: 1rem;
  height: 1rem;
}

.meal-sheet-photo {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  margin-bottom: 0.65rem;
}

.meal-sheet-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meal-sheet-meal {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
}

.meal-sheet-alert {
  display: flex;
  gap: 0.55rem;
  padding: 0.7rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.meal-sheet-alert-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: #c2410c;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.meal-sheet-alert-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: #9a3412;
}

.meal-sheet-alert-text {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #9a3412;
}

.meal-sheet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meal-sheet-item {
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-md, 1rem);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
}

.meal-sheet-item--uncounted {
  border-color: #fed7aa;
  background: #fffaf5;
}

.meal-sheet-item-head {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.meal-sheet-name-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
  min-width: 0;
}

.meal-sheet-remove {
  border: none;
  background: var(--cf-track);
  color: var(--cf-text-muted);
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.meal-sheet-remove-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.meal-sheet-ai-hint {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.meal-sheet-tag {
  margin: 0 0 0.4rem;
  font-size: 0.68rem;
  font-weight: 600;
}

.meal-sheet-tag--ok {
  color: var(--cf-green-dark, #6f7863);
}

.meal-sheet-tag--warn {
  color: #c2410c;
}

.meal-sheet-recipe-hint {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.meal-sheet-mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  padding: 0.2rem;
  border-radius: 10px;
  background: var(--cf-track, #f3f3f0);
}

.meal-sheet-mode-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  min-height: 2rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.meal-sheet-mode-btn--active {
  background: var(--cf-surface);
  color: var(--cf-text);
  box-shadow: var(--cf-shadow);
}

.meal-sheet-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.55rem;
}

.meal-sheet-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.meal-sheet-field input,
.meal-sheet-field select {
  min-width: 5.5rem;
  padding: 0.45rem 0.5rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.88rem;
  background: var(--cf-surface);
}

.meal-sheet-equiv {
  width: 100%;
  margin: 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.meal-sheet-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
  margin-left: auto;
}

.meal-sheet-macros--muted {
  opacity: 0.65;
}

.meal-sheet-add {
  width: 100%;
  margin-top: 0.55rem;
  padding: 0.65rem 0.75rem;
  border: 1.5px dashed var(--cf-border);
  border-radius: 12px;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.meal-sheet-totals {
  margin-top: 0.85rem;
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  background: var(--cf-green-soft, #eef0eb);
  font-size: 0.82rem;
}

.meal-sheet-totals p {
  margin: 0;
}

.meal-sheet-totals-macros {
  margin-top: 0.25rem !important;
  font-size: 0.75rem;
  color: var(--cf-text-muted);
}

.meal-sheet-totals-note {
  margin-top: 0.35rem !important;
  font-size: 0.72rem !important;
  color: #c2410c !important;
}

.meal-sheet-day {
  margin-top: 0.55rem;
  font-size: 0.78rem;
  color: var(--cf-text-muted);
}

.meal-sheet-day p {
  margin: 0;
}

.meal-sheet-error {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: var(--pa-red, #dc2626);
}

.meal-sheet-actions {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.5rem;
  margin-top: 0;
  padding: 0.65rem 0 calc(0.65rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.04);
}

.meal-sheet-btn {
  min-height: 2.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.meal-sheet-btn--ghost {
  background: var(--cf-track);
  color: var(--cf-text);
}

.meal-sheet-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
