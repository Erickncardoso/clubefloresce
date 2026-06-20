<template>
  <div class="patient-page evo-page patient-page--with-tab">
    <PatientHeader title="Evolução" show-back back-to="/inicio" :show-bell="false" />

    <NuxtLink
      v-if="pendingCheckIn"
      to="/check-in"
      class="evo-checkin-banner cf-squircle"
    >
      <CalendarCheck class="evo-checkin-banner-icon" aria-hidden="true" />
      <div>
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
        :class="{ active: activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="setTab(tab.id)"
      >
        <component :is="tab.icon" class="evo-tab-icon" />
        {{ tab.label }}
      </button>
    </div>

    <section v-if="activeTab === 'metas'" aria-label="Metas">
      <EvolucaoGoalsPanel />
    </section>

    <section v-else aria-label="Peso e medidas">
      <EvolucaoWeightPanel />
    </section>
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

const tabs = [
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'peso', label: 'Peso e medidas', icon: LineChart },
]

const activeTab = ref('metas')

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
})
</script>

<style scoped>
.evo-page {
  padding-top: 0;
}

.evo-checkin-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
  padding: 0.75rem 0.85rem;
  background: var(--cf-pink-soft);
  border: 1px solid color-mix(in srgb, var(--cf-pink) 25%, var(--cf-border));
  text-decoration: none;
  color: inherit;
}

.evo-checkin-banner-icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--cf-pink-dark);
  flex-shrink: 0;
}

.evo-checkin-banner strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-text);
}

.evo-checkin-banner p {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.evo-checkin-banner-arrow {
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  color: var(--cf-pink-dark);
  flex-shrink: 0;
}

.evo-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.evo-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.55rem 0.25rem;
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.evo-tab.active {
  border-color: var(--cf-pink);
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
}

.evo-tab-icon {
  width: 1rem;
  height: 1rem;
}
</style>
