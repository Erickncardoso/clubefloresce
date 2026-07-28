<template>
  <div class="gcal admin-shell-card">
    <aside class="gcal-sidebar">
      <button type="button" class="btn-primary gcal-sidebar__create" @click="$emit('new-appointment')">
        + Adicionar agendamento
      </button>

      <AgendaMiniCalendar
        v-model="anchorDateModel"
        :range-start="rangeStart"
        :range-end="rangeEnd"
      />
    </aside>

    <section class="gcal-main">
      <header class="gcal-toolbar">
        <div class="gcal-toolbar__left">
          <button type="button" class="btn-secondary gcal-toolbar__nav" @click="goPrev">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" class="btn-secondary gcal-toolbar__today" @click="goToday">
            Hoje
          </button>
          <button type="button" class="btn-secondary gcal-toolbar__nav" @click="goNext">
            <ChevronRight aria-hidden="true" />
          </button>

          <div class="gcal-toolbar__date">
            <select v-model.number="pickerMonth" class="gcal-select" aria-label="Mês">
              <option v-for="(name, index) in monthNames" :key="name" :value="index">
                {{ capitalize(name) }}
              </option>
            </select>
            <select v-model.number="pickerYear" class="gcal-select gcal-select--year" aria-label="Ano">
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>

          <p class="gcal-toolbar__range">{{ rangeLabel }}</p>
        </div>

        <div class="gcal-toolbar__right">
          <label class="gcal-search">
            <Search aria-hidden="true" />
            <input
              :value="searchQuery"
              type="search"
              placeholder="Pesquisar e pressione Enter"
              aria-label="Pesquisar na agenda"
              @input="$emit('update:searchQuery', $event.target.value)"
              @keydown.enter.prevent="$emit('search-submit')"
            >
          </label>

          <div class="gcal-view-toggle" role="tablist" aria-label="Visualização">
            <button
              type="button"
              role="tab"
              class="gcal-view-toggle__btn"
              :class="{ 'gcal-view-toggle__btn--active': viewMode === 'day' }"
              @click="viewMode = 'day'"
            >
              Dia
            </button>
            <button
              type="button"
              role="tab"
              class="gcal-view-toggle__btn"
              :class="{ 'gcal-view-toggle__btn--active': viewMode === 'week' }"
              @click="viewMode = 'week'"
            >
              Semana
            </button>
            <button
              type="button"
              role="tab"
              class="gcal-view-toggle__btn"
              :class="{ 'gcal-view-toggle__btn--active': viewMode === 'month' }"
              @click="viewMode = 'month'"
            >
              Mês
            </button>
          </div>
        </div>
      </header>

      <div v-if="loading" class="gcal-state">Carregando agenda…</div>
      <div v-else-if="loadError" class="gcal-state gcal-state--error">{{ loadError }}</div>

      <!-- Semana / Dia -->
      <div v-else-if="viewMode !== 'month'" class="gcal-time-wrap">
        <div class="gcal-time-head">
          <div class="gcal-time-head__gutter" aria-hidden="true" />
          <div
            class="gcal-time-head__days"
            :style="{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="day in visibleDays"
              :key="`head-${day.key}`"
              class="gcal-time-head__day"
              :class="{ 'gcal-time-head__day--today': day.isToday }"
            >
              <span>{{ day.weekdayLabel }}</span>
              <strong>{{ day.dayNumber }}</strong>
            </div>
          </div>
        </div>

        <div ref="scrollRef" class="gcal-time-scroll">
          <div class="gcal-time-grid" :style="gridStyle">
            <div class="gcal-time-gutter">
              <div
                v-for="slot in hourLabels"
                :key="slot.hour"
                class="gcal-time-gutter__label"
              >
                {{ slot.label }}
              </div>
            </div>

            <div
              class="gcal-time-columns"
              :style="{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }"
            >
              <div
                v-for="day in visibleDays"
                :key="`col-${day.key}`"
                class="gcal-time-column"
                :class="{
                  'gcal-time-column--today': day.isToday,
                  'gcal-time-column--dragging': dragState?.dayKey === day.key,
                }"
                @pointerdown="onColumnPointerDown(day, $event)"
              >
                <div
                  v-for="slot in hourLabels"
                  :key="`${day.key}-${slot.hour}`"
                  class="gcal-time-column__hour"
                />

                <div
                  v-if="selectionStyleForDay(day.key)"
                  class="gcal-selection"
                  :style="selectionStyleForDay(day.key)"
                  aria-hidden="true"
                />

                <button
                  v-for="item in appointmentsForDay(day.key)"
                  :key="item.id"
                  type="button"
                  class="gcal-event"
                  :style="eventBlockStyle(item)"
                  @pointerdown.stop
                  @click.stop="$emit('open-appointment', item)"
                >
                  <strong>{{ formatAgendaTime(item.startsAt) }} · {{ item.patientName }}</strong>
                  <span>{{ item.title }}</span>
                </button>

                <div
                  v-if="day.isToday && currentTimeOffset != null"
                  class="gcal-now-line"
                  :style="{ top: `${currentTimeOffset}px` }"
                  aria-hidden="true"
                >
                  <span class="gcal-now-line__dot" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="gcal-drag-hint">Arraste na grade para selecionar horário · clique em um evento para editar</p>
      </div>

      <!-- Mês -->
      <div v-else class="gcal-month">
        <div class="gcal-month__weekdays" aria-hidden="true">
          <span v-for="label in WEEKDAY_LABELS" :key="label">{{ label }}</span>
        </div>
        <div class="gcal-month__grid">
          <button
            v-for="cell in monthCells"
            :key="cell.key"
            type="button"
            class="gcal-month__cell"
            :class="{
              'gcal-month__cell--outside': !cell.inMonth,
              'gcal-month__cell--today': cell.isToday,
            }"
            @click="openDayFromMonth(cell)"
          >
            <span class="gcal-month__day">{{ cell.dayNumber }}</span>
            <div class="gcal-month__events">
              <span
                v-for="item in appointmentsForDay(cell.key).slice(0, 3)"
                :key="item.id"
                class="gcal-month__chip"
                :style="{ background: getEventColorStyle(item.patientId).accent }"
              >
                {{ formatAgendaTime(item.startsAt) }} {{ item.patientName }}
              </span>
              <small v-if="appointmentsForDay(cell.key).length > 3">
                +{{ appointmentsForDay(cell.key).length - 3 }} mais
              </small>
            </div>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import AgendaMiniCalendar from '~/components/agenda/AgendaMiniCalendar.vue'
import {
  AGENDA_DAY_END_HOUR,
  AGENDA_DAY_START_HOUR,
  AGENDA_HOUR_HEIGHT_PX,
  WEEKDAY_LABELS,
  addDays,
  buildHourLabels,
  buildMonthGrid,
  buildSlotDateTimeFromMinutes,
  buildWeekDays,
  endOfMonth,
  endOfWeek,
  filterAppointmentsByQuery,
  formatAgendaTime,
  formatWeekRangeLabel,
  getCurrentTimeLineOffset,
  getEventColorStyle,
  groupAppointmentsByDay,
  layoutAgendaEvent,
  minutesToPx,
  normalizeDraggedRange,
  startOfMonth,
  startOfWeek,
  toDateKey,
  yPxToMinutes,
} from '~/utils/agenda-calendar.js'

const props = defineProps({
  loading: { type: Boolean, default: false },
  loadError: { type: String, default: '' },
  appointments: { type: Array, default: () => [] },
  anchorDate: { type: Date, required: true },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits([
  'update:anchorDate',
  'update:searchQuery',
  'update:viewMode',
  'open-appointment',
  'schedule-slot',
  'search-submit',
  'new-appointment',
  'clear-selection',
])

const viewMode = ref('week')
const scrollRef = ref(null)
const nowTick = ref(Date.now())
const pickerMonth = ref(props.anchorDate.getMonth())
const pickerYear = ref(props.anchorDate.getFullYear())
const dragState = ref(null)
const selectionPreview = ref(null)

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const hourLabels = buildHourLabels()
let nowTimer = null

const anchorDateModel = computed({
  get: () => props.anchorDate,
  set: (value) => emit('update:anchorDate', value),
})

const visibleAppointments = computed(() => (
  filterAppointmentsByQuery(props.appointments, props.searchQuery)
))

const groupedByDay = computed(() => groupAppointmentsByDay(visibleAppointments.value))

const visibleDays = computed(() => {
  if (viewMode.value === 'day') {
    const date = props.anchorDate
    return [{
      key: toDateKey(date),
      date,
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
      dayNumber: date.getDate(),
      isToday: toDateKey(date) === toDateKey(new Date()),
    }]
  }
  return buildWeekDays(props.anchorDate, 0)
})

const monthCells = computed(() => buildMonthGrid(props.anchorDate))

const rangeStart = computed(() => {
  if (viewMode.value === 'month') return startOfMonth(props.anchorDate)
  if (viewMode.value === 'day') return props.anchorDate
  return startOfWeek(props.anchorDate, 0)
})

const rangeEnd = computed(() => {
  if (viewMode.value === 'month') return endOfMonth(props.anchorDate)
  if (viewMode.value === 'day') return props.anchorDate
  return endOfWeek(props.anchorDate, 0)
})

const rangeLabel = computed(() => {
  if (viewMode.value === 'day') {
    return props.anchorDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  if (viewMode.value === 'month') {
    return props.anchorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  const days = visibleDays.value
  if (!days.length) return ''
  return formatWeekRangeLabel(days[0].date, days[days.length - 1].date)
})

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - 2 + i)
})

const gridStyle = computed(() => ({
  '--gcal-hour-height': `${AGENDA_HOUR_HEIGHT_PX}px`,
  '--gcal-hours': hourLabels.length,
}))

const currentTimeOffset = computed(() => {
  void nowTick.value
  return getCurrentTimeLineOffset()
})

watch(viewMode, (mode) => {
  emit('update:viewMode', mode)
})

watch(
  () => props.anchorDate,
  (date) => {
    pickerMonth.value = date.getMonth()
    pickerYear.value = date.getFullYear()
  },
)

watch([pickerMonth, pickerYear], ([month, year]) => {
  const next = new Date(props.anchorDate)
  const day = Math.min(next.getDate(), new Date(year, month + 1, 0).getDate())
  next.setFullYear(year, month, day)
  if (next.getTime() !== props.anchorDate.getTime()) {
    emit('update:anchorDate', next)
  }
})

watch(viewMode, () => {
  nextTick(() => scrollToBusinessHours())
})

onMounted(() => {
  nowTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 60_000)
  nextTick(() => scrollToBusinessHours())
})

onBeforeUnmount(() => {
  if (nowTimer) window.clearInterval(nowTimer)
  stopDragListeners()
})

function capitalize(text) {
  return String(text).charAt(0).toUpperCase() + String(text).slice(1)
}

function clearSelectionPreview() {
  selectionPreview.value = null
}

defineExpose({ clearSelectionPreview })

function selectionStyleForDay(dayKey) {
  const source = dragState.value?.dayKey === dayKey
    ? {
      startMinutes: Math.min(dragState.value.startMinutes, dragState.value.currentMinutes),
      endMinutes: Math.max(dragState.value.startMinutes, dragState.value.currentMinutes),
    }
    : selectionPreview.value?.dayKey === dayKey
      ? selectionPreview.value
      : null
  if (!source) return null
  const range = normalizeDraggedRange(source.startMinutes, source.endMinutes)
  const top = minutesToPx(range.startMinutes)
  const height = Math.max(minutesToPx(range.endMinutes) - top, 20)
  return {
    top: `${top}px`,
    height: `${height}px`,
  }
}

function stopDragListeners() {
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('pointerup', onDocumentPointerUp)
  document.removeEventListener('pointercancel', onDocumentPointerUp)
}

function onColumnPointerDown(day, event) {
  if (event.button !== 0) return
  if (event.target.closest('.gcal-event')) return

  const column = event.currentTarget
  const rect = column.getBoundingClientRect()
  const y = Math.max(0, Math.min(column.offsetHeight, event.clientY - rect.top))
  const minutes = yPxToMinutes(y)

  dragState.value = {
    dayKey: day.key,
    day,
    columnEl: column,
    startMinutes: minutes,
    currentMinutes: minutes,
    moved: false,
  }
  selectionPreview.value = null
  emit('clear-selection')

  stopDragListeners()
  document.addEventListener('pointermove', onDocumentPointerMove)
  document.addEventListener('pointerup', onDocumentPointerUp)
  document.addEventListener('pointercancel', onDocumentPointerUp)
  column.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function onDocumentPointerMove(event) {
  if (!dragState.value) return
  const column = dragState.value.columnEl
  if (!column) return
  const rect = column.getBoundingClientRect()
  const y = Math.max(0, Math.min(column.offsetHeight, event.clientY - rect.top))
  const next = yPxToMinutes(y)
  if (Math.abs(next - dragState.value.startMinutes) >= 8) {
    dragState.value.moved = true
  }
  dragState.value.currentMinutes = next
}

function onDocumentPointerUp(event) {
  if (!dragState.value) return

  const { day, dayKey, startMinutes, currentMinutes, moved, columnEl } = dragState.value
  const range = normalizeDraggedRange(startMinutes, currentMinutes)
  selectionPreview.value = { dayKey, ...range }

  const startsAt = buildSlotDateTimeFromMinutes(dayKey, range.startMinutes)
  const colRect = columnEl?.getBoundingClientRect?.() || { right: event.clientX, top: event.clientY }
  const topPx = minutesToPx(range.startMinutes)
  const heightPx = Math.max(minutesToPx(range.endMinutes) - topPx, 24)

  emit('schedule-slot', {
    dayKey,
    startsAt,
    durationMin: range.durationMin,
    endMinutes: range.endMinutes,
    patientId: '',
    anchor: {
      x: colRect.right,
      y: colRect.top + topPx,
      width: 6,
      height: heightPx,
    },
    quickClick: !moved,
  })

  dragState.value = null
  stopDragListeners()
  try {
    columnEl?.releasePointerCapture?.(event.pointerId)
  } catch { /* ignore */ }
}

function appointmentsForDay(dayKey) {
  return groupedByDay.value.get(dayKey) || []
}

function eventBlockStyle(item) {
  const layout = layoutAgendaEvent(item)
  const colors = getEventColorStyle(item.patientId || item.id)
  return {
    top: `${layout.top}px`,
    height: `${layout.height}px`,
    background: colors.bg,
    borderLeftColor: colors.accent,
    color: colors.text,
  }
}

function openDayFromMonth(cell) {
  if (!cell.inMonth) return
  viewMode.value = 'day'
  emit('update:anchorDate', new Date(cell.date))
}

function goPrev() {
  if (viewMode.value === 'day') {
    emit('update:anchorDate', addDays(props.anchorDate, -1))
    return
  }
  if (viewMode.value === 'month') {
    const next = new Date(props.anchorDate)
    next.setMonth(next.getMonth() - 1)
    emit('update:anchorDate', next)
    return
  }
  emit('update:anchorDate', addDays(props.anchorDate, -7))
}

function goNext() {
  if (viewMode.value === 'day') {
    emit('update:anchorDate', addDays(props.anchorDate, 1))
    return
  }
  if (viewMode.value === 'month') {
    const next = new Date(props.anchorDate)
    next.setMonth(next.getMonth() + 1)
    emit('update:anchorDate', next)
    return
  }
  emit('update:anchorDate', addDays(props.anchorDate, 7))
}

function goToday() {
  emit('update:anchorDate', new Date())
}

function scrollToBusinessHours() {
  const el = scrollRef.value
  if (!el) return
  const offset = ((9 - AGENDA_DAY_START_HOUR) * AGENDA_HOUR_HEIGHT_PX)
  el.scrollTop = Math.max(0, offset - 24)
}
</script>

<style scoped>
.gcal {
  --gcal-btn-height: 2.25rem;
  --gcal-btn-radius: var(--cf-radius-pill);
  display: grid;
  grid-template-columns: 15.5rem minmax(0, 1fr);
  min-height: 38rem;
  padding: 0;
  overflow: hidden;
}

.gcal-sidebar {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 1rem;
  border-right: 1px solid var(--admin-border, #e8ece9);
  background: #fafbfa;
}

.gcal-sidebar__create {
  width: 100%;
  min-height: var(--gcal-btn-height);
  padding: 0.5rem 1rem;
  border-radius: var(--gcal-btn-radius);
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.gcal :deep(.btn-primary.gcal-sidebar__create) {
  min-height: var(--gcal-btn-height);
  padding: 0.5rem 1rem;
  border-radius: var(--gcal-btn-radius);
  font-size: 0.8125rem;
}

.gcal-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
}

.gcal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.gcal-toolbar__left,
.gcal-toolbar__right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.gcal-toolbar__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--gcal-btn-height);
  min-width: var(--gcal-btn-height);
  padding: 0;
}

.gcal :deep(.btn-secondary.gcal-toolbar__nav) {
  min-height: var(--gcal-btn-height);
  width: var(--gcal-btn-height);
  min-width: var(--gcal-btn-height);
  padding: 0;
  border-radius: var(--gcal-btn-radius);
  font-size: 0;
}

.gcal :deep(.btn-secondary.gcal-toolbar__today) {
  min-height: var(--gcal-btn-height);
  padding: 0 0.85rem;
  border-radius: var(--gcal-btn-radius);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.gcal-toolbar__nav svg {
  width: 1rem;
  height: 1rem;
}

.gcal-toolbar__today {
  font-weight: 600;
}

.gcal-toolbar__date {
  display: inline-flex;
  gap: 0.35rem;
}

.gcal-select {
  min-height: var(--gcal-btn-height);
  padding: 0 1.75rem 0 0.65rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--gcal-btn-radius);
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2366706e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0.55rem center;
  appearance: none;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
  cursor: pointer;
}

.gcal-select:hover {
  background-color: #f8faf8;
  border-color: #c8dcc4;
}

.gcal-select:focus-visible {
  outline: 2px solid rgba(139, 150, 124, 0.35);
  outline-offset: 1px;
}

.gcal-select--year {
  min-width: 4.8rem;
}

.gcal-toolbar__range {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-muted, #66706e);
  text-transform: capitalize;
}

.gcal-search {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 12rem;
  min-height: var(--gcal-btn-height);
  padding: 0 0.65rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--gcal-btn-radius);
  background: #fff;
}

.gcal-search svg {
  width: 0.9rem;
  height: 0.9rem;
  color: #9ca3af;
}

.gcal-search input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  outline: none;
}

.gcal-view-toggle {
  display: inline-flex;
  align-items: center;
  min-height: var(--gcal-btn-height);
  padding: 0.15rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--gcal-btn-radius);
  background: #f8faf9;
}

.gcal-view-toggle__btn {
  min-height: calc(var(--gcal-btn-height) - 0.3rem);
  padding: 0 0.75rem;
  border: none;
  border-radius: calc(var(--gcal-btn-radius) - 0.1rem);
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--admin-muted, #66706e);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.gcal-view-toggle__btn:hover {
  color: var(--admin-ink, #141414);
}

.gcal-view-toggle__btn--active {
  background: #fff;
  color: var(--admin-ink, #141414);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.gcal-state {
  padding: 2rem;
  text-align: center;
  color: var(--admin-muted, #66706e);
}

.gcal-state--error {
  color: #b42318;
}

.gcal-time-wrap {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.gcal-time-head {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.gcal-time-head__gutter {
  border-right: 1px solid #f0f2f1;
}

.gcal-time-head__days {
  display: grid;
}

.gcal-time-head__day {
  display: grid;
  justify-items: center;
  gap: 0.05rem;
  padding: 0.45rem 0.25rem;
  border-left: 1px solid #f0f2f1;
  text-align: center;
}

.gcal-time-head__day span {
  font-size: 0.68rem;
  color: #8a9288;
  text-transform: uppercase;
}

.gcal-time-head__day strong {
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.gcal-time-head__day--today strong {
  border-radius: var(--cf-radius-pill);
  background: var(--admin-primary, #8b967c);
  color: #fff;
}

.gcal-time-scroll {
  overflow: auto;
  min-height: 0;
  background: #fff;
}

.gcal-time-grid {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  min-height: calc(var(--gcal-hour-height) * var(--gcal-hours));
}

.gcal-time-gutter {
  border-right: 1px solid #f0f2f1;
}

.gcal-time-gutter__label {
  height: var(--gcal-hour-height);
  padding-right: 0.45rem;
  font-size: 0.62rem;
  font-weight: 500;
  color: #9ca3af;
  text-align: right;
  transform: translateY(-0.45rem);
}

.gcal-time-columns {
  display: grid;
}

.gcal-time-column {
  position: relative;
  border-left: 1px solid #f0f2f1;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.gcal-time-column--dragging {
  background: rgba(139, 150, 124, 0.06);
}

.gcal-selection {
  position: absolute;
  left: 0.2rem;
  right: 0.2rem;
  z-index: 1;
  border: 1px solid rgba(139, 150, 124, 0.55);
  border-radius: calc(var(--cf-radius-control) * 0.4);
  background: rgba(139, 150, 124, 0.18);
  pointer-events: none;
}

.gcal-drag-hint {
  margin: 0;
  padding: 0.45rem 1rem 0.65rem;
  font-size: 0.68rem;
  color: var(--admin-muted, #66706e);
  border-top: 1px solid #f0f2f1;
  background: #fafbfa;
}

.gcal-time-column--today {
  background: rgba(139, 150, 124, 0.04);
}

.gcal-time-column__hour {
  height: var(--gcal-hour-height);
  border-bottom: 1px solid #f3f5f4;
}

.gcal-event {
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  z-index: 2;
  display: grid;
  gap: 0.08rem;
  padding: 0.28rem 0.4rem;
  border: none;
  border-left: 3px solid transparent;
  border-radius: calc(var(--cf-radius-control) * 0.45);
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  font: inherit;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.gcal-event strong {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gcal-event span {
  font-size: 0.62rem;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gcal-now-line {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 3;
  height: 2px;
  background: #ea4335;
  pointer-events: none;
}

.gcal-now-line__dot {
  position: absolute;
  left: -0.3rem;
  top: 50%;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: #ea4335;
  transform: translateY(-50%);
}

.gcal-month {
  padding: 0.75rem 1rem 1rem;
  overflow: auto;
}

.gcal-month__weekdays,
.gcal-month__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.gcal-month__weekdays span {
  padding: 0.35rem 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #8a9288;
  text-align: center;
  text-transform: uppercase;
}

.gcal-month__grid {
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  overflow: hidden;
}

.gcal-month__cell {
  min-height: 6.5rem;
  padding: 0.35rem;
  border: none;
  border-right: 1px solid #f0f2f1;
  border-bottom: 1px solid #f0f2f1;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.gcal-month__cell:nth-child(7n) {
  border-right: none;
}

.gcal-month__cell--outside {
  background: #fafafa;
  color: #cbd5e1;
}

.gcal-month__cell--today .gcal-month__day {
  background: var(--admin-primary, #8b967c);
  color: #fff;
}

.gcal-month__day {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--cf-radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
}

.gcal-month__events {
  display: grid;
  gap: 0.15rem;
  margin-top: 0.25rem;
}

.gcal-month__chip {
  display: block;
  padding: 0.12rem 0.28rem;
  border-radius: calc(var(--cf-radius-control) * 0.35);
  font-size: 0.58rem;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gcal-month__events small {
  font-size: 0.58rem;
  color: var(--admin-muted, #66706e);
}

@media (max-width: 1080px) {
  .gcal {
    grid-template-columns: 1fr;
  }

  .gcal-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--admin-border, #e8ece9);
  }

  .gcal-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .gcal-search {
    width: 100%;
  }
}
</style>
