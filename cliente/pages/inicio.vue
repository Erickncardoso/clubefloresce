<template>
  <div class="patient-page home-page">
    <PatientHeader class="home-header" menu-left>
      <template #actions>
        <PatientHeaderDailyChip />
      </template>
    </PatientHeader>

    <PatientPageSkeleton v-if="pageLoading" layout="home" />

    <template v-else>
      <section class="home-welcome" aria-label="Boas-vindas">
        <NuxtLink to="/perfil" class="home-greeting-profile">
          <PatientAvatar
            size="md"
            :src="avatarUrl"
            :name="fullName"
            interactive
          />
          <div class="home-greeting-copy">
            <p class="home-greeting-hello">{{ timeGreeting }}, {{ firstName }}</p>
            <p class="home-greeting-sub">{{ todayLabel }}</p>
          </div>
          <ChevronRight class="home-greeting-arrow" aria-hidden="true" />
        </NuxtLink>
      </section>

      <section v-if="hasMealPlan" class="home-section" aria-labelledby="meal-title">
        <div class="home-section-head">
          <h2 id="meal-title">Próxima refeição</h2>
          <button type="button" class="home-section-link" @click="openDietaFromHome">
            Ver dieta
            <ChevronRight class="home-section-link-icon" aria-hidden="true" />
          </button>
        </div>
        <HomeCurrentMealCard />
      </section>

      <section class="home-section" aria-labelledby="nutrition-title">
        <div class="home-section-head">
          <h2 id="nutrition-title">Nutrição de hoje</h2>
          <NuxtLink to="/evolucao/nutricao" class="home-section-link">
            Detalhes
            <ChevronRight class="home-section-link-icon" aria-hidden="true" />
          </NuxtLink>
        </div>
        <HomeNutritionPanel
          :targets="targets"
          :consumed="consumed"
          :percent="caloriePercent"
        />
      </section>

      <section
        v-if="recentMealUploads.length"
        class="home-section"
        aria-labelledby="recent-uploads-title"
      >
        <div class="home-section-head">
          <h2 id="recent-uploads-title">Registros recentes</h2>
          <NuxtLink to="/evolucao/nutricao" class="home-section-link">
            Ver histórico
            <ChevronRight class="home-section-link-icon" aria-hidden="true" />
          </NuxtLink>
        </div>
        <HomeRecentMealUploads :entries="recentMealUploads" />
      </section>

      <section class="home-section" aria-labelledby="goals-title">
        <div class="home-section-head">
          <h2 id="goals-title">Metas diárias</h2>
          <NuxtLink to="/evolucao?tab=metas" class="home-section-link">
            Ver evolução
            <ChevronRight class="home-section-link-icon" aria-hidden="true" />
          </NuxtLink>
        </div>
        <HomeGoalsGrid
          :metrics="homeGoalMetrics"
          @quick-add="openQuickGoal"
        />
      </section>

      <section class="home-section home-section--bella" aria-labelledby="bella-title">
        <h2 id="bella-title" class="visually-hidden">Assistente Bella</h2>
        <div class="home-bella-card">
          <div class="home-bella-main">
            <NuxtLink to="/bella/chat/general" class="home-bella-action">
              <Sparkles class="home-bella-action-icon" aria-hidden="true" />
              <div>
                <p class="home-bella-action-title">Fale com a Bella</p>
                <p class="home-bella-action-copy">Tire dúvidas sobre alimentação e rotina.</p>
              </div>
              <ChevronRight class="home-bella-action-arrow" aria-hidden="true" />
            </NuxtLink>

            <NuxtLink :to="teachLink" class="home-bella-tip">
              <Lightbulb class="home-bella-tip-icon" aria-hidden="true" />
              <div class="home-bella-tip-copy">
                <span class="home-bella-tip-tag">Bella ensina</span>
                <p>{{ bellaTip }}</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>

    <CheckinFridayPrompt
      :open="fridayPromptOpen"
      :deadline-label="checkInStatus.deadlineLabel || 'segunda-feira'"
      @dismiss="dismissFridayPrompt"
      @start="goToCheckIn"
    />

    <HomeGoalQuickAddSheet
      :open="Boolean(quickGoalId)"
      :goal-id="quickGoalId"
      @close="quickGoalId = ''"
    />
  </div>
</template>

<script setup>
import {
  ChevronRight,
  Lightbulb,
  Sparkles,
} from 'lucide-vue-next'
import { getBellaDailyTip } from '~/data/bella-daily-tips'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { fetchPlan } = usePatientMealPlan()
const { hasPlan: hasMealPlan, mealOrder, getMealById } = useMealPlan()
const { loadChecked, countDone } = useDietaProgress()
const { resyncAllCheckedMeals } = useDietaDiarySync()
const { todaySummary, hydrate: hydrateGoals } = usePatientGoals()
const { navigateOrGate } = usePatientPremiumGate()
const {
  dailySummary,
  targets,
  consumed,
  caloriePercent,
  bootstrapDailyHeader,
  refreshActivityForToday,
} = usePatientDailyHeader()

const config = useRuntimeConfig()
const { userName, userFullName, userAvatar } = usePatientApp()
const pageLoading = ref(true)
const quickGoalId = ref('')

const firstName = computed(() => userName())
const fullName = computed(() => userFullName())
const avatarUrl = computed(() => userAvatar())

const featuredCourse = ref(null)

function openQuickGoal(goalId) {
  quickGoalId.value = String(goalId || '')
}

function openDietaFromHome() {
  void navigateOrGate('/dieta')
}

const metrics = ref([
  { id: 'water', label: 'Água', value: 0 },
  { id: 'food', label: 'Refeição livre', value: 0 },
  { id: 'exercise', label: 'Exercício', value: 0 },
  { id: 'sleep', label: 'Sono', value: 0 },
])

function formatGoalMeta(progress, goal) {
  const current = Number(progress ?? 0)
  const target = Number(goal?.target ?? 0)
  const unit = goal?.unit ?? ''

  if (goal?.id === 'food' || goal?.type === 'food') {
    return current === 1 ? '1 dia esta semana' : `${current} dias esta semana`
  }
  if (goal?.type === 'sleep') {
    return `${current}h de ${target}h`
  }
  if (goal?.frequency === 'weekly') {
    return `${current} / ${target} ${unit} na semana`
  }
  return `${current} / ${target} ${unit} hoje`
}

function goalBarPct(progress, goal, percent) {
  if (goal?.id === 'food') {
    const target = Math.max(1, Number(goal?.target ?? 1))
    return Math.min(100, Math.round((Number(progress ?? 0) / target) * 100))
  }
  return Math.min(100, Number(percent ?? 0))
}

const homeGoalMetrics = computed(() => {
  if (!todaySummary.value.length) {
    return metrics.value.map((item) => ({
      ...item,
      showPercent: item.id !== 'food',
      meta: item.id === 'food'
        ? '0 dias esta semana'
        : item.id === 'sleep'
          ? '0h de 8h'
          : item.id === 'water'
            ? '0 / 2 litros hoje'
            : '0 / 3 vezes na semana',
      barPct: 0,
    }))
  }
  return todaySummary.value.map((item) => ({
    id: item.goal.id,
    label: item.goal.label,
    value: item.goal.id === 'food' ? item.progress : item.percent,
    showPercent: item.goal.id !== 'food',
    meta: formatGoalMeta(item.progress, item.goal),
    barPct: goalBarPct(item.progress, item.goal, item.percent),
  }))
})

const timeGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const todayLabel = computed(() => {
  const value = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  return value.charAt(0).toUpperCase() + value.slice(1)
})

const bellaTip = computed(() => getBellaDailyTip())

const recentMealUploads = computed(() =>
  [...(dailySummary.value?.entries || [])]
    .filter((entry) => entry?.imageUrl)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3),
)

const teachLink = computed(() => {
  const id = featuredCourse.value?.id
  return id ? `/cursos/${id}` : '/cursos'
})

const { patientFetchInit } = usePatientLocalTime()

watch(todaySummary, () => {
  refreshActivityForToday()
}, { deep: true })

const {
  checkInStatus,
  fridayPromptOpen,
  loadCheckInAccess,
  dismissFridayPrompt,
  goToCheckIn,
} = useWeeklyCheckInPrompt()

onMounted(async () => {
  hydrateGoals()
  pageLoading.value = true
  loadCheckInAccess()

  void fetchPlan().then(async () => {
    if (!hasMealPlan.value) return
    const summary = await resyncAllCheckedMeals(
      getMealById,
      mealOrder.value,
      loadChecked,
      countDone,
    )
    if (summary) dailySummary.value = summary
  })

  const runWithTimeout = async (task, ms = 8000) => {
    let timeoutId
    const timeout = new Promise((resolve) => {
      timeoutId = setTimeout(resolve, ms)
    })
    try {
      await Promise.race([task(), timeout])
    } catch {
      /* defaults abaixo */
    } finally {
      clearTimeout(timeoutId)
    }
  }

  try {
    await Promise.allSettled([
      runWithTimeout(async () => {
        const courses = await $fetch(`${config.public.apiBase}/courses`, patientFetchInit())
        featuredCourse.value = courses?.[0] || null
      }),
      runWithTimeout(bootstrapDailyHeader),
    ])
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
.patient-page.home-page {
  --home-ink-soft: #6e6e73;
  --home-sage-wash: #eef1eb;
  --home-sage-line: rgba(60, 60, 67, 0.12);
  padding-top: 0;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--cf-font);
}

.home-page :deep(.home-header.cf-header) {
  margin-inline: calc(-1 * var(--cf-page-pad-x));
  padding-inline: calc(var(--cf-page-pad-x) + 0.15rem);
  padding-top: calc(0.35rem + env(safe-area-inset-top, 0px));
  padding-bottom: 0.5rem;
  background: #fff;
}

.home-page :deep(.home-header .cf-header-brand) {
  display: none;
}

.home-welcome {
  margin: 0.35rem 0 1.25rem;
}

.home-greeting-profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 3.25rem;
  text-decoration: none;
  color: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-greeting-copy {
  min-width: 0;
}

.home-greeting-hello {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--cf-text);
  text-wrap: balance;
}

.home-greeting-sub {
  margin: 0.22rem 0 0;
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--home-ink-soft);
  line-height: 1.4;
}

.home-greeting-arrow {
  width: 0.9rem;
  height: 0.9rem;
  margin-left: auto;
  color: #aeaeb2;
}

.home-section {
  margin-bottom: 1.75rem;
}

.home-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.home-section-head h2,
.home-section-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: var(--cf-text);
}

.home-section-title {
  margin-bottom: 0.75rem;
}

.home-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-height: 2rem;
  margin: 0;
  padding: 0 0 0 0.45rem;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--cf-pink-dark);
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-section-link-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.home-bella-card {
  border-radius: 1.25rem;
  border: 1px solid #e5e5ea;
  background: #fff;
  box-shadow: none;
  overflow: hidden;
}

.home-bella-main {
  display: flex;
  flex-direction: column;
}

.home-bella-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  transition: background 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-bella-action:active {
  background: #f2f2f7;
}

.home-bella-action-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  color: var(--cf-green-dark);
}

.home-bella-action-title {
  margin: 0 0 0.15rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--cf-text);
}

.home-bella-action-copy {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.home-bella-action-arrow {
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  flex-shrink: 0;
  color: var(--cf-text-muted);
}

.home-bella-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-bella-tip:active {
  background: var(--cf-green-soft);
}

.home-bella-tip-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--cf-green-dark);
}

.home-bella-tip-copy {
  min-width: 0;
}

.home-bella-tip-tag {
  display: inline-block;
  margin-bottom: 0.3rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--cf-green-dark);
}

.home-bella-tip-copy p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .home-bella-action,
  .home-bella-tip {
    transition: none;
  }
}

.home-greeting-profile:focus-visible,
.home-section-link:focus-visible,
.home-bella-action:focus-visible,
.home-bella-tip:focus-visible {
  outline: 2px solid var(--cf-green-dark);
  outline-offset: 3px;
}
</style>
