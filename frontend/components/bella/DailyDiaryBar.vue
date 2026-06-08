<template>
  <section v-if="summary" class="diary-bar">
    <p class="diary-bar-title">Diário de hoje</p>
    <div class="diary-bar-row">
      <span class="diary-bar-label">Calorias</span>
      <div class="diary-bar-track">
        <div
          class="diary-bar-fill diary-bar-fill--cal"
          :style="{ width: `${caloriePercent}%` }"
        />
      </div>
      <span class="diary-bar-value">{{ summary.consumed.caloriesKcal }} / {{ summary.targets.caloriesKcal }}</span>
    </div>
    <div class="diary-bar-macros">
      <span>P {{ summary.consumed.proteinG }}/{{ summary.targets.proteinG }} g</span>
      <span>C {{ summary.consumed.carbsG }}/{{ summary.targets.carbsG }} g</span>
      <span>G {{ summary.consumed.fatG }}/{{ summary.targets.fatG }} g</span>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  summary: { type: Object, default: null },
})

const caloriePercent = computed(() => {
  if (!props.summary?.targets?.caloriesKcal) return 0
  const pct = (props.summary.consumed.caloriesKcal / props.summary.targets.caloriesKcal) * 100
  return Math.min(100, Math.round(pct))
})
</script>

<style scoped>
.diary-bar {
  margin: 0 0 0.75rem;
  padding: 0.75rem 0.85rem;
  background: #fff;
  border: 1px solid var(--pa-border);
  border-radius: 12px;
}

.diary-bar-title {
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--pa-text-muted);
}

.diary-bar-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.diary-bar-label {
  font-size: 0.75rem;
  color: var(--pa-text);
  font-weight: 500;
}

.diary-bar-track {
  height: 0.45rem;
  background: #eef2f1;
  border-radius: 999px;
  overflow: hidden;
}

.diary-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.25s ease;
}

.diary-bar-fill--cal {
  background: var(--pa-green);
}

.diary-bar-value {
  font-size: 0.72rem;
  color: var(--pa-text-muted);
  white-space: nowrap;
}

.diary-bar-macros {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted);
}
</style>
