<template>
  <svg
    class="goal-mini-pie"
    :width="size"
    :height="size"
    viewBox="0 0 20 20"
    role="img"
    :aria-label="`${clamped}%`"
  >
    <circle
      cx="10"
      cy="10"
      :r="radius"
      fill="none"
      stroke="var(--cf-track)"
      :stroke-width="stroke"
    />
    <circle
      cx="10"
      cy="10"
      :r="radius"
      fill="none"
      stroke="var(--cf-green)"
      :stroke-width="stroke"
      stroke-linecap="round"
      :stroke-dasharray="`${filled} ${circumference}`"
      transform="rotate(-90 10 10)"
    />
  </svg>
</template>

<script setup>
const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 14 },
})

const radius = 7.25
const stroke = 3

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(Number(props.value) || 0))))

const circumference = 2 * Math.PI * radius

const filled = computed(() => (circumference * clamped.value) / 100)
</script>

<style scoped>
.goal-mini-pie {
  display: block;
  flex-shrink: 0;
}
</style>
