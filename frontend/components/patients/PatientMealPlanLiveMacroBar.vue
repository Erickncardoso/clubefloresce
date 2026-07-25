<template>
  <section v-if="isVisible" class="mped-live-macros admin-shell-card" aria-label="Macronutrientes do plano em tempo real">
    <div class="mped-live-macros__copy">
      <strong>Macros em tempo real</strong>
      <span>Atualiza conforme você monta as refeições</span>
    </div>
    <div class="mped-live-macros__metrics">
      <span
        v-for="chip in summary.chips"
        :key="chip.id"
        class="mped-chip"
        :class="`mped-chip--${chip.tone}`"
      >
        {{ chip.label }} {{ formatMacroGrams(summary.macros[chip.key]) }}
        <small v-if="chip.percent">({{ chip.percent }}%)</small>
      </span>
      <span class="mped-chip mped-chip--kcal">{{ formatMacroKcal(summary.macros.caloriesKcal) }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { buildMealMacroSummary, hasLiveMealMacros } from '~/utils/meal-plan-live-macros.js'
import { formatMacroGrams, formatMacroKcal } from '~/utils/meal-plan-prescription.js'

const props = defineProps({
  totals: { type: Object, default: () => ({}) },
  show: { type: Boolean, default: true },
})

const summary = computed(() => buildMealMacroSummary(props.totals))
const isVisible = computed(() => props.show && hasLiveMealMacros(props.totals))
</script>

<style scoped>
.mped-live-macros {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mped-live-macros__copy {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.mped-live-macros__copy strong {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.mped-live-macros__copy span {
  font-size: 0.68rem;
  color: #6b7280;
}

.mped-live-macros__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

.mped-live-macros__metrics .mped-chip small {
  margin-left: 0.15rem;
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.85;
}
</style>
