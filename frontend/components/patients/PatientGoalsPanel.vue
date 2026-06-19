<template>
  <div class="patient-goals-readonly">
    <div v-if="loading" class="patient-goals-loading">Carregando metas…</div>
    <p v-else-if="error" class="patient-goals-error">{{ error }}</p>
    <p v-else-if="!goals.length" class="patient-goals-empty">
      A paciente ainda não configurou metas no app.
    </p>
    <ul v-else class="patient-goals-list">
      <li v-for="item in goalRows" :key="item.goal.id" class="patient-goals-card">
        <div class="patient-goals-head">
          <div>
            <strong>{{ item.goal.label }}</strong>
            <span>{{ frequencyLabel(item.goal.frequency) }} · meta {{ item.goal.target }} {{ item.goal.unit }}</span>
          </div>
          <span class="patient-goals-pct">{{ item.percent }}%</span>
        </div>
        <div class="patient-goals-track" role="progressbar" :aria-valuenow="item.percent" aria-valuemin="0" aria-valuemax="100">
          <div class="patient-goals-fill" :style="{ width: `${item.percent}%`, backgroundColor: item.goal.color || '#6d9a66' }" />
        </div>
        <p class="patient-goals-progress">{{ formatProgress(item) }}</p>
      </li>
    </ul>

    <article v-if="nutritionTarget" class="patient-goals-targets">
      <h4>Metas nutricionais (diário)</h4>
      <div class="patient-goals-targets-grid">
        <span><strong>{{ nutritionTarget.caloriesKcal }}</strong> kcal</span>
        <span>C {{ nutritionTarget.carbsG }}g</span>
        <span>P {{ nutritionTarget.proteinG }}g</span>
        <span>G {{ nutritionTarget.fatG }}g</span>
      </div>
    </article>
  </div>
</template>

<script setup>
const props = defineProps({
  patientId: { type: String, required: true },
  nutritionTarget: { type: Object, default: null },
})

const config = useRuntimeConfig()

const loading = ref(true)
const error = ref('')
const goals = ref([])
const progress = ref({})

function authHeaders() {
  const token = import.meta.client ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekStartKey(date = new Date()) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return dateKey(copy)
}

function periodKeyForGoal(goal, date = new Date()) {
  return goal.frequency === 'weekly' ? weekStartKey(date) : dateKey(date)
}

function progressStorageKey(goalId, periodKey) {
  return `${goalId}:${periodKey}`
}

function getProgress(goal) {
  const key = progressStorageKey(goal.id, periodKeyForGoal(goal))
  return progress.value[key] || 0
}

function getProgressPercent(goal) {
  if (!goal.target) return 0
  return Math.min(100, Math.round((getProgress(goal) / goal.target) * 100))
}

const goalRows = computed(() =>
  goals.value.map((goal) => ({
    goal,
    progress: getProgress(goal),
    percent: getProgressPercent(goal),
  })),
)

function frequencyLabel(freq) {
  return freq === 'weekly' ? 'Semanal' : 'Diária'
}

function formatProgress(item) {
  const value = item.progress
  const goal = item.goal
  if (goal.id === 'sleep') {
    return `${value} / ${goal.target} ${goal.unit}`
  }
  if (goal.unit === 'litros') {
    const text = value % 1 === 0 ? String(value) : value.toFixed(2).replace('.', ',')
    return `${text} / ${goal.target} ${goal.unit}`
  }
  return `${value} / ${goal.target} ${goal.unit}`
}

async function loadGoals() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${config.public.apiBase}/patients/${props.patientId}/goals`, {
      headers: authHeaders(),
    })
    goals.value = Array.isArray(data.goals) ? data.goals : []
    progress.value = data.progress && typeof data.progress === 'object' ? data.progress : {}
  } catch (err) {
    error.value = err?.data?.message || 'Não foi possível carregar as metas.'
    goals.value = []
    progress.value = {}
  } finally {
    loading.value = false
  }
}

watch(() => props.patientId, loadGoals, { immediate: true })
</script>

<style scoped>
.patient-goals-loading,
.patient-goals-empty,
.patient-goals-error {
  font-size: 0.88rem;
  color: #666;
}

.patient-goals-error {
  color: #c53030;
}

.patient-goals-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.patient-goals-card {
  padding: 0.85rem 1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 12px;
  background: #fff;
}

.patient-goals-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.patient-goals-head strong {
  display: block;
  font-size: 0.92rem;
}

.patient-goals-head span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: #888;
}

.patient-goals-pct {
  font-size: 0.88rem;
  font-weight: 700;
  color: #2d5a27;
}

.patient-goals-track {
  height: 8px;
  border-radius: 999px;
  background: #eef0ee;
  overflow: hidden;
}

.patient-goals-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.patient-goals-progress {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  color: #666;
}

.patient-goals-targets {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 12px;
  background: #fafcfb;
}

.patient-goals-targets h4 {
  margin: 0 0 0.5rem;
  font-size: 0.88rem;
}

.patient-goals-targets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  font-size: 0.82rem;
  color: #555;
}

.patient-goals-targets-grid strong {
  color: #141414;
}
</style>
