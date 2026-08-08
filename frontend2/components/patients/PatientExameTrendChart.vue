<template>
  <figure class="petc">
    <figcaption class="petc-head">
      <strong>{{ chart.name }}</strong>
      <span>{{ unitLabel }}</span>
    </figcaption>
    <svg
      class="petc-svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="`Evolução de ${chart.name}`"
    >
      <rect
        v-if="refBand"
        :x="padding"
        :y="refBand.y"
        :width="innerWidth"
        :height="refBand.height"
        class="petc-ref-band"
      />
      <polyline
        v-if="linePoints"
        :points="linePoints"
        class="petc-line"
        fill="none"
      />
      <circle
        v-for="(point, index) in plottedPoints"
        :key="index"
        :cx="point.x"
        :cy="point.y"
        r="3.5"
        class="petc-dot"
      />
    </svg>
    <div class="petc-labels">
      <span v-for="(point, index) in chart.points" :key="index">{{ point.label }}</span>
    </div>
  </figure>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chart: { type: Object, required: true },
})

const width = 280
const height = 96
const padding = 16

const innerWidth = width - padding * 2
const innerHeight = height - padding * 2

const values = computed(() => props.chart.points.map((point) => Number(point.value)).filter(Number.isFinite))

const domain = computed(() => {
  const vals = values.value
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (props.chart.refMin != null) min = Math.min(min, Number(props.chart.refMin))
  if (props.chart.refMax != null) max = Math.max(max, Number(props.chart.refMax))
  if (min === max) {
    min -= 1
    max += 1
  }
  const pad = (max - min) * 0.12
  return { min: min - pad, max: max + pad }
})

function scaleY(value) {
  const { min, max } = domain.value
  const ratio = (Number(value) - min) / (max - min)
  return padding + innerHeight - ratio * innerHeight
}

function scaleX(index, total) {
  if (total <= 1) return padding + innerWidth / 2
  return padding + (index / (total - 1)) * innerWidth
}

const plottedPoints = computed(() => props.chart.points.map((point, index, arr) => ({
  x: scaleX(index, arr.length),
  y: scaleY(point.value),
  value: point.value,
})))

const linePoints = computed(() => plottedPoints.value.map((point) => `${point.x},${point.y}`).join(' '))

const refBand = computed(() => {
  const { refMin, refMax } = props.chart
  if (refMin == null && refMax == null) return null
  const yTop = scaleY(refMax ?? domain.value.max)
  const yBottom = scaleY(refMin ?? domain.value.min)
  return {
    y: yTop,
    height: Math.max(2, yBottom - yTop),
  }
})

const unitLabel = computed(() => {
  const unit = props.chart.unit || ''
  const ref = []
  if (props.chart.refMin != null) ref.push(`≥${props.chart.refMin}`)
  if (props.chart.refMax != null) ref.push(`≤${props.chart.refMax}`)
  const refText = ref.length ? ` · ref ${ref.join(' / ')}` : ''
  return `${unit}${refText}`.trim()
})
</script>

<style scoped>
.petc {
  margin: 0;
  padding: 0.65rem;
  border: 1px solid #eef1ee;
  background: #fafbfa;
}

.petc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.petc-head strong {
  font-size: 0.78rem;
  color: #2c322c;
}

.petc-head span {
  font-size: 0.68rem;
  color: #6b7368;
}

.petc-svg {
  width: 100%;
  height: auto;
  display: block;
}

.petc-ref-band {
  fill: rgba(139, 150, 124, 0.12);
}

.petc-line {
  stroke: #8b967c;
  stroke-width: 2;
}

.petc-dot {
  fill: #5f6d52;
}

.petc-labels {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
  margin-top: 0.25rem;
  font-size: 0.64rem;
  color: #6b7368;
}
</style>
