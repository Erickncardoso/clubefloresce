<template>
  <div class="weight-chart">
    <div v-if="!points.length" class="weight-chart-empty">
      Registre seu peso para ver o gráfico.
    </div>
    <template v-else>
      <svg :viewBox="`0 0 ${width} ${height}`" class="weight-chart-svg" aria-hidden="true">
        <line
          v-for="tick in ticks"
          :key="tick"
          :x1="padLeft"
          :y1="toY(tick)"
          :x2="width - padRight"
          :y2="toY(tick)"
          stroke="#ececee"
          stroke-width="1"
        />
        <text
          v-for="tick in ticks"
          :key="`label-${tick}`"
          :x="padLeft - 6"
          :y="toY(tick) + 4"
          text-anchor="end"
          fill="#aeaeb2"
          font-size="10"
        >
          {{ tick.toFixed(1) }}
        </text>
        <line
          v-if="goalKg != null && Number.isFinite(goalKg)"
          :x1="padLeft"
          :y1="toY(goalKg)"
          :x2="width - padRight"
          :y2="toY(goalKg)"
          stroke="#E85D5D"
          stroke-width="1.5"
          stroke-dasharray="5 4"
        />
        <polyline
          v-if="points.length > 1"
          :points="polyline"
          fill="none"
          stroke="#7B61FF"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="(point, index) in points"
          :key="`${point.label}-${index}`"
          :cx="toX(index)"
          :cy="toY(point.weightKg)"
          :r="points.length === 1 ? 5 : 4"
          fill="#7B61FF"
        />
        <text
          v-for="(point, index) in visibleLabels"
          :key="`x-${point.label}-${index}`"
          :x="toX(point.index)"
          :y="height - 6"
          text-anchor="middle"
          fill="#aeaeb2"
          font-size="10"
        >
          {{ point.label }}
        </text>
      </svg>
      <div class="weight-chart-legend">
        <span class="weight-chart-legend-item">
          <span class="weight-chart-dot" />
          Seu peso
        </span>
        <span v-if="goalKg != null && Number.isFinite(goalKg)" class="weight-chart-legend-item">
          <span class="weight-chart-dash" />
          Meta de peso
        </span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { chartYRange, yTicks } from '~/utils/weight-progress'

const props = defineProps({
  points: { type: Array, default: () => [] },
  goalKg: { type: Number, default: null },
})

const width = 320
const height = 168
const padLeft = 34
const padRight = 8
const padTop = 10
const padBottom = 24

const range = computed(() => chartYRange(props.points, props.goalKg))
const ticks = computed(() => yTicks(range.value.min, range.value.max, 5))
const innerW = width - padLeft - padRight
const innerH = height - padTop - padBottom

function toY(weight) {
  const { min, max } = range.value
  if (max === min) return padTop + innerH / 2
  return padTop + ((max - weight) / (max - min)) * innerH
}

function toX(index) {
  if (props.points.length <= 1) return padLeft + innerW / 2
  return padLeft + (index / (props.points.length - 1)) * innerW
}

const polyline = computed(() => props.points
  .map((point, index) => `${toX(index)},${toY(point.weightKg)}`)
  .join(' '))

const visibleLabels = computed(() => props.points
  .map((point, index) => ({ ...point, index }))
  .filter((point, index, list) => list.length <= 6 || index % 2 === 0 || index === list.length - 1))
</script>

<style scoped>
.weight-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weight-chart-empty {
  display: grid;
  place-items: center;
  min-height: 10.5rem;
  border-radius: 1rem;
  background: #fafafa;
  color: #8a8a8e;
  font-size: 0.82rem;
}

.weight-chart-svg {
  width: 100%;
  height: auto;
}

.weight-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-inline: 0.25rem;
}

.weight-chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #8a8a8e;
}

.weight-chart-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #7B61FF;
}

.weight-chart-dash {
  width: 0.85rem;
  height: 0.12rem;
  border-radius: 999px;
  background: #E85D5D;
}
</style>
