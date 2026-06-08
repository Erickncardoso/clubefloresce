<template>
  <div class="macro-pizza" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      class="macro-pizza-chart"
      :viewBox="`0 0 ${viewBox} ${viewBox}`"
      role="img"
      :aria-label="ariaLabel"
    >
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--cf-track)"
        :stroke-width="stroke"
      />
      <circle
        v-for="segment in segments"
        :key="segment.key"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="segment.color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="segment.dasharray"
        :transform="segment.transform"
      />
    </svg>

    <div class="macro-pizza-center">
      <span v-if="streakDays" class="macro-pizza-day">Dia {{ streakDays }}</span>
      <div class="macro-pizza-kcal">
        <Apple class="macro-pizza-icon" :size="18" :stroke-width="2" aria-hidden="true" />
        <strong>{{ consumed.caloriesKcal }}</strong>
      </div>
      <span class="macro-pizza-goal">{{ targets.caloriesKcal }} kcal</span>
    </div>
  </div>
</template>

<script setup>
import { Apple } from 'lucide-vue-next'

const props = defineProps({
  targets: { type: Object, required: true },
  consumed: { type: Object, required: true },
  streakDays: { type: Number, default: 0 },
  size: { type: Number, default: 148 },
})

const viewBox = 120
const center = 60
const stroke = 7
const radius = 50
const circumference = 2 * Math.PI * radius
const slot = circumference / 3
const slotGap = 3

function macroPercent(current, target) {
  if (!target) return 0
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100))
}

function slotDash(percent) {
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * Math.max(0, slot - slotGap)
  return `${filled} ${circumference - filled}`
}

const segments = computed(() => {
  const percents = [
    { key: 'carbs', pct: macroPercent(props.consumed.carbsG, props.targets.carbsG), color: '#6d9a66' },
    { key: 'protein', pct: macroPercent(props.consumed.proteinG, props.targets.proteinG), color: '#e8c24b' },
    { key: 'fat', pct: macroPercent(props.consumed.fatG, props.targets.fatG), color: '#a882d4' },
  ]

  return percents.map((item, index) => ({
    key: item.key,
    color: item.color,
    dasharray: slotDash(item.pct),
    transform: `rotate(${-90 + index * 120} ${center} ${center})`,
  }))
})

const ariaLabel = computed(() => {
  const carbs = macroPercent(props.consumed.carbsG, props.targets.carbsG)
  const protein = macroPercent(props.consumed.proteinG, props.targets.proteinG)
  const fat = macroPercent(props.consumed.fatG, props.targets.fatG)
  return `Carbos ${carbs}%, proteína ${protein}%, gorduras ${fat}%`
})
</script>

<style scoped>
.macro-pizza {
  position: relative;
  flex-shrink: 0;
}

.macro-pizza-chart {
  display: block;
  width: 100%;
  height: 100%;
}

.macro-pizza-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 1.5rem 0.75rem 1.25rem;
  text-align: center;
  pointer-events: none;
}

.macro-pizza-day {
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cf-text-muted);
  background: #f0f0ee;
  border: 1px solid var(--cf-border);
  line-height: 1.2;
}

.macro-pizza-kcal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  margin-top: 0.1rem;
}

.macro-pizza-icon {
  color: var(--cf-text);
  flex-shrink: 0;
}

.macro-pizza-kcal strong {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--cf-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.macro-pizza-goal {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  line-height: 1.15;
}
</style>
