<template>
  <section
    v-if="summary"
    class="diary-bar"
    :class="{
      'diary-bar--collapsible': collapsible,
      'diary-bar--expanded': collapsible && expanded,
      'diary-bar--collapsed': collapsible && !expanded,
    }"
  >
    <button
      v-if="collapsible"
      type="button"
      class="diary-bar-toggle"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <span class="diary-bar-toggle-copy">
        <span class="diary-bar-title">Diário de hoje</span>
        <span class="diary-bar-compact">
          <span class="diary-bar-compact-cal">{{ summary.consumed.caloriesKcal }} / {{ summary.targets.caloriesKcal }} kcal</span>
          <span v-if="hasConsumedData" class="diary-bar-compact-dot" aria-hidden="true" />
        </span>
      </span>
      <ChevronDown class="diary-bar-chevron" aria-hidden="true" />
    </button>

    <p v-else class="diary-bar-title">Diário de hoje</p>

    <div class="diary-bar-body">
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
    </div>
  </section>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  summary: { type: Object, default: null },
  collapsible: { type: Boolean, default: false },
})

const expanded = ref(!props.collapsible)

const caloriePercent = computed(() => {
  if (!props.summary?.targets?.caloriesKcal) return 0
  const pct = (props.summary.consumed.caloriesKcal / props.summary.targets.caloriesKcal) * 100
  return Math.min(100, Math.round(pct))
})

const hasConsumedData = computed(() => {
  const consumed = props.summary?.consumed
  if (!consumed) return false
  return (
    Number(consumed.caloriesKcal) > 0
    || Number(consumed.proteinG) > 0
    || Number(consumed.carbsG) > 0
    || Number(consumed.fatG) > 0
  )
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

watch(
  () => hasConsumedData.value,
  (filled) => {
    if (filled && props.collapsible) expanded.value = true
  },
)

watch(
  () => props.collapsible,
  (isCollapsible) => {
    expanded.value = !isCollapsible || hasConsumedData.value
  },
  { immediate: true },
)
</script>

<style scoped>
.diary-bar {
  margin: 0;
  padding: 0.75rem 0.85rem;
  background: #fff;
  border: 1px solid var(--pa-border, var(--cf-border));
  border-radius: var(--cf-radius-control, 12px);
}

.diary-bar--collapsible {
  padding: 0;
  overflow: hidden;
}

.diary-bar-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  width: 100%;
  margin: 0;
  padding: 0.7rem 0.85rem;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.diary-bar-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.diary-bar-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--pa-text-muted, var(--cf-text-muted));
}

.diary-bar-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.diary-bar-compact-cal {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--pa-text, var(--cf-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diary-bar-compact-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: var(--cf-radius-full, 50%);
  background: var(--pa-green, var(--cf-green));
  flex-shrink: 0;
}

.diary-bar-chevron {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: var(--pa-text-muted, var(--cf-text-muted));
  transition: transform 0.2s ease;
}

.diary-bar--expanded .diary-bar-chevron {
  transform: rotate(180deg);
}

.diary-bar-body {
  display: block;
}

.diary-bar--collapsible .diary-bar-body {
  padding: 0 0.85rem 0.75rem;
}

.diary-bar--collapsed .diary-bar-body {
  display: none;
}

.diary-bar-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.diary-bar-label {
  font-size: 0.75rem;
  color: var(--pa-text, var(--cf-text));
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
  background: var(--pa-green, var(--cf-green));
}

.diary-bar-value {
  font-size: 0.72rem;
  color: var(--pa-text-muted, var(--cf-text-muted));
  white-space: nowrap;
}

.diary-bar-macros {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
  font-size: 0.72rem;
  color: var(--pa-text-muted, var(--cf-text-muted));
}

.diary-bar:not(.diary-bar--collapsible) .diary-bar-title {
  margin-bottom: 0.55rem;
}
</style>
