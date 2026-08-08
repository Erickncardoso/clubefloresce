<template>
  <div class="pecp admin-shell-card">
    <header class="pecp-head">
      <div>
        <h3>Comparação de biomarcadores</h3>
        <p>{{ matrix.exams.length }} conjunto(s) · da data mais antiga à mais recente</p>
      </div>
      <div class="pecp-tools">
        <label class="field field--float pecp-ref-field">
          <span class="pecp-ref-label">Padronizar referências por</span>
          <select v-model="referenceSourceExamId" class="pecp-ref-select">
            <option value="">Referência de cada coleta</option>
            <option v-for="exam in matrix.exams" :key="exam.id" :value="exam.id">
              {{ formatExameDate(exam.collectedAt) }} — {{ exam.title }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <div class="pecp-tabs" role="tablist">
      <button
        type="button"
        class="pecp-tab"
        :class="{ 'pecp-tab--active': view === 'table' }"
        @click="view = 'table'"
      >
        Tabela
      </button>
      <button
        type="button"
        class="pecp-tab"
        :class="{ 'pecp-tab--active': view === 'charts' }"
        @click="view = 'charts'"
      >
        Gráficos
      </button>
    </div>

    <div v-if="view === 'table'" class="pecp-table-wrap">
      <table class="pecp-table">
        <thead>
          <tr>
            <th>Biomarcador</th>
            <th>Referência</th>
            <th v-for="exam in matrix.exams" :key="exam.id">
              {{ formatExameDate(exam.collectedAt) }}
              <small>{{ exam.labName || exam.title }}</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="category in matrix.categories" :key="category.id">
            <tr class="pecp-category-row">
              <td :colspan="2 + matrix.exams.length">{{ category.label }}</td>
            </tr>
            <tr v-for="row in category.rows" :key="row.markerId || row.name">
              <td class="pecp-marker">{{ row.name }}</td>
              <td class="pecp-ref">{{ row.referenceLabel }}</td>
              <td v-for="cell in row.cells" :key="cell.examId" class="pecp-value">
                <PatientExameBiomarkerInsight
                  v-if="cell.value != null"
                  :marker-id="row.markerId"
                  :status="cell.status"
                >
                  <span class="pecp-value__num" :class="`pecp-value__num--${cell.status}`">
                    {{ formatValue(cell.value) }}
                    <small>{{ row.unit }}</small>
                  </span>
                </PatientExameBiomarkerInsight>
                <span v-else class="pecp-value__empty">—</span>
                <span
                  v-if="cell.deltaLabel"
                  class="pecp-delta"
                  :class="`pecp-delta--${cell.deltaTone}`"
                >
                  {{ cell.deltaLabel }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-else class="pecp-charts">
      <p v-if="!chartGroups.length" class="pecp-empty">
        Selecione conjuntos com biomarcadores repetidos para ver a evolução.
      </p>
      <section v-for="group in chartGroups" :key="group.id" class="pecp-chart-group">
        <h4>{{ group.label }}</h4>
        <div class="pecp-chart-grid">
          <PatientExameTrendChart
            v-for="chart in group.charts"
            :key="chart.markerId || chart.name"
            :chart="chart"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import PatientExameBiomarkerInsight from '~/components/patients/PatientExameBiomarkerInsight.vue'
import PatientExameTrendChart from '~/components/patients/PatientExameTrendChart.vue'
import { formatExameDate } from '~/utils/lab-exams.js'
import { buildComparisonMatrix, buildTrendChartSeries } from '~/utils/lab-exam-comparison.js'

const props = defineProps({
  exames: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
})

const view = ref('table')
const referenceSourceExamId = ref('')

watch(
  () => props.selectedIds,
  (ids) => {
    if (!ids.length) referenceSourceExamId.value = ''
    else if (referenceSourceExamId.value && !ids.includes(referenceSourceExamId.value)) {
      referenceSourceExamId.value = ''
    }
  },
)

const matrix = computed(() => buildComparisonMatrix(
  props.exames,
  props.selectedIds,
  { referenceSourceExamId: referenceSourceExamId.value },
))

const chartGroups = computed(() => buildTrendChartSeries(matrix.value))

function formatValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '')
}
</script>

<style scoped>
.pecp {
  padding: 1rem;
}

.pecp-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.pecp-head h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #2c322c;
}

.pecp-head p {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
}

.pecp-ref-field {
  min-width: 14rem;
}

.pecp-ref-label {
  font-size: 0.72rem;
  color: #6b7368;
}

.pecp-ref-select {
  width: 100%;
  min-height: 2.25rem;
}

.pecp-tabs {
  display: inline-flex;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.pecp-tab {
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid #e2e8e4;
  background: #f4f6f4;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.pecp-tab--active {
  background: #8b967c;
  border-color: #8b967c;
  color: #fff;
}

.pecp-table-wrap {
  overflow: auto;
}

.pecp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.pecp-table th,
.pecp-table td {
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid #eef1ee;
  vertical-align: top;
  text-align: left;
}

.pecp-table th {
  font-size: 0.72rem;
  color: #6b7368;
  background: #f8faf8;
}

.pecp-table th small {
  display: block;
  font-weight: 500;
  color: #8a9288;
}

.pecp-category-row td {
  background: #f4f6f4;
  font-weight: 600;
  color: #5f6d52;
  font-size: 0.72rem;
}

.pecp-marker {
  font-weight: 600;
  color: #2c322c;
  white-space: nowrap;
}

.pecp-ref {
  color: #6b7368;
  white-space: nowrap;
}

.pecp-value__num {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
  font-weight: 600;
}

.pecp-value__num small {
  font-weight: 500;
  color: #6b7368;
}

.pecp-value__num--low { color: #1d4ed8; }
.pecp-value__num--high { color: #b42318; }
.pecp-value__num--normal { color: #166534; }

.pecp-value__empty {
  color: #9ca3af;
}

.pecp-delta {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  color: #6b7368;
}

.pecp-delta--up { color: #b45309; }
.pecp-delta--down { color: #1d4ed8; }

.pecp-charts {
  display: grid;
  gap: 1rem;
}

.pecp-chart-group h4 {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  color: #5f6d52;
}

.pecp-chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.65rem;
}

.pecp-empty {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7368;
}
</style>
