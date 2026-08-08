<template>
  <div
    class="food-days"
    :class="{
      'food-days--readonly': readonly,
      'food-days--compact': compact,
      'food-days--editor': editor,
    }"
    :aria-label="`Refeição livre: ${selectedCount} ${selectedCount === 1 ? 'dia marcado' : 'dias marcados'} esta semana`"
  >
    <template v-if="compact">
      <div class="food-days__compact-summary">
        <div class="food-days__compact-dots" aria-hidden="true">
          <span
            v-for="day in weekdays"
            :key="`compact-${day.index}`"
            :class="{ 'food-days__compact-dot--selected': isSelected(day.index) }"
          />
        </div>
        <div>
          <span>Registro semanal</span>
          <strong>{{ weeklyMessage }}</strong>
        </div>
      </div>

      <button
        v-if="!readonly"
        type="button"
        class="food-days__open"
        @click="emit('open-editor')"
      >
        <Plus aria-hidden="true" />
        {{ selectedCount > 0 ? 'Editar registros' : 'Registrar refeição livre' }}
      </button>
    </template>

    <template v-else>
      <div v-if="!editor" class="food-days__head">
        <div>
          <span>Semana atual</span>
          <strong>{{ selectedCount }} <small>de 7 dias</small></strong>
        </div>
        <p>{{ weeklyMessage }}</p>
      </div>

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
          :disabled="readonly"
          @click="!readonly && emit('toggle-day', day.index)"
        >
          <span class="food-days__chip-short">{{ day.short }}</span>
          <span class="food-days__chip-marker" aria-hidden="true">
            <Check v-if="isSelected(day.index)" />
          </span>
          <small>{{ day.index === todayIndex ? 'Hoje' : '' }}</small>
        </button>
      </div>

      <p v-if="!readonly" class="food-days__note">
        {{ selectedCount > 0 ? 'Toque novamente para remover um registro.' : 'Toque em um dia para registrar.' }}
      </p>
    </template>
  </div>
</template>

<script setup>
import { Check, Plus } from 'lucide-vue-next'
import { FOOD_WEEKDAYS } from '~/composables/usePatientGoals'

const props = defineProps({
  selectedDays: { type: Array, default: () => [] },
  todayIndex: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  editor: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-day', 'open-editor'])

const weekdays = FOOD_WEEKDAYS

const selectedSet = computed(() => new Set(props.selectedDays))
const selectedCount = computed(() => props.selectedDays.length)
const weeklyMessage = computed(() => {
  if (selectedCount.value === 0) return 'Nenhuma refeição livre registrada'
  if (selectedCount.value === 1) return '1 dia registrado nesta semana'
  return `${selectedCount.value} dias registrados nesta semana`
})

function isSelected(index) {
  return selectedSet.value.has(index)
}
</script>

<style scoped>
.food-days {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.food-days--compact {
  gap: 0.75rem;
}

.food-days__compact-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 3.75rem;
}

.food-days__compact-summary > div:last-child {
  min-width: 0;
}

.food-days__compact-summary span,
.food-days__compact-summary strong {
  display: block;
}

.food-days__compact-summary > div:last-child > span {
  color: #7b7472;
  font-size: 0.62rem;
}

.food-days__compact-summary strong {
  margin-top: 0.2rem;
  overflow: hidden;
  color: #383534;
  font-size: 0.76rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-days__compact-dots {
  display: grid;
  grid-template-columns: repeat(7, 0.42rem);
  gap: 0.22rem;
  flex-shrink: 0;
}

.food-days__compact-dots span {
  width: 0.42rem;
  height: 1.75rem;
  border-radius: 999px;
  background: #ece5e2;
}

.food-days__compact-dots .food-days__compact-dot--selected {
  background: #a87d70;
}

.food-days__open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid #a87d70;
  border-radius: 0.72rem;
  background: #a87d70;
  color: #fff;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.food-days__open svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.food-days__open:focus-visible {
  outline: 2px solid #8f665d;
  outline-offset: 2px;
}

.food-days__open:active {
  transform: scale(0.98);
}

.food-days__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.food-days__head > div {
  flex-shrink: 0;
}

.food-days__head span,
.food-days__head strong {
  display: block;
}

.food-days__head span {
  font-size: 0.62rem;
  color: #7b7472;
}

.food-days__head strong {
  margin-top: 0.2rem;
  color: #8f665d;
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.food-days__head small {
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0;
}

.food-days__head p {
  max-width: 12rem;
  margin: 0;
  color: #76716f;
  font-size: 0.66rem;
  line-height: 1.4;
  text-align: right;
  text-wrap: pretty;
}

.food-days__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.2rem;
}

.food-days__grid::before {
  content: '';
  position: absolute;
  top: 2.52rem;
  right: 1.25rem;
  left: 1.25rem;
  height: 1px;
  background: #eadfdb;
  pointer-events: none;
}

.food-days__chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.38rem;
  min-width: 0;
  min-height: 4.6rem;
  padding: 0.45rem 0.05rem 0.2rem;
  border: none;
  border-radius: 0.65rem;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.16s ease, transform 0.16s ease;
}

.food-days__chip-short {
  font-size: 0.62rem;
  font-weight: 500;
  color: #77716f;
}

.food-days__chip-marker {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid #dfd2cd;
  border-radius: 50%;
  background: #fff;
  color: #fff;
}

.food-days__chip-marker svg {
  width: 0.85rem;
  height: 0.85rem;
  stroke-width: 2.5;
}

.food-days__chip small {
  min-height: 0.7rem;
  color: #9d7268;
  font-size: 0.54rem;
  line-height: 1;
}

.food-days__chip--today .food-days__chip-marker {
  border-color: #b48b80;
  box-shadow: 0 0 0 3px #f7eeeb;
}

.food-days__chip--selected .food-days__chip-short {
  color: #9d7268;
}

.food-days__chip--selected .food-days__chip-marker {
  border-color: #a87d70;
  background: #a87d70;
}

.food-days--readonly .food-days__chip {
  cursor: default;
}

.food-days--readonly .food-days__chip:active {
  transform: none;
}

.food-days__chip:active {
  transform: scale(0.97);
}

.food-days__note {
  margin: 0;
  color: #85807e;
  font-size: 0.62rem;
  line-height: 1.3;
  text-align: center;
}

.food-days__chip:focus-visible {
  outline: 2px solid #8f665d;
  outline-offset: 2px;
}

@media (hover: hover) {
  .food-days__chip:hover {
    background: #faf6f4;
  }

  .food-days__open:hover {
    background: #946b60;
  }
}

@media (prefers-reduced-motion: reduce) {
  .food-days__chip,
  .food-days__open {
    transition: none;
  }
}
</style>
