<template>
  <article class="mped-shopping-card admin-shell-card">
    <header class="mped-shopping-card__head">
      <div
        class="mped-shopping-card__title-wrap"
        role="button"
        tabindex="0"
        @click="$emit('edit')"
        @keydown.enter.prevent="$emit('edit')"
        @keydown.space.prevent="$emit('edit')"
      >
        <ShoppingCart class="mped-shopping-card__icon" aria-hidden="true" />
        <h4 class="mped-shopping-card__title">{{ title }}</h4>
        <span class="mped-shopping-card__edit" aria-hidden="true">
          <Pencil />
        </span>
      </div>
      <span class="mped-shopping-card__count">{{ countLabel }}</span>
    </header>

    <ul v-if="items.length" class="mped-shopping-card__list">
      <li v-for="name in previewItems" :key="name">{{ name }}</li>
    </ul>
    <p v-else class="mped-shopping-card__empty">Adicione alimentos para gerar a lista.</p>

    <div class="mped-shopping-card__foot">
      <button
        type="button"
        class="mped-shopping-card__smart"
        @click="$emit('smart')"
      >
        Lista Inteligente
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { Pencil, ShoppingCart } from 'lucide-vue-next'
import { formatShoppingItemCount } from '~/utils/meal-plan-shopping-list.js'

const props = defineProps({
  title: { type: String, default: 'Lista de Compras' },
  items: { type: Array, default: () => [] },
  previewLimit: { type: Number, default: 6 },
})

defineEmits(['edit', 'smart'])

const countLabel = computed(() => formatShoppingItemCount(props.items.length))
const previewItems = computed(() => props.items.slice(0, props.previewLimit))
</script>

<style scoped>
.mped-shopping-card {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mped-shopping-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
}

.mped-shopping-card__title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.1rem 0.15rem;
  margin: -0.1rem -0.15rem;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mped-shopping-card__title-wrap:hover,
.mped-shopping-card__title-wrap:focus-visible {
  background: #f9fafb;
  outline: none;
}

.mped-shopping-card__icon {
  width: 0.95rem;
  height: 0.95rem;
  color: #374151;
  flex-shrink: 0;
  pointer-events: none;
}

.mped-shopping-card__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  line-height: 1.3;
  pointer-events: none;
}

.mped-shopping-card__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  color: #9ca3af;
  flex-shrink: 0;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.15s ease, transform 0.15s ease, color 0.15s ease;
}

.mped-shopping-card__edit svg {
  width: 0.78rem;
  height: 0.78rem;
}

@media (hover: hover) {
  .mped-shopping-card__title-wrap:hover .mped-shopping-card__edit,
  .mped-shopping-card__title-wrap:focus-visible .mped-shopping-card__edit {
    opacity: 1;
    transform: scale(1);
  }

  .mped-shopping-card__title-wrap:hover .mped-shopping-card__edit {
    color: #6b7280;
  }
}

@media (hover: none) {
  .mped-shopping-card__edit {
    opacity: 1;
    transform: none;
  }
}

.mped-shopping-card__count {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #9ca3af;
  white-space: nowrap;
}

.mped-shopping-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
}

.mped-shopping-card__list li {
  position: relative;
  padding-left: 0.85rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.4;
}

.mped-shopping-card__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 50%;
  background: #d1d5db;
  transform: translateY(-50%);
}

.mped-shopping-card__empty {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: #9ca3af;
  line-height: 1.45;
}

.mped-shopping-card__foot {
  display: flex;
  justify-content: flex-end;
}

.mped-shopping-card__smart {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-control);
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #fbbf24, #a78bfa, #60a5fa) border-box;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mped-shopping-card__smart:hover {
  color: #111827;
}
</style>
