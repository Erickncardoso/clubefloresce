<template>
  <div
    v-if="show"
    class="bella-restaurant-intent"
    role="group"
    aria-label="Intenção da refeição"
  >
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="bella-restaurant-intent-btn"
      :class="{ 'bella-restaurant-intent-btn--primary': option.id === 'plan_fit' }"
      :disabled="disabled"
      @click="emit('select', option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  RESTAURANT_INTENT_OPTIONS,
  hasActiveRestaurantIntent,
} from '~/utils/bella-restaurant'

const props = defineProps({
  message: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const show = computed(() => hasActiveRestaurantIntent(props.message))
const options = computed(() => RESTAURANT_INTENT_OPTIONS)
</script>

<style scoped>
.bella-restaurant-intent {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  margin-top: 0.75rem;
  width: 100%;
}

.bella-restaurant-intent-btn {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--cf-border, #e4e4e0);
  border-radius: 0.85rem;
  background: #fff;
  color: var(--cf-text, #141414);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.bella-restaurant-intent-btn:hover:not(:disabled) {
  background: var(--cf-pink-soft, #faecef);
  border-color: #e0c4c6;
}

.bella-restaurant-intent-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: var(--cf-pink-soft, #faecef);
}

.bella-restaurant-intent-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-restaurant-intent-btn--primary {
  background: var(--cf-pink-soft, #faecef);
  border-color: #e0c4c6;
  color: var(--cf-pink-dark, #a06267);
  font-weight: 700;
}
</style>
