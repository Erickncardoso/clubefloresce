<template>
  <div class="agenda-mini-cal">
    <header class="agenda-mini-cal__head">
      <button type="button" class="agenda-mini-cal__nav" aria-label="Mês anterior" @click="prevMonth">
        <ChevronLeft aria-hidden="true" />
      </button>
      <p class="agenda-mini-cal__title">{{ monthLabel }}</p>
      <button type="button" class="agenda-mini-cal__nav" aria-label="Próximo mês" @click="nextMonth">
        <ChevronRight aria-hidden="true" />
      </button>
    </header>

    <div class="agenda-mini-cal__weekdays" aria-hidden="true">
      <span v-for="day in weekdays" :key="day">{{ day }}</span>
    </div>

    <div class="agenda-mini-cal__grid" role="grid" aria-label="Calendário">
      <button
        v-for="cell in calendarCells"
        :key="cell.key"
        type="button"
        role="gridcell"
        class="agenda-mini-cal__day"
        :class="{
          'agenda-mini-cal__day--outside': !cell.inMonth,
          'agenda-mini-cal__day--today': cell.isToday,
          'agenda-mini-cal__day--selected': cell.isSelected,
          'agenda-mini-cal__day--in-range': cell.inRange,
        }"
        :aria-label="cell.label"
        :aria-selected="cell.isSelected"
        @click="selectDate(cell.date)"
      >
        {{ cell.day }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  endOfWeek,
  isSameDay,
  isToday,
  startOfWeek,
} from '~/utils/agenda-calendar.js'

const props = defineProps({
  modelValue: { type: Date, default: () => new Date() },
  rangeStart: { type: Date, default: null },
  rangeEnd: { type: Date, default: null },
})

const emit = defineEmits(['update:modelValue'])

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const viewYear = ref(props.modelValue.getFullYear())
const viewMonth = ref(props.modelValue.getMonth())

watch(() => props.modelValue, (value) => {
  if (!value) return
  viewYear.value = value.getFullYear()
  viewMonth.value = value.getMonth()
})

const monthLabel = computed(() => {
  const name = monthNames[viewMonth.value] || ''
  return `${name} de ${viewYear.value}`
})

const calendarCells = computed(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(viewYear.value, viewMonth.value, dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    const inRange = isDateInVisibleRange(date)

    cells.push({
      key: `${viewYear.value}-${viewMonth.value}-${i}`,
      day: date.getDate(),
      date,
      inMonth,
      isToday: isToday(date),
      isSelected: isSameDay(date, props.modelValue),
      inRange,
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

function isDateInVisibleRange(date) {
  const start = props.rangeStart || startOfWeek(props.modelValue, 1)
  const end = props.rangeEnd || endOfWeek(props.modelValue, 1)
  const time = date.getTime()
  return time >= startOfDayTime(start) && time <= endOfDayTime(end)
}

function startOfDayTime(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next.getTime()
}

function endOfDayTime(date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next.getTime()
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
    return
  }
  viewMonth.value -= 1
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
    return
  }
  viewMonth.value += 1
}

function selectDate(date) {
  emit('update:modelValue', new Date(date))
}
</script>

<style scoped>
.agenda-mini-cal {
  display: grid;
  gap: 0.55rem;
}

.agenda-mini-cal__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem;
}

.agenda-mini-cal__title {
  order: -1;
  grid-column: 1 / -1;
  margin: 0 0 0.15rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--admin-ink, #141414);
  text-transform: capitalize;
  text-align: left;
}

.agenda-mini-cal__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-pill);
  background: #fff;
  color: var(--admin-muted, #66706e);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.agenda-mini-cal__nav:hover {
  background: #f8faf8;
  border-color: #c8dcc4;
}

.agenda-mini-cal__nav svg {
  width: 0.95rem;
  height: 0.95rem;
}

.agenda-mini-cal__weekdays,
.agenda-mini-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.2rem;
}

.agenda-mini-cal__weekdays span {
  text-align: center;
  font-size: 0.62rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
}

.agenda-mini-cal__day {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--cf-radius-pill);
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--admin-ink, #141414);
  cursor: pointer;
  transition: background 0.12s ease;
}

.agenda-mini-cal__day:hover:not(.agenda-mini-cal__day--selected) {
  background: rgba(139, 150, 124, 0.12);
}

.agenda-mini-cal__day--outside {
  color: #cbd5e1;
}

.agenda-mini-cal__day--today:not(.agenda-mini-cal__day--selected) {
  box-shadow: inset 0 0 0 1px rgba(139, 150, 124, 0.55);
}

.agenda-mini-cal__day--selected {
  background: var(--admin-primary, #8b967c);
  color: #fff;
}

.agenda-mini-cal__day--in-range:not(.agenda-mini-cal__day--selected) {
  background: rgba(139, 150, 124, 0.1);
}
</style>
