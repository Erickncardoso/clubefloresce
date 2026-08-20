<template>
  <Teleport to="body">
    <Transition name="diary-cal">
      <div v-if="open" class="diary-cal-wrap">
        <button
          type="button"
          class="diary-cal-backdrop"
          aria-label="Fechar calendário"
          @click="emit('close')"
        />

        <section class="diary-cal-panel" role="dialog" aria-modal="true" aria-label="Escolher dia do consumo">
          <header class="diary-cal-head">
            <button type="button" class="diary-cal-nav" aria-label="Mês anterior" @click="prevMonth">
              <ChevronLeft aria-hidden="true" />
            </button>
            <h2 class="diary-cal-title">{{ monthLabel }}</h2>
            <button
              type="button"
              class="diary-cal-nav"
              aria-label="Próximo mês"
              :disabled="!canGoNext"
              @click="nextMonth"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </header>

          <div class="diary-cal-weekdays" aria-hidden="true">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>

          <div class="diary-cal-grid" role="grid">
            <button
              v-for="cell in calendarCells"
              :key="cell.key"
              type="button"
              role="gridcell"
              class="diary-cal-day"
              :class="{
                'diary-cal-day--outside': !cell.inMonth,
                'diary-cal-day--today': cell.isToday,
                'diary-cal-day--selected': cell.isSelected,
              }"
              :disabled="cell.disabled"
              :aria-label="cell.label"
              :aria-selected="cell.isSelected"
              @click="selectDay(cell.dateKey)"
            >
              {{ cell.day }}
            </button>
          </div>

          <button type="button" class="diary-cal-today" @click="selectDay(todayKey)">
            Ir para hoje
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { buildCalendarMonthCells, parseDateKeyParts } from '~/utils/diary-date'
import { getLocalDateKey } from '~/utils/local-date'

const props = defineProps({
  open: { type: Boolean, default: false },
  selectedDateKey: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth() + 1)
const todayKey = computed(() => getLocalDateKey())

const monthLabel = computed(() => {
  const name = monthNames[(viewMonth.value || 1) - 1] || ''
  return `${name} de ${viewYear.value}`
})

const calendarCells = computed(() =>
  buildCalendarMonthCells(viewYear.value, viewMonth.value, {
    selectedDateKey: props.selectedDateKey,
    todayDateKey: todayKey.value,
    maxDateKey: todayKey.value,
  }),
)

const canGoNext = computed(() => {
  const now = new Date()
  return viewYear.value < now.getFullYear()
    || (viewYear.value === now.getFullYear() && viewMonth.value < now.getMonth() + 1)
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  const parts = parseDateKeyParts(props.selectedDateKey) || parseDateKeyParts(todayKey.value)
  if (parts) {
    viewYear.value = parts.year
    viewMonth.value = parts.month
  }
})

function prevMonth() {
  if (viewMonth.value === 1) {
    viewMonth.value = 12
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (!canGoNext.value) return
  if (viewMonth.value === 12) {
    viewMonth.value = 1
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function selectDay(dateKey) {
  emit('select', dateKey)
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(() => props.open, (isOpen) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('diary-cal-open', isOpen)
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('diary-cal-open')
  }
})
</script>

<style scoped>
.diary-cal-wrap {
  position: fixed;
  inset: 0;
  z-index: var(--cf-z-sheet-backdrop, 1200);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;
}

.diary-cal-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.diary-cal-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 26rem);
  margin: 0 0 calc(env(safe-area-inset-bottom, 0px) + 0.5rem);
  padding: 1rem 1rem 1.1rem;
  border: 1px solid var(--cf-border, #e2e5e0);
  border-radius: 1.25rem 1.25rem 1rem 1rem;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.diary-cal-head {
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.diary-cal-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  text-align: center;
  color: var(--cf-text, #1c1816);
}

.diary-cal-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--cf-text-muted, #6e6e73);
  cursor: pointer;
}

.diary-cal-nav:disabled {
  opacity: 0.35;
  cursor: default;
}

.diary-cal-nav svg {
  width: 1.1rem;
  height: 1.1rem;
}

.diary-cal-weekdays,
.diary-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.28rem;
}

.diary-cal-weekdays {
  margin-bottom: 0.35rem;
}

.diary-cal-weekdays span {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--cf-text-muted, #6e6e73);
}

.diary-cal-day {
  display: grid;
  place-items: center;
  min-height: 2.4rem;
  border: none;
  border-radius: 0.65rem;
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--cf-text, #1c1816);
  cursor: pointer;
}

.diary-cal-day--outside {
  color: rgba(28, 24, 22, 0.22);
}

.diary-cal-day--today {
  color: #798a70;
}

.diary-cal-day--selected {
  background: #798a70;
  color: #fff;
}

.diary-cal-day:disabled {
  opacity: 0.28;
  cursor: default;
}

.diary-cal-today {
  width: 100%;
  margin-top: 0.85rem;
  min-height: 2.75rem;
  border: none;
  border-radius: 999px;
  background: #798a70;
  font: 600 0.875rem/1 inherit;
  color: #fff;
  cursor: pointer;
}

.diary-cal-enter-active,
.diary-cal-leave-active {
  transition: opacity 0.18s ease;
}

.diary-cal-enter-active .diary-cal-panel,
.diary-cal-leave-active .diary-cal-panel {
  transition: transform 0.22s ease, opacity 0.18s ease;
}

.diary-cal-enter-from,
.diary-cal-leave-to {
  opacity: 0;
}

.diary-cal-enter-from .diary-cal-panel,
.diary-cal-leave-to .diary-cal-panel {
  opacity: 0;
  transform: translateY(1rem);
}
</style>

<style>
html.diary-cal-open {
  overflow: hidden;
}
</style>
