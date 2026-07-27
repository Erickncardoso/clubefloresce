<template>
  <NuxtLink
    to="/evolucao/nutricao"
    class="home-nutrition"
    aria-label="Abrir detalhes da nutrição de hoje"
  >
    <div class="home-nutrition-overview">
      <div class="home-nutrition-chart-wrap">
        <svg
          class="home-nutrition-chart"
          viewBox="0 0 120 120"
          role="img"
          :aria-label="chartAriaLabel"
        >
          <circle
            cx="60"
            cy="60"
            :r="radius"
            fill="none"
            stroke="#e5e9e1"
            :stroke-width="strokeWidth"
          />
          <circle
            cx="60"
            cy="60"
            :r="radius"
            fill="none"
            stroke="#76826b"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="calorieDashOffset"
            transform="rotate(-90 60 60)"
          />
        </svg>

        <div class="home-nutrition-chart-center" aria-hidden="true">
          <Flame class="home-nutrition-chart-center-icon" />
          <strong class="home-nutrition-chart-center-value">{{ centerPercent }}%</strong>
          <span class="home-nutrition-chart-center-label">da meta</span>
        </div>
      </div>

      <div class="home-nutrition-summary">
        <span class="home-nutrition-summary-label">Consumido hoje</span>
        <p class="home-nutrition-summary-value">
          <strong>{{ formatStatValue(calorieStat.value) }}</strong>
          <span>kcal</span>
        </p>
        <p class="home-nutrition-summary-target">
          Meta de {{ formatStatValue(calorieStat.target) }} kcal
        </p>
        <span class="home-nutrition-summary-status">{{ remainingLabel }}</span>
      </div>
    </div>

    <ul class="home-nutrition-stats">
      <li
        v-for="stat in macroStats"
        :key="stat.key"
        class="home-nutrition-stat"
      >
        <span
          class="home-nutrition-stat-dot"
          :style="{ backgroundColor: stat.color }"
          aria-hidden="true"
        />
        <p class="home-nutrition-stat-label">{{ stat.label }}</p>
        <p class="home-nutrition-stat-value">
          <span class="home-nutrition-stat-number">{{ formatStatValue(stat.value) }}</span>
          <span class="home-nutrition-stat-unit">/ {{ formatStatValue(stat.target) }} {{ stat.unit }}</span>
        </p>
        <span class="home-nutrition-stat-track" aria-hidden="true">
          <span
            class="home-nutrition-stat-fill"
            :style="{ width: `${stat.percent}%`, backgroundColor: stat.color }"
          />
        </span>
      </li>
    </ul>
  </NuxtLink>
</template>

<script setup>
import { Flame } from 'lucide-vue-next'

const props = defineProps({
  targets: { type: Object, required: true },
  consumed: { type: Object, required: true },
  streakDays: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
})

const CALORIE_CONFIG = {
  getValue: (consumed) => Number(consumed.caloriesKcal || 0),
  getTarget: (targets) => Number(targets.caloriesKcal || 0),
}

const LIST_CONFIG = [
  {
    key: 'carbs',
    label: 'Carboidratos',
    unit: 'g',
    color: '#6e9ed8',
    getValue: (consumed) => Number(consumed.carbsG || 0),
    getTarget: (targets) => Number(targets.carbsG || 0),
  },
  {
    key: 'protein',
    label: 'Proteínas',
    unit: 'g',
    color: '#64875e',
    getValue: (consumed) => Number(consumed.proteinG || 0),
    getTarget: (targets) => Number(targets.proteinG || 0),
  },
  {
    key: 'fat',
    label: 'Gorduras',
    unit: 'g',
    color: '#b08d5b',
    getValue: (consumed) => Number(consumed.fatG || 0),
    getTarget: (targets) => Number(targets.fatG || 0),
  },
]

const radius = 48
const strokeWidth = 9
const circumference = 2 * Math.PI * radius

function progressPercent(value, target) {
  if (!target) return 0
  return Math.min(100, Math.round((value / target) * 100))
}

const calorieStat = computed(() => ({
  value: CALORIE_CONFIG.getValue(props.consumed),
  target: CALORIE_CONFIG.getTarget(props.targets),
}))

const macroStats = computed(() =>
  LIST_CONFIG.map((item) => {
    const value = item.getValue(props.consumed)
    const target = item.getTarget(props.targets)
    return {
      key: item.key,
      label: item.label,
      unit: item.unit,
      color: item.color,
      value,
      target,
      percent: progressPercent(value, target),
    }
  }),
)

const centerPercent = computed(() =>
  Math.min(100, Math.max(0, Math.round(Number(props.percent) || 0))),
)

const calorieDashOffset = computed(() =>
  circumference - (centerPercent.value / 100) * circumference,
)

const remainingLabel = computed(() => {
  const remaining = Math.max(0, calorieStat.value.target - calorieStat.value.value)
  if (!calorieStat.value.target) return 'Meta ainda não definida'
  if (remaining === 0) return 'Meta alcançada'
  return `Faltam ${formatStatValue(remaining)} kcal`
})

const chartAriaLabel = computed(() =>
  `${centerPercent.value}% da meta calórica consumida`,
)

function formatStatValue(value) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR')
}
</script>

<style scoped>
.home-nutrition {
  display: block;
  padding: 1rem;
  border: 1px solid #e5e5ea;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: none;
  text-decoration: none;
  color: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.home-nutrition:hover {
  border-color: #d1d1d6;
}

.home-nutrition:focus-visible {
  outline: 2px solid var(--cf-green-dark);
  outline-offset: 3px;
}

.home-nutrition:active {
  transform: scale(0.985);
  background: #fafafa;
}

.home-nutrition-overview {
  display: grid;
  grid-template-columns: 7.25rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.home-nutrition-chart-wrap {
  position: relative;
  width: 7.25rem;
  height: 7.25rem;
}

.home-nutrition-chart {
  display: block;
  width: 100%;
  height: 100%;
}

.home-nutrition-chart-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.08rem;
  pointer-events: none;
}

.home-nutrition-chart-center-icon {
  width: 0.95rem;
  height: 0.95rem;
  color: var(--cf-green-dark);
  stroke-width: 2.2;
}

.home-nutrition-chart-center-value {
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
}

.home-nutrition-chart-center-label {
  font-size: 0.58rem;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.home-nutrition-summary {
  min-width: 0;
}

.home-nutrition-summary-label {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.home-nutrition-summary-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin: 0;
  line-height: 1;
}

.home-nutrition-summary-value strong {
  font-size: 1.65rem;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
}

.home-nutrition-summary-value span {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.home-nutrition-summary-target {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.home-nutrition-summary-status {
  display: block;
  align-items: center;
  margin-top: 0.45rem;
  color: var(--cf-green-dark);
  font-size: 0.7rem;
  font-weight: 500;
}

.home-nutrition-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  list-style: none;
  margin: 0.95rem 0 0;
  padding: 0;
  border-top: 1px solid #eceee9;
}

.home-nutrition-stat {
  display: flex;
  min-width: 0;
  padding: 0.85rem 0.65rem 0;
  flex-direction: column;
  border-right: 1px solid #eceee9;
}

.home-nutrition-stat:first-child {
  padding-left: 0;
}

.home-nutrition-stat:last-child {
  padding-right: 0;
  border-right: 0;
}

.home-nutrition-stat-dot {
  width: 0.45rem;
  height: 0.45rem;
  margin-bottom: 0.35rem;
  border-radius: 50%;
}

.home-nutrition-stat-label {
  overflow: hidden;
  margin: 0;
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.15;
  color: var(--cf-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-nutrition-stat-value {
  display: flex;
  align-items: baseline;
  gap: 0.12rem;
  margin: 0.2rem 0 0;
  line-height: 1.1;
  color: var(--cf-text);
}

.home-nutrition-stat-number {
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.home-nutrition-stat-unit {
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 400;
  color: var(--cf-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-nutrition-stat-track {
  display: block;
  width: 100%;
  height: 0.25rem;
  margin-top: 0.55rem;
  border-radius: 999px;
  background: #edf0ea;
  overflow: hidden;
}

.home-nutrition-stat-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

@media (max-width: 355px) {
  .home-nutrition-overview {
    grid-template-columns: 6.5rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .home-nutrition-chart-wrap {
    width: 6.5rem;
    height: 6.5rem;
  }

  .home-nutrition-summary-value strong {
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-nutrition {
    transition: none;
  }

  .home-nutrition:active {
    transform: none;
  }
}
</style>
