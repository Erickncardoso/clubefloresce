<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panelRef"
      class="mph-formula mph-modal-popover"
      role="dialog"
      aria-label="Cálculo de Prescrição Hídrica"
      :style="panelStyle"
      @mouseenter="$emit('pointerenter')"
      @mouseleave="$emit('pointerleave')"
      @click.stop
    >
      <h3 class="mph-formula__title">Cálculo de Prescrição Hídrica</h3>

      <div class="mph-formula__grid">
        <section class="mph-formula__block">
          <h4>Base Fisiológica (BSA)</h4>
          <pre class="mph-formula__code">BSA = 0,007184 × peso^0,425 × alt^0,725</pre>
          <p class="mph-formula__line">Base diária = BSA × 1.000 ml</p>
          <h4 class="mph-formula__sub">Clima Quente/Úmido</h4>
          <p class="mph-formula__line">Fator multiplicador: ×1,2 (+20%)</p>
        </section>

        <section class="mph-formula__block">
          <h4>Atividade Física</h4>
          <ul class="mph-formula__list">
            <li v-for="item in HYDRATION_ACTIVITY_LEVELS" :key="item.id">
              <span>{{ item.label }}</span>
              <span class="mph-formula__value">×{{ formatFactor(item.factor) }}</span>
            </li>
          </ul>
          <h4 class="mph-formula__sub">Acréscimo por Duração</h4>
          <ul class="mph-formula__list">
            <li v-for="item in durationRows" :key="item.id">
              <span>{{ item.label }}</span>
              <span class="mph-formula__value">+{{ item.mlPerHour }} ml/h</span>
            </li>
          </ul>
        </section>
      </div>

      <section class="mph-formula__final">
        <h4>Fórmula Final</h4>
        <pre class="mph-formula__code mph-formula__code--wide">Meta = (BSA × 1.000 × fator atividade + ml/h × duração) × fator clima</pre>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { HYDRATION_ACTIVITY_LEVELS } from '~/utils/meal-plan-hydration.js'

defineProps({
  open: { type: Boolean, default: false },
  panelStyle: { type: Object, default: () => ({}) },
})

defineEmits(['pointerenter', 'pointerleave'])

const panelRef = ref(null)
defineExpose({ panelRef })

const durationRows = HYDRATION_ACTIVITY_LEVELS.filter((item) => item.mlPerHour > 0)

function formatFactor(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, '')
}
</script>

<style scoped>
.mph-formula {
  --mph-water: #00b2ca;
  width: min(31rem, calc(100vw - 1.5rem));
  padding: 1.15rem 1.25rem 1.2rem;
  background: #fff;
  border: 1px solid #eceef0;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
  z-index: 6300;
  pointer-events: auto;
  font-weight: 400;
}

.mph-formula__title {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--mph-water);
}

.mph-formula__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.35rem;
}

.mph-formula__block h4,
.mph-formula__final h4 {
  margin: 0 0 0.35rem;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.35;
  color: #4b5563;
}

.mph-formula__sub {
  margin-top: 0.75rem !important;
}

.mph-formula__code {
  margin: 0 0 0.5rem;
  padding: 0.5rem 0.65rem;
  background: #f5f5f5;
  border: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.5;
  color: #374151;
  white-space: pre-wrap;
}

.mph-formula__code--wide {
  margin-bottom: 0;
}

.mph-formula__line {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.45;
}

.mph-formula__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.22rem;
}

.mph-formula__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.4;
}

.mph-formula__value {
  font-size: 0.75rem;
  font-weight: 400;
  color: #374151;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mph-formula__final {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid #eef0f2;
}

@media (max-width: 640px) {
  .mph-formula__grid {
    grid-template-columns: 1fr;
  }
}
</style>
