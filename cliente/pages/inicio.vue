<template>
  <div class="patient-page home-page patient-page--with-tab">
    <div class="home-hero-bg">
      <PatientHeader class="home-header" />

      <template v-if="!pageLoading">
        <NuxtLink to="/perfil" class="home-profile">
          <PatientAvatar
            size="lg"
            :src="avatarUrl"
            :name="fullName"
            interactive
          />
          <div class="home-profile-copy">
            <p class="home-profile-greeting">{{ timeGreeting }}</p>
            <h1 class="home-profile-name">{{ firstName }}</h1>
            <p class="home-profile-streak">
              <Flame class="home-profile-streak-icon" aria-hidden="true" />
              {{ streakDays }} {{ streakDaysLabel }} florescendo
            </p>
          </div>
        </NuxtLink>
      </template>
    </div>

    <div class="home-sheet">
      <PatientPageSkeleton v-if="pageLoading" layout="home" />

      <template v-else>
        <nav class="home-quick-strip cf-squircle" aria-label="Atalhos rápidos">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="home-quick-action"
          >
            <span class="home-quick-action-icon-wrap" aria-hidden="true">
              <component :is="action.icon" class="home-quick-action-icon" />
            </span>
            <span class="home-quick-action-label">{{ action.label }}</span>
          </NuxtLink>
        </nav>

        <section v-if="hasMealPlan" class="home-section" aria-labelledby="meal-title">
          <div class="home-section-head">
            <h2 id="meal-title">Refeição do dia</h2>
            <NuxtLink to="/dieta" class="home-section-link">
              Ver dieta
              <ChevronRight class="home-section-link-icon" aria-hidden="true" />
            </NuxtLink>
          </div>
          <HomeCurrentMealCard />
        </section>

        <section class="home-section" aria-labelledby="nutrition-title">
          <div class="home-section-head">
            <h2 id="nutrition-title">Sua nutrição</h2>
            <NuxtLink to="/evolucao/nutricao" class="home-section-link">
              Ver mês
              <ChevronRight class="home-section-link-icon" aria-hidden="true" />
            </NuxtLink>
          </div>
          <HomeNutritionPanel
            :targets="targets"
            :consumed="consumed"
            :streak-days="streakDays"
            :percent="calorieConsumedPct"
          />
        </section>

        <section class="home-section" aria-labelledby="goals-title">
          <div class="home-section-head">
            <h2 id="goals-title">Metas diárias</h2>
            <NuxtLink to="/evolucao?tab=metas" class="home-section-link">
              Evolução
              <ChevronRight class="home-section-link-icon" aria-hidden="true" />
            </NuxtLink>
          </div>
          <p class="home-goals-overview">
            <span>Seu dia</span>
            <strong>{{ homeGoalsAverage }}%</strong>
          </p>
          <NuxtLink to="/evolucao?tab=metas" class="home-goals-grid" aria-label="Abrir metas na Evolução">
            <article
              v-for="metric in homeGoalMetrics"
              :key="metric.id"
              class="home-goal-tile"
              :style="{ '--goal-color': metric.color }"
            >
              <div class="home-goal-tile-ring" aria-hidden="true">
                <GoalMiniPie :value="metric.value" :size="54" :color="metric.color" />
                <component :is="metric.icon" class="home-goal-tile-icon" />
              </div>
              <p class="home-goal-tile-label">{{ metric.label }}</p>
              <p class="home-goal-tile-pct">{{ metric.value }}%</p>
            </article>
          </NuxtLink>
        </section>

        <div class="home-bella-overflow">
          <NuxtLink to="/bella/chat/general" class="home-bella cf-squircle">
            <div class="home-bella-copy">
              <h3>Fale com a Bella</h3>
              <p>Sua nutricionista IA para dúvidas do dia a dia.</p>
            </div>
            <div class="home-bella-figure" aria-hidden="true">
              <img
                src="/falecomabella.webp"
                alt=""
                class="home-bella-avatar"
                width="88"
                height="120"
                loading="lazy"
              />
            </div>
          </NuxtLink>
        </div>

        <div class="home-bella-teach-overflow">
          <NuxtLink
            :to="teachLink"
            class="home-bella-teach"
            aria-label="Abrir Bella ensina"
          >
            <div class="home-bella-teach-figure" aria-hidden="true">
              <img src="/imgs/bellaensina.png" alt="" class="home-bella-teach-photo" loading="lazy" />
            </div>

            <span class="home-bella-teach-badge" aria-hidden="true">
              <Lightbulb class="home-bella-teach-badge-icon" />
            </span>

            <div class="home-bella-teach-body">
              <div class="home-bella-teach-meta">
                <span class="home-bella-teach-tag">Bella ensina</span>
                <p class="home-bella-teach-tip">{{ bellaTip }}</p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </template>
    </div>

    <CheckinFridayPrompt
      :open="fridayPromptOpen"
      :deadline-label="checkInStatus.deadlineLabel || 'segunda-feira'"
      @dismiss="dismissFridayPrompt"
      @start="goToCheckIn"
    />
  </div>
</template>

<script setup>
import {
  Activity,
  CalendarCheck,
  ChevronRight,
  Droplets,
  Flame,
  Lightbulb,
  LineChart,
  Moon,
  Sparkles,
  Utensils,
} from 'lucide-vue-next'
import { getBellaDailyTip } from '~/data/bella-daily-tips'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const quickActions = [
  { label: 'Minha dieta', to: '/dieta', icon: Utensils },
  { label: 'Evolução', to: '/evolucao', icon: LineChart },
  { label: 'Check-in', to: '/check-in', icon: CalendarCheck },
  { label: 'Bella IA', to: '/bella', icon: Sparkles },
]

const { fetchPlan } = usePatientMealPlan()
const { hasPlan: hasMealPlan } = useMealPlan()
const { todaySummary, hydrate: hydrateGoals } = usePatientGoals()

const config = useRuntimeConfig()
const { userName, userFullName, userAvatar } = usePatientApp()
const pageLoading = ref(true)

const firstName = computed(() => userName())
const fullName = computed(() => userFullName())
const avatarUrl = computed(() => userAvatar())

const streakDaysLabel = computed(() => (streakDays.value === 1 ? 'dia' : 'dias'))
const featuredCourse = ref(null)
const dailySummary = ref(null)
const streakDays = ref(12)

const defaultTargets = {
  caloriesKcal: 2000,
  proteinG: 120,
  carbsG: 220,
  fatG: 65,
}

const metrics = ref([
  { id: 'water', label: 'Água', value: 80, icon: Droplets, color: '#5ba4d9' },
  { id: 'food', label: 'Alimentação', value: 90, icon: Utensils, color: 'var(--cf-pink)' },
  { id: 'exercise', label: 'Exercício', value: 70, icon: Activity, color: 'var(--cf-green)' },
  { id: 'sleep', label: 'Sono', value: 85, icon: Moon, color: '#7c6bae' },
])

const iconByGoalId = {
  water: Droplets,
  food: Utensils,
  exercise: Activity,
  sleep: Moon,
}

const homeGoalsAverage = computed(() => {
  const items = homeGoalMetrics.value
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return Math.round(total / items.length)
})

const homeGoalMetrics = computed(() => {
  if (!todaySummary.value.length) return metrics.value
  return todaySummary.value.map((item) => ({
    id: item.goal.id,
    label: item.goal.label,
    value: item.percent,
    icon: iconByGoalId[item.goal.id] || Activity,
    color: item.goal.color,
  }))
})

const timeGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const bellaTip = computed(() => getBellaDailyTip())

const teachLink = computed(() => {
  const id = featuredCourse.value?.id
  return id ? `/cursos/${id}` : '/cursos'
})

const targets = computed(() => dailySummary.value?.targets ?? defaultTargets)

const consumed = computed(() =>
  dailySummary.value?.consumed ?? {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  },
)

const calorieConsumedPct = computed(() => {
  if (!targets.value.caloriesKcal) return 0
  return Math.min(100, Math.round((consumed.value.caloriesKcal / targets.value.caloriesKcal) * 100))
})

const { patientTimeHeaders } = usePatientLocalTime()
const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)

async function loadDailyNutrition() {
  try {
    dailySummary.value = await $fetch(`${config.public.apiBase}/food-diary/today`, { headers: patientTimeHeaders() })
  } catch {
    dailySummary.value = null
  }
}

watch(nutritionRefresh, () => {
  loadDailyNutrition()
})

const {
  checkInStatus,
  pendingCheckIn,
  fridayPromptOpen,
  loadCheckInAccess,
  dismissFridayPrompt,
  goToCheckIn,
} = useWeeklyCheckInPrompt()

onMounted(async () => {
  pageLoading.value = true
  hydrateGoals()
  loadCheckInAccess()
  try {
    await fetchPlan()
    try {
      const courses = await $fetch(`${config.public.apiBase}/courses`, { headers: patientTimeHeaders() })
      featuredCourse.value = courses?.[0] || null
    } catch {
      featuredCourse.value = null
    }
    try {
      await loadDailyNutrition()
    } catch {
      dailySummary.value = null
    }
    try {
      const data = await $fetch(`${config.public.apiBase}/checkin/me`, { headers: patientTimeHeaders() })
      streakDays.value = Math.max(1, (data.history?.length || 0) + (data.current ? 1 : 0))
    } catch {
      /* defaults */
    }
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
.patient-page.home-page {
  padding: 0;
  background: var(--cf-bg);
  overflow-x: hidden;
}

/* Header colorido — só o topo */
.home-hero-bg {
  position: relative;
  z-index: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0 1.25rem 2.85rem;
  background: linear-gradient(165deg, #d49297 0%, #c17b80 42%, #a06267 100%);
}

.home-page :deep(.home-header.cf-header) {
  margin-inline: -0.25rem;
  padding-inline: 0.25rem;
  padding-top: calc(0.35rem + env(safe-area-inset-top, 0px));
  padding-bottom: 0.5rem;
  background: transparent;
}

.home-page :deep(.home-header .cf-header-brand) {
  opacity: 0;
  pointer-events: none;
}

.home-page :deep(.home-header .cf-header-btn) {
  color: #fff;
}

.home-page :deep(.home-header .cf-header-btn:hover) {
  background: rgba(255, 255, 255, 0.14);
}

.home-page :deep(.home-header .cf-header-icon) {
  color: #fff;
}

.home-page :deep(.home-header .cf-header-badge) {
  border-color: #a06267;
}

.home-hero-skeleton {
  display: none;
}

.home-profile {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.85rem;
  text-decoration: none;
  color: inherit;
}

.home-profile-copy {
  flex: 1;
  min-width: 0;
}

.home-profile-greeting {
  margin: 0 0 0.2rem;
  font-size: 0.84rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.88);
}

.home-profile-name {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.22;
  color: #fff;
}

.home-profile-streak {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0.25rem 0.62rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.35;
  background: rgba(255, 255, 255, 0.16);
}

.home-profile-streak-icon {
  width: 0.85rem;
  height: 0.85rem;
  color: #ffe8a8;
}

.home-quick-strip {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin: -2.55rem 0 1.1rem;
  padding: 0.5rem;
  background: #fff;
  border: 1px solid var(--cf-border);
  border-radius: 1.15rem;
  box-shadow: 0 10px 28px rgba(40, 20, 22, 0.1);
}

.home-quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  min-height: 3.95rem;
  padding: 0.55rem 0.2rem;
  border-radius: 0.9rem;
  background: #f3f3f6;
  border: none;
  text-decoration: none;
  color: var(--cf-text);
  transition: background 0.15s ease, transform 0.15s ease;
}

.home-quick-action:active {
  transform: scale(0.98);
  background: #ebebef;
}

.home-quick-action-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.home-quick-action-icon {
  width: 1.2rem;
  height: 1.2rem;
  stroke-width: 1.8;
  color: var(--cf-pink-dark, #a06267);
}

.home-quick-action-label {
  font-size: 0.66rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-align: center;
  color: #3d3d45;
}

/* Folha branca — bordas arredondadas sobre o header rosa */
.home-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  margin-top: -0.35rem;
  padding: 1.35rem 1.25rem var(--cf-tab-clearance);
  border-radius: 2rem 2rem 0 0;
  background: var(--cf-bg);
  box-shadow: 0 -8px 32px rgba(40, 20, 22, 0.1);
  min-height: 12rem;
}

.home-section {
  margin-bottom: 1.35rem;
}

.home-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.home-section-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.3;
  color: var(--cf-text);
}

.home-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.35;
  color: var(--cf-pink-dark);
  text-decoration: none;
}

.home-section-link-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.home-goals-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0.55rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(232, 165, 152, 0.14), rgba(106, 171, 106, 0.1));
  font-size: 0.78rem;
  color: var(--cf-text-muted);
}

.home-goals-overview strong {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--cf-pink-dark);
  font-variant-numeric: tabular-nums;
}

.home-goals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  color: inherit;
  text-decoration: none;
}

.home-goal-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.85rem 0.5rem 0.75rem;
  border-radius: 1.15rem;
  border: 1px solid var(--cf-border);
  background: color-mix(in srgb, var(--goal-color) 10%, #fff);
  box-shadow: 0 4px 14px rgba(28, 24, 22, 0.04);
}

.home-goal-tile-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.4rem;
  height: 3.4rem;
}

.home-goal-tile-icon {
  position: absolute;
  width: 1.05rem;
  height: 1.05rem;
  color: var(--goal-color);
}

.home-goal-tile-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.35;
  color: var(--cf-text);
  text-align: center;
}

.home-goal-tile-pct {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cf-text-muted);
  font-variant-numeric: tabular-nums;
}

.home-bella-overflow {
  position: relative;
  z-index: 5;
  margin-top: 0.25rem;
  margin-bottom: 0.75rem;
  padding-top: 1.35rem;
  overflow: visible;
}

.home-bella-figure {
  position: absolute;
  right: 0.65rem;
  top: -2.5rem;
  bottom: 0;
  z-index: 2;
  width: 5.5rem;
  overflow: visible;
  line-height: 0;
  pointer-events: none;
}

.home-bella-avatar {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 5.15rem;
  height: auto;
  min-height: 6.85rem;
  max-width: none;
  display: block;
  object-fit: cover;
  object-position: center top;
  pointer-events: none;
}

.home-bella {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 1.15rem 6.5rem 0.85rem 2.35rem;
  margin: 0;
  min-height: 4.5rem;
  border: none;
  background: linear-gradient(135deg, #c98a8f 0%, var(--cf-pink) 55%, #a06267 100%);
  color: #fff;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0.12);
  overflow: visible;
  box-shadow: 0 8px 24px rgba(160, 98, 103, 0.28);
  transition: transform 0.15s ease;
}

.home-bella:active {
  transform: scale(0.99);
}

.home-bella:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.home-bella-copy {
  flex: 1;
  min-width: 0;
}

.home-bella-copy h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.home-bella-copy p {
  margin: 0;
  font-size: 0.8125rem;
  opacity: 0.92;
  line-height: 1.4;
}

.home-bella-teach-overflow {
  position: relative;
  z-index: 5;
  margin-top: 0.35rem;
  margin-bottom: 0.85rem;
  padding-top: 1.85rem;
  overflow: visible;
}

.home-bella-teach {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-bottom: 0;
  padding: 1.05rem 0 1.1rem 8.15rem;
  min-height: 6.35rem;
  border: none;
  border-radius: 1.5rem;
  background: var(--cf-green-soft);
  color: inherit;
  text-decoration: none;
  overflow: visible;
}

.home-bella-teach-figure {
  position: absolute;
  left: -0.75rem;
  top: -1.85rem;
  bottom: 0;
  z-index: 1;
  width: 9.35rem;
  line-height: 0;
  pointer-events: none;
}

.home-bella-teach-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 2.85rem;
  height: 2.85rem;
  border: 4px solid var(--cf-bg);
  border-radius: 50%;
  background: #e5efe3;
}

.home-bella-teach-badge-icon {
  width: 1.45rem;
  height: 1.45rem;
  color: var(--cf-green-dark);
  stroke-width: 2.25;
  flex-shrink: 0;
}

.home-bella-teach-body {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  min-width: 0;
  padding-right: 3.1rem;
}

.home-bella-teach-photo {
  width: 100%;
  height: 100%;
  max-width: none;
  display: block;
  object-fit: contain;
  object-position: left bottom;
}

.home-bella-teach-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.15rem;
}

.home-bella-teach-tag {
  align-self: flex-start;
  padding: 0.32rem 0.68rem;
  border-radius: 999px;
  background: var(--cf-green-dark);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-transform: none;
}

.home-bella-teach-tip {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  letter-spacing: 0.01em;
  color: #2f3d2c;
}

@media (prefers-reduced-motion: reduce) {
  .home-bella,
  .home-quick-action,
  .home-bella-teach {
    transition: none;
  }
}
</style>
