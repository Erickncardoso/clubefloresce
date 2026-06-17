<template>
  <div class="patient-page home-page">
    <PatientHeader />

    <PatientPageSkeleton v-if="pageLoading" layout="home" />

    <template v-else>
    <NuxtLink
      v-if="pendingCheckIn"
      to="/check-in"
      class="home-checkin-banner cf-squircle"
    >
      <CalendarCheck class="home-checkin-banner-icon" aria-hidden="true" />
      <span>Check-in semanal disponível — responder agora</span>
      <ChevronRight class="home-checkin-banner-arrow" aria-hidden="true" />
    </NuxtLink>

    <header class="home-hero">
      <NuxtLink to="/perfil" class="home-hero-row">
        <PatientAvatar
          size="lg"
          :src="avatarUrl"
          :name="fullName"
          interactive
        />
        <div class="home-hero-copy">
          <p class="home-hero-greeting">{{ timeGreeting }}</p>
          <h1 class="home-hero-name">{{ firstName }}</h1>
          <p class="home-hero-streak">
            Você está há <strong>{{ streakDays }} {{ streakDaysLabel }}</strong> florescendo.
          </p>
        </div>
      </NuxtLink>
    </header>

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
      <NuxtLink to="/evolucao?tab=metas" class="home-goals cf-squircle" aria-label="Abrir metas na Evolução">
        <div v-for="metric in homeGoalMetrics" :key="metric.id" class="home-goal">
          <div class="home-goal-head">
            <component :is="metric.icon" class="home-goal-icon" :style="{ color: metric.color }" aria-hidden="true" />
            <span class="home-goal-label">{{ metric.label }}</span>
            <span class="home-goal-pct">{{ metric.value }}%</span>
          </div>
          <div class="home-goal-track" role="progressbar" :aria-valuenow="metric.value" aria-valuemin="0" aria-valuemax="100">
            <div class="home-goal-fill" :style="{ width: `${metric.value}%`, backgroundColor: metric.color }" />
          </div>
        </div>
      </NuxtLink>
    </section>

    <div class="home-bella-overflow">
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
      <NuxtLink to="/bella/chat/general" class="home-bella cf-squircle">
        <div class="home-bella-copy">
          <h3>Fale com a Bella</h3>
          <p>Sua nutricionista IA para dúvidas do dia a dia.</p>
        </div>
        <ChevronRight class="home-bella-arrow" aria-hidden="true" />
      </NuxtLink>
    </div>

    <article class="home-bella-teach cf-squircle" aria-label="Dica da Bella">
      <div class="home-bella-teach-copy">
        <div class="home-bella-teach-head">
          <Lightbulb class="home-bella-teach-bulb" aria-hidden="true" />
          <div>
            <h3 class="home-bella-teach-title">Bella ensina</h3>
            <p class="home-bella-teach-eyebrow">Dica do dia</p>
          </div>
        </div>
        <p class="home-bella-teach-tip">{{ bellaTip }}</p>
      </div>
      <div class="home-bella-teach-visual">
        <img :src="teachImage" alt="" class="home-bella-teach-photo" loading="lazy" />
      </div>
    </article>
    </template>

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
  Lightbulb,
  Moon,
  Utensils,
} from 'lucide-vue-next'
import { getBellaDailyTip } from '~/data/bella-daily-tips'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

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

const teachImage = computed(() => {
  const c = featuredCourse.value
  const cover = c?.thumbnailMobile || c?.thumbnail
  if (cover) return cover
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&q=80'
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
      dailySummary.value = await $fetch(`${config.public.apiBase}/food-diary/today`, { headers: patientTimeHeaders() })
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
  padding-inline: 1.25rem;
  padding-top: 0.75rem;
  padding-bottom: var(--cf-tab-clearance);
  box-sizing: border-box;
  background: var(--cf-bg);
}

.home-checkin-banner {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
  padding: 0.65rem 0.85rem;
  background: var(--cf-pink-soft);
  border: 1px solid color-mix(in srgb, var(--cf-pink) 25%, var(--cf-border));
  text-decoration: none;
  color: var(--cf-pink-dark);
  font-size: 0.78rem;
  font-weight: 600;
}

.home-checkin-banner-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

.home-checkin-banner-arrow {
  width: 0.95rem;
  height: 0.95rem;
  margin-left: auto;
  flex-shrink: 0;
}

/* Hero */
.home-hero {
  margin-bottom: 1rem;
}

.home-hero-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: inherit;
  padding: 0.25rem 0;
  border-radius: var(--cf-radius-sm);
  transition: background 0.15s ease;
}

.home-hero-row:active {
  background: var(--cf-green-soft);
}

.home-hero-copy {
  flex: 1;
  min-width: 0;
}

.home-hero-greeting {
  margin: 0 0 0.25rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  line-height: 1.3;
}

.home-hero-name {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.2;
  color: var(--cf-text);
  text-wrap: balance;
}

.home-hero-streak {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.home-hero-streak strong {
  font-weight: 700;
  color: var(--cf-pink);
}

/* Sections */
.home-section {
  margin-bottom: 1.5rem;
}

.home-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.home-section-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--cf-text);
}

.home-section-meta {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  background: #f6f6f4;
  border: 1px solid var(--cf-border);
}

.home-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  text-decoration: none;
}

.home-section-link-icon {
  width: 0.85rem;
  height: 0.85rem;
}

/* Metas */
.home-goals {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  color: inherit;
  text-decoration: none;
}

.home-goal {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.home-goal-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.home-goal-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.home-goal-label {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text);
}

.home-goal-pct {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cf-text-muted);
  font-variant-numeric: tabular-nums;
}

.home-goal-track {
  height: 6px;
  border-radius: 999px;
  background: var(--cf-track);
  overflow: hidden;
}

.home-goal-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 0;
}

/* Bella CTA */
.home-bella-overflow {
  position: relative;
  z-index: 5;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  padding-top: 1.35rem;
  overflow: visible;
}

.home-bella-figure {
  position: absolute;
  left: 0.15rem;
  top: -2.5rem;
  bottom: 0;
  z-index: 2;
  width: 5.5rem;
  overflow: hidden;
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
  padding: 1.15rem 1.125rem 0.85rem 5.75rem;
  margin: 0;
  min-height: 4.5rem;
  border: none;
  background: var(--cf-pink);
  color: #fff;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  transition: background 0.15s ease, transform 0.15s ease;
}

.home-bella:active {
  transform: scale(0.99);
  background: var(--cf-pink-dark);
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

.home-bella-arrow {
  width: 1.125rem;
  height: 1.125rem;
  opacity: 0.85;
  flex-shrink: 0;
  align-self: center;
}

/* Bella ensina */
.home-bella-teach {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
  width: 100%;
  margin-bottom: 1.5rem;
  padding: 0.9rem 0.85rem 0.9rem 1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  text-align: left;
  font-family: inherit;
}

.home-bella-teach-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.55rem;
}

.home-bella-teach-head {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.home-bella-teach-bulb {
  width: 1.15rem;
  height: 1.15rem;
  color: #d4a056;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.home-bella-teach-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #a06267;
  line-height: 1.2;
}

.home-bella-teach-eyebrow {
  margin: 0.1rem 0 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.home-bella-teach-tip {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--cf-text);
}

.home-bella-teach-visual {
  position: relative;
  width: 5.5rem;
  flex-shrink: 0;
  align-self: center;
}

.home-bella-teach-photo {
  width: 100%;
  height: 5.5rem;
  border-radius: var(--cf-radius-md);
  object-fit: cover;
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .home-bella {
    transition: none;
  }
}
</style>
