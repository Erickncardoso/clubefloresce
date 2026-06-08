<template>
  <section v-if="items.length" class="bib-row" :aria-labelledby="headingId">
    <div class="bib-row-head">
      <h2 :id="headingId" class="bib-row-title">{{ title }}</h2>
      <NuxtLink v-if="seeAllTo" :to="seeAllTo" class="bib-row-see-all">
        Ver tudo
        <ChevronRight class="bib-row-see-all-icon" aria-hidden="true" />
      </NuxtLink>
    </div>

    <SharedCfTileCarousel
      inset="1rem"
      :items="items"
      :aria-label="title"
      @select="emit('select', $event)"
    />
  </section>
</template>

<script setup>
import { ChevronRight } from 'lucide-vue-next'

defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  seeAllTo: { type: String, default: '' },
  headingId: { type: String, required: true },
})

const emit = defineEmits(['select'])
</script>

<style scoped>
.bib-row {
  margin-bottom: 1.35rem;
  overflow: visible;
}

.bib-row-head {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.bib-row-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--cf-text);
}

.bib-row-see-all {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  min-height: 2rem;
  padding: 0.25rem 0.15rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  text-decoration: none;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.bib-row-see-all:active {
  opacity: 0.75;
}

.bib-row-see-all-icon {
  width: 0.85rem;
  height: 0.85rem;
}
</style>
