<template>
  <div ref="rootRef" class="admin-agenda-topbar">
    <button
      ref="triggerRef"
      type="button"
      class="admin-agenda-topbar__pill"
      :class="{ 'admin-agenda-topbar__pill--open': panelOpen }"
      :aria-expanded="panelOpen"
      aria-haspopup="dialog"
      title="Agenda"
      @click.stop="togglePanel"
    >
      <AdminAgendaFlameIcon size="sm" />
      <span class="admin-agenda-topbar__pill-value">{{ pillCount }}</span>
    </button>

    <Teleport to="body">
      <Transition name="admin-agenda-panel">
        <div
          v-if="panelOpen"
          class="admin-agenda-topbar__layer"
          @keydown.escape="closePanel"
        >
          <div class="admin-agenda-topbar__backdrop" aria-hidden="true" @click="closePanel" />
          <section
            ref="panelRef"
            class="admin-agenda-topbar__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Resumo da agenda"
            :style="panelStyle"
          >
            <header class="admin-agenda-topbar__head">
              <div class="admin-agenda-topbar__title">
                <AdminAgendaFlameIcon size="lg" />
                <h2>Agenda</h2>
              </div>
              <div class="admin-agenda-topbar__head-actions">
                <NuxtLink to="/agenda" class="admin-agenda-topbar__link" @click="closePanel">
                  Abrir agenda
                </NuxtLink>
                <button type="button" class="admin-agenda-topbar__close" aria-label="Fechar" @click="closePanel">
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>

            <div v-if="loading" class="admin-agenda-topbar__loading">Carregando…</div>

            <div v-else class="admin-agenda-topbar__body">
              <aside class="admin-agenda-topbar__calendar">
                <div class="admin-agenda-topbar__cal-nav">
                  <button type="button" aria-label="Mês anterior" @click="prevMonth">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <p>{{ monthLabel }}</p>
                  <button type="button" aria-label="Próximo mês" @click="nextMonth">
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>

                <div class="admin-agenda-topbar__weekdays" aria-hidden="true">
                  <span v-for="day in weekdays" :key="day">{{ day }}</span>
                </div>

                <div class="admin-agenda-topbar__grid" role="grid" aria-label="Calendário do mês">
                  <button
                    v-for="cell in calendarCells"
                    :key="cell.key"
                    type="button"
                    role="gridcell"
                    class="admin-agenda-topbar__day"
                    :class="{
                      'admin-agenda-topbar__day--outside': !cell.inMonth,
                      'admin-agenda-topbar__day--today': cell.isToday,
                      'admin-agenda-topbar__day--busy': cell.count > 0,
                    }"
                    :aria-label="cell.label"
                    @click="goToDay(cell.dateKey)"
                  >
                    <span>{{ cell.day }}</span>
                    <i v-if="cell.count > 0" class="admin-agenda-topbar__day-dot" aria-hidden="true" />
                  </button>
                </div>
              </aside>

              <div class="admin-agenda-topbar__stats">
                <div class="admin-agenda-topbar__metrics">
                  <article class="admin-agenda-topbar__metric">
                    <strong>{{ stats.today }}</strong>
                    <span>Hoje</span>
                  </article>
                  <article class="admin-agenda-topbar__metric">
                    <strong>{{ stats.week }}</strong>
                    <span>Semana</span>
                  </article>
                  <article class="admin-agenda-topbar__metric">
                    <strong>{{ stats.month }}</strong>
                    <span>No mês</span>
                  </article>
                </div>

                <div class="admin-agenda-topbar__progress-row">
                  <div class="admin-agenda-topbar__goal">
                    <svg viewBox="0 0 72 72" aria-hidden="true">
                      <circle cx="36" cy="36" r="28" class="admin-agenda-topbar__goal-track" />
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        class="admin-agenda-topbar__goal-fill"
                        :style="{ strokeDashoffset: goalDashOffset }"
                      />
                    </svg>
                    <div class="admin-agenda-topbar__goal-copy">
                      <strong>{{ stats.week }}/{{ weeklyGoal }}</strong>
                      <span>Meta semanal</span>
                    </div>
                  </div>

                  <div class="admin-agenda-topbar__week-bars" aria-label="Consultas por dia da semana">
                    <button
                      v-for="bar in weekBars"
                      :key="bar.key"
                      type="button"
                      class="admin-agenda-topbar__week-bar"
                      :class="{ 'admin-agenda-topbar__week-bar--today': bar.isToday }"
                      :title="`${bar.label}: ${bar.count} consulta(s)`"
                      @click="goToDay(bar.key)"
                    >
                      <span class="admin-agenda-topbar__week-bar-track">
                        <span
                          class="admin-agenda-topbar__week-bar-fill"
                          :style="{ height: `${bar.height}%` }"
                        />
                      </span>
                      <small>{{ bar.shortLabel }}</small>
                    </button>
                  </div>
                </div>

                <footer class="admin-agenda-topbar__next">
                  <div class="admin-agenda-topbar__next-copy">
                    <Hourglass aria-hidden="true" />
                    <div>
                      <strong>{{ nextTitle }}</strong>
                      <span>{{ nextSubtitle }}</span>
                    </div>
                  </div>
                  <time class="admin-agenda-topbar__next-time">{{ nextTimeLabel }}</time>
                </footer>
              </div>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight, Hourglass, X } from 'lucide-vue-next'
import AdminAgendaFlameIcon from '~/components/admin/AdminAgendaFlameIcon.vue'
import { useAdminAgendaTopbar } from '~/composables/useAdminAgendaTopbar.js'
import { useAgenda } from '~/composables/useAgenda.js'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isToday,
  parseDateKey,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from '~/utils/agenda-calendar.js'

const router = useRouter()
const { fetchAppointments } = useAgenda()
const { refreshTick, weeklyGoal } = useAdminAgendaTopbar()

const rootRef = ref(null)
const triggerRef = ref(null)
const panelRef = ref(null)
const panelOpen = ref(false)
const loading = ref(false)
const appointments = ref([])
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth() + 1)
const nowTick = ref(Date.now())
const panelStyle = ref({})

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

let countdownTimer = null
let panelPositionFrame = null

const pillCount = computed(() => stats.value.week)

const monthLabel = computed(() => {
  const name = monthNames[(viewMonth.value || 1) - 1] || ''
  return `${name} de ${viewYear.value}`
})

const appointmentsByDay = computed(() => {
  const map = new Map()
  for (const item of appointments.value) {
    if (!item?.startsAt) continue
    const key = toDateKey(new Date(item.startsAt))
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
})

const stats = computed(() => {
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, 0)
  const weekEnd = endOfWeek(today, 0)
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  let todayCount = 0
  let weekCount = 0
  let monthCount = 0

  for (const item of appointments.value) {
    if (!item?.startsAt) continue
    const date = new Date(item.startsAt)
    if (isSameDay(date, today)) todayCount += 1
    if (date >= weekStart && date <= weekEnd) weekCount += 1
    if (date >= monthStart && date <= monthEnd) monthCount += 1
  }

  return { today: todayCount, week: weekCount, month: monthCount }
})

const goalProgress = computed(() => {
  if (!weeklyGoal) return 0
  return Math.min(1, stats.value.week / weeklyGoal)
})

const goalDashOffset = computed(() => {
  const circumference = 2 * Math.PI * 28
  return `${circumference * (1 - goalProgress.value)}`
})

const weekBars = computed(() => {
  const start = startOfWeek(new Date(), 0)
  const max = Math.max(1, ...Array.from({ length: 7 }, (_, index) => {
    const key = toDateKey(addDays(start, index))
    return appointmentsByDay.value.get(key) || 0
  }))

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = toDateKey(date)
    const count = appointmentsByDay.value.get(key) || 0
    return {
      key,
      count,
      isToday: isToday(date),
      label: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
      shortLabel: date.toLocaleDateString('pt-BR', { weekday: 'narrow' }).replace('.', ''),
      height: Math.round((count / max) * 100),
    }
  })
})

const nextAppointment = computed(() => {
  const now = new Date(nowTick.value)
  const upcoming = appointments.value
    .filter((item) => item?.startsAt && new Date(item.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  return upcoming[0] || null
})

const nextTitle = computed(() => {
  if (!nextAppointment.value) return 'Sem próximas consultas'
  const date = new Date(nextAppointment.value.startsAt)
  if (isToday(date)) return 'Próxima consulta hoje'
  return 'Próxima consulta'
})

const nextSubtitle = computed(() => {
  if (!nextAppointment.value) return 'Agende pacientes na agenda'
  return nextAppointment.value.patientName || nextAppointment.value.title || 'Consulta'
})

const nextTimeLabel = computed(() => {
  if (!nextAppointment.value) return '—'
  const target = new Date(nextAppointment.value.startsAt)
  const now = new Date(nowTick.value)
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return 'Agora'
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const calendarCells = computed(() => {
  const year = viewYear.value
  const monthIndex = (viewMonth.value || 1) - 1
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const todayKey = toDateKey(new Date())
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(year, monthIndex, dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    const dateKeyStr = toDateKey(date)
    const count = appointmentsByDay.value.get(dateKeyStr) || 0

    cells.push({
      key: `${year}-${monthIndex}-${i}`,
      day: date.getDate(),
      dateKey: dateKeyStr,
      inMonth,
      isToday: dateKeyStr === todayKey,
      count,
      label: `${date.toLocaleDateString('pt-BR')} · ${count} consulta(s)`,
    })
  }

  return cells
})

function updatePanelPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const panelWidth = Math.min(640, window.innerWidth - 24)
  const left = Math.min(
    Math.max(12, rect.right - panelWidth),
    window.innerWidth - panelWidth - 12,
  )
  panelStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
    width: `${panelWidth}px`,
  }
}

async function loadAgendaSummary() {
  loading.value = true
  try {
    const monthStart = startOfMonth(new Date(viewYear.value, (viewMonth.value || 1) - 1, 1))
    const monthEnd = addDays(endOfMonth(monthStart), 1)
    const todayWeekStart = startOfWeek(new Date(), 0)
    const calendarStart = startOfWeek(monthStart, 0)
    const start = calendarStart < todayWeekStart ? calendarStart : todayWeekStart
    const end = monthEnd > addDays(todayWeekStart, 7) ? monthEnd : addDays(todayWeekStart, 7)
    const data = await fetchAppointments({
      from: start.toISOString(),
      to: end.toISOString(),
    })
    appointments.value = Array.isArray(data?.appointments) ? data.appointments : []
  } catch {
    appointments.value = []
  } finally {
    loading.value = false
  }
}

function startCountdown() {
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
}

function stopCountdown() {
  clearInterval(countdownTimer)
  countdownTimer = null
}

function openPanel() {
  panelOpen.value = true
  viewYear.value = new Date().getFullYear()
  viewMonth.value = new Date().getMonth() + 1
  nowTick.value = Date.now()
  startCountdown()
  nextTick(() => {
    updatePanelPosition()
    panelRef.value?.focus?.()
  })
  void loadAgendaSummary()
}

function closePanel() {
  panelOpen.value = false
  stopCountdown()
}

function togglePanel() {
  if (panelOpen.value) closePanel()
  else openPanel()
}

function prevMonth() {
  if (viewMonth.value === 1) {
    viewMonth.value = 12
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
  void loadAgendaSummary()
}

function nextMonth() {
  if (viewMonth.value === 12) {
    viewMonth.value = 1
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
  void loadAgendaSummary()
}

function goToDay(dayKey) {
  const date = parseDateKey(dayKey)
  if (!date) return
  closePanel()
  void router.push({ path: '/agenda', query: { day: dayKey } })
}

function onWindowChange() {
  if (panelOpen.value) updatePanelPosition()
}

watch(refreshTick, () => {
  void loadAgendaSummary()
})

watch(panelOpen, (open) => {
  if (open) {
    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)
  } else {
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange, true)
  }
})

onMounted(() => {
  void loadAgendaSummary()
})

onBeforeUnmount(() => {
  stopCountdown()
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
  if (panelPositionFrame) cancelAnimationFrame(panelPositionFrame)
})
</script>

<style scoped>
.admin-agenda-topbar {
  position: relative;
  flex-shrink: 0;
}

.admin-agenda-topbar__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 2.125rem;
  padding: 0 0.65rem 0 0.55rem;
  border: 1px solid rgba(139, 150, 124, 0.45);
  border-radius: var(--cf-radius-pill, 999px);
  background: #fff;
  color: #374151;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.admin-agenda-topbar__pill:hover,
.admin-agenda-topbar__pill--open {
  background: rgba(139, 150, 124, 0.08);
  border-color: rgba(139, 150, 124, 0.55);
  box-shadow: 0 2px 8px rgba(95, 106, 82, 0.12);
}

.admin-agenda-topbar__pill-value {
  min-width: 0.75rem;
  line-height: 1;
}

.admin-agenda-topbar__layer {
  position: fixed;
  inset: 0;
  z-index: 240;
}

.admin-agenda-topbar__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
}

.admin-agenda-topbar__panel {
  position: fixed;
  z-index: 241;
  max-width: calc(100vw - 24px);
  padding: 1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
  outline: none;
}

.admin-agenda-topbar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.admin-agenda-topbar__title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.admin-agenda-topbar__title h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
}

.admin-agenda-topbar__head-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.admin-agenda-topbar__link {
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.1);
  color: #5f6a52;
  font-size: 0.6875rem;
  font-weight: 700;
  text-decoration: none;
}

.admin-agenda-topbar__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.admin-agenda-topbar__close svg {
  width: 1rem;
  height: 1rem;
}

.admin-agenda-topbar__loading {
  padding: 1.5rem 0.5rem;
  color: #6b7280;
  font-size: 0.8125rem;
  text-align: center;
}

.admin-agenda-topbar__body {
  display: grid;
  grid-template-columns: minmax(11rem, 13.5rem) minmax(0, 1fr);
  gap: 0.85rem;
}

.admin-agenda-topbar__calendar {
  padding: 0.65rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #f8faf9;
}

.admin-agenda-topbar__cal-nav {
  display: grid;
  grid-template-columns: 1.75rem 1fr 1.75rem;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.55rem;
}

.admin-agenda-topbar__cal-nav p {
  margin: 0;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #374151;
  text-transform: capitalize;
}

.admin-agenda-topbar__cal-nav button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.admin-agenda-topbar__cal-nav button svg {
  width: 0.95rem;
  height: 0.95rem;
}

.admin-agenda-topbar__weekdays,
.admin-agenda-topbar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
}

.admin-agenda-topbar__weekdays {
  margin-bottom: 0.25rem;
}

.admin-agenda-topbar__weekdays span {
  text-align: center;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #9ca3af;
}

.admin-agenda-topbar__day {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: none;
  border-radius: var(--cf-radius-pill);
  background: transparent;
  color: #374151;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
}

.admin-agenda-topbar__day--outside {
  color: #cbd5e1;
}

.admin-agenda-topbar__day--today {
  background: #8b967c;
  color: #fff;
}

.admin-agenda-topbar__day--busy:not(.admin-agenda-topbar__day--today) {
  background: rgba(139, 150, 124, 0.14);
}

.admin-agenda-topbar__day-dot {
  position: absolute;
  bottom: 0.12rem;
  width: 0.22rem;
  height: 0.22rem;
  border-radius: 50%;
  background: #8b967c;
}

.admin-agenda-topbar__day--today .admin-agenda-topbar__day-dot {
  background: #fff;
}

.admin-agenda-topbar__stats {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
}

.admin-agenda-topbar__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.admin-agenda-topbar__metric {
  padding: 0.55rem 0.45rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  text-align: center;
}

.admin-agenda-topbar__metric strong {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.1;
}

.admin-agenda-topbar__metric span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: #9ca3af;
}

.admin-agenda-topbar__progress-row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.55rem;
  align-items: stretch;
}

.admin-agenda-topbar__goal {
  position: relative;
  display: grid;
  place-items: center;
  padding: 0.45rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.admin-agenda-topbar__goal svg {
  width: 4.5rem;
  height: 4.5rem;
  transform: rotate(-90deg);
}

.admin-agenda-topbar__goal-track {
  fill: none;
  stroke: #eef2ef;
  stroke-width: 6;
}

.admin-agenda-topbar__goal-fill {
  fill: none;
  stroke: #8b967c;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 175.93;
  transition: stroke-dashoffset 0.35s ease;
}

.admin-agenda-topbar__goal-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.admin-agenda-topbar__goal-copy strong {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
}

.admin-agenda-topbar__goal-copy span {
  margin-top: 0.1rem;
  font-size: 0.5625rem;
  font-weight: 600;
  color: #9ca3af;
}

.admin-agenda-topbar__week-bars {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.3rem;
  padding: 0.55rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.admin-agenda-topbar__week-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-height: 4.5rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.admin-agenda-topbar__week-bar-track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 3rem;
  padding: 0.15rem;
  border-radius: var(--cf-radius-pill);
  background: #eef2ef;
}

.admin-agenda-topbar__week-bar-fill {
  width: 100%;
  min-height: 0;
  border-radius: var(--cf-radius-pill);
  background: linear-gradient(180deg, #a8b39a 0%, #8b967c 100%);
  transition: height 0.25s ease;
}

.admin-agenda-topbar__week-bar--today .admin-agenda-topbar__week-bar-fill {
  background: linear-gradient(180deg, #c4b896 0%, #6b7558 100%);
}

.admin-agenda-topbar__week-bar small {
  font-size: 0.5625rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
}

.admin-agenda-topbar__next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #f8faf9;
}

.admin-agenda-topbar__next-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.admin-agenda-topbar__next-copy svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #8b967c;
}

.admin-agenda-topbar__next-copy strong {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1f2937;
}

.admin-agenda-topbar__next-copy span {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.6875rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14rem;
}

.admin-agenda-topbar__next-time {
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #5f6a52;
  white-space: nowrap;
}

.admin-agenda-panel-enter-active,
.admin-agenda-panel-leave-active {
  transition: opacity 0.18s ease;
}

.admin-agenda-panel-enter-active .admin-agenda-topbar__panel,
.admin-agenda-panel-leave-active .admin-agenda-topbar__panel {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.admin-agenda-panel-enter-from,
.admin-agenda-panel-leave-to {
  opacity: 0;
}

.admin-agenda-panel-enter-from .admin-agenda-topbar__panel,
.admin-agenda-panel-leave-to .admin-agenda-topbar__panel {
  transform: translateY(-6px);
  opacity: 0;
}

@media (max-width: 720px) {
  .admin-agenda-topbar__body {
    grid-template-columns: 1fr;
  }

  .admin-agenda-topbar__progress-row {
    grid-template-columns: 1fr;
  }
}
</style>
