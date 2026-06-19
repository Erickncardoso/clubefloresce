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
          v-for="bg in donutBackgrounds"
          :key="`bg-${bg.key}`"
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="bg.color"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="bg.dasharray"
          :transform="bg.transform"
        />
        <circle
          v-for="segment in donutSegments"
          :key="segment.key"
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

      <span
        v-for="marker in donutMarkers"
        :key="marker.key"
        class="home-nutrition-marker"
        :style="{ left: `${marker.x}%`, top: `${marker.y}%`, color: marker.color }"
        aria-hidden="true"
      >
        <component :is="marker.icon" class="home-nutrition-marker-icon" />
      </span>
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
    color: '#dce85a',
    trackColor: '#eef3c4',
    icon: Flame,
    getValue: (c) => Number(c.caloriesKcal || 0),
    getTarget: (t) => Number(t.caloriesKcal || 0),
  },
  {
    key: 'carbs',
    label: 'Carboidrato',
    unit: 'g',
    color: '#9eb8f8',
    trackColor: '#dfe8fb',
    icon: Wheat,
    getValue: (c) => Number(c.carbsG || 0),
    getTarget: (t) => Number(t.carbsG || 0),
  },
  {
    key: 'fat',
    label: 'Gorduras',
    unit: 'g',
    color: '#c9b8f2',
    trackColor: '#ebe6f8',
    icon: Droplet,
    getValue: (c) => Number(c.fatG || 0),
    getTarget: (t) => Number(t.fatG || 0),
  },
  {
    key: 'protein',
    label: 'Proteínas',
    unit: 'g',
    color: '#e8a598',
    trackColor: '#fae8e4',
    icon: Fish,
    getValue: (c) => Number(c.proteinG || 0),
    getTarget: (t) => Number(t.proteinG || 0),
  },
]

const radius = 42
const strokeWidth = 22
const circumference = 2 * Math.PI * radius
const slotCount = MACRO_CONFIG.length
const slotArc = circumference / slotCount
const slotAngle = 360 / slotCount

const macroStats = computed(() =>
  MACRO_CONFIG.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    color: item.color,
    icon: item.icon,
    value: item.getValue(props.consumed),
    target: item.getTarget(props.targets),
    percent: progressPercent(item.getValue(props.consumed), item.getTarget(props.targets)),
  })),
)

function progressPercent(value, target) {
  if (!target) return 0
  return Math.min(100, Math.round((value / target) * 100))
}

const donutBackgrounds = computed(() => {
  let rotation = -90

  return macroStats.value.map((item) => {
    const dasharray = `${slotArc} ${circumference - slotArc}`
    const transform = `rotate(${rotation} 60 60)`
    rotation += slotAngle

    return {
      key: item.key,
      color: MACRO_CONFIG.find((m) => m.key === item.key)?.trackColor || item.color,
      dasharray,
      transform,
    }
  })
})

const donutSegments = computed(() => {
  let rotation = -90

  return macroStats.value.map((item) => {
    const filled = (item.percent / 100) * slotArc
    const dasharray = `${Math.max(filled, 0)} ${circumference - Math.max(filled, 0)}`
    const transform = `rotate(${rotation} 60 60)`
    rotation += slotAngle

    return {
      key: item.key,
      color: item.color,
      dasharray,
      transform,
    }
  })
})

const donutMarkers = computed(() => {
  let rotation = -90
  // Borda externa do anel (r=42 + metade do traço) em % do centro do gráfico
  const markerRadius = ((radius + strokeWidth / 2) / 60) * 50

  return macroStats.value.map((item) => {
    const midAngle = rotation + slotAngle / 2
    rotation += slotAngle
    const rad = (midAngle * Math.PI) / 180

    return {
      key: item.key,
      icon: item.icon,
      color: item.color,
      x: 50 + markerRadius * Math.cos(rad),
      y: 50 + markerRadius * Math.sin(rad),
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1.15rem 1rem 1.15rem 1.15rem;
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
  gap: 0.62rem;
  flex: 1;
  min-width: 0;
}

.home-nutrition-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.home-nutrition-stat-dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.home-nutrition-stat-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
}

.home-nutrition-stat-value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.18rem;
  line-height: 1.1;
  color: var(--cf-text);
}

.home-nutrition-stat-number {
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.home-nutrition-stat-unit {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.home-nutrition-stat-label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--cf-text-muted);
}

.home-nutrition-chart-wrap {
  position: relative;
  flex-shrink: 0;
  width: 8.1rem;
  height: 8.1rem;
  overflow: visible;
}

.home-nutrition-chart {
  display: block;
  width: 100%;
  height: 100%;
}

.home-nutrition-marker {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  background: #fff;
  border: 2px solid currentColor;
  box-shadow: 0 0 0 4px #fafaf8;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
}

.home-nutrition-marker-icon {
  width: 0.82rem;
  height: 0.82rem;
  color: currentColor;
  stroke-width: 2.35;
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
