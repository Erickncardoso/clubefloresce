<template>
  <div
    class="food-days"
    :class="{ 'food-days--readonly': readonly }"
    :aria-label="`Refeição livre: ${selectedCount} ${selectedCount === 1 ? 'dia marcado' : 'dias marcados'} esta semana`"
  >
    <p class="food-days__hint">
      {{ readonly ? 'Dias em que a paciente fez refeição livre esta semana' : 'Toque nos dias em que você fez refeição livre' }}
    </p>

    <div class="food-days__grid" role="group" aria-label="Dias da semana">
      <button
        v-for="day in weekdays"
        :key="day.index"
        type="button"
        class="food-days__chip"
        :class="{
          'food-days__chip--selected': isSelected(day.index),
          'food-days__chip--today': day.index === todayIndex,
        }"
        :aria-pressed="isSelected(day.index)"
        :aria-label="`${day.label}${day.index === todayIndex ? ', hoje' : ''}${isSelected(day.index) ? ', marcado' : ''}`"
        @click="!readonly && emit('toggle-day', day.index)"
      >
        <span class="food-days__chip-short">{{ day.short }}</span>
        <span class="food-days__chip-check" aria-hidden="true">
          <Check v-if="isSelected(day.index)" class="food-days__chip-check-icon" />
        </span>
      </button>
    </div>

    <p class="food-days__summary">
      <strong>{{ selectedCount }}</strong>
      <span>{{ selectedCount === 1 ? 'dia marcado' : 'dias marcados' }} esta semana</span>
    </p>

    <p v-if="selectedCount > 0 && !readonly" class="food-days__note">
      Toque em um dia marcado para desmarcar.
    </p>
  </div>
</template>

<script setup>
import { Check } from 'lucide-vue-next'
import { FOOD_WEEKDAYS } from '~/composables/usePatientGoals'

const props = defineProps({
  selectedDays: { type: Array, default: () => [] },
  todayIndex: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-day'])

const weekdays = FOOD_WEEKDAYS

const selectedSet = computed(() => new Set(props.selectedDays))
const selectedCount = computed(() => props.selectedDays.length)

function isSelected(index) {
  return selectedSet.value.has(index)
}
</script>

<style scoped>
.food-days {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.food-days__hint {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
  text-align: center;
}

.food-days__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.food-days__chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  padding: 0.45rem 0.15rem 0.4rem;
  border: none;
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.food-days__chip-short {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--cf-text-muted);
}

.food-days__chip-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1.5px solid #e8ddd8;
  background: rgba(255, 255, 255, 0.72);
  color: #fff;
}

.food-days__chip-check-icon {
  width: 0.7rem;
  height: 0.7rem;
  stroke-width: 3;
}

.food-days__chip--today {
  box-shadow: inset 0 0 0 1.5px rgba(157, 114, 104, 0.35);
}

.food-days__chip--selected {
  background: #fff;
  box-shadow: inset 0 0 0 1.5px #b8927a, 0 2px 8px rgba(157, 114, 104, 0.16);
}

.food-days__chip--selected .food-days__chip-short {
  color: #9d7268;
}

.food-days__chip--selected .food-days__chip-check {
  background: #b8927a;
  border-color: #b8927a;
}

.food-days--readonly .food-days__chip {
  cursor: default;
  pointer-events: none;
}

.food-days--readonly .food-days__chip:active {
  transform: none;
}

.food-days__chip:active {
  transform: scale(0.97);
}

.food-days__summary {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.3rem;
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.food-days__summary strong {
  font-size: 1.1rem;
  font-weight: 800;
  color: #9d7268;
}

.food-days__note {
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.4;
  text-align: center;
  color: var(--cf-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .food-days__chip {
    transition: none;
  }
}
</style>
