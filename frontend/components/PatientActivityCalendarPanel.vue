<template>
  <Teleport to="body">
    <Transition name="activity-panel">
      <div v-if="calendarOpen" class="activity-panel-wrap">
        <button
          type="button"
          class="activity-panel-backdrop"
          aria-label="Fechar calendário"
          @click="closeCalendar"
        />

        <section class="activity-panel" role="dialog" aria-modal="true" aria-label="Dias ativos e metas">
          <article class="activity-panel__calendar">
            <header class="activity-panel__month">
              <button type="button" class="activity-panel__nav" aria-label="Mês anterior" @click="prevMonth">
                <ChevronLeft aria-hidden="true" />
              </button>
              <h2 class="activity-panel__month-title">{{ monthLabel }}</h2>
              <button type="button" class="activity-panel__nav" aria-label="Próximo mês" @click="nextMonth">
                <ChevronRight aria-hidden="true" />
              </button>
            </header>

            <div class="activity-panel__weekdays" aria-hidden="true">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>

            <div v-if="monthLoading" class="activity-panel__loading">Carregando…</div>

            <div v-else class="activity-panel__grid" role="grid">
              <button
                v-for="cell in calendarCells"
                :key="cell.key"
                type="button"
                role="gridcell"
                class="activity-panel__day"
                :class="{
                  'activity-panel__day--outside': !cell.inMonth,
                  'activity-panel__day--today': cell.isToday,
                  'activity-panel__day--active': cell.isActive && cell.inMonth,
                }"
                :aria-label="cell.label"
                @click="selectCalendarDay(cell.dateKey)"
              >
                <span class="activity-panel__day-num">{{ cell.day }}</span>
                <PatientFlameIcon3d
                  v-if="cell.isActive && cell.inMonth"
                  size="xs"
                  class="activity-panel__day-flame"
                />
              </button>
            </div>
          </article>

          <div class="activity-panel__stats">
            <article class="activity-panel__weekly">
              <div class="activity-panel__weekly-ring" aria-hidden="true">
                <svg viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" class="activity-panel__weekly-track" />
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    class="activity-panel__weekly-fill"
                    :style="{ strokeDashoffset: weekGoalDashOffset }"
                  />
                </svg>
                <div class="activity-panel__weekly-copy">
                  <strong>{{ weekActiveCount }}/{{ weekGoal }}</strong>
                  <span>Meta semanal</span>
                </div>
              </div>
            </article>

            <article class="activity-panel__week" aria-label="Dias ativos na semana">
              <div
                v-for="bar in weekBars"
                :key="bar.key"
                class="activity-panel__week-dot"
                :class="{
                  'activity-panel__week-dot--active': bar.active,
                  'activity-panel__week-dot--today': bar.isToday,
                }"
                :title="bar.label"
              >
                {{ bar.shortLabel }}
              </div>
            </article>
          </div>

          <article class="activity-panel__goals">
            <strong>Metas de hoje</strong>
            <span>{{ goalsAverage }}% concluídas</span>
          </article>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import PatientFlameIcon3d from '~/components/PatientFlameIcon3d.vue'
import { dateKey } from '~/utils/patient-activity-days.js'

const {
  calendarOpen,
  viewYear,
  viewMonth,
  monthLoading,
  goalsAverage,
  weekActiveCount,
  weekGoal,
  weekGoalProgress,
  weekBars,
  closeCalendar,
  prevMonth,
  nextMonth,
  selectCalendarDay,
  isDayActive,
} = usePatientDailyHeader()

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const monthLabel = computed(() => {
  const name = monthNames[(viewMonth.value || 1) - 1] || ''
  return `${name} de ${viewYear.value}`
})

const weekGoalDashOffset = computed(() => {
  const circumference = 2 * Math.PI * 28
  return `${circumference * (1 - weekGoalProgress.value)}`
})

const calendarCells = computed(() => {
  const year = viewYear.value
  const monthIndex = (viewMonth.value || 1) - 1
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const todayKey = dateKey()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(year, monthIndex, dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    const dateKeyStr = dateKey(date)

    cells.push({
      key: `${year}-${monthIndex}-${i}`,
      day: date.getDate(),
      dateKey: dateKeyStr,
      inMonth,
      isToday: dateKeyStr === todayKey,
      isActive: isDayActive(dateKeyStr),
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

function onKeydown(event) {
  if (event.key === 'Escape' && calendarOpen.value) closeCalendar()
}

watch(calendarOpen, (open) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('patient-activity-panel-open', open)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('patient-activity-panel-open')
  }
})
</script>

<style scoped>
.activity-panel-wrap {
  position: fixed;
  inset: 0;
  z-index: 480;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.activity-panel-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.activity-panel {
  position: relative;
  z-index: 1;
  margin-top: calc(3.35rem + env(safe-area-inset-top, 0px));
  margin-bottom: calc(var(--cf-tab-h, 64px) + env(safe-area-inset-bottom, 0px));
  padding: 0.35rem 1.15rem 1rem;
  overflow-y: auto;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
}

.activity-panel__calendar {
  padding: 0.85rem 0.75rem 0.95rem;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-md);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
}

.activity-panel__month {
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.activity-panel__month-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-align: center;
  color: var(--cf-text);
}

.activity-panel__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-pill);
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.activity-panel__nav svg {
  width: 1.1rem;
  height: 1.1rem;
}

.activity-panel__weekdays,
.activity-panel__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.28rem;
}

.activity-panel__weekdays {
  margin-bottom: 0.35rem;
}

.activity-panel__weekdays span {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.activity-panel__loading {
  padding: 2rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--cf-text-muted);
}

.activity-panel__day {
  display: flex;
  min-height: 2.65rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.12rem;
  padding: 0.28rem 0.1rem 0.22rem;
  border: none;
  border-radius: var(--cf-radius-sm);
  background: transparent;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.activity-panel__day-num {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
  color: var(--cf-text);
}

.activity-panel__day--outside .activity-panel__day-num {
  color: rgba(28, 24, 22, 0.22);
}

.activity-panel__day--today .activity-panel__day-num {
  color: #c2410c;
}

.activity-panel__day--active {
  background: #fff0e3;
}

.activity-panel__day-flame {
  flex-shrink: 0;
}

.activity-panel__stats {
  display: grid;
  grid-template-columns: 6.75rem minmax(0, 1fr);
  gap: 0.65rem;
  margin-top: 0.85rem;
}

.activity-panel__weekly,
.activity-panel__week {
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-md);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
}

.activity-panel__weekly {
  display: grid;
  place-items: center;
  padding: 0.55rem;
}

.activity-panel__weekly-ring {
  position: relative;
  width: 5.25rem;
  height: 5.25rem;
}

.activity-panel__weekly-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.activity-panel__weekly-track {
  fill: none;
  stroke: var(--cf-track);
  stroke-width: 6;
}

.activity-panel__weekly-fill {
  fill: none;
  stroke: #e07a3a;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 175.93;
  transition: stroke-dashoffset 0.35s ease;
}

.activity-panel__weekly-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.activity-panel__weekly-copy strong {
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--cf-text);
}

.activity-panel__weekly-copy span {
  margin-top: 0.1rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.activity-panel__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: center;
  gap: 0.35rem;
  padding: 0.85rem 0.65rem;
}

.activity-panel__week-dot {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  margin: 0 auto;
  border-radius: 50%;
  background: #ececea;
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--cf-text-muted);
  text-transform: uppercase;
}

.activity-panel__week-dot--active {
  background: linear-gradient(180deg, #ffc766 0%, #e07a3a 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(224, 122, 58, 0.28);
}

.activity-panel__week-dot--today.activity-panel__week-dot--active {
  background: linear-gradient(180deg, #ffb347 0%, #c2410c 100%);
}

.activity-panel__goals {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.85rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-md);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
}

.activity-panel__goals strong {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--cf-text);
}

.activity-panel__goals span {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.activity-panel-enter-active,
.activity-panel-leave-active {
  transition: opacity 0.2s ease;
}

.activity-panel-enter-active .activity-panel,
.activity-panel-leave-active .activity-panel {
  transition: transform 0.24s ease, opacity 0.2s ease;
}

.activity-panel-enter-from,
.activity-panel-leave-to {
  opacity: 0;
}

.activity-panel-enter-from .activity-panel,
.activity-panel-leave-to .activity-panel {
  opacity: 0;
  transform: translateY(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .activity-panel-enter-active,
  .activity-panel-leave-active,
  .activity-panel-enter-active .activity-panel,
  .activity-panel-leave-active .activity-panel,
  .activity-panel__weekly-fill {
    transition: none;
  }
}
</style>

<style>
html.patient-activity-panel-open {
  overflow: hidden;
}
</style>
