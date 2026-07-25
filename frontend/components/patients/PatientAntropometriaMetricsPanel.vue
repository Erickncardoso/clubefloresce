<template>
  <aside class="pametrics">
    <section class="pametrics-card">
      <header class="pametrics-head">
        <h3>IMC</h3>
        <button
          type="button"
          class="pametrics-info"
          aria-label="Informações sobre IMC"
          :title="bmiInfoTitle"
        >
          ⓘ
        </button>
      </header>
      <p class="pametrics-value">
        <strong>{{ formatNumber(report.bmi, 2) }}</strong>
        <span>kg/m²</span>
        <span v-if="report.bmiClass" class="pametrics-class">{{ report.bmiClass.label }}</span>
      </p>
      <div
        class="pametrics-scale pametrics-scale--bmi"
        :style="{ gridTemplateColumns: `repeat(${bmiSegments.length}, 1fr)` }"
      >
        <div
          v-for="(segment, index) in bmiSegments"
          :key="segment.label"
          class="pametrics-scale__seg"
          :class="`pametrics-scale__seg--${segment.tone}`"
        />
        <span
          v-if="report.bmiClass"
          class="pametrics-scale__marker"
          :style="{ left: `${bmiMarkerLeft}%` }"
          aria-hidden="true"
        />
      </div>
      <p v-if="report.bmiClass" class="pametrics-caption">
        {{ report.bmiClass.label }}
        <small v-if="report.bmiReference">{{ report.bmiReference.reference }} · {{ report.bmiReference.label }}</small>
      </p>
    </section>

    <section class="pametrics-card">
      <header class="pametrics-head">
        <h3>Densidade Corporal</h3>
        <button type="button" class="pametrics-info" aria-label="Informações">ⓘ</button>
      </header>
      <p class="pametrics-value">
        <strong>{{ formatNumber(report.bodyDensity, 3) }}</strong>
        <span>g/cm³</span>
      </p>
      <div class="pametrics-scale pametrics-scale--muted">
        <div v-for="n in 5" :key="n" class="pametrics-scale__seg" />
      </div>
    </section>

    <section class="pametrics-card">
      <header class="pametrics-head">
        <h3>Composição Corporal</h3>
        <button type="button" class="pametrics-info" aria-label="Informações">ⓘ</button>
      </header>
      <div class="pametrics-legend">
        <span class="pametrics-legend__item pametrics-legend__item--lean">Massa Magra</span>
        <span class="pametrics-legend__item pametrics-legend__item--fat">Massa Gorda</span>
      </div>
      <div class="pametrics-bar">
        <span
          class="pametrics-bar__lean"
          :style="{ width: `${report.leanShare || 0}%` }"
        />
        <span
          class="pametrics-bar__fat"
          :style="{ width: `${report.fatShare || 0}%` }"
        />
      </div>
    </section>

    <section class="pametrics-card">
      <header class="pametrics-head">
        <h3>Razão Cintura–Quadril</h3>
        <button type="button" class="pametrics-info" aria-label="Informações">ⓘ</button>
      </header>
      <p class="pametrics-value">
        <strong>{{ formatNumber(report.whr, 2) }}</strong>
      </p>
      <div class="pametrics-scale pametrics-scale--muted">
        <div v-for="n in 5" :key="`whr-${n}`" class="pametrics-scale__seg" />
      </div>
    </section>

    <section class="pametrics-card">
      <header class="pametrics-head">
        <h3>Distribuição de Peso</h3>
        <button type="button" class="pametrics-info" aria-label="Informações">ⓘ</button>
      </header>
      <div class="pametrics-legend pametrics-legend--wrap">
        <span class="pametrics-legend__item pametrics-legend__item--lean">Muscular</span>
        <span class="pametrics-legend__item pametrics-legend__item--residual">Residual</span>
        <span class="pametrics-legend__item pametrics-legend__item--bone">Ósseo</span>
        <span class="pametrics-legend__item pametrics-legend__item--fat">Adiposo</span>
      </div>
      <div class="pametrics-scale pametrics-scale--muted">
        <div v-for="n in 4" :key="`dist-${n}`" class="pametrics-scale__seg" />
      </div>
    </section>

    <button type="button" class="btn-primary pametrics-print" @click="$emit('print')">
      <Printer :size="16" />
      Imprimir
    </button>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Printer } from 'lucide-vue-next'
import { buildAntropometriaReport, bmiReferenceHint, bmiScaleSegmentsForAge, formatNumber } from '~/utils/antropometria.js'

const props = defineProps({
  assessment: { type: Object, default: () => ({}) },
  birthDate: { type: String, default: '' },
})

defineEmits(['print'])

const report = computed(() => buildAntropometriaReport(props.assessment, { birthDate: props.birthDate }))

const patientAge = computed(() => report.value.patientAgeYears)

const bmiSegments = computed(() => bmiScaleSegmentsForAge(patientAge.value))

const bmiInfoTitle = computed(() => bmiReferenceHint(patientAge.value))

const bmiMarkerLeft = computed(() => {
  const index = report.value.bmiClass?.index ?? 1
  const total = bmiSegments.value.length || 1
  return ((index + 0.5) / total) * 100
})
</script>

<style scoped>
.pametrics {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  position: sticky;
  top: 0.75rem;
}

.pametrics-card {
  padding: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.pametrics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.pametrics-head h3 {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #5f7560;
}

.pametrics-info {
  border: none;
  background: transparent;
  color: #9aa39a;
  font-size: 0.75rem;
  cursor: help;
}

.pametrics-value {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0 0 0.55rem;
}

.pametrics-value strong {
  font-size: 1.35rem;
  font-weight: 600;
  color: #5f7560;
  line-height: 1;
}

.pametrics-value span {
  font-size: 0.75rem;
  color: #8a9288;
}

.pametrics-class {
  margin-left: 0.15rem;
  padding: 0.12rem 0.45rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.14);
  font-size: 0.68rem !important;
  font-weight: 600;
  color: #4a5f48 !important;
}

.pametrics-scale {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.15rem;
  min-height: 0.45rem;
}

.pametrics-scale--muted {
  grid-template-columns: repeat(5, 1fr);
}

.pametrics-scale__seg {
  height: 0.45rem;
  border-radius: var(--cf-radius-pill);
  background: #eef1ee;
}

.pametrics-scale__seg--blue { background: #93c5fd; }
.pametrics-scale__seg--green { background: #86efac; }
.pametrics-scale__seg--amber { background: #fcd34d; }
.pametrics-scale__seg--orange { background: #fdba74; }
.pametrics-scale__seg--red { background: #fca5a5; }
.pametrics-scale__seg--red-dark { background: #f87171; }

.pametrics-scale__marker {
  position: absolute;
  top: -0.35rem;
  width: 0;
  height: 0;
  border-left: 0.35rem solid transparent;
  border-right: 0.35rem solid transparent;
  border-top: 0.45rem solid #5f7560;
  transform: translateX(-50%);
}

.pametrics-caption {
  margin: 0.45rem 0 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: #5f7560;
}

.pametrics-caption small {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.64rem;
  font-weight: 400;
  color: #8a9288;
}

.pametrics-legend {
  display: flex;
  gap: 0.65rem;
  margin-bottom: 0.45rem;
}

.pametrics-legend--wrap {
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
}

.pametrics-legend__item {
  font-size: 0.68rem;
  font-weight: 500;
}

.pametrics-legend__item--lean { color: #15803d; }
.pametrics-legend__item--fat { color: #2563eb; }
.pametrics-legend__item--residual { color: #ca8a04; }
.pametrics-legend__item--bone { color: #db2777; }

.pametrics-bar {
  display: flex;
  width: 100%;
  height: 0.55rem;
  overflow: hidden;
  border-radius: var(--cf-radius-pill);
  background: #eef1ee;
}

.pametrics-bar__lean,
.pametrics-bar__fat {
  display: block;
  height: 100%;
}

.pametrics-bar__lean { background: #86efac; }
.pametrics-bar__fat { background: #93c5fd; }

.pametrics-print {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
}
</style>
