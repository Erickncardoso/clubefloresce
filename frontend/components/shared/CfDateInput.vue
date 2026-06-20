<template>
  <div
    ref="rootRef"
    class="cf-date-input"
    :class="{ 'cf-date-input--open': open, 'cf-date-input--disabled': disabled }"
  >
    <button
      :id="id"
      type="button"
      class="cf-date-input-trigger cf-squircle cf-squircle--control"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <Calendar class="cf-date-input-icon" aria-hidden="true" />
      <span class="cf-date-input-value" :class="{ 'cf-date-input-value--placeholder': !modelValue }">
        {{ displayValue }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="cf-date-panel cf-squircle cf-squircle--control"
        role="dialog"
        aria-label="Selecionar data"
        :style="panelStyle"
      >
        <div class="cf-date-panel-head">
          <button type="button" class="cf-date-nav" aria-label="Mês anterior" @click="prevMonth">
            <ChevronLeft class="cf-date-nav-icon" />
          </button>

          <div class="cf-date-panel-title">
            {{ monthLabel }}
          </div>

          <button type="button" class="cf-date-nav" aria-label="Próximo mês" @click="nextMonth">
            <ChevronRight class="cf-date-nav-icon" />
          </button>
        </div>

        <div class="cf-date-weekdays" aria-hidden="true">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>

        <div class="cf-date-grid" role="grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            role="gridcell"
            class="cf-date-day"
            :class="{
              'cf-date-day--outside': !cell.inMonth,
              'cf-date-day--today': cell.isToday,
              'cf-date-day--selected': cell.isSelected,
              'cf-date-day--disabled': cell.disabled,
            }"
            :disabled="cell.disabled"
            :aria-label="cell.label"
            :aria-selected="cell.isSelected"
            @click="selectDate(cell.iso)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div class="cf-date-panel-foot">
          <button v-if="!required" type="button" class="cf-date-foot-btn" @click="clearDate">
            Limpar
          </button>
          <span v-else aria-hidden="true" />
          <button type="button" class="cf-date-foot-btn cf-date-foot-btn--primary" @click="selectToday">
            Hoje
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: undefined,
  },
  min: {
    type: String,
    default: undefined,
  },
  max: {
    type: String,
    default: undefined,
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: 'dd/mm/aaaa',
  },
})

const emit = defineEmits(['update:modelValue'])

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  return formatDisplay(props.modelValue)
})

const monthLabel = computed(() => {
  const name = monthNames[viewMonth.value] || ''
  return `${name} de ${viewYear.value}`
})

const todayIso = computed(() => toIsoDate(new Date()))

const calendarCells = computed(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(viewYear.value, viewMonth.value, dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    const iso = toIsoDate(date)

    cells.push({
      key: `${viewYear.value}-${viewMonth.value}-${i}`,
      day: date.getDate(),
      iso,
      inMonth,
      isToday: iso === todayIso.value,
      isSelected: iso === props.modelValue,
      disabled: isDisabled(iso),
      label: date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    })
  }

  return cells
})

function parseIso(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(value) {
  const date = parseIso(value)
  if (!date) return props.placeholder
  return date.toLocaleDateString('pt-BR')
}

function isDisabled(iso) {
  if (props.min && iso < props.min) return true
  if (props.max && iso > props.max) return true
  return false
}

function syncViewToValue() {
  const date = parseIso(props.modelValue) || new Date()
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
}

function updatePanelPosition() {
  const root = rootRef.value
  if (!root) return

  const rect = root.getBoundingClientRect()
  const panelHeight = 360
  const gap = 6
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < panelHeight && rect.top > panelHeight

  panelStyle.value = {
    position: 'fixed',
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12))}px`,
    width: `${Math.min(Math.max(rect.width, 300), 320)}px`,
    top: openAbove ? `${rect.top - panelHeight - gap}px` : `${rect.bottom + gap}px`,
    zIndex: 12000,
  }
}

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    syncViewToValue()
    nextTick(() => updatePanelPosition())
  }
}

function selectDate(iso) {
  if (isDisabled(iso)) return
  emit('update:modelValue', iso)
  close()
}

function clearDate() {
  if (props.required) return
  emit('update:modelValue', '')
  close()
}

function selectToday() {
  const iso = todayIso.value
  if (isDisabled(iso)) return
  emit('update:modelValue', iso)
  close()
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function onDocumentClick(event) {
  if (!open.value) return
  const target = event.target
  if (rootRef.value?.contains(target) || panelRef.value?.contains(target)) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

watch(() => props.modelValue, () => {
  if (open.value) syncViewToValue()
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
})
</script>

<style scoped>
.cf-date-input {
  position: relative;
  width: 100%;
}

.cf-date-input-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field--float .cf-date-input-trigger {
  padding-top: 0.95rem;
}

.cf-date-input-trigger:hover:not(:disabled) {
  border-color: #d4e5d1;
}

.cf-date-input-trigger:focus-visible {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-date-input--open .cf-date-input-trigger {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-date-input-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cf-date-input-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  color: #8a9a92;
}

.cf-date-input--open .cf-date-input-icon,
.cf-date-input-trigger:focus-visible .cf-date-input-icon {
  color: #8B967C;
}

.cf-date-input-value {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a2e24;
}

.cf-date-input-value--placeholder {
  color: #9aa8a2;
}

.cf-date-panel {
  overflow: hidden;
  border: 1px solid #e2e8e4;
  background: #fff;
  padding: 0.85rem 0.85rem 0.7rem;
  box-shadow:
    0 4px 6px rgba(26, 46, 36, 0.04),
    0 14px 32px rgba(26, 46, 36, 0.12);
}

.cf-date-panel-head {
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.cf-date-panel-title {
  text-align: center;
  font-size: 0.88rem;
  font-weight: 700;
  color: #1a2e24;
  text-transform: capitalize;
  line-height: 1.2;
}

.cf-date-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-icon, 0.875rem);
  background: #f4f8f3;
  color: #8B967C;
  cursor: pointer;
  transition: background 0.12s ease;
}

.cf-date-nav:hover {
  background: #eaf3e8;
}

.cf-date-nav:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-date-nav-icon {
  width: 1rem;
  height: 1rem;
}

.cf-date-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
  margin-bottom: 0.35rem;
}

.cf-date-weekdays span {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8a9a92;
}

.cf-date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
}

.cf-date-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border: none;
  border-radius: var(--cf-radius-icon, 0.875rem);
  background: transparent;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cf-date-day:hover:not(:disabled) {
  background: #f4f8f3;
}

.cf-date-day--outside {
  color: #7a8a82;
  font-weight: 500;
}

.cf-date-day--outside:hover:not(:disabled) {
  background: #f0f4f1;
  color: #5c6b64;
}

.cf-date-day--today:not(.cf-date-day--selected) {
  color: #8B967C;
  font-weight: 700;
  box-shadow: inset 0 0 0 1.5px #cfe3cb;
}

.cf-date-day--selected {
  background: #8B967C;
  color: #fff;
  font-weight: 700;
}

.cf-date-day--selected:hover:not(:disabled) {
  background: #3a6f34;
}

.cf-date-day--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cf-date-day--outside.cf-date-day--disabled {
  opacity: 0.55;
  color: #a3aea8;
}

.cf-date-day:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-date-panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.7rem;
  padding-top: 0.65rem;
  border-top: 1px solid #eef2ef;
}

.cf-date-foot-btn {
  border: none;
  background: transparent;
  color: #5c6b64;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.35rem 0.5rem;
  border-radius: var(--cf-radius-pill);
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
}

.cf-date-foot-btn:hover {
  color: #8B967C;
  background: #f4f8f3;
}

.cf-date-foot-btn--primary {
  color: #8B967C;
}

.cf-date-foot-btn:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 2px;
}

@supports (corner-shape: squircle) {
  .cf-date-input-trigger.cf-squircle--control,
  .cf-date-panel.cf-squircle--control {
    corner-shape: squircle;
  }

  .cf-date-day {
    corner-shape: squircle;
  }
}
</style>
