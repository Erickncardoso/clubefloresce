<template>
  <div class="patient-page evo-page patient-page--with-tab">
    <div class="evo-hero-bg">
      <PatientHeader
        class="evo-header"
        title="Evolução"
        show-back
        back-to="/inicio"
        :show-bell="false"
      />

      <p class="evo-hero-kicker">Acompanhe seu progresso</p>

      <div class="evo-hero-stats" aria-label="Resumo de hoje">
        <div class="evo-hero-stat">
          <strong>{{ goalsAverage }}%</strong>
          <span>Média das metas</span>
        </div>
        <div class="evo-hero-stat">
          <strong>{{ goalsCompleted }}</strong>
          <span>Concluídas</span>
        </div>
        <div class="evo-hero-stat">
          <strong>{{ todaySummary.length }}</strong>
          <span>Metas ativas</span>
        </div>
      </div>
    </div>

    <div class="evo-sheet">
      <div class="evo-summary-pill" aria-label="Resumo das metas de hoje">
        <span class="evo-summary-pill-label">Média do dia</span>
        <strong class="evo-summary-pill-value">{{ goalsAverage }}%</strong>
        <span class="evo-summary-pill-meta">{{ goalsCompleted }}/{{ todaySummary.length }} concluídas</span>
      </div>

      <NuxtLink
        v-if="pendingCheckIn"
        to="/check-in"
        class="evo-checkin-banner"
      >
        <span class="evo-checkin-banner-icon-wrap" aria-hidden="true">
          <CalendarCheck class="evo-checkin-banner-icon" />
        </span>
        <div class="evo-checkin-banner-copy">
          <strong>Check-in semanal disponível</strong>
          <p>Preencha até {{ checkInStatus.deadlineLabel || 'segunda-feira' }}</p>
        </div>
        <ChevronRight class="evo-checkin-banner-arrow" aria-hidden="true" />
      </NuxtLink>

      <div class="evo-tabs" role="tablist" aria-label="Seções de evolução">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="evo-tab"
          :class="{ 'evo-tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="setTab(tab.id)"
        >
          <component :is="tab.icon" class="evo-tab-icon" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </div>

      <section v-if="activeTab === 'metas'" aria-label="Metas">
        <div class="evo-section-head">
          <h2>Registrar metas</h2>
          <NuxtLink to="/evolucao/nutricao" class="evo-section-link">
            Nutrição
            <ChevronRight class="evo-section-link-icon" aria-hidden="true" />
          </NuxtLink>
        </div>
        <EvolucaoGoalsPanel />
      </section>

      <section v-else aria-label="Peso e medidas">
        <div class="evo-section-head">
          <h2>Peso e medidas</h2>
        </div>
        <EvolucaoWeightPanel />
      </section>
    </div>
  </div>
</template>

<script setup>
import { CalendarCheck, ChevronRight, LineChart, Target } from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const route = useRoute()
const router = useRouter()

const {
  checkInStatus,
  pendingCheckIn,
  loadCheckInAccess,
} = useWeeklyCheckInPrompt()

const { todaySummary, hydrate: hydrateGoals } = usePatientGoals()

const tabs = [
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'peso', label: 'Peso', icon: LineChart },
]

const activeTab = ref('metas')

const goalsAverage = computed(() => {
  const items = todaySummary.value
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + item.percent, 0)
  return Math.round(total / items.length)
})

const goalsCompleted = computed(() =>
  todaySummary.value.filter((item) => item.percent >= 100).length,
)

function normalizeTab(value) {
  if (value === 'peso' || value === 'metas') return value
  return 'metas'
}

function setTab(id) {
  activeTab.value = id
  router.replace({ query: { ...route.query, tab: id } })
}

watch(
  () => route.query.tab,
  (tab) => {
    const value = String(tab || 'metas')
    if (value === 'dieta') {
      navigateTo('/dieta', { replace: true })
      return
    }
    activeTab.value = normalizeTab(value)
  },
  { immediate: true },
)

onMounted(() => {
  loadCheckInAccess()
  hydrateGoals()
})
</script>

<style scoped>
.patient-page.evo-page {
  padding: 0;
  background: var(--cf-bg);
}

.evo-hero-bg {
  width: 100%;
  box-sizing: border-box;
  padding: env(safe-area-inset-top, 0px) 1.25rem 2.35rem;
  background: var(--cf-green);
  border-radius: 0 0 30px 30px;
}

.evo-page :deep(.evo-header.cf-header) {
  margin-inline: -0.25rem;
  padding-inline: 0.25rem;
  padding-top: 0.35rem;
  padding-bottom: 0.55rem;
  background: transparent;
}

.evo-page :deep(.evo-header .cf-header-title) {
  color: #fff;
}

.evo-page :deep(.evo-header .cf-header-btn) {
  color: #fff;
}

.evo-page :deep(.evo-header .cf-header-btn:hover) {
  background: rgba(255, 255, 255, 0.12);
}

.evo-page :deep(.evo-header .cf-header-icon) {
  color: #fff;
}

.evo-hero-kicker {
  margin: 0 0 1rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.62);
}

.evo-hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.evo-hero-stat {
  text-align: center;
}

.evo-hero-stat strong {
  display: block;
  font-size: 1.2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: #fff;
}

.evo-hero-stat span {
  display: block;
  margin-top: 0.22rem;
  font-size: 0.64rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.25;
}

.evo-sheet {
  width: 100%;
  box-sizing: border-box;
  padding: 0.35rem 1.25rem var(--cf-tab-clearance);
  background: var(--cf-bg);
}

.evo-summary-pill {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: -1.35rem 0 1rem;
  padding: 0.85rem 1.05rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
}

.evo-summary-pill-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.evo-summary-pill-value {
  margin-left: auto;
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--cf-text);
}

.evo-summary-pill-meta {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  white-space: nowrap;
}

.evo-checkin-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 1.35rem;
  border: none;
  background: #fff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
  text-decoration: none;
  color: inherit;
}

.evo-checkin-banner-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: var(--cf-pink-soft, #fff5f8);
  flex-shrink: 0;
}

.evo-checkin-banner-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--cf-pink-dark);
}

.evo-checkin-banner-copy strong {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--cf-text);
}

.evo-checkin-banner-copy p {
  margin: 0.15rem 0 0;
  font-size: 0.74rem;
  color: var(--cf-text-muted);
}

.evo-checkin-banner-arrow {
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  color: var(--cf-text-muted);
  flex-shrink: 0;
}

.evo-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.55rem;
  margin-bottom: 1.15rem;
}

.evo-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-text-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.evo-tab--active {
  background: var(--cf-green-dark);
  color: #fff;
  box-shadow: 0 6px 16px rgba(86, 97, 55, 0.22);
}

.evo-tab-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.evo-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.evo-section-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.012em;
  color: var(--cf-text);
}

.evo-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  text-decoration: none;
}

.evo-section-link-icon {
  width: 0.85rem;
  height: 0.85rem;
}

@media (prefers-reduced-motion: reduce) {
  .evo-tab {
    transition: none;
  }
}
</style>
