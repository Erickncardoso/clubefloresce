<template>
  <div v-if="open" class="mprs-overlay" role="dialog" aria-modal="true">
    <div class="mprs-backdrop" @click="$emit('close')" />
    <article class="mprs-sheet">
      <header class="mprs-head">
        <div>
          <p class="mprs-kicker">Receita</p>
          <h2>{{ recipe?.title || 'Receita' }}</h2>
          <p v-if="metaLine" class="mprs-meta">{{ metaLine }}</p>
        </div>
        <button type="button" class="mprs-close" aria-label="Fechar" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div v-if="recipe?.imageUrl" class="mprs-image" :style="imageStyle" />

      <section v-if="recipe?.macros?.caloriesKcal" class="mprs-macros">
        <span>{{ recipe.macros.caloriesKcal }} kcal</span>
        <span>C {{ recipe.macros.carbsG }}g</span>
        <span>P {{ recipe.macros.proteinG }}g</span>
        <span>G {{ recipe.macros.fatG }}g</span>
      </section>

      <section class="mprs-block">
        <h3>Ingredientes</h3>
        <ul>
          <li v-for="ingredient in recipe?.ingredients || []" :key="ingredient.id">
            {{ ingredient.amount }} {{ ingredient.unit }} {{ ingredient.name }}
          </li>
        </ul>
      </section>

      <section v-if="recipe?.steps" class="mprs-block">
        <h3>Modo de preparo</h3>
        <p class="mprs-steps">{{ recipe.steps }}</p>
      </section>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  recipe: { type: Object, default: null },
})

defineEmits(['close'])

const metaLine = computed(() => {
  const parts = []
  if (props.recipe?.servingsLabel) parts.push(props.recipe.servingsLabel)
  if (props.recipe?.prepMinutes) parts.push(`${props.recipe.prepMinutes} min`)
  return parts.join(' · ')
})

const imageStyle = computed(() => ({
  backgroundImage: props.recipe?.imageUrl ? `url(${props.recipe.imageUrl})` : undefined,
  backgroundPosition: props.recipe?.imagePosition || '50% 50%',
}))
</script>

<style scoped>
.mprs-overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: end center;
}

.mprs-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.mprs-sheet {
  position: relative;
  width: min(100%, 32rem);
  max-height: 88dvh;
  overflow: auto;
  background: #fff;
  border-radius: var(--cf-radius-control) var(--cf-radius-control) 0 0;
  padding: 1rem 1rem 1.5rem;
}

.mprs-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.mprs-kicker {
  margin: 0;
  font-size: 0.75rem;
  color: #8a9288;
}

.mprs-head h2 {
  margin: 0.15rem 0;
  font-size: 1.2rem;
}

.mprs-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7368;
}

.mprs-close {
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  width: 2.5rem;
  height: 2.5rem;
  background: #fff;
  display: grid;
  place-items: center;
}

.mprs-image {
  margin-top: 0.85rem;
  aspect-ratio: 16 / 10;
  border-radius: var(--cf-radius-control);
  background: #f5f6f5 center/cover no-repeat;
}

.mprs-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
  font-size: 0.78rem;
  color: #15803d;
}

.mprs-block {
  margin-top: 1rem;
}

.mprs-block h3 {
  margin: 0 0 0.45rem;
  font-size: 0.92rem;
}

.mprs-block ul {
  margin: 0;
  padding-left: 1rem;
}

.mprs-block li {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.mprs-steps {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #374151;
}
</style>
