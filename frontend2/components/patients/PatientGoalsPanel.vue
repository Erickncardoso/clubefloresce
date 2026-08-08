<template>
  <div class="patient-goals-readonly" :class="{ 'patient-goals-readonly--compact': compact }">
    <div v-if="loading" class="patient-goals-state">Carregando metas…</div>
    <p v-else-if="error" class="patient-goals-state patient-goals-state--error">{{ error }}</p>
    <p v-else-if="!goalRows.length" class="patient-goals-state">
      A paciente ainda não registrou metas no app.
    </p>

    <div v-else class="evo-goals">
      <article
        v-for="item in visibleGoalRows"
        :key="item.goal.id"
        class="evo-goal-card"
        :class="`evo-goal-card--${item.goal.id}`"
      >
        <header class="evo-goal-head">
          <div class="evo-goal-head-copy">
            <span class="evo-goal-icon" aria-hidden="true">
              <component :is="goalIcon(item.goal)" class="evo-goal-icon-svg" />
            </span>
            <div>
              <h3>{{ item.goal.label }}</h3>
              <p class="evo-goal-meta">
                <template v-if="item.goal.id === 'food'">
                  Semanal · {{ item.progress }} {{ item.progress === 1 ? 'dia registrado' : 'dias registrados' }}
                </template>
                <template v-else>
                  {{ frequencyLabel(item.goal.frequency) }} · {{ item.progress }} / {{ item.goal.target }} {{ item.goal.unit }}
                </template>
              </p>
            </div>
          </div>
          <span v-if="item.goal.id === 'food'" class="evo-goal-pct evo-goal-pct--count">{{ item.progress }}</span>
          <span v-else class="evo-goal-pct">{{ item.percent }}%</span>
        </header>

        <div class="evo-goal-surface">
          <div class="evo-goal-widget">
            <EvolucaoWaterBottle
              v-if="item.goal.type === 'water'"
              readonly
              :current="item.progress"
              :target="item.goal.target"
            />

            <EvolucaoFoodPlate
              v-else-if="item.goal.id === 'food'"
              readonly
              :selected-days="foodSelectedDays"
              :today-index="todayWeekdayIndex"
            />

            <EvolucaoExerciseArm
              v-else-if="item.goal.id === 'exercise'"
              readonly
              :current="item.progress"
              :target="item.goal.target"
            />

            <EvolucaoSleepChart
              v-else-if="item.goal.id === 'sleep'"
              readonly
              :target="item.goal.target"
              :schedule="sleepSchedule"
            />

            <div v-else class="evo-goal-actions evo-goal-actions--readonly">
              <span class="evo-goal-value">{{ item.progress }} / {{ item.goal.target }} {{ item.goal.unit }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <article v-if="nutritionTarget && !compact" class="patient-goals-targets">
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
import { Cookie, Droplets, Dumbbell, Moon, Sparkles } from 'lucide-vue-next'
import {
  buildGoalsSummary,
  getFoodSelectedDays,
  getSleepSchedule,
  weekdayIndex,
} from '~/utils/patientGoalsProgress.js'

const props = defineProps({
  patientId: { type: String, required: true },
  nutritionTarget: { type: Object, default: null },
  compact: { type: Boolean, default: false },
  limit: { type: Number, default: 0 },
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

const goalRows = computed(() => buildGoalsSummary(goals.value, progress.value))

const visibleGoalRows = computed(() => {
  if (!props.compact || !props.limit || props.limit <= 0) return goalRows.value
  return goalRows.value.slice(0, props.limit)
})

const foodGoal = computed(() => goals.value.find((item) => item.id === 'food') || null)
const foodSelectedDays = computed(() => getFoodSelectedDays(foodGoal.value, progress.value))
const todayWeekdayIndex = computed(() => weekdayIndex())
const sleepSchedule = computed(() => getSleepSchedule(progress.value))

function goalIcon(goal) {
  if (goal.type === 'water') return Droplets
  if (goal.id === 'food') return Cookie
  if (goal.id === 'exercise') return Dumbbell
  if (goal.id === 'sleep') return Moon
  return Sparkles
}

function frequencyLabel(frequency) {
  return frequency === 'weekly' ? 'Semanal' : 'Diária'
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
.patient-goals-readonly {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.patient-goals-readonly--compact .evo-goals {
  gap: 0.65rem;
}

.patient-goals-readonly--compact .evo-goal-card {
  padding: 0.85rem 0.9rem 0.8rem;
}

.patient-goals-readonly--compact .evo-goal-pct {
  font-size: 1.25rem;
}

.patient-goals-state {
  font-size: 0.88rem;
  color: #666;
}

.patient-goals-state--error {
  color: #c53030;
}

.evo-goals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evo-goal-card {
  padding: 1rem 1.05rem 0.95rem;
  border-radius: 1.35rem;
  border: none;
  background: #f3f4f6;
  box-shadow: none;
}

.evo-goal-card--water { background: #e8f0fb; }
.evo-goal-card--food { background: #f8f0ed; }
.evo-goal-card--exercise { background: #eef0eb; }
.evo-goal-card--sleep { background: #f3f4f6; }

.evo-goal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.evo-goal-head-copy {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.evo-goal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
  color: var(--cf-text, #1c1816);
}

.evo-goal-card--water .evo-goal-icon { color: #4a8fc4; }
.evo-goal-card--food .evo-goal-icon { color: #9d7268; }
.evo-goal-card--exercise .evo-goal-icon { color: #5f8f58; }
.evo-goal-card--sleep .evo-goal-icon { color: #6b74b8; }

.evo-goal-icon-svg {
  width: 1rem;
  height: 1rem;
}

.evo-goal-head h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cf-text, #1c1816);
}

.evo-goal-pct {
  font-size: 1.55rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--cf-text, #1c1816);
}

.evo-goal-pct--count {
  font-size: 1.55rem;
}

.evo-goal-meta {
  margin: 0.18rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: rgba(28, 24, 22, 0.52);
}

.evo-goal-surface {
  padding: 0.75rem 0.65rem 0.7rem;
  border-radius: 1.1rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
}

.evo-goal-widget {
  padding: 0;
}

.evo-goal-actions--readonly {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0;
}

.evo-goal-value {
  font-size: 0.85rem;
  font-weight: 700;
  min-width: 4.5rem;
  text-align: center;
}

.patient-goals-targets {
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
