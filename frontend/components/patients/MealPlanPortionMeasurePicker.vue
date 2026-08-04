<template>
  <div ref="rootEl" class="mpms" :class="{ 'mpms--open': open }">
    <div class="mpms-input-wrap">
      <input
        ref="qtyInputEl"
        :value="amount"
        type="number"
        min="0.1"
        step="any"
        class="mpms-qty"
        inputmode="decimal"
        aria-label="Quantidade"
        @input="onAmountInput"
        @focus="openPanel"
        @keydown="onQtyKeydown"
      >
      <button
        type="button"
        class="mpms-trigger"
        :aria-expanded="open"
        @mousedown.prevent
        @click="togglePanel"
      >
        <span>{{ selectedLabel }}</span>
        <ChevronDown class="mpms-chevron" :class="{ 'mpms-chevron--open': open }" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="mpms-panel"
        :style="panelStyle"
        role="listbox"
      >
        <div class="mpms-panel-head">
          <Clock aria-hidden="true" />
          <span>Medidas encontradas</span>
          <small>{{ options.length }} opções</small>
        </div>

        <ul class="mpms-list">
          <li
            v-for="(option, idx) in options"
            :key="option.id"
            role="option"
            :aria-selected="idx === activeIndex"
            class="mpms-item"
            :class="{ 'mpms-item--active': idx === activeIndex || option.id === measureId }"
            @mousedown.prevent
            @click="selectOption(option)"
            @mouseenter="activeIndex = idx"
          >
            <div class="mpms-item-main">
              <strong>{{ option.label }}</strong>
              <span class="mpms-item-hint">{{ option.hint }}</span>
            </div>
            <div class="mpms-item-side">
              <span class="mpms-item-grams">{{ option.gramsLabel }}</span>
              <span v-if="option.macros" class="mpms-item-macros">
                <span class="mpms-macro mpms-macro--c">C: {{ formatMacro(option.macros.carbsG) }}</span>
                <span class="mpms-macro mpms-macro--p">P: {{ formatMacro(option.macros.proteinG) }}</span>
                <span class="mpms-macro mpms-macro--f">L: {{ formatMacro(option.macros.fatG) }}</span>
                <span class="mpms-kcal">{{ option.macros.caloriesKcal }} kcal</span>
              </span>
            </div>
          </li>
        </ul>

        <footer class="mpms-shortcuts">
          <span><ArrowUpDown aria-hidden="true" /> Navegar</span>
          <span><CornerDownLeft aria-hidden="true" /> Enter Selecionar</span>
          <span>Esc Fechar</span>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ArrowUpDown, ChevronDown, Clock, CornerDownLeft } from 'lucide-vue-next'
import { macrosForFoodRecord } from '~/utils/food-bank.js'
import {
  PORTION_MEASURES,
  amountToGrams,
  guessGramsPerUnit,
} from '~/utils/meal-portion-measures.js'

const props = defineProps({
  foodName: { type: String, default: '' },
  foodSource: { type: String, default: '' },
  per100g: { type: Object, default: null },
  nutrientsPer100g: { type: Object, default: null },
  amount: { type: Number, default: 1 },
  measureId: { type: String, default: 'unidade' },
})

const emit = defineEmits(['update:amount', 'update:measureId', 'change', 'submit', 'cancel'])

const rootEl = ref(null)
const qtyInputEl = ref(null)
const panelEl = ref(null)
const open = ref(false)
const activeIndex = ref(-1)
const panelStyle = ref({})

const options = computed(() => {
  const qty = Math.max(0.1, Number(props.amount) || 1)
  const per100g = props.per100g || {}
  const foodName = props.foodName || ''

  const base = [
    {
      id: 'grams',
      label: 'Gramas',
      hint: 'Por peso',
      gramsFor: () => Math.max(1, Math.round(qty)),
      gramsLabel: `${Math.max(1, Math.round(qty))} g`,
    },
    {
      id: 'porcao_media',
      label: 'Porção média',
      hint: 'Equivalente a 100 g',
      gramsFor: () => 100,
      gramsLabel: '100 g',
    },
    ...PORTION_MEASURES.map((measure) => {
      const gpu = guessGramsPerUnit(foodName, measure.id)
      const grams = Math.max(1, Math.round(qty * gpu))
      return {
        id: measure.id,
        label: measure.label,
        hint: measure.id === 'unidade' ? 'Por unidade' : 'Medida caseira',
        gramsFor: () => grams,
        gramsLabel: `${qty} ${measure.label.replace('(ões)', '').replace('(s)', '').trim()} = ${grams}g`,
      }
    }),
  ]

  return base.map((option) => {
    const grams = option.gramsFor()
    const macros = per100g?.caloriesKcal != null
      ? macrosForFoodRecord({
        source: props.foodSource,
        per100g,
        nutrients: props.nutrientsPer100g ? { per100g: props.nutrientsPer100g } : null,
      }, grams)
      : null
    return { ...option, macros }
  })
})

const selectedLabel = computed(() => {
  const found = options.value.find((item) => item.id === props.measureId)
  return found?.label || 'Medida'
})

function formatMacro(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

function updatePanelPosition() {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return
  const width = Math.max(rect.width, 360)
  const maxLeft = Math.max(8, window.innerWidth - width - 8)
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${Math.min(rect.left, maxLeft)}px`,
    width: `${width}px`,
    zIndex: 10200,
  }
}

function emitChange(measureId = props.measureId, amount = props.amount) {
  const option = options.value.find((item) => item.id === measureId) || options.value[0]
  const grams = measureId === 'grams'
    ? Math.max(1, Math.round(Number(amount) || 1))
    : option?.gramsFor?.() || amountToGrams(amount, measureId, props.foodName)
  emit('update:measureId', measureId)
  emit('update:amount', Number(amount) || 1)
  emit('change', { measureId, amount: Number(amount) || 1, grams })
}

function openPanel() {
  open.value = true
  nextTick(updatePanelPosition)
}

function closePanel() {
  open.value = false
  activeIndex.value = -1
}

function togglePanel() {
  if (open.value) closePanel()
  else openPanel()
}

function onAmountInput(event) {
  const value = Math.max(0.1, Number(event.target.value) || 1)
  emit('update:amount', value)
  emitChange(props.measureId, value)
  if (!open.value) openPanel()
  nextTick(updatePanelPosition)
}

/* Enter confirma a linha inteira (o pai fecha a edição e abre a próxima);
   Esc desiste. Antes só existia o "OK" clicável no fim da linha. */
function onQtyKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    closePanel()
    emit('submit')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    if (open.value) {
      closePanel()
      return
    }
    emit('cancel')
  }
}

function focusAmount() {
  qtyInputEl.value?.focus?.()
  qtyInputEl.value?.select?.()
}

defineExpose({ focus: focusAmount })

function selectOption(option) {
  emitChange(option.id, props.amount)
  closePanel()
}

function moveActive(delta) {
  if (!options.value.length) return
  const next = activeIndex.value + delta
  if (next < 0) activeIndex.value = options.value.length - 1
  else if (next >= options.value.length) activeIndex.value = 0
  else activeIndex.value = next
}

function onDocumentKeydown(event) {
  if (!open.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    selectOption(options.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel()
  }
}

function onDocumentPointer(event) {
  const target = event.target
  if (rootEl.value?.contains(target) || panelEl.value?.contains(target)) return
  closePanel()
}

function onViewportChange() {
  if (open.value) updatePanelPosition()
}

watch(
  () => [props.amount, props.measureId, props.foodName],
  () => {
    if (open.value) nextTick(updatePanelPosition)
  },
)

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  document.addEventListener('pointerdown', onDocumentPointer)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointer)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.mpms {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.mpms-input-wrap {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-sm);
  overflow: hidden;
  background: #fff;
  box-sizing: border-box;
}

@supports (corner-shape: squircle) {
  .mpms-input-wrap {
    corner-shape: squircle;
  }
}

.mpms-qty {
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  padding: 0.35rem 0.3rem;
  border: none;
  border-right: 1px solid #e2e8e4;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #2c322c;
  background: #fff;
  box-sizing: border-box;
}

.mpms-qty:focus {
  outline: none;
}

.mpms-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-width: 0;
  min-height: 2rem;
  padding: 0.35rem 0.45rem;
  border: none;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #2c322c;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
}

.mpms-trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpms-chevron {
  width: 0.85rem;
  height: 0.85rem;
  color: #8a9288;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.mpms-chevron--open {
  transform: rotate(180deg);
}

.mpms--open .mpms-input-wrap {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 2px rgba(45, 90, 39, 0.08);
}

.mpms-panel {
  display: flex;
  flex-direction: column;
  max-height: min(320px, 46dvh);
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-sm);
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.mpms-panel-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  background: #f8faf9;
  border-bottom: 1px solid #eef1ee;
  font-size: 0.78rem;
  font-weight: 400;
  color: #4b5563;
}

.mpms-panel-head svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mpms-panel-head small {
  margin-left: auto;
  color: #8a9288;
}

.mpms-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.mpms-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f1f3f2;
  cursor: pointer;
}

.mpms-item:last-child {
  border-bottom: none;
}

.mpms-item--active,
.mpms-item:hover {
  background: rgba(139, 150, 124, 0.12);
}

.mpms-item--active strong,
.mpms-item:hover strong {
  color: #5f7560;
}

.mpms-item-main strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #2c322c;
}

.mpms-item-hint {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.68rem;
  color: #8a9288;
}

.mpms-item-side {
  text-align: right;
  flex-shrink: 0;
}

.mpms-item-grams {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #5f675f;
}

.mpms-item-macros {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.15rem;
  font-size: 0.62rem;
  font-weight: 400;
}

.mpms-macro--c { color: #2563eb; }
.mpms-macro--p { color: #dc2626; }
.mpms-macro--f { color: #d97706; }

.mpms-kcal {
  color: #5f675f;
}

.mpms-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  border-top: 1px solid #eef1ee;
  background: #fafbfa;
  font-size: 0.68rem;
  color: #8a9288;
}

.mpms-shortcuts span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.mpms-shortcuts svg {
  width: 0.8rem;
  height: 0.8rem;
}
</style>
