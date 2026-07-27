<template>
  <NuxtLink v-if="meal" :to="dietaLink" class="home-meal-card">
    <header class="home-meal-card-head">
      <div class="home-meal-card-icon-wrap" aria-hidden="true">
        <component :is="meal.icon" class="home-meal-card-icon" />
      </div>

      <div class="home-meal-card-title-wrap">
        <div class="home-meal-card-context">
          <span class="home-meal-card-status">Agora</span>
          <span class="home-meal-card-time">{{ meal.time }}</span>
        </div>
        <h3 class="home-meal-card-title">{{ meal.label }}</h3>
        <p class="home-meal-card-meta">
          Refeição {{ meal.index }} de {{ meal.total }}
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
        <div class="home-meal-card-item-body">
          <span class="home-meal-card-item-name" :class="{ 'home-meal-card-item-name--sub': item.isSubstituted }">
            {{ item.name }}
          </span>
          <span v-if="item.detail" class="home-meal-card-item-detail">{{ item.detail }}</span>
          <span v-if="item.isSubstituted" class="home-meal-card-item-tag">Substituído</span>
        </div>
        <span v-if="item.portion" class="home-meal-card-item-portion">{{ item.portion }}</span>
      </li>
    </ul>

    <p v-if="hiddenCount > 0" class="home-meal-card-more">+ {{ hiddenCount }} {{ hiddenCount === 1 ? 'item' : 'itens' }}</p>

    <footer class="home-meal-card-foot">
      <span class="home-meal-card-cta">
        Abrir no plano alimentar
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

function normalizeQuantityText(value = '') {
  let text = String(value)
    .replace(/([A-Za-zÀ-ÿ])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-zÀ-ÿ])/g, '$1 $2')
    .replace(/(\d+)\s*Unidade\(s\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'unidade' : 'unidades'}`)
    .replace(/(\d+)\s*Filé\(s\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'filé' : 'filés'}`)
    .replace(/(\d+)\s*colher\(es\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'colher' : 'colheres'}`)

  const singular = /\b1\s+(unidade|filé|colher)\b/i.test(text)
  text = text
    .replace(/médio\(s\)/gi, singular ? 'médio' : 'médios')
    .replace(/cheia\(s\)/gi, singular ? 'cheia' : 'cheias')

  return text.replace(/\s+/g, ' ').trim()
}

function formatDisplayItem(source, isSubstituted = false) {
  const parsed = splitMealItemDisplay(source)
  const normalizedName = normalizeQuantityText(parsed.name)
  const quantityStart = normalizedName.search(/\s\d+\s/)

  if (quantityStart < 0) {
    return { ...parsed, name: normalizedName, detail: '', isSubstituted }
  }

  return {
    ...parsed,
    name: normalizedName.slice(0, quantityStart).trim(),
    detail: normalizedName.slice(quantityStart).trim(),
    isSubstituted,
  }
}

const displayItems = computed(() => {
  if (!meal.value?.items?.length) {
    return (meal.value?.itemLabels || []).map((label) => formatDisplayItem(label))
  }

  return meal.value.items.map((item) =>
    formatDisplayItem(item.display || item.name, Boolean(item.isSubstituted)),
  )
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
  padding: 1rem 1rem 0;
  border: 1px solid #e5e5ea;
  border-radius: 1.25rem;
  background: var(--cf-surface);
  box-shadow: none;
  text-decoration: none;
  color: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.home-meal-card:hover {
  border-color: #d1d1d6;
}

.home-meal-card:focus-visible {
  outline: 2px solid var(--cf-green-dark);
  outline-offset: 3px;
}

.home-meal-card:active {
  transform: scale(0.985);
  background: #fafafa;
}

.home-meal-card-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.9rem;
}

.home-meal-card-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eef1eb;
  border: 0;
}

.home-meal-card-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--cf-pink-dark);
}

.home-meal-card-title-wrap {
  flex: 1;
  min-width: 0;
}

.home-meal-card-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.home-meal-card-status {
  display: inline-flex;
  align-items: center;
  min-height: auto;
  padding: 0;
  color: var(--cf-green-dark);
  font-size: 0.62rem;
  font-weight: 500;
  line-height: 1;
}

.home-meal-card-title {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--cf-text);
  text-wrap: balance;
}

.home-meal-card-time {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: #596251;
}

.home-meal-card-meta {
  margin: 0.18rem 0 0;
  font-size: 0.72rem;
  font-weight: 400;
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
  font-weight: 500;
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
  align-items: center;
  gap: 0.75rem;
  min-height: 3.45rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
}

.home-meal-card-item:last-child {
  border-bottom: none;
}

.home-meal-card-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.home-meal-card-item-name {
  font-size: 0.84rem;
  font-weight: 400;
  line-height: 1.3;
  color: var(--cf-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home-meal-card-item-detail {
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.3;
  color: var(--cf-text-muted);
}

.home-meal-card-item-name--sub {
  color: var(--cf-green-dark);
}

.home-meal-card-item-tag {
  align-self: flex-start;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--cf-green-dark);
  background: var(--cf-green-soft);
  border: 1px solid var(--cf-border);
}

.home-meal-card-item-portion {
  flex-shrink: 0;
  padding: 0.22rem 0.48rem;
  border-radius: 0.55rem;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #596251;
  background: #f1f3ed;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-top: 0;
}

.home-meal-card-more {
  margin: 0.35rem 0 0;
  padding-left: 1.05rem;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.home-meal-card-foot {
  display: flex;
  margin-top: 0.25rem;
  border-top: 1px solid rgba(60, 60, 67, 0.1);
}

.home-meal-card-cta {
  display: inline-flex;
  width: 100%;
  min-height: 2.8rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
  color: var(--cf-green-dark);
  font-size: 0.76rem;
  font-weight: 500;
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
