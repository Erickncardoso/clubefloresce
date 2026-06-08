<template>
  <div class="home-stat-carousel-wrap">
    <div
      ref="trackRef"
      class="home-stat-carousel"
      role="list"
      aria-label="Resumo nutricional do dia"
      @scroll="onScroll"
    >
      <NuxtLink
        v-for="card in cards"
        :key="card.label"
        to="/dieta"
        class="home-stat-card cf-squircle cf-squircle--tile"
        :class="`home-stat-card--${card.tone}`"
        role="listitem"
      >
        <span class="home-stat-card-icon-wrap cf-squircle cf-squircle--icon" aria-hidden="true">
          <component :is="card.icon" class="home-stat-card-icon" />
        </span>
        <span class="home-stat-card-label">{{ card.label }}</span>
        <strong class="home-stat-card-value">{{ card.value }}</strong>
        <span class="home-stat-card-meta">{{ card.meta }}</span>
      </NuxtLink>
    </div>

    <div v-if="cards.length > 1" class="home-stat-carousel-dots" aria-hidden="true">
      <span
        v-for="(_, index) in cards"
        :key="index"
        class="home-stat-carousel-dot"
        :class="{ 'home-stat-carousel-dot--active': activeIndex === index }"
      />
    </div>
  </div>
</template>

<script setup>
import { Dumbbell, Flame, Leaf, Utensils, Zap } from 'lucide-vue-next'

const props = defineProps({
  targets: { type: Object, required: true },
  consumed: { type: Object, required: true },
  remainingKcal: { type: Number, default: 0 },
  exerciseKcal: { type: Number, default: 0 },
})

const trackRef = ref(null)
const activeIndex = ref(0)

const cards = computed(() => [
  {
    label: 'Calorias',
    value: `${props.consumed.caloriesKcal} kcal`,
    meta: `/ ${props.targets.caloriesKcal} meta`,
    icon: Flame,
    tone: 'orange',
  },
  {
    label: 'Proteína',
    value: `${Math.round(props.consumed.proteinG)} g`,
    meta: `/ ${props.targets.proteinG} g meta`,
    icon: Dumbbell,
    tone: 'blue',
  },
  {
    label: 'Carbos',
    value: `${Math.round(props.consumed.carbsG)} g`,
    meta: `/ ${props.targets.carbsG} g meta`,
    icon: Zap,
    tone: 'yellow',
  },
  {
    label: 'Gorduras',
    value: `${Math.round(props.consumed.fatG)} g`,
    meta: `/ ${props.targets.fatG} g meta`,
    icon: Leaf,
    tone: 'purple',
  },
  {
    label: 'Restantes',
    value: `${props.remainingKcal} kcal`,
    meta: props.exerciseKcal ? `${props.exerciseKcal} kcal exercício` : 'para a meta',
    icon: Utensils,
    tone: 'pink',
  },
])

function onScroll() {
  const track = trackRef.value
  if (!track) return
  const card = track.querySelector('.home-stat-card')
  if (!card) return
  const gap = Number.parseFloat(getComputedStyle(track).gap) || 10
  activeIndex.value = Math.max(0, Math.round(track.scrollLeft / (card.offsetWidth + gap)))
}
</script>

<style scoped>
.home-stat-carousel-wrap {
  margin-bottom: 0.85rem;
}

.home-stat-carousel {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 1.25rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-inline: -1.25rem;
  padding-inline: 1.25rem;
  padding-bottom: 0.15rem;
  --home-stat-card-w: 128px;
  --home-stat-card-h: 152px;
  --home-stat-card-gap: 0.65rem;
}

.home-stat-carousel::-webkit-scrollbar {
  display: none;
}

.home-stat-card {
  flex: 0 0 var(--home-stat-card-w);
  width: var(--home-stat-card-w);
  height: var(--home-stat-card-h);
  box-sizing: border-box;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 0.75rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  text-decoration: none;
  color: inherit;
  transition: transform 0.16s ease;
}

.home-stat-card:active {
  transform: scale(0.98);
}

.home-stat-card-icon-wrap {
  width: 1.85rem;
  height: 1.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.1rem;
}

.home-stat-card-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.home-stat-card--orange .home-stat-card-icon-wrap {
  background: #fff3e6;
  color: #c4842e;
}

.home-stat-card--blue .home-stat-card-icon-wrap {
  background: #e8f2fa;
  color: #4a8fc7;
}

.home-stat-card--yellow .home-stat-card-icon-wrap {
  background: #fff8e8;
  color: #c4842e;
}

.home-stat-card--purple .home-stat-card-icon-wrap {
  background: #f0ebf8;
  color: #7c5fad;
}

.home-stat-card--pink .home-stat-card-icon-wrap {
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
}

.home-stat-card-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  line-height: 1.2;
}

.home-stat-card-value {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  margin-top: auto;
}

.home-stat-card-meta {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-stat-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.home-stat-carousel-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--cf-track);
  transition: background 0.2s ease, transform 0.2s ease;
}

.home-stat-carousel-dot--active {
  background: var(--cf-pink);
  transform: scale(1.15);
}

@media (prefers-reduced-motion: reduce) {
  .home-stat-card {
    transition: none;
  }

  .home-stat-card:active {
    transform: none;
  }

  .home-stat-carousel-dot {
    transition: none;
  }
}
</style>
