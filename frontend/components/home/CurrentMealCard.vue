<template>
  <NuxtLink v-if="meal" :to="dietaLink" class="home-meal-card cf-squircle">
    <header class="home-meal-card-head">
      <div class="home-meal-card-icon-wrap" aria-hidden="true">
        <component :is="meal.icon" class="home-meal-card-icon" />
      </div>

      <div class="home-meal-card-title-wrap">
        <div class="home-meal-card-title-row">
          <h2 class="home-meal-card-title">{{ meal.label }}</h2>
          <span class="home-meal-card-time">{{ meal.time }}</span>
        </div>
        <p class="home-meal-card-meta">
          Agora · {{ meal.index }} de {{ meal.total }}
          <span v-if="totalItems"> · {{ totalItems }} {{ totalItems === 1 ? 'item' : 'itens' }}</span>
        </p>
      </div>
    </header>

    <div v-if="itemsProgress > 0" class="home-meal-card-progress-wrap">
      <div class="home-meal-card-progress-track" role="progressbar" :aria-valuenow="itemsProgress" aria-valuemin="0" aria-valuemax="100">
        <div class="home-meal-card-progress-fill" :style="{ width: `${itemsProgress}%` }" />
      </div>
      <span class="home-meal-card-progress-label">{{ progressText }}</span>
    </div>

    <ul class="home-meal-card-items">
      <li
        v-for="(item, index) in visibleItems"
        :key="`${meal.id}-${index}`"
        class="home-meal-card-item"
      >
        <span class="home-meal-card-item-dot" aria-hidden="true" />
        <div class="home-meal-card-item-body">
          <span class="home-meal-card-item-name" :class="{ 'home-meal-card-item-name--sub': item.isSubstituted }">
            {{ item.name }}
          </span>
          <span v-if="item.isSubstituted" class="home-meal-card-item-tag">Substituído</span>
        </div>
        <span v-if="item.portion" class="home-meal-card-item-portion">{{ item.portion }}</span>
      </li>
    </ul>

    <p v-if="hiddenCount > 0" class="home-meal-card-more">+ {{ hiddenCount }} {{ hiddenCount === 1 ? 'item' : 'itens' }}</p>

    <footer class="home-meal-card-foot">
      <span class="home-meal-card-cta">
        Abrir refeição
        <ChevronRight class="home-meal-card-cta-icon" aria-hidden="true" />
      </span>
    </footer>
  </NuxtLink>
</template>

<script setup>
import { ChevronRight } from 'lucide-vue-next'
import { useDietaProgress } from '~/composables/useDietaProgress'
import { useMealPlan } from '~/composables/useMealPlan'
import { splitMealItemDisplay } from '~/utils/meal-item-display'

const props = defineProps({
  mealId: { type: String, default: '' },
  maxItems: { type: Number, default: 4 },
})

const now = ref(new Date())
const { currentMeal, getMealById } = useMealPlan(now)
const { loadChecked, countDone } = useDietaProgress()

const meal = computed(() => {
  if (props.mealId) return getMealById(props.mealId)
  return currentMeal.value
})

const displayItems = computed(() => {
  if (!meal.value?.items?.length) {
    return (meal.value?.itemLabels || []).map((label) => ({
      ...splitMealItemDisplay(label),
      isSubstituted: false,
    }))
  }

  return meal.value.items.map((item) => ({
    ...splitMealItemDisplay(item.display || item.name),
    isSubstituted: Boolean(item.isSubstituted),
  }))
})

const totalItems = computed(() => displayItems.value.length)
const visibleItems = computed(() => displayItems.value.slice(0, props.maxItems))
const hiddenCount = computed(() => Math.max(0, displayItems.value.length - props.maxItems))

const itemsProgress = computed(() => {
  if (!meal.value?.items?.length) return 0
  const states = loadChecked(meal.value.id, meal.value.items.length)
  const done = countDone(states)
  if (!done) return 0
  return Math.round((done / meal.value.items.length) * 100)
})

const progressText = computed(() => {
  if (!meal.value?.items?.length || !itemsProgress.value) return ''
  const states = loadChecked(meal.value.id, meal.value.items.length)
  const done = countDone(states)
  const total = meal.value.items.length
  if (done === total) return 'Concluída'
  return `${done}/${total}`
})

let mealClockId
onMounted(() => {
  mealClockId = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})

onUnmounted(() => {
  if (mealClockId) clearInterval(mealClockId)
})

const dietaLink = computed(() => ({
  path: '/dieta',
  query: { meal: meal.value?.id },
}))
</script>

<style scoped>
.home-meal-card {
  display: block;
  padding: 1.15rem 1.15rem 1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.home-meal-card:active {
  transform: scale(0.995);
  box-shadow: var(--cf-shadow);
}

.home-meal-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 0.9rem;
}

.home-meal-card-icon-wrap {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--cf-radius-md);
  background: var(--cf-pink-soft);
  border: 1px solid var(--cf-border);
}

.home-meal-card-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--cf-pink-dark);
}

.home-meal-card-title-wrap {
  flex: 1;
  min-width: 0;
  padding-top: 0.15rem;
}

.home-meal-card-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.home-meal-card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--cf-text);
  text-wrap: balance;
}

.home-meal-card-time {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--cf-pink-dark);
}

.home-meal-card-meta {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  line-height: 1.4;
}

.home-meal-card-progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.home-meal-card-progress-track {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--cf-track);
  overflow: hidden;
}

.home-meal-card-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--cf-green);
  min-width: 0;
}

.home-meal-card-progress-label {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--cf-green-dark);
  font-variant-numeric: tabular-nums;
}

.home-meal-card-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.home-meal-card-item {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--cf-border);
}

.home-meal-card-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.home-meal-card-item-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  margin-top: 0.45rem;
  border-radius: 50%;
  background: var(--cf-pink);
}

.home-meal-card-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.home-meal-card-item-name {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--cf-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home-meal-card-item-name--sub {
  color: var(--cf-green-dark);
}

.home-meal-card-item-tag {
  align-self: flex-start;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cf-green-dark);
  background: var(--cf-green-soft);
  border: 1px solid var(--cf-border);
}

.home-meal-card-item-portion {
  flex-shrink: 0;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cf-pink-dark);
  background: var(--cf-pink-soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-top: 0.05rem;
}

.home-meal-card-more {
  margin: 0.35rem 0 0;
  padding-left: 1.05rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.home-meal-card-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--cf-border);
}

.home-meal-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
}

.home-meal-card-cta-icon {
  width: 0.9rem;
  height: 0.9rem;
}

@media (prefers-reduced-motion: reduce) {
  .home-meal-card {
    transition: none;
  }

  .home-meal-card:active {
    transform: none;
  }
}
</style>
