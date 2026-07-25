<template>
  <section class="plaf admin-shell-card" aria-label="Filtros avançados de pacientes">
    <header class="plaf-head">
      <button
        type="button"
        class="plaf-toggle"
        :aria-expanded="expanded ? 'true' : 'false'"
        @click="expanded = !expanded"
      >
        <SlidersHorizontal aria-hidden="true" />
        <span>Filtros avançados</span>
        <span v-if="activeFilterCount" class="plaf-toggle-badge">{{ activeFilterCount }}</span>
        <ChevronDown class="plaf-toggle-chevron" :class="{ 'plaf-toggle-chevron--open': expanded }" aria-hidden="true" />
      </button>

      <div v-if="expanded" class="plaf-head-meta">
        <span class="plaf-result-count">
          {{ filteredCount }} de {{ totalCount }} pacientes
        </span>
        <button
          v-if="activeFilterCount"
          type="button"
          class="plaf-clear"
          @click="$emit('clear')"
        >
          Limpar filtros
        </button>
      </div>
    </header>

    <div v-if="expanded" class="plaf-body">
      <div
        v-for="group in filterGroups"
        :key="group.key"
        class="plaf-group"
      >
        <span class="plaf-group-label">{{ group.label }}</span>
        <div class="plaf-options" role="group" :aria-label="group.label">
          <button
            v-for="option in group.options"
            :key="`${group.key}-${option.value}`"
            type="button"
            class="plaf-pill"
            :class="{
              'plaf-pill--active': option.active,
              [`plaf-pill--zone-${option.value}`]: group.key === 'engagementZone',
            }"
            :aria-pressed="option.active ? 'true' : 'false'"
            :disabled="option.count === 0 && !option.active"
            @click="$emit('toggle', group.key, option.value)"
          >
            <span
              v-if="option.color"
              class="plaf-pill-dot"
              :style="{ background: option.color }"
              aria-hidden="true"
            />
            <span class="plaf-pill-label">{{ option.label }}</span>
            <span class="plaf-pill-count">{{ option.count }}</span>
          </button>
        </div>
      </div>

      <p v-if="engagementLoading" class="plaf-hint">Carregando zonas de engajamento…</p>
      <p v-else class="plaf-hint">
        Os números mostram quantas pacientes se encaixam em cada filtro com a seleção atual.
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronDown, SlidersHorizontal } from 'lucide-vue-next'

defineProps({
  filterGroups: { type: Array, default: () => [] },
  activeFilterCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  engagementLoading: { type: Boolean, default: false },
})

defineEmits(['toggle', 'clear'])

const expanded = ref(true)
</script>

<style scoped>
.plaf {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
}

.plaf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.plaf-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c322c;
  cursor: pointer;
}

.plaf-toggle svg {
  width: 1rem;
  height: 1rem;
  color: #6b7368;
}

.plaf-toggle-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: var(--cf-radius-pill, 999px);
  background: rgba(139, 150, 124, 0.16);
  color: #5f6b55;
  font-size: 0.72rem;
  font-weight: 600;
}

.plaf-toggle-chevron {
  transition: transform 0.18s ease;
}

.plaf-toggle-chevron--open {
  transform: rotate(180deg);
}

.plaf-head-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.plaf-result-count {
  font-size: 0.78rem;
  color: #6b7368;
}

.plaf-clear {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--primary, #8b967c);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.plaf-body {
  margin-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.plaf-group {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr);
  gap: 0.55rem 0.85rem;
  align-items: start;
}

.plaf-group-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: #6b7368;
  padding-top: 0.35rem;
}

.plaf-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.plaf-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.85rem;
  padding: 0.2rem 0.55rem 0.2rem 0.5rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #4b5563;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.plaf-pill:hover:not(:disabled) {
  border-color: #c8dcc4;
  background: #f8faf8;
}

.plaf-pill:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.plaf-pill--active {
  border-color: rgba(139, 150, 124, 0.55);
  background: rgba(139, 150, 124, 0.12);
  color: #3f4a38;
}

.plaf-pill-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: var(--cf-radius-pill, 999px);
  flex-shrink: 0;
}

.plaf-pill-label {
  line-height: 1.2;
}

.plaf-pill-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border-radius: var(--cf-radius-pill, 999px);
  background: rgba(15, 23, 42, 0.06);
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 600;
}

.plaf-pill--active .plaf-pill-count {
  background: rgba(63, 74, 56, 0.12);
  color: #3f4a38;
}

.plaf-pill--zone-danger.plaf-pill--active {
  border-color: rgba(220, 38, 38, 0.35);
  background: rgba(254, 226, 226, 0.65);
  color: #991b1b;
}

.plaf-pill--zone-attention.plaf-pill--active {
  border-color: rgba(217, 119, 6, 0.35);
  background: rgba(254, 243, 199, 0.75);
  color: #92400e;
}

.plaf-pill--zone-success.plaf-pill--active {
  border-color: rgba(22, 163, 74, 0.35);
  background: rgba(220, 252, 231, 0.75);
  color: #166534;
}

.plaf-hint {
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.4;
}

@media (max-width: 720px) {
  .plaf-group {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .plaf-group-label {
    padding-top: 0;
  }
}
</style>
