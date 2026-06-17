<template>
  <div class="nutrition-month">
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
          }"
          @click="selectedDate = day.date"
        >
          <span class="nutrition-month-day-num">{{ dayNumber(day.date) }}</span>
          <span
            class="nutrition-month-day-bar"
            :style="{ height: `${barHeight(day)}%`, backgroundColor: barColor(day) }"
            aria-hidden="true"
          />
        </button>
      </div>

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
          <p class="nutrition-month-detail-meta">{{ selectedDay.entryCount }} refeiç{{ selectedDay.entryCount === 1 ? 'ão' : 'ões' }} registrada{{ selectedDay.entryCount === 1 ? '' : 's' }}</p>
        </template>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const config = useRuntimeConfig()
const { patientTimeHeaders } = usePatientLocalTime()

const loading = ref(true)
const error = ref('')
const summary = ref(null)
const selectedDate = ref('')

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

const detailTitle = computed(() => {
  if (!selectedDay.value) return ''
  const date = new Date(`${selectedDay.value.date}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
})

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
    summary.value = await $fetch(`${config.public.apiBase}/food-diary/month`, {
      headers: patientTimeHeaders(),
      query: { year: viewYear.value, month: viewMonth.value },
    })
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
</style>
