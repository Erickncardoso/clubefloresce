<template>
  <div
    ref="rowRef"
    class="mpns-nutrient-row"
    :class="{ 'mpns-nutrient-row--active': panel === 'breakdown' || panel === 'goal' }"
    @mouseenter="onRowEnter"
    @mouseleave="onRowLeave"
  >
    <span class="mpns-nutrient-row__label">{{ row.label }}</span>
    <span class="mpns-nutrient-row__value">{{ row.displayValue }}</span>
    <div class="mpns-nutrient-row__bar-wrap" aria-hidden="true">
      <div
        class="mpns-nutrient-row__bar"
        :class="`mpns-nutrient-row__bar--${row.barTone}`"
        :style="{ width: `${row.barWidthPct}%` }"
      />
    </div>
    <span class="mpns-nutrient-row__pct">{{ row.pctLabel }}</span>

    <div class="mpns-nutrient-row__tools mpns-nutrient-row__tools--screen">
      <button
        v-if="showTools"
        ref="triggerRef"
        type="button"
        class="mpns-nutrient-plus"
        :class="{ 'mpns-nutrient-plus--open': panel === 'goal' }"
        :aria-expanded="panel === 'goal'"
        aria-haspopup="dialog"
        :aria-label="`Definir meta de ${row.label}`"
        @click.stop="openGoalPanel"
        @mouseenter="onPlusEnter"
        @mouseleave="onPlusLeave"
      >
        <Plus aria-hidden="true" />
      </button>
    </div>

    <Teleport to="body">
      <button
        v-if="showGoalChip"
        type="button"
        class="mpns-nutrient-goal-chip mpns-nutrient-layer"
        :style="goalChipStyle"
        @click.stop="openGoalPanel"
      >
        Definir meta
      </button>

      <div
        v-if="panel === 'breakdown'"
        ref="breakdownRef"
        class="mpns-nutrient-popover mpns-nutrient-popover--breakdown admin-shell admin-shell-card mpns-nutrient-layer"
        role="dialog"
        :aria-label="`Contribuição por alimento — ${row.label}`"
        :style="breakdownStyle"
        @mouseenter="onBreakdownEnter"
        @mouseleave="onBreakdownLeave"
        @click.stop
      >
        <header class="mpns-nutrient-popover__head">
          <strong>{{ row.label }}</strong>
          <span>{{ row.displayValue }}</span>
        </header>
        <ul v-if="breakdown.length" class="mpns-nutrient-breakdown">
          <li v-for="entry in breakdown" :key="entry.id">
            <span class="mpns-nutrient-breakdown__name">{{ entry.name }}</span>
            <span class="mpns-nutrient-breakdown__amount">{{ formatAmount(entry.amount) }}</span>
            <span class="mpns-nutrient-breakdown__share">{{ entry.sharePct }}%</span>
          </li>
        </ul>
        <p v-else class="mpns-nutrient-popover__empty">
          Vincule alimentos ao TBCA para ver a contribuição por item.
        </p>
      </div>

      <div
        v-if="panel === 'goal'"
        ref="goalRef"
        class="mpns-nutrient-popover mpns-nutrient-popover--goal admin-shell admin-shell-card mpns-nutrient-layer"
        role="dialog"
        :aria-label="`Meta de ${row.label}`"
        :style="goalStyle"
        @click.stop
      >
        <header class="mpns-nutrient-popover__goal-head">
          <Target aria-hidden="true" />
          <strong>Meta de {{ row.label }}</strong>
        </header>
        <div class="field field--float mpns-nutrient-goal-field">
          <label :for="goalInputId">{{ row.label }}</label>
          <input
            :id="goalInputId"
            v-model="goalDraft"
            type="text"
            inputmode="decimal"
            :placeholder="row.unit"
          >
        </div>
        <button
          v-if="defaultDri != null"
          type="button"
          class="mpns-nutrient-dri-link"
          @click="useDefaultDri"
        >
          Usar DRI: {{ formatDri(defaultDri) }} {{ row.unit }}
        </button>
        <footer class="mpns-nutrient-popover__foot">
          <button
            type="button"
            class="btn-primary mpns-nutrient-save"
            :disabled="!canSaveGoal"
            @click="saveGoal"
          >
            Salvar
          </button>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Plus, Target } from 'lucide-vue-next'
import {
  buildNutrientFoodBreakdown,
  formatNutrientDisplay,
} from '~/utils/meal-plan-nutrition-report.js'

const props = defineProps({
  row: { type: Object, required: true },
  meals: { type: Array, default: () => [] },
  defaultDri: { type: Number, default: null },
  customGoal: { type: Number, default: null },
})

const emit = defineEmits(['update:customGoal', 'close-siblings'])

const hovered = ref(false)
const plusHovered = ref(false)
const panel = ref(null)
const rowRef = ref(null)
const triggerRef = ref(null)
const breakdownLeaveTimer = ref(null)
const breakdownRef = ref(null)
const goalRef = ref(null)
const breakdownStyle = ref({})
const goalStyle = ref({})
const goalChipStyle = ref({})
const goalDraft = ref('')

const goalInputId = computed(() => `mpns-goal-${props.row.key}`)

const breakdown = computed(() => buildNutrientFoodBreakdown(props.meals, props.row.key))

const showTools = computed(() => hovered.value || panel.value != null || plusHovered.value)

const showGoalChip = computed(() =>
  (plusHovered.value || panel.value === 'goal') && panel.value !== 'goal',
)

const canSaveGoal = computed(() => {
  const n = Number(String(goalDraft.value || '').replace(',', '.'))
  return Number.isFinite(n) && n > 0
})

function formatAmount(value) {
  return formatNutrientDisplay(value, props.row.unit)
}

function formatDri(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function updatePopoverPosition(targetEl, styleRef, preferLeft = true) {
  const anchor = rowRef.value
  if (!anchor) return

  const rect = anchor.getBoundingClientRect()
  const panelEl = targetEl
  const panelWidth = panelEl?.offsetWidth || 280
  const panelHeight = panelEl?.offsetHeight || 180
  const gap = 10
  const pad = 12

  let left = preferLeft ? rect.left - panelWidth - gap : rect.right + gap
  if (left < pad) left = rect.right + gap
  if (left + panelWidth > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - panelWidth - pad)
  }

  let top = rect.top + rect.height / 2 - panelHeight / 2
  top = Math.max(pad, Math.min(top, window.innerHeight - panelHeight - pad))

  styleRef.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 6200,
  }
}

function updateGoalChipPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  goalChipStyle.value = {
    position: 'fixed',
    top: `${rect.top - 38}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 6199,
  }
}

function clearBreakdownLeaveTimer() {
  if (breakdownLeaveTimer.value != null) {
    clearTimeout(breakdownLeaveTimer.value)
    breakdownLeaveTimer.value = null
  }
}

function closePanels() {
  clearBreakdownLeaveTimer()
  panel.value = null
}

function openBreakdown() {
  if (panel.value === 'goal') return
  emit('close-siblings')
  panel.value = 'breakdown'
  nextTick(() => {
    updatePopoverPosition(breakdownRef.value, breakdownStyle, true)
    updateGoalChipPosition()
  })
}

function scheduleBreakdownClose() {
  if (panel.value !== 'breakdown') return
  clearBreakdownLeaveTimer()
  breakdownLeaveTimer.value = setTimeout(() => {
    if (panel.value === 'breakdown') closePanels()
    breakdownLeaveTimer.value = null
  }, 200)
}

function onRowEnter() {
  hovered.value = true
  clearBreakdownLeaveTimer()
  openBreakdown()
}

function onPlusEnter() {
  plusHovered.value = true
  clearBreakdownLeaveTimer()
}

function onPlusLeave() {
  plusHovered.value = false
}

function openGoalPanel() {
  emit('close-siblings')
  panel.value = 'goal'
  goalDraft.value = props.customGoal != null
    ? String(props.customGoal)
    : (props.row.value != null ? String(props.row.value) : '')
  nextTick(() => {
    updatePopoverPosition(goalRef.value, goalStyle, false)
  })
}

function useDefaultDri() {
  if (props.defaultDri == null) return
  goalDraft.value = String(props.defaultDri)
}

function saveGoal() {
  const n = Number(String(goalDraft.value || '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return
  emit('update:customGoal', n)
  closePanels()
}

function onRowLeave() {
  hovered.value = false
  plusHovered.value = false
  scheduleBreakdownClose()
}

function onBreakdownEnter() {
  clearBreakdownLeaveTimer()
}

function onBreakdownLeave() {
  scheduleBreakdownClose()
}

function onDocumentClick(event) {
  if (!panel.value) return
  const target = event.target
  if (triggerRef.value?.contains(target)) return
  if (breakdownRef.value?.contains(target)) return
  if (goalRef.value?.contains(target)) return
  if (target?.closest?.('.mpns-nutrient-goal-chip')) return
  closePanels()
}

function onKeydown(event) {
  if (event.key === 'Escape') closePanels()
}

watch(showGoalChip, (visible) => {
  if (visible) nextTick(() => updateGoalChipPosition())
})

watch(() => props.customGoal, () => {
  if (panel.value !== 'goal') {
    goalDraft.value = props.customGoal != null ? String(props.customGoal) : ''
  }
})

function exposeClose() {
  closePanels()
}

defineExpose({ closePanels: exposeClose })

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', closePanels)
  window.addEventListener('scroll', closePanels, true)
})

onBeforeUnmount(() => {
  clearBreakdownLeaveTimer()
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', closePanels)
  window.removeEventListener('scroll', closePanels, true)
})
</script>

<style scoped>
.mpns-nutrient-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1.4fr) 5.5rem minmax(5rem, 1fr) 3rem 2rem;
  gap: 0.65rem;
  align-items: center;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  font-size: 0.82rem;
  position: relative;
}

.mpns-nutrient-row:last-child {
  border-bottom: 0;
}

.mpns-nutrient-row--active {
  background: rgba(139, 150, 124, 0.08);
}

.mpns-nutrient-row__label {
  color: rgba(15, 23, 42, 0.78);
}

.mpns-nutrient-row__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(15, 23, 42, 0.88);
}

.mpns-nutrient-row__bar-wrap {
  height: 0.35rem;
  background: rgba(15, 23, 42, 0.08);
  border-radius: var(--cf-radius-pill);
  overflow: hidden;
}

.mpns-nutrient-row__bar {
  height: 100%;
  border-radius: var(--cf-radius-pill);
}

.mpns-nutrient-row__bar--neutral { background: rgba(15, 23, 42, 0.18); }
.mpns-nutrient-row__bar--low { background: #f59e0b; }
.mpns-nutrient-row__bar--ok { background: #22c55e; }
.mpns-nutrient-row__bar--high { background: #ef4444; }

.mpns-nutrient-row__pct {
  text-align: right;
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.55);
  font-variant-numeric: tabular-nums;
}

.mpns-nutrient-row__tools {
  display: flex;
  justify-content: flex-end;
  min-height: 1.75rem;
}

.mpns-nutrient-plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-full);
  background: #8b7cb8;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(91, 73, 130, 0.28);
  transition: transform 0.12s ease, background 0.12s ease;
}

.mpns-nutrient-plus svg {
  width: 0.95rem;
  height: 0.95rem;
}

.mpns-nutrient-plus:hover,
.mpns-nutrient-plus--open {
  background: #7565a8;
  transform: scale(1.04);
}

.mpns-nutrient-goal-chip {
  padding: 0.35rem 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-pill);
  background: #fff;
  color: #5f7560;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1);
  white-space: nowrap;
}

.mpns-nutrient-goal-chip:hover {
  border-color: #c5d4c1;
  color: #4f6f45;
}

.mpns-nutrient-popover {
  width: min(19rem, calc(100vw - 1.5rem));
  padding: 0.85rem 0.95rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow:
    0 4px 6px rgba(26, 46, 36, 0.04),
    0 16px 32px rgba(26, 46, 36, 0.12);
  overflow: visible;
}

.mpns-nutrient-popover--goal {
  width: min(16.75rem, calc(100vw - 1.5rem));
  padding: 0.95rem 1rem 1rem;
}

.mpns-nutrient-popover__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.55rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid #eef1ee;
}

.mpns-nutrient-popover__head strong {
  font-size: 0.82rem;
  color: #2c322c;
}

.mpns-nutrient-popover__head span {
  font-size: 0.78rem;
  color: #8a9288;
  font-variant-numeric: tabular-nums;
}

.mpns-nutrient-breakdown {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.mpns-nutrient-breakdown li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.45rem 0.65rem;
  align-items: center;
  font-size: 0.76rem;
}

.mpns-nutrient-breakdown__name {
  color: #5f675f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpns-nutrient-breakdown__amount {
  color: #8a9288;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mpns-nutrient-breakdown__share {
  color: #b0b8b0;
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 2rem;
}

.mpns-nutrient-popover__empty {
  margin: 0;
  font-size: 0.76rem;
  color: #8a9288;
  line-height: 1.45;
}

.mpns-nutrient-popover__goal-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
  color: #8b7cb8;
}

.mpns-nutrient-popover__goal-head svg {
  width: 1rem;
  height: 1rem;
  color: #d97706;
}

.mpns-nutrient-popover__goal-head strong {
  font-size: 0.88rem;
  color: #8b7cb8;
}

.mpns-nutrient-goal-field {
  position: relative;
  margin-top: 0.35rem;
  width: 100%;
  min-width: 0;
}

.mpns-nutrient-goal-field > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: var(--admin-font-label-weight, 600);
  color: #444;
  line-height: 1;
}

.mpns-nutrient-goal-field input {
  width: 100%;
  min-height: 2.35rem;
  padding: 0.95rem 0.9rem 0.85rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  color: #2c322c;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.mpns-nutrient-goal-field input:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.mpns-nutrient-goal-field input::placeholder {
  color: #9ca3af;
}

@supports (corner-shape: squircle) {
  .mpns-nutrient-popover,
  .mpns-nutrient-goal-field input,
  .mpns-nutrient-save {
    corner-shape: squircle;
  }
}

.mpns-nutrient-dri-link {
  margin-top: 0.45rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #8b7cb8;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.mpns-nutrient-popover__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.mpns-nutrient-save {
  min-height: 2.15rem !important;
  padding: 0.4rem 1.05rem !important;
  font-size: 0.82rem !important;
  border-radius: var(--cf-radius-control) !important;
}
</style>
