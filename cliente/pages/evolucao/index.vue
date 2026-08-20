<template>
  <div class="patient-page evo-page patient-page--with-tab">
    <PatientHeader />

    <main class="evo-content">
      <section class="evo-overview" aria-labelledby="evo-overview-title">
        <div class="evo-overview-head">
          <div>
            <p class="evo-eyebrow">Esta semana</p>
            <h1 id="evo-overview-title">Seu progresso</h1>
          </div>
          <div class="evo-overview-score" aria-label="Média das metas">
            <strong>{{ goalsAverage }}%</strong>
            <span>concluído</span>
          </div>
        </div>

        <div
          class="evo-overview-progress"
          role="progressbar"
          aria-label="Progresso médio das metas"
          :aria-valuenow="goalsAverage"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ width: `${Math.min(100, goalsAverage)}%` }" />
        </div>

        <div class="evo-overview-stats">
          <div class="evo-overview-stat">
            <strong>{{ goalsCompleted }}</strong>
            <span>concluídas</span>
          </div>
          <div class="evo-overview-divider" aria-hidden="true" />
          <div class="evo-overview-stat">
            <strong>{{ todaySummary.length }}</strong>
            <span>metas ativas</span>
          </div>
          <div class="evo-overview-divider" aria-hidden="true" />
          <div class="evo-overview-stat">
            <strong>{{ Math.max(0, todaySummary.length - goalsCompleted) }}</strong>
            <span>em andamento</span>
          </div>
        </div>
      </section>

      <NuxtLink
        v-if="pendingCheckIn"
        to="/check-in"
        class="evo-checkin-banner"
      >
        <span class="evo-checkin-banner-icon-wrap" aria-hidden="true">
          <CalendarCheck class="evo-checkin-banner-icon" />
        </span>
        <div class="evo-checkin-banner-copy">
          <strong>Check-in semanal</strong>
          <p>Disponível até {{ checkInStatus.deadlineLabel || 'segunda-feira' }}</p>
        </div>
        <span class="evo-checkin-banner-action">Responder</span>
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
          <div>
            <p class="evo-section-kicker">Acompanhamento diário</p>
            <h2>Metas de hoje</h2>
          </div>
          <NuxtLink to="/evolucao/nutricao" class="evo-section-link">
            Nutrição
            <ChevronRight class="evo-section-link-icon" aria-hidden="true" />
          </NuxtLink>
        </div>
        <EvolucaoGoalsPanel />
      </section>

      <section v-else aria-label="Peso">
        <EvolucaoWeightPanel />
      </section>
    </main>
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
  background: #fff;
  color: var(--cf-text);
}

.evo-content {
  width: 100%;
  box-sizing: border-box;
  padding: 1rem 1rem var(--cf-tab-clearance);
}

.evo-overview {
  padding: 1rem;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.evo-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.evo-eyebrow,
.evo-section-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: #8a8a8e;
}

.evo-overview h1 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 600;
  letter-spacing: -0.018em;
  text-wrap: balance;
}

.evo-overview-score {
  text-align: right;
  flex-shrink: 0;
}

.evo-overview-score strong {
  display: block;
  font-size: 1.55rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1;
}

.evo-overview-score span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.64rem;
  color: #8a8a8e;
}

.evo-overview-progress {
  height: 0.35rem;
  margin: 0.9rem 0 0.85rem;
  overflow: hidden;
  border-radius: 999px;
  background: #ececee;
}

.evo-overview-progress span {
  display: block;
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--cf-green, #8b967c);
}

.evo-overview-stats {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
}

.evo-overview-stat {
  min-width: 0;
}

.evo-overview-stat strong {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.evo-overview-stat span {
  display: block;
  margin-top: 0.12rem;
  overflow: hidden;
  font-size: 0.62rem;
  color: #8a8a8e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evo-overview-divider {
  width: 1px;
  height: 1.5rem;
  margin-inline: 0.65rem;
  background: #ededf0;
}

.evo-checkin-banner {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 0.75rem;
  padding: 0.78rem 0.85rem;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
}

.evo-checkin-banner-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: #f1f3ef;
  color: var(--cf-green-dark, #6f7863);
  flex-shrink: 0;
}

.evo-checkin-banner-icon {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.8;
}

.evo-checkin-banner-copy {
  min-width: 0;
}

.evo-checkin-banner-copy strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
}

.evo-checkin-banner-copy p {
  margin: 0.15rem 0 0;
  overflow: hidden;
  font-size: 0.68rem;
  color: #8a8a8e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evo-checkin-banner-action {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--cf-green-dark, #6f7863);
}

.evo-checkin-banner-arrow {
  width: 0.85rem;
  height: 0.85rem;
  color: #b0b0b4;
  flex-shrink: 0;
}

.evo-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.2rem;
  margin: 1rem 0 1.15rem;
  padding: 0.2rem;
  border-radius: 0.75rem;
  background: #f2f2f4;
}

.evo-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  min-height: 2.35rem;
  padding: 0.45rem 0.7rem;
  border: none;
  border-radius: 0.58rem;
  background: transparent;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  color: #77777c;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.evo-tab--active {
  background: #fff;
  color: var(--cf-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.09);
}

.evo-tab-icon {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 1.8;
}

.evo-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.evo-section-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.evo-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.08rem;
  min-height: 2rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--cf-green-dark, #6f7863);
  text-decoration: none;
  touch-action: manipulation;
}

.evo-section-link-icon {
  width: 0.78rem;
  height: 0.78rem;
}

.evo-checkin-banner:focus-visible,
.evo-tab:focus-visible,
.evo-section-link:focus-visible {
  outline: 2px solid var(--cf-green-dark, #6f7863);
  outline-offset: 2px;
}

.evo-checkin-banner:active,
.evo-section-link:active {
  opacity: 0.7;
}

@media (max-width: 360px) {
  .evo-content {
    padding-inline: 0.8rem;
  }

  .evo-overview-divider {
    margin-inline: 0.4rem;
  }

  .evo-checkin-banner-action {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .evo-tab {
    transition: none;
  }
}
</style>
