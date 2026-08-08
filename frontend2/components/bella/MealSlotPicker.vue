<template>
  <section
    class="meal-slot-picker"
    :class="{ 'meal-slot-picker--inline': inline }"
    aria-label="Escolha a refeição"
  >
    <p class="meal-slot-picker-label">
      Qual refeição você está registrando?
      <span v-if="selectedMeal" class="meal-slot-picker-active">{{ selectedMeal.label }}</span>
    </p>
    <div class="meal-slot-picker-row" role="list">
      <button
        v-for="meal in meals"
        :key="meal.id"
        type="button"
        class="meal-slot-btn"
        :class="{
          'meal-slot-btn--active': modelValue === meal.id,
          'meal-slot-btn--logged': loggedMealIds.includes(meal.id),
        }"
        role="listitem"
        :aria-pressed="modelValue === meal.id"
        :disabled="disabled"
        @click="selectMeal(meal.id)"
      >
        <component :is="meal.icon" class="meal-slot-btn-icon" aria-hidden="true" />
        <span class="meal-slot-btn-text">{{ meal.short }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  meals: { type: Array, default: () => [] },
  loggedMealIds: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const selectedMeal = computed(() => props.meals.find((meal) => meal.id === props.modelValue) || null)

function selectMeal(id) {
  if (props.disabled || !id) return
  emit('update:modelValue', id)
}
</script>

<style scoped>
.meal-slot-picker {
  margin: 0;
  padding: 0.65rem 1rem 0.5rem;
  background: #fff;
  border-bottom: 1px solid var(--cf-border, var(--pa-border));
}

.meal-slot-picker--inline {
  margin-top: 0.75rem;
  padding: 0.75rem 0 0;
  background: transparent;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.meal-slot-picker--inline .meal-slot-picker-label {
  font-size: 0.75rem;
}

.meal-slot-picker--inline .meal-slot-btn {
  min-width: 3.85rem;
  padding: 0.6rem 0.5rem;
  font-size: 0.65rem;
}

.meal-slot-picker-label {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted, var(--pa-text-muted));
  line-height: 1.35;
}

.meal-slot-picker-active {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--cf-green-dark, var(--pa-green-dark));
}

.meal-slot-picker-row {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  scrollbar-width: none;
}

.meal-slot-picker-row::-webkit-scrollbar {
  display: none;
}

.meal-slot-btn {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 3.65rem;
  padding: 0.55rem 0.45rem;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: var(--cf-surface, #fff);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  color: var(--cf-text-muted, var(--pa-text-muted));
  cursor: pointer;
  box-shadow: var(--cf-shadow);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.meal-slot-btn--active {
  background: var(--cf-green-soft, #eef0eb);
  border-color: var(--cf-green, var(--pa-green));
  color: var(--cf-green-dark, var(--pa-green-dark));
}

.meal-slot-btn--logged:not(.meal-slot-btn--active) {
  border-color: var(--cf-border, var(--pa-border));
}

.meal-slot-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.meal-slot-btn-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.meal-slot-btn-text {
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}
</style>
