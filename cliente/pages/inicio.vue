<template>
  <div class="patient-page home-page patient-page--no-tab">
    <div class="home-hero-bg">
      <PatientHeader class="home-header" menu-left />

      <template v-if="!pageLoading">
        <div class="home-hero-panel">
          <NuxtLink to="/perfil" class="home-hero-profile">
            <PatientAvatar
              size="lg"
              :src="avatarUrl"
              :name="fullName"
              interactive
            />
            <div class="home-hero-profile-copy">
              <h1 class="home-hero-name">{{ firstName }}</h1>
              <p class="home-hero-sub">{{ timeGreeting }} · Clube Florescer</p>
            </div>
          </NuxtLink>

          <div class="home-hero-kcal">
            <span class="home-hero-kcal-label">Kcal hoje</span>
            <strong class="home-hero-kcal-value">{{ consumed.caloriesKcal.toLocaleString('pt-BR') }}</strong>
          </div>
        </div>

        <div class="home-hero-stats" aria-label="Resumo do dia">
          <div class="home-hero-stat">
            <strong>{{ streakDays }}</strong>
            <span>{{ streakDaysLabel }} florescendo</span>
          </div>
          <div class="home-hero-stat">
            <strong>{{ calorieConsumedPct }}%</strong>
            <span>Meta calórica</span>
          </div>
          <div class="home-hero-stat">
            <strong>{{ homeGoalsAverage }}%</strong>
            <span>Metas do dia</span>
          </div>
        </div>
      </template>
    </div>

    <NuxtLink v-if="!pageLoading" to="/bella/chat/general" class="home-hero-search-pill">
      <Search class="home-hero-search-icon" aria-hidden="true" />
      <span>Pergunte algo para a Bella</span>
    </NuxtLink>

    <div class="home-sheet">
      <PatientPageSkeleton v-if="pageLoading" layout="home" />

      <template v-else>
        <div class="home-quick-strip">
          <div
            class="home-quick-carousel"
            data-h-scroll
            role="list"
            aria-label="Atalhos rápidos"
          >
            <NuxtLink
              v-for="action in quickActions"
              :key="action.label"
              :to="action.to"
              class="home-quick-action"
              role="listitem"
            >
              <span class="home-quick-action-icon-wrap" aria-hidden="true">
                <img
                  :src="action.image"
                  alt=""
                  class="home-quick-action-photo"
                  loading="lazy"
                  draggable="false"
                >
              </span>
              <span class="home-quick-action-label">{{ action.label }}</span>
            </NuxtLink>
          </div>
        </div>

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
          <div class="home-goals-summary">
            <p class="home-goals-summary-title">Seu dia</p>
            <p class="home-goals-summary-copy">
              Média das metas: <strong>{{ homeGoalsAverage }}%</strong>
            </p>
          </div>
          <NuxtLink to="/evolucao?tab=metas" class="home-goals-grid" aria-label="Abrir metas na Evolução">
            <article
              v-for="metric in homeGoalMetrics"
              :key="metric.id"
              class="home-goal-card"
              :class="`home-goal-card--${metric.id}`"
            >
              <ArrowUpRight class="home-goal-card-arrow" aria-hidden="true" />
              <p class="home-goal-card-value">
                {{ metric.value }}<span v-if="metric.showPercent !== false">%</span>
              </p>
              <p class="home-goal-card-label">{{ metric.label }}</p>
              <p class="home-goal-card-meta">{{ metric.meta }}</p>
            </article>
          </NuxtLink>
        </section>

        <div class="home-bella-overflow">
          <NuxtLink to="/bella/chat/general" class="home-bella">
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
  ArrowUpRight,
  ChevronRight,
  Lightbulb,
  Search,
} from 'lucide-vue-next'
import { getBellaDailyTip } from '~/data/bella-daily-tips'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const quickActions = [
  { label: 'Minha dieta', to: '/dieta', image: '/imgs/quick/quick-dieta.png' },
  { label: 'Evolução', to: '/evolucao', image: '/imgs/quick/quick-evolucao.png' },
  { label: 'Check-in', to: '/check-in', image: '/imgs/quick/quick-checkin.png' },
  { label: 'Bella IA', to: '/bella', image: '/imgs/quick/quick-bella.png' },
  { label: 'Vídeos', to: '/cursos', image: '/imgs/quick/quick-videos.png' },
  { label: 'Ebooks', to: '/ebooks', image: '/imgs/quick/quick-ebooks.png' },
  { label: 'Biblioteca', to: '/conteudo', image: '/imgs/quick/quick-biblioteca.png' },
  { label: 'Comunidade', to: '/comunidade', image: '/imgs/quick/quick-comunidade.png' },
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
  { id: 'water', label: 'Água', value: 80 },
  { id: 'food', label: 'Refeição livre', value: 90 },
  { id: 'exercise', label: 'Exercício', value: 70 },
  { id: 'sleep', label: 'Sono', value: 85 },
])

const homeGoalsAverage = computed(() => {
  const items = homeGoalMetrics.value.filter((item) => item.id !== 'food')
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return Math.round(total / items.length)
})

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

const homeGoalMetrics = computed(() => {
  if (!todaySummary.value.length) {
    return metrics.value.map((item) => ({
      ...item,
      meta: `${item.value}% concluído`,
    }))
  }
  return todaySummary.value.map((item) => ({
    id: item.goal.id,
    label: item.goal.label,
    value: item.goal.id === 'food' ? item.progress : item.percent,
    showPercent: item.goal.id !== 'food',
    meta: formatGoalMeta(item.progress, item.goal),
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

const { patientFetchInit } = usePatientLocalTime()
const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)

async function loadDailyNutrition() {
  try {
    dailySummary.value = await $fetch(`${config.public.apiBase}/food-diary/today`, patientFetchInit())
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
      const courses = await $fetch(`${config.public.apiBase}/courses`, patientFetchInit())
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
      const data = await $fetch(`${config.public.apiBase}/checkin/me`, patientFetchInit())
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

/* Header verde — topo da home (inclui área do relógio/status bar) */
.home-hero-bg {
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  padding: env(safe-area-inset-top, 0px) 1.25rem 2.65rem;
  background: var(--cf-pink);
  border-radius: 0 0 30px 30px;
}

.home-page :deep(.home-header.cf-header) {
  margin-inline: -0.25rem;
  padding-inline: 0.25rem;
  padding-top: 0.35rem;
  padding-bottom: 0.65rem;
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
  background: rgba(255, 255, 255, 0.1);
}

.home-page :deep(.home-header .cf-header-icon) {
  color: #fff;
}

.home-page :deep(.home-header .cf-header-badge) {
  border-color: rgba(255, 255, 255, 0.35);
}

.home-hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  margin-bottom: 1.15rem;
}

.home-hero-profile {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.home-hero-profile-copy {
  min-width: 0;
}

.home-hero-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: #fff;
}

.home-hero-sub {
  margin: 0.28rem 0 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.35;
}

.home-hero-kcal {
  flex-shrink: 0;
  text-align: right;
}

.home-hero-kcal-label {
  display: block;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.home-hero-kcal-value {
  display: block;
  margin-top: 0.12rem;
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #fff;
}

.home-hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.home-hero-stat {
  text-align: center;
}

.home-hero-stat strong {
  display: block;
  font-size: 1.15rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: #fff;
}

.home-hero-stat span {
  display: block;
  margin-top: 0.22rem;
  font-size: 0.66rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.52);
  line-height: 1.25;
}

.home-hero-search-pill {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: -1.35rem 1.25rem 0;
  padding: 0.9rem 1.05rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  text-decoration: none;
  color: #6b7280;
  font-size: 0.84rem;
  font-weight: 600;
}

.home-hero-search-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #111827;
}

.home-quick-strip {
  position: relative;
  z-index: 2;
  margin: 1rem 0 1.15rem;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.home-quick-carousel {
  display: flex;
  gap: 0.85rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 1.25rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-inline: -1.25rem;
  padding: 0.1rem 1.25rem 0.15rem;
}

.home-quick-carousel::-webkit-scrollbar {
  display: none;
}

.home-quick-action {
  flex: 0 0 4.85rem;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-height: 0;
  padding: 0;
  background: transparent;
  border: none;
  text-decoration: none;
  color: var(--cf-text);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.home-quick-action:active {
  transform: scale(0.94);
  opacity: 0.82;
}

.home-quick-action-icon-wrap {
  display: block;
  width: auto;
  height: auto;
  line-height: 0;
  background: none;
  box-shadow: none;
}

.home-quick-action-photo {
  display: block;
  width: 3.6rem;
  height: 3.6rem;
  object-fit: contain;
  background: transparent;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.home-quick-action-label {
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: center;
  color: var(--cf-text);
}

/* Corpo claro abaixo do header */
.home-sheet {
  position: relative;
  z-index: 0;
  width: 100%;
  box-sizing: border-box;
  margin-top: 0;
  padding: 0.35rem 1.25rem 1.25rem;
  background: var(--cf-bg);
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

.home-goals-summary {
  margin: 0 0 0.65rem;
  padding: 1rem 1.05rem;
  border-radius: 1.35rem;
  background: #fff;
  border: 1px solid rgba(28, 24, 22, 0.06);
}

.home-goals-summary-title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.home-goals-summary-copy {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.home-goals-summary-copy strong {
  font-weight: 800;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
}

.home-goals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  color: inherit;
  text-decoration: none;
}

.home-goal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 6.75rem;
  padding: 1rem 1rem 0.9rem;
  border-radius: 1.35rem;
  border: none;
  box-shadow: none;
  background: #f3f4f6;
  text-decoration: none;
  color: var(--cf-text);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.home-goals-grid:active .home-goal-card {
  transform: scale(0.985);
}

.home-goal-card-arrow {
  position: absolute;
  top: 0.95rem;
  right: 0.95rem;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--cf-text);
  opacity: 0.65;
  stroke-width: 2.1;
}

.home-goal-card-value {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.home-goal-card-label {
  margin: 0.38rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--cf-text);
}

.home-goal-card-meta {
  margin: auto 0 0;
  padding-top: 0.9rem;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.35;
  color: rgba(28, 24, 22, 0.52);
}

.home-goal-card--water {
  background: #e8f0fb;
}

.home-goal-card--food {
  background: #f8f0ed;
}

.home-goal-card--exercise {
  background: #eef0eb;
}

.home-goal-card--sleep {
  background: #f3f4f6;
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
  padding: 1.15rem 6.5rem 0.85rem 1.25rem;
  margin: 0;
  min-height: 4.5rem;
  border: none;
  border-radius: 1.85rem;
  background: var(--cf-pink);
  color: #fff;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0.12);
  overflow: visible;
  box-shadow: 0 8px 24px rgba(86, 97, 55, 0.22);
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
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.home-bella-copy p {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
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
  background: #eef0eb;
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
  color: #6f7863;
}

@media (prefers-reduced-motion: reduce) {
  .home-bella,
  .home-quick-action,
  .home-bella-teach {
    transition: none;
  }
}
</style>
