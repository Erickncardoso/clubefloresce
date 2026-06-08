<template>
  <div class="journey-macro-ring">
    <div class="journey-macro-ring__chart" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img" :aria-label="`${label}: ${percent}%`">
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          stroke="var(--cf-track)"
          :stroke-width="stroke"
        />
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke="color"
          :stroke-width="stroke"
          stroke-linecap="round"
          :stroke-dasharray="`${filled} ${circumference}`"
          :transform="`rotate(-90 ${center} ${center})`"
        />
      </svg>
      <div class="journey-macro-ring__center">
        <component :is="icon" class="journey-macro-ring__icon" aria-hidden="true" />
        <span class="journey-macro-ring__value">{{ displayValue }}</span>
        <span v-if="!showPercentOnly" class="journey-macro-ring__pct">{{ percent }}%</span>
      </div>
    </div>
    <p class="journey-macro-ring__label" :style="labelColor ? { color: labelColor } : undefined">{{ label }}</p>
    <p v-if="metaLabel" class="journey-macro-ring__meta">{{ metaLabel }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: 0 },
  target: { type: Number, default: 0 },
  unit: { type: String, default: 'g' },
  percent: { type: Number, default: 0 },
  color: { type: String, default: 'var(--cf-green)' },
  icon: { type: [Object, Function], required: true },
  size: { type: Number, default: 76 },
  metaLabel: { type: String, default: '' },
  showPercentOnly: { type: Boolean, default: false },
  labelColor: { type: String, default: '' },
})

const stroke = 5
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - stroke) / 2 - 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const filled = computed(() => (circumference.value * Math.max(0, Math.min(100, props.percent))) / 100)

const displayValue = computed(() => {
  if (props.showPercentOnly) return `${props.percent}%`
  return `${Math.round(props.value)} ${props.unit}`
})
</script>

<style scoped>
.journey-macro-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
}

.journey-macro-ring__chart {
  position: relative;
}

.journey-macro-ring__chart svg {
  display: block;
}

.journey-macro-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  padding: 0.35rem;
}

.journey-macro-ring__icon {
  width: 0.85rem;
  height: 0.85rem;
  color: var(--cf-text-muted);
}

.journey-macro-ring__value {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cf-text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.journey-macro-ring__pct {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  font-variant-numeric: tabular-nums;
}

.journey-macro-ring__label {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text);
  letter-spacing: -0.02em;
}

.journey-macro-ring__meta {
  margin: 0.1rem 0 0;
  font-size: 0.68rem;
  color: var(--cf-text-muted);
}
</style>
