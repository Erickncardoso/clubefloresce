<template>
  <div
    ref="rootRef"
    class="cf-dt-input"
    :class="{ 'cf-dt-input--open': open, 'cf-dt-input--disabled': disabled }"
  >
    <button
      :id="id"
      type="button"
      class="cf-dt-trigger cf-squircle cf-squircle--control"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <Calendar class="cf-dt-trigger-icon" aria-hidden="true" />
      <span class="cf-dt-trigger-value" :class="{ 'cf-dt-trigger-value--placeholder': !modelValue }">
        {{ displayValue }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="cf-dt-panel cf-squircle cf-squircle--control"
        role="dialog"
        aria-label="Selecionar data e hora"
        :style="panelStyle"
      >
        <div class="cf-dt-panel-body">
          <section class="cf-dt-calendar" aria-label="Data">
            <div class="cf-dt-panel-head">
              <button type="button" class="cf-dt-nav" aria-label="Mês anterior" @click="prevMonth">
                <ChevronLeft class="cf-dt-nav-icon" />
              </button>
              <div class="cf-dt-panel-title">{{ monthLabel }}</div>
              <button type="button" class="cf-dt-nav" aria-label="Próximo mês" @click="nextMonth">
                <ChevronRight class="cf-dt-nav-icon" />
              </button>
            </div>

            <div class="cf-dt-weekdays" aria-hidden="true">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>

            <div class="cf-dt-grid" role="grid">
              <button
                v-for="cell in calendarCells"
                :key="cell.key"
                type="button"
                role="gridcell"
                class="cf-dt-day"
                :class="{
                  'cf-dt-day--outside': !cell.inMonth,
                  'cf-dt-day--today': cell.isToday,
                  'cf-dt-day--selected': cell.isSelected,
                  'cf-dt-day--disabled': cell.disabled,
                }"
                :disabled="cell.disabled"
                :aria-label="cell.label"
                :aria-selected="cell.isSelected"
                @click="selectDate(cell.iso)"
              >
                {{ cell.day }}
              </button>
            </div>
          </section>

          <section class="cf-dt-time" aria-label="Hora">
            <p class="cf-dt-time-label">Horário</p>
            <div class="cf-dt-time-pickers">
              <div class="cf-dt-time-col">
                <span class="cf-dt-time-col-title">Hora</span>
                <div class="cf-dt-time-scroll" ref="hourListRef">
                  <button
                    v-for="hour in hourOptions"
                    :key="hour"
                    type="button"
                    class="cf-dt-time-option"
                    :class="{ 'cf-dt-time-option--selected': pendingHour === hour }"
                    @click="pendingHour = hour"
                  >
                    {{ String(hour).padStart(2, '0') }}
                  </button>
                </div>
              </div>
              <span class="cf-dt-time-sep" aria-hidden="true">:</span>
              <div class="cf-dt-time-col">
                <span class="cf-dt-time-col-title">Min</span>
                <div class="cf-dt-time-scroll" ref="minuteListRef">
                  <button
                    v-for="minute in minuteOptions"
                    :key="minute"
                    type="button"
                    class="cf-dt-time-option"
                    :class="{ 'cf-dt-time-option--selected': pendingMinute === minute }"
                    @click="pendingMinute = minute"
                  >
                    {{ String(minute).padStart(2, '0') }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="cf-dt-panel-foot">
          <button v-if="!required" type="button" class="cf-dt-foot-btn" @click="clearValue">
            Limpar
          </button>
          <span v-else aria-hidden="true" />
          <div class="cf-dt-foot-actions">
            <button type="button" class="cf-dt-foot-btn" @click="selectNow">
              Agora
            </button>
            <button type="button" class="cf-dt-foot-btn cf-dt-foot-btn--primary" @click="confirmSelection">
              Confirmar
            </button>
          </div>
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
    default: 'dd/mm/aaaa às hh:mm',
  },
})

const emit = defineEmits(['update:modelValue'])

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const hourOptions = Array.from({ length: 24 }, (_, i) => i)
const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5)

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const hourListRef = ref(null)
const minuteListRef = ref(null)
const panelStyle = ref({})
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const pendingDate = ref('')
const pendingHour = ref(9)
const pendingMinute = ref(0)

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
      isSelected: iso === pendingDate.value,
      disabled: isDateDisabled(iso),
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

function parseDateTime(value) {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  return {
    date: match[1],
    hour: Number(match[2]),
    minute: Number(match[3]),
  }
}

function parseIsoDate(value) {
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

function roundMinuteToStep(minute) {
  const rounded = Math.round(minute / 5) * 5
  return rounded >= 60 ? 55 : rounded
}

function toModelValue(date, hour, minute) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatDisplay(value) {
  const parsed = parseDateTime(value)
  if (!parsed) return props.placeholder
  const date = parseIsoDate(parsed.date)
  if (!date) return props.placeholder
  const dateStr = date.toLocaleDateString('pt-BR')
  const timeStr = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
  return `${dateStr} às ${timeStr}`
}

function isDateDisabled(iso) {
  if (!props.min) return false
  const minParsed = parseDateTime(props.min)
  if (!minParsed) return false
  return iso < minParsed.date
}

function syncPendingFromValue() {
  const parsed = parseDateTime(props.modelValue)
  const now = new Date()

  if (parsed) {
    pendingDate.value = parsed.date
    pendingHour.value = parsed.hour
    pendingMinute.value = roundMinuteToStep(parsed.minute)
    const date = parseIsoDate(parsed.date) || now
    viewYear.value = date.getFullYear()
    viewMonth.value = date.getMonth()
  } else {
    pendingDate.value = toIsoDate(now)
    pendingHour.value = now.getHours()
    pendingMinute.value = roundMinuteToStep(now.getMinutes())
    viewYear.value = now.getFullYear()
    viewMonth.value = now.getMonth()
  }
}

function scrollSelectedTimeIntoView() {
  nextTick(() => {
    const hourBtn = hourListRef.value?.querySelector('.cf-dt-time-option--selected')
    const minuteBtn = minuteListRef.value?.querySelector('.cf-dt-time-option--selected')
    hourBtn?.scrollIntoView({ block: 'center' })
    minuteBtn?.scrollIntoView({ block: 'center' })
  })
}

function updatePanelPosition() {
  const root = rootRef.value
  if (!root) return

  const rect = root.getBoundingClientRect()
  const panelHeight = 420
  const gap = 6
  const panelWidth = Math.min(420, window.innerWidth - 24)
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < panelHeight && rect.top > panelHeight

  panelStyle.value = {
    position: 'fixed',
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))}px`,
    width: `${panelWidth}px`,
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
    syncPendingFromValue()
    nextTick(() => {
      updatePanelPosition()
      scrollSelectedTimeIntoView()
    })
  }
}

function selectDate(iso) {
  if (isDateDisabled(iso)) return
  pendingDate.value = iso
}

function confirmSelection() {
  if (!pendingDate.value) return
  emit('update:modelValue', toModelValue(pendingDate.value, pendingHour.value, pendingMinute.value))
  close()
}

function clearValue() {
  if (props.required) return
  emit('update:modelValue', '')
  close()
}

function selectNow() {
  const now = new Date()
  pendingDate.value = toIsoDate(now)
  pendingHour.value = now.getHours()
  pendingMinute.value = roundMinuteToStep(now.getMinutes())
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  scrollSelectedTimeIntoView()
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
  if (open.value) syncPendingFromValue()
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
.cf-dt-input {
  position: relative;
  width: 100%;
}

.cf-dt-trigger {
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

.field--float .cf-dt-trigger,
.dispatch-field .cf-dt-trigger {
  padding-top: 0.95rem;
}

.cf-dt-trigger:hover:not(:disabled) {
  border-color: #d4e5d1;
}

.cf-dt-trigger:focus-visible {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-dt-input--open .cf-dt-trigger {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-dt-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cf-dt-trigger-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  color: #8a9a92;
}

.cf-dt-input--open .cf-dt-trigger-icon,
.cf-dt-trigger:focus-visible .cf-dt-trigger-icon {
  color: #8B967C;
}

.cf-dt-trigger-value {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a2e24;
}

.cf-dt-trigger-value--placeholder {
  color: #9aa8a2;
}

.cf-dt-panel {
  overflow: hidden;
  border: 1px solid #e2e8e4;
  background: #fff;
  padding: 0.85rem;
  box-shadow:
    0 4px 6px rgba(26, 46, 36, 0.04),
    0 14px 32px rgba(26, 46, 36, 0.12);
}

.cf-dt-panel-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: start;
}

.cf-dt-panel-head {
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}

.cf-dt-panel-title {
  text-align: center;
  font-size: 0.84rem;
  font-weight: 700;
  color: #1a2e24;
  text-transform: capitalize;
  line-height: 1.2;
}

.cf-dt-nav {
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

.cf-dt-nav:hover {
  background: #eaf3e8;
}

.cf-dt-nav:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-dt-nav-icon {
  width: 1rem;
  height: 1rem;
}

.cf-dt-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.1rem;
  margin-bottom: 0.3rem;
}

.cf-dt-weekdays span {
  text-align: center;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8a9a92;
}

.cf-dt-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.1rem;
}

.cf-dt-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  max-height: 2rem;
  border: none;
  border-radius: var(--cf-radius-icon, 0.875rem);
  background: transparent;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cf-dt-day:hover:not(:disabled) {
  background: #f4f8f3;
}

.cf-dt-day--outside {
  color: #9aa8a2;
}

.cf-dt-day--today:not(.cf-dt-day--selected) {
  color: #8B967C;
  font-weight: 700;
  box-shadow: inset 0 0 0 1.5px #cfe3cb;
}

.cf-dt-day--selected {
  background: #8B967C;
  color: #fff;
  font-weight: 700;
}

.cf-dt-day--selected:hover:not(:disabled) {
  background: #3a6f34;
}

.cf-dt-day--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cf-dt-day:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-dt-time {
  display: flex;
  flex-direction: column;
  min-width: 5.5rem;
  padding-left: 0.65rem;
  border-left: 1px solid #eef2ef;
}

.cf-dt-time-label {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #8a9a92;
}

.cf-dt-time-pickers {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.cf-dt-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 2.5rem;
}

.cf-dt-time-col-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: #8a9a92;
}

.cf-dt-time-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 9.5rem;
  overflow-y: auto;
  padding: 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: #cfe3cb transparent;
}

.cf-dt-time-scroll::-webkit-scrollbar {
  width: 4px;
}

.cf-dt-time-scroll::-webkit-scrollbar-thumb {
  background: #cfe3cb;
  border-radius: 999px;
}

.cf-dt-time-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.35rem;
  padding: 0.35rem 0.45rem;
  border: none;
  border-radius: var(--cf-radius-icon, 0.75rem);
  background: transparent;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cf-dt-time-option:hover {
  background: #f4f8f3;
}

.cf-dt-time-option--selected {
  background: #8B967C;
  color: #fff;
}

.cf-dt-time-option--selected:hover {
  background: #3a6f34;
}

.cf-dt-time-option:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-dt-time-sep {
  font-size: 1rem;
  font-weight: 700;
  color: #8B967C;
  padding-top: 1.1rem;
}

.cf-dt-panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid #eef2ef;
}

.cf-dt-foot-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.cf-dt-foot-btn {
  border: none;
  background: transparent;
  color: #5c6b64;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.4rem 0.65rem;
  border-radius: var(--cf-radius-pill);
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
}

.cf-dt-foot-btn:hover {
  color: #8B967C;
  background: #f4f8f3;
}

.cf-dt-foot-btn--primary {
  color: #fff;
  background: #8B967C;
}

.cf-dt-foot-btn--primary:hover {
  background: #3a6f34;
  color: #fff;
}

.cf-dt-foot-btn:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .cf-dt-panel-body {
    grid-template-columns: 1fr;
  }

  .cf-dt-time {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid #eef2ef;
    padding-top: 0.65rem;
  }

  .cf-dt-time-pickers {
    justify-content: center;
  }
}

@supports (corner-shape: squircle) {
  .cf-dt-trigger.cf-squircle--control,
  .cf-dt-panel.cf-squircle--control {
    corner-shape: squircle;
  }

  .cf-dt-day,
  .cf-dt-time-option {
    corner-shape: squircle;
  }
}
</style>
