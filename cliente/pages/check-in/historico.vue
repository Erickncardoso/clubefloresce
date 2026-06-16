<template>
  <div class="patient-page historico-page">
    <PatientHeader title="Histórico" show-back back-to="/check-in" />

    <PatientPageSkeleton v-if="pageLoading" layout="checkin" />

    <template v-else>
      <div class="historico-chips">
        <button
          v-for="chip in filters"
          :key="chip.id"
          type="button"
          class="patient-chip"
          :class="{ active: activeFilter === chip.id }"
          @click="activeFilter = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <section class="patient-card historico-chart">
        <h2>Seu progresso de check-ins</h2>
        <div class="historico-bars">
          <div
            v-for="(item, i) in chartItems"
            :key="item.id"
            class="historico-bar-wrap"
          >
            <div class="historico-bar" :style="{ height: `${item.pct}%` }" />
            <span>S{{ chartItems.length - i }}</span>
          </div>
        </div>
      </section>

      <section class="historico-list">
        <article v-for="(item, index) in filteredHistory" :key="item.id" class="historico-row">
          <div>
            <strong>{{ formatEntryTitle(item, index) }}</strong>
            <p>{{ formatCheckinPeriod(item.periodKey, item.template?.frequency) }}</p>
            <p class="historico-summary">{{ summarizeCheckinAnswers(item.template?.steps, item.answers) }}</p>
          </div>
          <span class="historico-status" :class="statusClass(item)">
            {{ statusLabel(item) }}
          </span>
        </article>
        <p v-if="!filteredHistory.length" class="historico-empty">Nenhum registro neste período.</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import {
  formatCheckinPeriod,
  scoreFromTemplateAnswers,
  summarizeCheckinAnswers,
} from '~/utils/checkin-answers'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const { patientTimeHeaders } = usePatientLocalTime()
const history = ref([])
const activeFilter = ref('all')
const pageLoading = ref(true)

const filters = [
  { id: 'all', label: 'Todas as semanas' },
  { id: 'month', label: 'Este mês' },
  { id: 'quarter', label: 'Últimos 3 meses' },
]

const pct = (item) => scoreFromTemplateAnswers(item.answers) ?? 0

const chartItems = computed(() =>
  [...history.value].slice(0, 8).reverse().map((item) => ({ ...item, pct: pct(item) })),
)

const filteredHistory = computed(() => {
  const now = new Date()
  return history.value.filter((item) => {
    const d = new Date(item.updatedAt || item.createdAt)
    if (activeFilter.value === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    if (activeFilter.value === 'quarter') {
      const diff = now - d
      return diff <= 90 * 24 * 60 * 60 * 1000
    }
    return true
  })
})

const formatEntryTitle = (item, index) => {
  const title = item.template?.title || 'Check-in'
  return `${title} #${history.value.length - index}`
}

const statusLabel = (item) => {
  const value = pct(item)
  if (value >= 80) return '✓ Concluído'
  if (value >= 50) return '◐ Parcial'
  return '— Fraco'
}

const statusClass = (item) => {
  const value = pct(item)
  if (value >= 80) return 'historico-status--ok'
  if (value >= 50) return 'historico-status--warn'
  return 'historico-status--muted'
}

onMounted(async () => {
  pageLoading.value = true
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me/responses`, {
      headers: patientTimeHeaders(),
    })
    history.value = data.responses || []
  } catch {
    history.value = []
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
.historico-page {
  padding-top: 0;
}

.historico-chips {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1.25rem;
  scrollbar-width: none;
}

.historico-chart {
  margin-bottom: 1.25rem;
}

.historico-chart h2 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 800;
}

.historico-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 5rem;
}

.historico-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  height: 100%;
  justify-content: flex-end;
}

.historico-bar {
  width: 100%;
  background: var(--pa-green);
  border-radius: 6px 6px 0 0;
  min-height: 8px;
}

.historico-bar-wrap span {
  font-size: 0.65rem;
  color: var(--pa-text-muted);
}

.historico-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--pa-border);
}

.historico-row strong {
  display: block;
  font-size: 0.92rem;
}

.historico-row p {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--pa-text-muted);
}

.historico-summary {
  margin-top: 0.35rem !important;
  color: var(--pa-text) !important;
}

.historico-status {
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.historico-status--ok { color: var(--pa-green); }
.historico-status--warn { color: var(--pa-orange); }
.historico-status--muted { color: #9ca3af; }

.historico-empty {
  text-align: center;
  color: var(--pa-text-muted);
  padding: 2rem;
}
</style>
