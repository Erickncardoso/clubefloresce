<template>
  <div class="home-goals-panel" role="list" aria-label="Metas diárias">
    <article
      v-for="metric in metrics"
      :key="metric.id"
      class="home-goal"
      :class="`home-goal--${metric.id}`"
      role="listitem"
    >
      <NuxtLink
        to="/evolucao?tab=metas"
        class="home-goal-link"
        :aria-label="`Ver detalhes de ${metric.label}`"
      >
        <span class="home-goal-heading">
          <span class="home-goal-icon" aria-hidden="true">
            <component :is="goalIcon(metric.id)" class="home-goal-icon-svg" />
          </span>
          <span class="home-goal-label">{{ metric.label }}</span>
        </span>

        <span class="home-goal-meta">{{ metric.meta }}</span>

        <span
          class="home-goal-chart"
          role="progressbar"
          :aria-valuenow="progressPct(metric.barPct)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${metric.label}: ${progressPct(metric.barPct)}% concluído`"
        >
          <svg class="home-goal-chart-svg" viewBox="0 0 100 100" aria-hidden="true">
            <path
              class="home-goal-chart-track"
              d="M 50 8 A 42 42 0 0 0 50 92"
              pathLength="100"
            />
            <path
              v-if="progressPct(metric.barPct) > 0"
              class="home-goal-chart-progress"
              d="M 50 8 A 42 42 0 0 0 50 92"
              pathLength="100"
              :style="{ '--goal-progress': progressPct(metric.barPct) }"
            />
          </svg>
        </span>
        <span
          class="home-goal-chart-value"
          :class="{ 'home-goal-chart-value--triple': progressPct(metric.barPct) === 100 }"
          aria-hidden="true"
        >
          {{ progressPct(metric.barPct) }}%
        </span>
      </NuxtLink>

      <button
        type="button"
        class="home-goal-quick-add"
        :aria-label="`Adicionar ${metric.label}`"
        @click="emit('quick-add', metric.id)"
      >
        <Plus aria-hidden="true" />
      </button>
    </article>
  </div>
</template>

<script setup>
import { Cookie, Droplets, Dumbbell, Moon, Plus } from 'lucide-vue-next'

defineProps({
  metrics: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['quick-add'])

const GOAL_ICONS = {
  water: Droplets,
  food: Cookie,
  exercise: Dumbbell,
  sleep: Moon,
}

function goalIcon(id) {
  return GOAL_ICONS[id] || Droplets
}

function progressPct(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
}
</script>

<style scoped>
.home-goals-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
  box-shadow: none;
}

.home-goal {
  --goal-accent: #8f9a84;
  position: relative;
  min-width: 0;
  min-height: 6.8rem;
  overflow: hidden;
  color: inherit;
  transition: background 0.15s ease;
}

.home-goal-link {
  display: flex;
  min-height: 6.8rem;
  padding: 0.8rem 3.5rem 2.25rem 1rem;
  flex-direction: column;
  justify-content: center;
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.home-goal:nth-child(odd) {
  border-right: 1px solid rgba(60, 60, 67, 0.1);
}

.home-goal:nth-child(-n + 2) {
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
}

.home-goal:hover {
  background: #fafafa;
}

.home-goal-link:focus-visible {
  z-index: 1;
  outline: 2px solid var(--cf-green-dark);
  outline-offset: -2px;
}

.home-goal:active {
  background: #f2f2f7;
}

.home-goal-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.home-goal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.home-goal--water {
  --goal-accent: #4a8fc4;
}

.home-goal--water .home-goal-icon {
  color: #4a8fc4;
  background: #edf5fb;
}

.home-goal--food {
  --goal-accent: #9d7268;
}

.home-goal--food .home-goal-icon {
  color: #9d7268;
  background: #f8f1ef;
}

.home-goal--exercise {
  --goal-accent: #5f8f58;
}

.home-goal--exercise .home-goal-icon {
  color: #5f8f58;
  background: #eff5ed;
}

.home-goal--sleep {
  --goal-accent: #6b74b8;
}

.home-goal--sleep .home-goal-icon {
  color: #6b74b8;
  background: #f0f1f8;
}

.home-goal-icon-svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 1.75;
}

.home-goal-label {
  overflow: hidden;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--cf-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-goal-meta {
  overflow: hidden;
  margin-top: 0.55rem;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.35;
  color: #6e6e73;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-goal-chart {
  position: absolute;
  top: 50%;
  right: -3.5rem;
  width: 7rem;
  height: 7rem;
  transform: translateY(-50%);
  color: var(--goal-accent);
}

.home-goal-chart-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.home-goal-chart-track,
.home-goal-chart-progress {
  fill: none;
  stroke-width: 10;
}

.home-goal-chart-track {
  stroke: #e5e5ea;
}

.home-goal-chart-progress {
  stroke: var(--goal-accent);
  stroke-linecap: round;
  stroke-dasharray: var(--goal-progress) 100;
  transition: stroke-dasharray 0.3s ease-out;
}

.home-goal-chart-value {
  position: absolute;
  top: 50%;
  right: 0;
  width: 2rem;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transform: translateY(-50%);
}

.home-goal-chart-value--triple {
  font-size: 0.53125rem;
}

.home-goal-quick-add {
  position: absolute;
  left: 0.55rem;
  bottom: 0.55rem;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  border: 1px solid #dedee3;
  border-radius: 50%;
  background: #fff;
  color: var(--goal-accent);
  box-shadow: 0 1px 4px rgba(20, 20, 24, 0.12);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background 0.16s ease;
}

.home-goal-quick-add svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.home-goal-quick-add::before {
  position: absolute;
  inset: -0.45rem;
  content: '';
}

.home-goal-quick-add:focus-visible {
  outline: 2px solid var(--goal-accent);
  outline-offset: 2px;
}

.home-goal-quick-add:active {
  background: #f2f2f7;
  transform: scale(0.92);
}

@media (hover: hover) {
  .home-goal-quick-add:hover {
    background: #f7f7f8;
    transform: scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-goal,
  .home-goal-chart-progress,
  .home-goal-quick-add {
    transition: none;
  }
}
</style>
