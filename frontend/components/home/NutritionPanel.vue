<template>
  <NuxtLink to="/evolucao/nutricao" class="home-nutrition" aria-label="Abrir nutrição do mês">
    <ul class="home-nutrition-stats">
      <li
        v-for="stat in macroStats"
        :key="stat.key"
        class="home-nutrition-stat"
      >
        <span class="home-nutrition-stat-dot" :style="{ backgroundColor: stat.color }" aria-hidden="true" />
        <div class="home-nutrition-stat-copy">
          <p class="home-nutrition-stat-value">
            <span class="home-nutrition-stat-number">{{ formatStatValue(stat.value) }}</span>
            <span class="home-nutrition-stat-unit">{{ stat.unit }}</span>
          </p>
          <p class="home-nutrition-stat-label">{{ stat.label }}</p>
        </div>
      </li>
    </ul>

    <div class="home-nutrition-chart-wrap">
      <svg
        class="home-nutrition-chart"
        viewBox="0 0 120 120"
        role="img"
        :aria-label="chartAriaLabel"
      >
        <circle
          v-for="track in donutTracks"
          :key="`track-${track.key}`"
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="track.color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="track.dasharray"
          :transform="track.transform"
        />
        <circle
          v-for="segment in donutSegments"
          :key="`seg-${segment.key}`"
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="segment.color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="segment.dasharray"
          :transform="segment.transform"
        />
      </svg>

      <div class="home-nutrition-chart-center" aria-hidden="true">
        <Flame class="home-nutrition-chart-center-icon" />
        <strong class="home-nutrition-chart-center-value">{{ centerPercent }}%</strong>
        <span class="home-nutrition-chart-center-label">meta kcal</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
import { Droplet, Fish, Flame, Wheat } from 'lucide-vue-next'

const props = defineProps({
  targets: { type: Object, required: true },
  consumed: { type: Object, required: true },
  streakDays: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
})

const MACRO_CONFIG = [
  {
    key: 'calories',
    label: 'Calorias',
    unit: 'kcal',
    color: '#c5d84a',
    trackColor: '#eef3c8',
    icon: Flame,
    getValue: (c) => Number(c.caloriesKcal || 0),
    getTarget: (t) => Number(t.caloriesKcal || 0),
  },
  {
    key: 'carbs',
    label: 'Carboidrato',
    unit: 'g',
    color: '#8eb0f0',
    trackColor: '#e4ecfb',
    icon: Wheat,
    getValue: (c) => Number(c.carbsG || 0),
    getTarget: (t) => Number(t.carbsG || 0),
  },
  {
    key: 'fat',
    label: 'Gorduras',
    unit: 'g',
    color: '#b8a8e8',
    trackColor: '#ede8f8',
    icon: Droplet,
    getValue: (c) => Number(c.fatG || 0),
    getTarget: (t) => Number(t.fatG || 0),
  },
  {
    key: 'protein',
    label: 'Proteínas',
    unit: 'g',
    color: '#8B967C',
    trackColor: '#eef0eb',
    icon: Fish,
    getValue: (c) => Number(c.proteinG || 0),
    getTarget: (t) => Number(t.proteinG || 0),
  },
]

const radius = 46
const strokeWidth = 12
const circumference = 2 * Math.PI * radius
const slotCount = MACRO_CONFIG.length
const slotAngle = 360 / slotCount
const gapAngle = 6
const segmentAngle = slotAngle - gapAngle
const segmentArc = (segmentAngle / 360) * circumference
const segmentGap = circumference - segmentArc

const macroStats = computed(() =>
  MACRO_CONFIG.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    color: item.color,
    value: item.getValue(props.consumed),
    target: item.getTarget(props.targets),
    percent: progressPercent(item.getValue(props.consumed), item.getTarget(props.targets)),
  })),
)

const centerPercent = computed(() => Math.min(100, Math.max(0, Math.round(Number(props.percent) || 0))))

function progressPercent(value, target) {
  if (!target) return 0
  return Math.min(100, Math.round((value / target) * 100))
}

const donutTracks = computed(() => {
  let rotation = -90 + gapAngle / 2

  return macroStats.value.map((item) => {
    const config = MACRO_CONFIG.find((m) => m.key === item.key)
    const transform = `rotate(${rotation} 60 60)`
    rotation += slotAngle

    return {
      key: item.key,
      color: config?.trackColor || item.color,
      dasharray: `${segmentArc} ${segmentGap}`,
      transform,
    }
  })
})

const donutSegments = computed(() => {
  let rotation = -90 + gapAngle / 2

  return macroStats.value.map((item) => {
    const filled = Math.max((item.percent / 100) * segmentArc, item.percent > 0 ? 1.5 : 0)
    const transform = `rotate(${rotation} 60 60)`
    rotation += slotAngle

    return {
      key: item.key,
      color: item.color,
      dasharray: `${filled} ${circumference - filled}`,
      transform,
    }
  })
})

const chartAriaLabel = computed(() =>
  macroStats.value
    .map((item) => `${item.label} ${formatStatValue(item.value)} ${item.unit}`)
    .join(', '),
)

function formatStatValue(value) {
  const rounded = Math.round(Number(value) || 0)
  return rounded.toLocaleString('pt-BR')
}
</script>

<style scoped>
.home-nutrition {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem 1.15rem;
  padding: 1.25rem 1.2rem 1.25rem 1.3rem;
  border: 1px solid var(--cf-border);
  border-radius: 1.65rem;
  background: #fafaf8;
  box-shadow: 0 10px 28px rgba(28, 24, 22, 0.06);
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.home-nutrition:active {
  transform: scale(0.992);
  box-shadow: 0 6px 18px rgba(28, 24, 22, 0.05);
}

.home-nutrition-stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 0;
}

.home-nutrition-stat {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
}

.home-nutrition-stat-dot {
  width: 0.58rem;
  height: 0.58rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.home-nutrition-stat-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.home-nutrition-stat-value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  line-height: 1.1;
  color: var(--cf-text);
}

.home-nutrition-stat-number {
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.home-nutrition-stat-unit {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.home-nutrition-stat-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--cf-text-muted);
}

.home-nutrition-chart-wrap {
  position: relative;
  flex-shrink: 0;
  width: 9.75rem;
  height: 9.75rem;
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
  width: 1.05rem;
  height: 1.05rem;
  color: #c5d84a;
  stroke-width: 2.2;
}

.home-nutrition-chart-center-value {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
}

.home-nutrition-chart-center-label {
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
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
