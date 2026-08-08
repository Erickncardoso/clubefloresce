<template>
  <div class="home-macro-bar">
    <div
      class="home-macro-bar-track"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`${label}: ${percent}%`"
    >
      <span
        v-for="index in segments"
        :key="index"
        class="home-macro-bar-seg"
        :class="{ 'home-macro-bar-seg--filled': index <= filledSegments }"
        :style="segmentStyle(index)"
      />
    </div>

    <div class="home-macro-bar-copy">
      <span class="home-macro-bar-values">
        <strong>{{ Math.round(value) }}</strong>/{{ target }}g
      </span>
      <span class="home-macro-bar-label" :style="{ color }">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: 0 },
  target: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
  color: { type: String, default: 'var(--cf-green)' },
  segments: { type: Number, default: 8 },
})

const filledSegments = computed(() =>
  Math.round((Math.max(0, Math.min(100, props.percent)) / 100) * props.segments),
)

function segmentStyle(index) {
  if (index <= filledSegments.value) {
    return { backgroundColor: props.color }
  }
  return { backgroundColor: `${props.color}22` }
}
</script>

<style scoped>
.home-macro-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.home-macro-bar-track {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  gap: 2px;
  flex-shrink: 0;
  width: 26px;
  height: 44px;
}

.home-macro-bar-seg {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  transition: background-color 0.25s ease;
}

.home-macro-bar-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
  min-width: 0;
}

.home-macro-bar-values {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.home-macro-bar-values strong {
  font-weight: 800;
}

.home-macro-bar-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

@media (prefers-reduced-motion: reduce) {
  .home-macro-bar-seg {
    transition: none;
  }
}
</style>
