<template>
  <div class="nutrition-month" :class="{ 'nutrition-month--compact': compact }">
    <div class="nutrition-month-nav">
      <button type="button" class="nutrition-month-btn" aria-label="Mês anterior" @click="shiftMonth(-1)">
        <ChevronLeft />
      </button>
      <h2 class="nutrition-month-title">{{ monthLabel }}</h2>
      <button type="button" class="nutrition-month-btn" aria-label="Próximo mês" :disabled="isCurrentMonth" @click="shiftMonth(1)">
        <ChevronRight />
      </button>
    </div>

    <div v-if="loading" class="nutrition-month-loading">Carregando panorama…</div>
    <p v-else-if="error" class="nutrition-month-error">{{ error }}</p>

    <template v-else-if="summary">
      <div class="nutrition-month-summary cf-squircle">
        <div class="nutrition-month-stat">
          <strong>{{ summary.totals.caloriesKcal.toLocaleString('pt-BR') }}</strong>
          <span>kcal no mês</span>
        </div>
        <div class="nutrition-month-stat">
          <strong>{{ summary.daysWithEntries }}</strong>
          <span>dias registrados</span>
        </div>
        <div class="nutrition-month-stat">
          <strong>{{ avgCalories }}</strong>
          <span>média/dia</span>
        </div>
      </div>

      <div class="nutrition-month-grid" role="list" aria-label="Calorias por dia">
        <button
          v-for="day in summary.days"
          :key="day.date"
          type="button"
          role="listitem"
          class="nutrition-month-day"
          :class="{
            'nutrition-month-day--today': day.date === todayKey,
            'nutrition-month-day--empty': !day.entryCount,
            'nutrition-month-day--selected': day.date === selectedDate,
            'nutrition-month-day--hovered': day.date === hoveredDate,
          }"
          :aria-label="dayAriaLabel(day)"
          @click="selectDay(day)"
          @mouseenter="hoveredDate = day.date"
          @mouseleave="hoveredDate = ''"
          @focus="hoveredDate = day.date"
          @blur="hoveredDate = ''"
        >
          <span class="nutrition-month-day-num">{{ dayNumber(day.date) }}</span>
          <span
            class="nutrition-month-day-bar"
            :style="{ height: `${barHeight(day)}%`, backgroundColor: barColor(day) }"
            aria-hidden="true"
          />
          <span
            v-if="hoveredDate === day.date || selectedDate === day.date"
            class="nutrition-month-tip"
            role="tooltip"
          >
            {{ dayTip(day) }}
          </span>
        </button>
      </div>

      <p v-if="compact && hoveredDaySummary" class="nutrition-month-hover-readout">
        <strong>{{ hoveredDayTitle }}</strong>
        <span>{{ dayTip(hoveredDaySummary) }}</span>
      </p>

      <article v-if="selectedDay" class="nutrition-month-detail cf-squircle">
        <h3>{{ detailTitle }}</h3>
        <p v-if="!selectedDay.entryCount" class="nutrition-month-detail-empty">Nenhuma refeição registrada neste dia.</p>
        <template v-else>
          <div class="nutrition-month-macros">
            <span><strong>{{ selectedDay.consumed.caloriesKcal }}</strong> kcal</span>
            <span>C {{ selectedDay.consumed.carbsG }}g</span>
            <span>P {{ selectedDay.consumed.proteinG }}g</span>
            <span>G {{ selectedDay.consumed.fatG }}g</span>
          </div>
          <p class="nutrition-month-detail-meta">
            {{ selectedDay.entryCount }} refeiç{{ selectedDay.entryCount === 1 ? 'ão' : 'ões' }} registrada{{ selectedDay.entryCount === 1 ? '' : 's' }}
            <span v-if="summary?.targets?.caloriesKcal">
              · meta {{ summary.targets.caloriesKcal }} kcal
            </span>
          </p>

          <p v-if="loadingDay" class="nutrition-month-detail-loading">Carregando refeições…</p>
          <ul v-else-if="dayEntries.length" class="nutrition-month-entries">
            <li v-for="entry in dayEntries" :key="entry.id" class="nutrition-month-entry">
              <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" class="nutrition-month-entry-img" loading="lazy" />
              <div>
                <strong>{{ entry.mealLabel || entry.mealType }}</strong>
                <span>{{ entry.caloriesKcal }} kcal · P {{ entry.proteinG }}g · C {{ entry.carbsG }}g · G {{ entry.fatG }}g</span>
              </div>
            </li>
          </ul>
        </template>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import { authFetchInit } from '~/composables/useAuthSession.js'

const props = defineProps({
  patientId: { type: String, default: null },
  compact: { type: Boolean, default: false },
})

const config = useRuntimeConfig()
const { patientFetchInit } = usePatientLocalTime()

const loading = ref(true)
const error = ref('')
const summary = ref(null)
const selectedDate = ref('')
const hoveredDate = ref('')
const dayEntries = ref([])
const loadingDay = ref(false)

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)

const todayKey = computed(() => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const isCurrentMonth = computed(() =>
  viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1,
)

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
)

const avgCalories = computed(() => {
  if (!summary.value?.daysWithEntries) return '0'
  return Math.round(summary.value.totals.caloriesKcal / summary.value.daysWithEntries).toLocaleString('pt-BR')
})

const selectedDay = computed(() =>
  summary.value?.days.find((day) => day.date === selectedDate.value) || null,
)

const hoveredDaySummary = computed(() =>
  summary.value?.days.find((day) => day.date === hoveredDate.value) || null,
)

const hoveredDayTitle = computed(() => {
  if (!hoveredDaySummary.value) return ''
  const date = new Date(`${hoveredDaySummary.value.date}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
})

const detailTitle = computed(() => {
  if (!selectedDay.value) return ''
  const date = new Date(`${selectedDay.value.date}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
})

function dayTip(day) {
  if (!day.entryCount) return 'Sem registro neste dia'
  const target = summary.value?.targets?.caloriesKcal || 2000
  const pct = Math.round((day.consumed.caloriesKcal / target) * 100)
  return `${day.consumed.caloriesKcal} kcal (${pct}% da meta) · ${day.entryCount} refeiç${day.entryCount === 1 ? 'ão' : 'ões'}`
}

function dayAriaLabel(day) {
  const date = new Date(`${day.date}T12:00:00`)
  const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${label}: ${dayTip(day)}`
}

function selectDay(day) {
  selectedDate.value = day.date
}

function dayNumber(dateKey) {
  return Number(dateKey.slice(8, 10))
}

function barHeight(day) {
  const target = summary.value?.targets?.caloriesKcal || 2000
  if (!day.entryCount) return 8
  return Math.max(12, Math.min(100, Math.round((day.consumed.caloriesKcal / target) * 100)))
}

function barColor(day) {
  if (!day.entryCount) return 'var(--cf-track)'
  const pct = barHeight(day)
  if (pct >= 100) return '#c4842e'
  if (pct >= 70) return 'var(--cf-green)'
  return '#5ba4d9'
}

function monthFetchUrl() {
  if (props.patientId) {
    return `${config.public.apiBase}/patients/${props.patientId}/food-diary/month`
  }
  return `${config.public.apiBase}/food-diary/month`
}

function monthFetchOptions() {
  const query = { year: viewYear.value, month: viewMonth.value }
  if (props.patientId) {
    return authFetchInit({ query })
  }
  return patientFetchInit({ query })
}

async function loadDayEntries(date) {
  if (!date) {
    dayEntries.value = []
    return
  }
  if (!props.patientId) {
    dayEntries.value = []
    return
  }
  loadingDay.value = true
  try {
    const data = await $fetch(`${config.public.apiBase}/patients/${props.patientId}/food-diary/day`, authFetchInit({
      query: { date },
    }))
    dayEntries.value = data.entries || []
  } catch {
    dayEntries.value = []
  } finally {
    loadingDay.value = false
  }
}

watch(selectedDate, (date) => {
  void loadDayEntries(date)
})

function shiftMonth(delta) {
  let month = viewMonth.value + delta
  let year = viewYear.value
  if (month < 1) {
    month = 12
    year -= 1
  } else if (month > 12) {
    month = 1
    year += 1
  }
  viewMonth.value = month
  viewYear.value = year
  void loadMonth()
}

async function loadMonth() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await $fetch(monthFetchUrl(), monthFetchOptions())
    const todayInView = summary.value.days.find((day) => day.date === todayKey.value)
    selectedDate.value = todayInView?.date || summary.value.days[summary.value.days.length - 1]?.date || ''
  } catch {
    error.value = 'Não foi possível carregar o panorama do mês.'
    summary.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadMonth)
</script>

<style scoped>
.nutrition-month {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nutrition-month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.nutrition-month-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.nutrition-month-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  cursor: pointer;
}

.nutrition-month-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nutrition-month-btn :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.nutrition-month-loading,
.nutrition-month-error {
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.nutrition-month-error {
  color: var(--pa-red, #d64545);
}

.nutrition-month-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.85rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
}

.nutrition-month-stat {
  text-align: center;
}

.nutrition-month-stat strong {
  display: block;
  font-size: 0.95rem;
}

.nutrition-month-stat span {
  font-size: 0.68rem;
  color: var(--cf-text-muted);
}

.nutrition-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.nutrition-month-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-height: 3.4rem;
  padding: 0.25rem 0.1rem 0.35rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #fafafa;
  cursor: pointer;
  font-family: inherit;
}

.nutrition-month-day--hovered:not(.nutrition-month-day--selected) {
  border-color: #d6e8f5;
  background: #f3f9fd;
}

.nutrition-month-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.35rem);
  z-index: 5;
  transform: translateX(-50%);
  min-width: 9.5rem;
  max-width: 13rem;
  padding: 0.4rem 0.55rem;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.nutrition-month-tip::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1f2937;
}

.nutrition-month-day--selected .nutrition-month-tip {
  background: var(--cf-pink-dark, #9a4f55);
}

.nutrition-month-day--selected .nutrition-month-tip::after {
  border-top-color: var(--cf-pink-dark, #9a4f55);
}

.nutrition-month-detail-loading {
  margin: 0.5rem 0 0;
  font-size: 0.76rem;
  color: var(--cf-text-muted);
}

.nutrition-month--compact .nutrition-month-tip {
  display: none;
}

.nutrition-month-hover-readout {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.55rem;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: #eef6fc;
  border: 1px solid #d6e8f5;
  font-size: 0.72rem;
  color: #374151;
}

.nutrition-month-hover-readout strong {
  font-size: 0.74rem;
  color: #1f2937;
}

.nutrition-month-hover-readout span {
  color: #4b5563;
}

.nutrition-month--compact .nutrition-month-title {
  font-size: 0.88rem;
}

.nutrition-month--compact .nutrition-month-summary {
  padding: 0.65rem;
  gap: 0.35rem;
}

.nutrition-month--compact .nutrition-month-stat strong {
  font-size: 0.82rem;
}

.nutrition-month--compact .nutrition-month-stat span {
  font-size: 0.62rem;
}

.nutrition-month--compact .nutrition-month-day {
  min-height: 2.85rem;
}

.nutrition-month--compact .nutrition-month-day-num {
  font-size: 0.62rem;
}

.nutrition-month--compact .nutrition-month-day-bar {
  width: 0.45rem;
}

.nutrition-month--compact .nutrition-month-detail {
  padding: 0.75rem;
}

.nutrition-month--compact .nutrition-month-detail h3 {
  font-size: 0.82rem;
}

.nutrition-month--compact .nutrition-month-entry-img {
  width: 44px;
  height: 44px;
}

.nutrition-month-day--today {
  border-color: var(--cf-pink);
}

.nutrition-month-day--selected {
  background: var(--cf-pink-soft);
}

.nutrition-month-day-num {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.nutrition-month-day-bar {
  width: 0.55rem;
  min-height: 0.45rem;
  border-radius: 999px;
  transition: height 0.2s ease;
}

.nutrition-month-detail {
  padding: 0.95rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
}

.nutrition-month-detail h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  text-transform: capitalize;
}

.nutrition-month-detail-empty,
.nutrition-month-detail-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--cf-text-muted);
}

.nutrition-month-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  font-size: 0.78rem;
  color: var(--cf-text);
}

.nutrition-month-entries {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.nutrition-month-entry {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: #fafafa;
}

.nutrition-month-entry strong {
  display: block;
  font-size: 0.82rem;
}

.nutrition-month-entry span {
  display: block;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.nutrition-month-entry-img {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
</style>
