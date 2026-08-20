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
        v-if="entry.imageUrl"
        :src="entry.imageUrl"
        :alt="`Foto de ${entryLabel(entry)}`"
        class="home-recent-upload-image"
        width="64"
        height="64"
        loading="lazy"
      >
      <span v-else class="home-recent-upload-image home-recent-upload-image--empty" aria-hidden="true" />

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
          <span><strong>{{ formatNumber(entry.proteinG) }}g</strong> prot</span>
          <span><strong>{{ formatNumber(entry.carbsG) }}g</strong> carb</span>
          <span><strong>{{ formatNumber(entry.fatG) }}g</strong> gord</span>
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
  border-radius: 1rem;
  background: #fff;
  box-shadow: none;
}

.home-recent-upload {
  position: relative;
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr) 1rem;
  align-items: center;
  gap: 0.75rem;
  min-height: 0;
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
  left: 5.5rem;
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
  width: 4rem;
  height: 4rem;
  border-radius: 0.85rem;
  background: #e9e9ed;
  object-fit: cover;
}

.home-recent-upload-image--empty {
  flex-shrink: 0;
}

.home-recent-upload-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.15rem;
}

.home-recent-upload-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.home-recent-upload-title {
  overflow: hidden;
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--cf-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-recent-upload-time {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: #8e8e93;
  font-variant-numeric: tabular-nums;
}

.home-recent-upload-summary {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--cf-green-dark);
  font-variant-numeric: tabular-nums;
}

.home-recent-upload-macros {
  display: flex;
  min-width: 0;
  gap: 0.75rem;
  margin-top: 0.1rem;
  color: #8e8e93;
}

.home-recent-upload-macros span {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 400;
  white-space: nowrap;
}

.home-recent-upload-macros strong {
  font-weight: 500;
  color: var(--cf-text);
}

.home-recent-upload-arrow {
  width: 1rem;
  height: 1rem;
  color: #c7c7cc;
  justify-self: end;
}

@media (max-width: 355px) {
  .home-recent-upload {
    gap: 0.65rem;
  }

  .home-recent-upload-macros {
    gap: 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-recent-upload {
    transition: none;
  }
}
</style>
