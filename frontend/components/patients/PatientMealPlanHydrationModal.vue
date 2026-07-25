<template>
  <Teleport to="body">
    <div v-if="open" class="mph-modal" role="dialog" aria-modal="true" aria-labelledby="mph-title">
      <div class="mph-modal__backdrop" aria-hidden="true" @click="close" />
      <div class="modal-card mph-modal__panel admin-shell admin-shell-card" @click.stop>
        <header class="mph-modal__head">
          <label class="mph-modal__title-field">
            <span class="mph-modal__title-sr">Título da prescrição</span>
            <input
              v-model="draft.title"
              type="text"
              class="mph-modal__title-input"
              placeholder="Título da prescrição"
              maxlength="120"
              autocomplete="off"
            >
          </label>
          <button type="button" class="mph-modal__close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="mph-mode">
          <span class="mph-mode__label">Prescrição</span>
          <div class="mph-segment" role="group" aria-label="Modo de prescrição">
            <button
              v-for="mode in HYDRATION_SCHEDULE_MODES"
              :key="mode.id"
              type="button"
              class="mph-segment__btn"
              :class="{ 'mph-segment__btn--active': draft.scheduleMode === mode.id }"
              @click="setScheduleMode(mode.id)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div class="mph-days" role="tablist" aria-label="Dias da semana">
          <button
            v-for="day in visibleDayTabs"
            :key="day.id"
            type="button"
            role="tab"
            class="mph-tab"
            :class="{ 'mph-tab--active': draft.activeDay === day.id }"
            :aria-selected="draft.activeDay === day.id"
            @click="selectDay(day.id)"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="mph-layout">
          <section class="mph-form" aria-label="Meta hídrica">
            <div class="mph-section-head">
              <h2 id="mph-title" class="mph-section-title">
                <SharedCfHydrationBottleIcon :size="16" />
                Meta hídrica
              </h2>
              <button
                ref="formulaTriggerRef"
                type="button"
                class="mph-section-hint"
                :class="{ 'mph-section-hint--open': formulaPopoverOpen }"
                :aria-expanded="formulaPopoverOpen"
                aria-haspopup="dialog"
                aria-label="Como calculamos a prescrição hídrica"
                @click.stop="toggleFormulaPopover"
                @mouseenter="openFormulaPopover"
                @mouseleave="scheduleCloseFormulaPopover"
              >
                <Info aria-hidden="true" />
              </button>
            </div>

            <div class="mph-form__row">
              <div class="field field--float mph-field mph-field--suffix">
                <label for="mph-weight">Peso</label>
                <input id="mph-weight" v-model="draft.weightKg" type="number" min="0" step="0.1" inputmode="decimal">
                <span class="mph-field__suffix">kg</span>
              </div>
              <div class="field field--float mph-field mph-field--suffix">
                <label for="mph-height">Altura</label>
                <input id="mph-height" v-model="draft.heightCm" type="number" min="0" step="1" inputmode="numeric">
                <span class="mph-field__suffix">cm</span>
              </div>
            </div>

            <div class="mph-form__row">
              <div class="field field--float mph-field">
                <label for="mph-activity">Atividade física</label>
                <SharedCfSelect
                  id="mph-activity"
                  v-model="draft.activityLevel"
                  :options="activityOptions"
                />
              </div>
              <div class="field field--float mph-field mph-field--suffix" :class="{ 'mph-field--disabled': draft.activityLevel === 'sedentary' }">
                <label for="mph-duration">Duração</label>
                <input
                  id="mph-duration"
                  v-model="draft.activityDurationMin"
                  type="number"
                  min="0"
                  step="5"
                  inputmode="numeric"
                  placeholder="—"
                  :disabled="draft.activityLevel === 'sedentary'"
                >
                <span class="mph-field__suffix">min</span>
              </div>
            </div>

            <div class="mph-climate">
              <div class="mph-climate__copy">
                <strong>Clima quente/úmido?</strong>
                <span>Temperatura &gt;30 °C ou umidade &gt;70%</span>
              </div>
              <div class="mph-toggle" role="group" aria-label="Clima quente ou úmido">
                <button
                  type="button"
                  class="mph-segment__btn"
                  :class="{ 'mph-segment__btn--active': !draft.hotHumidClimate }"
                  @click="setHotHumidClimate(false)"
                >
                  Não
                </button>
                <button
                  type="button"
                  class="mph-segment__btn"
                  :class="{ 'mph-segment__btn--active': draft.hotHumidClimate }"
                  @click="setHotHumidClimate(true)"
                >
                  Sim
                </button>
              </div>
            </div>

            <div class="mph-interval">
              <div class="mph-interval__head">
                <label class="mph-interval__label">
                  <input v-model="draft.useConsumptionWindow" type="checkbox">
                  <span>Intervalo de consumo</span>
                </label>
                <button
                  ref="intervalHintTriggerRef"
                  type="button"
                  class="mph-interval__info-btn"
                  :class="{ 'mph-interval__info-btn--open': intervalHintOpen }"
                  :aria-expanded="intervalHintOpen"
                  aria-haspopup="dialog"
                  aria-label="Como funciona o intervalo de consumo"
                  @click.stop="toggleIntervalHint"
                  @mouseenter="openIntervalHint"
                  @mouseleave="scheduleCloseIntervalHint"
                >
                  <Info aria-hidden="true" />
                </button>
              </div>
              <div class="mph-interval__grid" :class="{ 'mph-interval__grid--disabled': !draft.useConsumptionWindow }">
                <div class="field field--float mph-field mph-field--time">
                  <label for="mph-wake">Início</label>
                  <input id="mph-wake" v-model="draft.wakeTime" type="time" :disabled="!draft.useConsumptionWindow">
                </div>
                <div class="field field--float mph-field mph-field--time">
                  <label for="mph-bed">Término</label>
                  <input id="mph-bed" v-model="draft.bedTime" type="time" :disabled="!draft.useConsumptionWindow">
                </div>
                <div class="field field--float mph-field mph-field--suffix mph-field--interval">
                  <label for="mph-interval">A cada</label>
                  <input
                    id="mph-interval"
                    v-model="draft.intervalHours"
                    type="number"
                    min="1"
                    max="12"
                    step="1"
                    inputmode="numeric"
                    :disabled="!draft.useConsumptionWindow"
                  >
                  <span class="mph-field__suffix">h</span>
                </div>
              </div>
              <p v-if="draft.useConsumptionWindow && intervalPreviewCups" class="mph-interval__preview">
                ≈ {{ intervalPreviewCups }} por lembrete
                <span>(janela {{ draft.wakeTime }}–{{ draft.bedTime }})</span>
              </p>
            </div>

            <div class="mph-units">
              <span class="mph-units__label">Medida</span>
              <div class="mph-segment" role="group" aria-label="Unidade de medida">
                <button
                  v-for="unit in HYDRATION_UNIT_OPTIONS"
                  :key="unit.id"
                  type="button"
                  class="mph-segment__btn"
                  :class="{ 'mph-segment__btn--active': draft.unit === unit.id }"
                  @click="draft.unit = unit.id"
                >
                  {{ unit.label }}
                </button>
              </div>
            </div>

            <div class="mph-quantity">
              <div class="field field--float mph-field mph-field--suffix mph-quantity__field">
                <label for="mph-custom">Quantidade de água</label>
                <input
                  id="mph-custom"
                  :value="displayDailyAmount"
                  type="number"
                  min="0"
                  step="50"
                  inputmode="numeric"
                  :placeholder="formattedComputedDaily"
                  @input="onDailyAmountInput"
                >
                <span class="mph-field__suffix">{{ draft.unit }}</span>
              </div>
              <button
                v-if="showUndo"
                type="button"
                class="btn-secondary mph-undo-btn"
                @click="undoManualOverride"
              >
                Desfazer
              </button>
            </div>

            <div class="field field--float mph-field">
              <label for="mph-notes">Observações</label>
              <textarea id="mph-notes" v-model="draft.notes" rows="3" placeholder="Orientações adicionais para a paciente" />
            </div>
          </section>

          <aside class="mph-preview" aria-label="Resumo da prescrição">
            <header class="mph-preview__head">
              <SharedCfHydrationBottleIcon :size="18" flat />
              <span>Prescrição de Hidratação</span>
            </header>

            <div class="mph-preview__block">
              <p class="mph-preview__block-label">Meta hídrica</p>
              <p class="mph-preview__block-value">
                {{ formattedDaily }}<span>/dia</span>
              </p>
              <ul class="mph-preview__breakdown">
                <li>+ {{ formatBreakdownLine(breakdown.baseMl) }} (base)</li>
                <li>+ {{ formatBreakdownLine(breakdown.activityBonusMl) }} ({{ breakdown.activityLabel }})</li>
                <li>+ {{ formatBreakdownLine(breakdown.climateBonusMl) }} ({{ breakdown.climateLabel }})</li>
              </ul>
            </div>

            <div class="mph-preview__block mph-preview__block--interval">
              <div>
                <span class="mph-preview__interval-label">A cada {{ draft.intervalHours || 2 }} horas</span>
                <small v-if="intervalPreviewCups" class="mph-preview__interval-cups">{{ intervalPreviewCups }}</small>
              </div>
              <strong class="mph-preview__interval-value">{{ formattedInterval }}</strong>
            </div>
          </aside>
        </div>

        <footer class="mph-modal__foot">
          <button type="button" class="btn-secondary mph-modal__btn" @click="close">Cancelar</button>
          <button type="button" class="btn-primary mph-modal__btn mph-modal__btn--save" @click="save">Salvar</button>
        </footer>
      </div>

      <PatientMealPlanHydrationFormulaPopover
        :open="formulaPopoverOpen"
        :panel-style="formulaPopoverStyle"
        @pointerenter="cancelCloseFormulaPopover"
        @pointerleave="scheduleCloseFormulaPopover"
      />

      <PatientMealPlanHydrationIntervalPopover
        :open="intervalHintOpen"
        :panel-style="intervalHintStyle"
        @pointerenter="cancelCloseIntervalHint"
        @pointerleave="scheduleCloseIntervalHint"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Info, X } from 'lucide-vue-next'
import PatientMealPlanHydrationFormulaPopover from '~/components/patients/PatientMealPlanHydrationFormulaPopover.vue'
import PatientMealPlanHydrationIntervalPopover from '~/components/patients/PatientMealPlanHydrationIntervalPopover.vue'
import {
  HYDRATION_ACTIVITY_LEVELS,
  HYDRATION_DAY_IDS,
  HYDRATION_SCHEDULE_MODES,
  HYDRATION_UNIT_OPTIONS,
  computeHydrationBreakdown,
  computeHydrationGoal,
  displayUnitAmount,
  formatHydrationAmount,
  hasManualHydrationOverride,
  normalizeHydrationPrescription,
} from '~/utils/meal-plan-hydration.js'
import {
  formatHydrationCups,
  hydrationPerReminder,
} from '~/utils/meal-plan-hydration-tracking.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  prescription: { type: Object, default: null },
  profileDefaults: { type: Object, default: () => ({}) },
  planTitle: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'save'])

const formulaTriggerRef = ref(null)
const formulaPopoverOpen = ref(false)
const formulaPopoverStyle = ref({})
const formulaCloseTimer = ref(null)
const formulaPinnedOpen = ref(false)

const intervalHintTriggerRef = ref(null)
const intervalHintOpen = ref(false)
const intervalHintStyle = ref({})
const intervalHintCloseTimer = ref(null)
const intervalHintPinned = ref(false)

const draft = reactive(normalizeHydrationPrescription(null, {
  weightKg: props.profileDefaults?.weightKg,
  heightCm: props.profileDefaults?.heightCm,
}))

const activityOptions = HYDRATION_ACTIVITY_LEVELS.map((item) => ({ value: item.id, label: item.label }))

const breakdown = computed(() => computeHydrationBreakdown(draft))
const computedDailyMl = computed(() => breakdown.value.totalMl)
const dailyMl = computed(() => computeHydrationGoal(draft, draft.activeDay))
const formattedDaily = computed(() => formatHydrationAmount(dailyMl.value, draft.unit))
const formattedComputedDaily = computed(() => formatHydrationAmount(computedDailyMl.value, draft.unit))

const visibleDayTabs = computed(() => {
  if (draft.scheduleMode === 'daily') {
    return HYDRATION_DAY_IDS.filter((day) => day.id !== 'all')
  }
  return HYDRATION_DAY_IDS.filter((day) => day.id === 'all')
})

const intervalMl = computed(() => {
  if (!draft.useConsumptionWindow) {
    return Math.round((dailyMl.value || 0) / Math.max(1, Math.ceil(24 / (Number(draft.intervalHours) || 2))))
  }
  return hydrationPerReminder(dailyMl.value, draft.wakeTime, draft.bedTime, draft.intervalHours)
})

const formattedInterval = computed(() => formatHydrationAmount(intervalMl.value, draft.unit))
const intervalPreviewCups = computed(() => {
  if (!draft.useConsumptionWindow || !intervalMl.value) return ''
  return formatHydrationCups(intervalMl.value)
})

const showUndo = computed(() => hasManualHydrationOverride(draft, computedDailyMl.value))

const displayDailyAmount = computed(() => {
  const activeDay = draft.activeDay
  if (draft.scheduleMode === 'daily' && activeDay !== 'all') {
    const perDay = draft.dailyGoals?.[activeDay]
    if (perDay != null && Number(perDay) > 0) {
      return draft.unit === 'l' ? Number(perDay) / 1000 : Number(perDay)
    }
  }
  if (draft.customDailyMl != null && draft.customDailyMl > 0) {
    return draft.unit === 'l' ? draft.customDailyMl / 1000 : draft.customDailyMl
  }
  return draft.unit === 'l' ? computedDailyMl.value / 1000 : computedDailyMl.value
})

function mlFromDisplayInput(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return draft.unit === 'l' ? Math.round(num * 1000) : Math.round(num)
}

function onDailyAmountInput(event) {
  const ml = mlFromDisplayInput(event.target.value)
  draft.manualOverride = true
  if (draft.scheduleMode === 'daily' && draft.activeDay !== 'all') {
    if (ml == null) {
      delete draft.dailyGoals[draft.activeDay]
    } else {
      draft.dailyGoals[draft.activeDay] = ml
    }
    return
  }
  draft.customDailyMl = ml
}

function undoManualOverride() {
  draft.manualOverride = false
  draft.customDailyMl = null
  if (draft.scheduleMode === 'daily' && draft.activeDay !== 'all') {
    delete draft.dailyGoals[draft.activeDay]
  }
}

function setScheduleMode(mode) {
  draft.scheduleMode = mode
  if (mode === 'weekly') {
    draft.activeDay = 'all'
  } else if (draft.activeDay === 'all') {
    draft.activeDay = 'mon'
  }
}

function selectDay(dayId) {
  draft.activeDay = dayId
}

watch(() => draft.activityLevel, (level) => {
  if (level === 'sedentary') draft.activityDurationMin = null
})

watch(() => props.open, (value) => {
  if (!value) return
  Object.assign(
    draft,
    normalizeHydrationPrescription(props.prescription, {
      weightKg: props.profileDefaults?.weightKg,
      heightCm: props.profileDefaults?.heightCm,
      title: props.prescription?.title || props.planTitle || '',
    }),
  )
}, { immediate: true })

function formatBreakdownLine(ml) {
  return formatHydrationAmount(ml, draft.unit)
}

function clearFormulaCloseTimer() {
  if (formulaCloseTimer.value != null) {
    clearTimeout(formulaCloseTimer.value)
    formulaCloseTimer.value = null
  }
}

function updateFormulaPopoverPosition() {
  const trigger = formulaTriggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const panelWidth = Math.min(496, window.innerWidth - 24)
  const panelHeight = 280
  const gap = 8
  const pad = 12

  let left = rect.left
  let top = rect.bottom + gap

  if (top + panelHeight > window.innerHeight - pad) {
    top = rect.top - panelHeight - gap
  }
  if (top < pad) {
    top = pad
  }

  if (left + panelWidth > window.innerWidth - pad) {
    left = window.innerWidth - panelWidth - pad
  }
  left = Math.max(pad, left)

  formulaPopoverStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 6300,
  }
}

function toggleFormulaPopover() {
  clearFormulaCloseTimer()
  if (formulaPopoverOpen.value) {
    formulaPopoverOpen.value = false
    formulaPinnedOpen.value = false
    return
  }
  formulaPinnedOpen.value = true
  openFormulaPopover()
}

function openFormulaPopover() {
  clearFormulaCloseTimer()
  closeIntervalHint()
  updateFormulaPopoverPosition()
  formulaPopoverOpen.value = true
  nextTick(() => updateFormulaPopoverPosition())
}

function scheduleCloseFormulaPopover() {
  if (formulaPinnedOpen.value) return
  clearFormulaCloseTimer()
  formulaCloseTimer.value = setTimeout(() => {
    formulaPopoverOpen.value = false
    formulaCloseTimer.value = null
  }, 280)
}

function cancelCloseFormulaPopover() {
  clearFormulaCloseTimer()
}

function clearIntervalHintCloseTimer() {
  if (intervalHintCloseTimer.value != null) {
    clearTimeout(intervalHintCloseTimer.value)
    intervalHintCloseTimer.value = null
  }
}

function updateIntervalHintPosition() {
  const trigger = intervalHintTriggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const panelWidth = Math.min(416, window.innerWidth - 24)
  const panelHeight = 96
  const gap = 10
  const pad = 12

  let left = rect.left - 24
  let top = rect.top - panelHeight - gap

  if (top < pad) {
    top = rect.bottom + gap
  }

  if (left + panelWidth > window.innerWidth - pad) {
    left = window.innerWidth - panelWidth - pad
  }
  left = Math.max(pad, left)

  intervalHintStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 6300,
  }
}

function closeIntervalHint() {
  intervalHintOpen.value = false
  intervalHintPinned.value = false
}

function toggleIntervalHint() {
  clearIntervalHintCloseTimer()
  if (intervalHintOpen.value) {
    closeIntervalHint()
    return
  }
  intervalHintPinned.value = true
  openIntervalHint()
}

function openIntervalHint() {
  clearIntervalHintCloseTimer()
  formulaPopoverOpen.value = false
  formulaPinnedOpen.value = false
  updateIntervalHintPosition()
  intervalHintOpen.value = true
  nextTick(() => updateIntervalHintPosition())
}

function scheduleCloseIntervalHint() {
  if (intervalHintPinned.value) return
  clearIntervalHintCloseTimer()
  intervalHintCloseTimer.value = setTimeout(() => {
    intervalHintOpen.value = false
    intervalHintCloseTimer.value = null
  }, 280)
}

function cancelCloseIntervalHint() {
  clearIntervalHintCloseTimer()
}

function handleDocumentPointerDown(event) {
  const target = event.target
  if (!(target instanceof Node)) return

  if (formulaPopoverOpen.value && formulaPinnedOpen.value) {
    if (formulaTriggerRef.value?.contains(target)) return
    if (document.querySelector('.mph-formula')?.contains(target)) return
    formulaPopoverOpen.value = false
    formulaPinnedOpen.value = false
  }

  if (intervalHintOpen.value && intervalHintPinned.value) {
    if (intervalHintTriggerRef.value?.contains(target)) return
    if (document.querySelector('.mph-interval-hint')?.contains(target)) return
    closeIntervalHint()
  }
}

function setHotHumidClimate(value) {
  draft.hotHumidClimate = value
  draft.climate = value ? 'warm' : 'mild'
}

function close() {
  formulaPopoverOpen.value = false
  formulaPinnedOpen.value = false
  closeIntervalHint()
  emit('update:open', false)
}

function save() {
  emit('save', normalizeHydrationPrescription({ ...draft }))
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  clearFormulaCloseTimer()
  clearIntervalHintCloseTimer()
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<style scoped>
.mph-modal {
  --mph-water: #00b2ca;
  --mph-water-strong: #0099ad;
  --mph-water-soft: #eefafb;
  --mph-water-text: #0099ad;

  position: fixed;
  inset: 0;
  z-index: 6100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mph-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
}

.mph-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 56rem);
  max-height: min(92vh, 52rem);
  overflow: auto;
  padding: 0;
  display: grid;
  gap: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  font-weight: 400;
  border-radius: var(--cf-radius-control);
}

.mph-modal__panel :deep(.field--float label) {
  font-weight: 400;
}

.mph-modal__panel :deep(.field input),
.mph-modal__panel :deep(.field textarea),
.mph-modal__panel :deep(.cf-select-trigger) {
  font-weight: 400;
}

.mph-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.15rem 0.35rem;
}

.mph-modal__eyebrow,
.mph-modal__title-field {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.mph-modal__title-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mph-modal__title-input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.15rem 0;
  border: none;
  border-bottom: 1px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
  outline: none;
  cursor: text;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.mph-modal__title-input::placeholder {
  color: #9ca3af;
}

.mph-modal__title-input:hover {
  border-bottom-color: #e5e7eb;
}

.mph-modal__title-input:focus {
  border-bottom-color: var(--mph-water, #00b2ca);
  color: #374151;
}

.mph-modal__eyebrow {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #9ca3af;
}

.mph-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.mph-modal__close svg {
  width: 1.1rem;
  height: 1.1rem;
}

.mph-modal__close:hover {
  background: #f3f4f6;
  color: #374151;
}

.mph-mode {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0 1.15rem 0.65rem;
}

.mph-mode__label {
  font-size: 0.8125rem;
  color: #374151;
}

.mph-interval__preview {
  margin: 0;
  font-size: 0.74rem;
  color: var(--mph-water-text);
}

.mph-interval__preview span {
  color: #9ca3af;
}

.mph-quantity {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}

.mph-quantity__field {
  flex: 1;
}

.mph-undo-btn {
  min-height: 2.75rem !important;
  padding: 0.35rem 0.75rem !important;
  font-size: 0.78rem !important;
}

.mph-field--disabled :deep(input) {
  opacity: 0.55;
}

.mph-preview__interval-cups {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  color: #6b7280;
  font-weight: 400;
}

.mph-days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0 1.15rem 0.85rem;
  border-bottom: 1px solid #f0f1f3;
}

.mph-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0.35rem 0.7rem;
  min-height: calc(var(--cf-radius-control) * 2 + 0.2rem);
  border-radius: var(--cf-radius-control);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mph-tab--active {
  background: var(--mph-water);
  color: #fff;
}

.mph-tab:hover:not(.mph-tab--active) {
  color: #6b7280;
}

.mph-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(14rem, 0.85fr);
  gap: 1.25rem;
  align-items: start;
  padding: 1rem 1.15rem;
}

.mph-form {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
}

.mph-section-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mph-section-title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--mph-water-text);
}

.mph-section-title .cf-hydration-bottle {
  width: 1rem;
  height: auto;
}

.mph-section-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-full);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mph-section-hint:hover,
.mph-section-hint:focus-visible,
.mph-section-hint--open {
  background: #f3f4f6;
  color: #6b7280;
  outline: none;
}

.mph-section-hint svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mph-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.mph-field--suffix {
  position: relative;
}

.mph-field__suffix {
  position: absolute;
  right: 0.85rem;
  bottom: 0.72rem;
  font-size: 0.78rem;
  font-weight: 400;
  color: #9ca3af;
  pointer-events: none;
}

.mph-field--suffix :deep(input) {
  padding-right: 2.5rem !important;
}

.mph-climate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mph-climate__copy {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.mph-climate__copy strong {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
}

.mph-climate__copy span {
  font-size: 0.72rem;
  color: #9ca3af;
  line-height: 1.35;
}

.mph-toggle,
.mph-segment {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  flex-shrink: 0;
  padding: 0.2rem;
  border-radius: var(--cf-radius-control);
  background: #f3f4f6;
}

.mph-segment__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: calc(var(--cf-radius-control) * 1.75);
  border: none;
  background: transparent;
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-sm);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.mph-segment__btn--active {
  background: #fff;
  color: #374151;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.mph-interval {
  display: grid;
  gap: 0.55rem;
}

.mph-interval__head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.mph-interval__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
  cursor: pointer;
}

.mph-interval__label span {
  font-weight: inherit;
}

.mph-interval__label input {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: var(--mph-water);
}

.mph-interval__info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-full);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mph-interval__info-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mph-interval__info-btn:hover,
.mph-interval__info-btn:focus-visible,
.mph-interval__info-btn--open {
  background: #f3f4f6;
  color: #6b7280;
  outline: none;
}

.mph-interval__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.mph-interval__grid--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.mph-units {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.mph-units__label {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
}

.mph-preview {
  display: grid;
  gap: 0.65rem;
  align-content: start;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
}

.mph-preview__head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
}

.mph-preview__head .cf-hydration-bottle {
  flex-shrink: 0;
  color: var(--mph-water);
}

.mph-preview__block {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem 0.85rem;
  border-radius: var(--cf-radius-control);
  background: var(--mph-water-soft);
  overflow: hidden;
}

.mph-preview__block-label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--mph-water-text);
}

.mph-preview__block-value {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--mph-water-text);
  font-variant-numeric: tabular-nums;
}

.mph-preview__block-value span {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #9ca3af;
  margin-left: 0.1rem;
}

.mph-preview__breakdown {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.15rem;
}

.mph-preview__breakdown li {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--mph-water-text);
  line-height: 1.4;
}

.mph-preview__block--interval {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.mph-preview__interval-label {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--mph-water-text);
}

.mph-preview__interval-value {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--mph-water-text);
  font-variant-numeric: tabular-nums;
}

.mph-modal__foot {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.85rem 1.15rem 1rem;
  border-top: 1px solid #f0f1f3;
  background: #fff;
}

.mph-modal__btn {
  width: auto !important;
  min-height: 2.75rem !important;
  padding: 0.45rem 1.15rem !important;
  font-size: 0.875rem !important;
  font-weight: 400 !important;
}

.mph-modal__btn--save {
  background: var(--mph-water-strong) !important;
  border-color: var(--mph-water-strong) !important;
}

.mph-modal__btn--save:hover:not(:disabled) {
  background: var(--mph-water) !important;
}

@media (max-width: 768px) {
  .mph-layout {
    grid-template-columns: 1fr;
  }

  .mph-interval__grid {
    grid-template-columns: 1fr;
  }
}
</style>
