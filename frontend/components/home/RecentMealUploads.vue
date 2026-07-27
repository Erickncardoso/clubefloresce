<template>
  <div class="home-recent-uploads" role="list" aria-label="Registros recentes">
    <NuxtLink
      v-for="entry in entries"
      :key="entry.id"
      to="/evolucao/nutricao"
      class="home-recent-upload"
      role="listitem"
    >
      <img
        :src="entry.imageUrl"
        :alt="`Foto de ${entryLabel(entry)}`"
        class="home-recent-upload-image"
        width="72"
        height="72"
        loading="lazy"
      >

      <span class="home-recent-upload-body">
        <span class="home-recent-upload-head">
          <span class="home-recent-upload-title">{{ entryLabel(entry) }}</span>
          <time
            v-if="entry.createdAt"
            class="home-recent-upload-time"
            :datetime="entry.createdAt"
          >
            {{ formatTime(entry.createdAt) }}
          </time>
        </span>

        <span class="home-recent-upload-summary">
          {{ formatNumber(entry.caloriesKcal) }} kcal
        </span>

        <span class="home-recent-upload-macros">
          <span>Proteína {{ formatNumber(entry.proteinG) }}g</span>
          <span>Carboidrato {{ formatNumber(entry.carbsG) }}g</span>
          <span>Gordura {{ formatNumber(entry.fatG) }}g</span>
        </span>
      </span>

      <ChevronRight class="home-recent-upload-arrow" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>

<script setup>
import { ChevronRight } from 'lucide-vue-next'

defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
})

const MEAL_LABELS = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
  other: 'Refeição',
}

function entryLabel(entry) {
  return entry?.mealLabel || MEAL_LABELS[entry?.mealType] || 'Refeição'
}

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR')
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}
</script>

<style scoped>
.home-recent-uploads {
  overflow: hidden;
  border: 1px solid #e5e5ea;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: none;
}

.home-recent-upload {
  position: relative;
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 6rem;
  padding: 0.75rem;
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.home-recent-upload::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 6.05rem;
  height: 1px;
  background: rgba(60, 60, 67, 0.1);
  content: '';
}

.home-recent-upload:last-child::after {
  display: none;
}

.home-recent-upload:hover {
  background: #fafafa;
}

.home-recent-upload:active {
  background: #f2f2f7;
}

.home-recent-upload:focus-visible {
  z-index: 1;
  outline: 2px solid var(--cf-green-dark);
  outline-offset: -2px;
}

.home-recent-upload-image {
  display: block;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 0.9rem;
  background: #e9e9ed;
  object-fit: cover;
}

.home-recent-upload-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.home-recent-upload-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.home-recent-upload-title {
  overflow: hidden;
  flex: 1;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--cf-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-recent-upload-time {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 400;
  color: #8e8e93;
  font-variant-numeric: tabular-nums;
}

.home-recent-upload-summary {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--cf-green-dark);
  font-variant-numeric: tabular-nums;
}

.home-recent-upload-macros {
  display: flex;
  min-width: 0;
  gap: 0.5rem;
  margin-top: 0.42rem;
  overflow: hidden;
  color: #6e6e73;
}

.home-recent-upload-macros span {
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-recent-upload-arrow {
  width: 0.85rem;
  height: 0.85rem;
  color: #aeaeb2;
}

@media (max-width: 355px) {
  .home-recent-upload {
    grid-template-columns: 4rem minmax(0, 1fr) auto;
    gap: 0.65rem;
  }

  .home-recent-upload-image {
    width: 4rem;
    height: 4rem;
  }

  .home-recent-upload-macros span:last-child {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-recent-upload {
    transition: none;
  }
}
</style>
