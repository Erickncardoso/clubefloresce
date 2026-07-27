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
        </span>
      </span>
      <ChevronDown class="diary-bar-chevron" aria-hidden="true" />
    </button>

    <div v-else class="diary-bar-heading">
      <p class="diary-bar-title">Nutrição de hoje</p>
      <span class="diary-bar-percent">{{ caloriePercent }}% da meta</span>
    </div>

    <div class="diary-bar-body">
      <div class="diary-bar-calories">
        <div class="diary-bar-calories-copy">
          <span class="diary-bar-calories-value">{{ formatNumber(summary.consumed.caloriesKcal, 0) }}</span>
          <span class="diary-bar-calories-unit">kcal consumidas</span>
        </div>
        <div class="diary-bar-calories-target">
          <span>{{ formatNumber(caloriesRemaining, 0) }}</span>
          <small>restantes</small>
        </div>
      </div>
      <div class="diary-bar-track" role="progressbar" aria-label="Calorias consumidas" :aria-valuenow="caloriePercent" aria-valuemin="0" aria-valuemax="100">
        <div class="diary-bar-fill diary-bar-fill--cal" :style="{ transform: `scaleX(${caloriePercent / 100})` }" />
      </div>
      <div class="diary-bar-macros">
        <div class="diary-bar-macro diary-bar-macro--protein">
          <span class="diary-bar-macro-dot" aria-hidden="true" />
          <div>
            <span>Proteínas</span>
            <strong>{{ formatNumber(summary.consumed.proteinG) }} g</strong>
            <small>de {{ formatNumber(summary.targets.proteinG) }} g</small>
          </div>
        </div>
        <div class="diary-bar-macro diary-bar-macro--carbs">
          <span class="diary-bar-macro-dot" aria-hidden="true" />
          <div>
            <span>Carboidratos</span>
            <strong>{{ formatNumber(summary.consumed.carbsG) }} g</strong>
            <small>de {{ formatNumber(summary.targets.carbsG) }} g</small>
          </div>
        </div>
        <div class="diary-bar-macro diary-bar-macro--fat">
          <span class="diary-bar-macro-dot" aria-hidden="true" />
          <div>
            <span>Gorduras</span>
            <strong>{{ formatNumber(summary.consumed.fatG) }} g</strong>
            <small>de {{ formatNumber(summary.targets.fatG) }} g</small>
          </div>
        </div>
      </div>

      <div v-if="manageable && diaryEntries.length" class="diary-bar-entries-heading">
        <span>Registrado hoje</span>
        <small>{{ diaryEntries.length }} {{ diaryEntries.length === 1 ? 'refeição' : 'refeições' }}</small>
      </div>
      <ul v-if="manageable && diaryEntries.length" class="diary-bar-entries">
        <li v-for="entry in diaryEntries" :key="entry.id" class="diary-bar-entry">
          <span class="diary-bar-entry-symbol">
            <Utensils aria-hidden="true" />
          </span>
          <div class="diary-bar-entry-copy">
            <span class="diary-bar-entry-label">{{ entry.mealLabel || 'Refeição' }}</span>
            <span class="diary-bar-entry-kcal">{{ formatNumber(entry.caloriesKcal, 0) }} kcal</span>
          </div>
          <div class="diary-bar-entry-actions">
            <button
              type="button"
              class="diary-bar-entry-btn"
              :aria-label="`Editar ${entry.mealLabel || 'refeição'}`"
              @click="emit('edit-entry', entry)"
            >
              <Pencil class="diary-bar-entry-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="diary-bar-entry-btn diary-bar-entry-btn--danger"
              :aria-label="`Remover ${entry.mealLabel || 'refeição'}`"
              @click="emit('delete-entry', entry)"
            >
              <Trash2 class="diary-bar-entry-icon" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ChevronDown, Pencil, Trash2, Utensils } from 'lucide-vue-next'

const props = defineProps({
  summary: { type: Object, default: null },
  collapsible: { type: Boolean, default: false },
  manageable: { type: Boolean, default: false },
})

const emit = defineEmits(['edit-entry', 'delete-entry'])

const expanded = ref(!props.collapsible)

const caloriePercent = computed(() => {
  if (!props.summary?.targets?.caloriesKcal) return 0
  const pct = (props.summary.consumed.caloriesKcal / props.summary.targets.caloriesKcal) * 100
  return Math.min(100, Math.round(pct))
})

const caloriesRemaining = computed(() => Math.max(
  0,
  Number(props.summary?.targets?.caloriesKcal || 0) - Number(props.summary?.consumed?.caloriesKcal || 0),
))

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

const diaryEntries = computed(() => props.summary?.entries || [])

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits,
  }).format(Number(value) || 0)
}

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

watch(
  () => [props.manageable, diaryEntries.value.length],
  ([manageable, count]) => {
    if (manageable && count > 0 && props.collapsible) expanded.value = true
  },
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

.diary-bar:not(.diary-bar--collapsible) .diary-bar-heading .diary-bar-title {
  margin-bottom: 0;
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

.diary-bar-entries {
  list-style: none;
  margin: 0.65rem 0 0;
  padding: 0;
  border-top: 1px solid var(--pa-border, var(--cf-border));
}

.diary-bar-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.diary-bar-entry:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.diary-bar-entry-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.diary-bar-entry-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--pa-text, var(--cf-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diary-bar-entry-kcal {
  font-size: 0.68rem;
  color: var(--pa-text-muted, var(--cf-text-muted));
}

.diary-bar-entry-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.diary-bar-entry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #f3f4f3;
  color: var(--pa-text-muted, var(--cf-text-muted));
  cursor: pointer;
}

.diary-bar-entry-btn--danger {
  color: #dc2626;
}

.diary-bar-entry-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.diary-bar:not(.diary-bar--collapsible) .diary-bar-title {
  margin-bottom: 0.55rem;
}
</style>

<style scoped>
.diary-bar {
  padding: 1rem;
  border-color: #dde1db;
  border-radius: 1rem;
}

.diary-bar-heading {
  align-items: center;
  margin-bottom: 0.875rem;
}

.diary-bar-title {
  color: #292c28;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: -0.012em;
}

.diary-bar:not(.diary-bar--collapsible) .diary-bar-heading .diary-bar-title {
  margin: 0;
}

.diary-bar-percent {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: #f0f3ed;
  color: #62715c;
  font-size: 0.6875rem;
  font-weight: 500;
}

.diary-bar-calories {
  align-items: flex-end;
}

.diary-bar-calories-copy {
  gap: 0.375rem;
}

.diary-bar-calories-value {
  color: #20231f;
  font-size: 1.625rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.035em;
}

.diary-bar-calories-unit {
  padding-bottom: 0.125rem;
  color: #666c64;
  font-size: 0.6875rem;
}

.diary-bar-calories-target {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 0.0625rem;
  padding-bottom: 0.0625rem;
  font-variant-numeric: tabular-nums;
}

.diary-bar-calories-target span {
  color: #4f554d;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.1;
}

.diary-bar-calories-target small {
  color: #70766e;
  font-size: 0.625rem;
  font-weight: 400;
}

.diary-bar-track {
  height: 0.25rem;
  margin-top: 0.75rem;
  background: #e9ece7;
}

.diary-bar-fill--cal {
  background: #7d9073;
}

.diary-bar-macros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 0.875rem;
}

.diary-bar-macro {
  display: flex;
  align-items: flex-start;
  gap: 0.4375rem;
  min-width: 0;
  padding: 0 0.625rem;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.diary-bar-macro:first-child {
  padding-left: 0;
}

.diary-bar-macro:last-child {
  padding-right: 0;
}

.diary-bar-macro + .diary-bar-macro {
  border-left: 1px solid #e7eae5;
}

.diary-bar-macro::before {
  display: none;
}

.diary-bar-macro-dot {
  display: block;
  width: 0.4375rem;
  height: 0.4375rem;
  margin-top: 0.1875rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #8ea084;
}

.diary-bar-macro--carbs .diary-bar-macro-dot {
  background: #b49f7f;
}

.diary-bar-macro--fat .diary-bar-macro-dot {
  background: #9693a8;
}

.diary-bar-macro > div {
  min-width: 0;
}

.diary-bar-macro > div > span,
.diary-bar-macro > div > strong,
.diary-bar-macro > div > small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diary-bar-macro > div > span {
  color: #6c726a;
  font-size: 0.625rem;
  font-weight: 400;
}

.diary-bar-macro > div > strong {
  margin-top: 0.1875rem;
  color: #30342f;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.diary-bar-macro > div > small {
  margin-top: 0.0625rem;
  color: #70766e;
  font-size: 0.5625rem;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.diary-bar-entries-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.9375rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e8eae7;
}

.diary-bar-entries-heading span {
  color: #343733;
  font-size: 0.71875rem;
  font-weight: 500;
}

.diary-bar-entries-heading small {
  color: #70766e;
  font-size: 0.625rem;
  font-weight: 400;
}

.diary-bar-entries {
  margin: 0.25rem 0 0;
  border: 0;
}

.diary-bar-entry {
  gap: 0.625rem;
  min-height: 3.25rem;
  padding: 0.25rem 0 0;
  border: 0;
}

.diary-bar-entry-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 0.6875rem;
  background: #f1f3ef;
  color: #75816f;
}

.diary-bar-entry-symbol :deep(svg) {
  width: 0.875rem;
  height: 0.875rem;
}

.diary-bar-entry-copy {
  flex: 1;
}

.diary-bar-entry-label {
  color: #30332f;
  font-size: 0.75rem;
  font-weight: 500;
}

.diary-bar-entry-kcal {
  color: #70766e;
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
}

.diary-bar-entry-actions {
  gap: 0;
}

.diary-bar-entry-btn {
  width: 2.75rem;
  height: 2.75rem;
  background: transparent;
  color: #70766e;
}

.diary-bar-entry-btn:hover {
  background: #f1f3ef;
  color: #4f554d;
}

.diary-bar-entry-btn--danger {
  color: #a35d59;
}

.diary-bar-entry-btn--danger:hover {
  background: #f8eeee;
  color: #8f4844;
}

@media (max-width: 360px) {
  .diary-bar-macro {
    padding-inline: 0.4375rem;
  }

  .diary-bar-macro-dot {
    display: none;
  }
}
</style>

<style scoped>
@layer diaryLegacy {
.diary-bar {
  padding: 0.875rem;
  border: 1px solid #dfe2dd;
  border-radius: 1rem;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.diary-bar button {
  -webkit-tap-highlight-color: rgba(121, 138, 112, 0.14);
  touch-action: manipulation;
}

.diary-bar button:focus-visible {
  outline: 2px solid #65785c;
  outline-offset: 2px;
}

.diary-bar-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.diary-bar-kicker {
  margin: 0 0 0.125rem;
  color: #969a94;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.diary-bar-title {
  margin: 0;
  color: #292c28;
  font-size: 0.875rem;
  font-weight: 500;
}

.diary-bar-percent {
  color: #586653;
  font-size: 0.875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.diary-bar-calories {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.diary-bar-calories-copy {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
}

.diary-bar-calories-value {
  color: #222521;
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.diary-bar-calories-unit,
.diary-bar-calories-left {
  color: #858a83;
  font-size: 0.6875rem;
  font-weight: 400;
}

.diary-bar-track {
  height: 0.25rem;
  margin-top: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: #eceeeb;
}

.diary-bar-fill--cal {
  width: 100%;
  background: #819278;
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.diary-bar-macros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4375rem;
  margin-top: 0.75rem;
  color: inherit;
}

.diary-bar-macro {
  position: relative;
  min-width: 0;
  padding: 0.5rem 0.5rem 0.5rem 0.625rem;
  overflow: hidden;
  border: 1px solid #eaebe8;
  border-radius: 0.6875rem;
  background: #fafbfa;
}

.diary-bar-macro::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.1875rem;
  background: #a7b49f;
  content: "";
}

.diary-bar-macro--carbs::before {
  background: #b8aa91;
}

.diary-bar-macro--fat::before {
  background: #aaa9b8;
}

.diary-bar-macro > span {
  display: block;
  overflow: hidden;
  color: #8c908a;
  font-size: 0.59375rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diary-bar-macro strong {
  display: block;
  margin-top: 0.1875rem;
  color: #373a36;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.diary-bar-macro small {
  color: #979b95;
  font-size: 0.5625rem;
  font-weight: 400;
}

.diary-bar-entries {
  margin-top: 0.75rem;
  border-color: #eaebe8;
}

.diary-bar-entry-label {
  font-weight: 500;
}

.diary-bar-entry-btn {
  width: 2.75rem;
  height: 2.75rem;
}

@media (prefers-reduced-motion: reduce) {
  .diary-bar-fill--cal {
    transition: none;
  }
}
}
</style>
