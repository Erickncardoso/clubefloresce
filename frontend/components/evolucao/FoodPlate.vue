<template>
  <div class="food-plate" :aria-label="`Refeição livre: ${current} de ${target} dias na semana`">
    <div class="food-plate__card" aria-hidden="true">
      <svg class="food-plate__icon" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="34" r="22" fill="#f8faf5" stroke="#dce5d4" stroke-width="2.5" />
        <circle cx="32" cy="34" r="14" fill="#fff" stroke="#e8efe3" stroke-width="1.5" stroke-dasharray="3 3" />
        <path d="M18 18c2-4 6-6 10-6" fill="none" stroke="#8B967C" stroke-width="2" stroke-linecap="round" opacity="0.55" />
        <path d="M24 14c2-3 5-4 8-4" fill="none" stroke="#8B967C" stroke-width="2" stroke-linecap="round" opacity="0.4" />
        <path d="M36 14c2-3 5-4 8-4" fill="none" stroke="#8B967C" stroke-width="2" stroke-linecap="round" opacity="0.4" />
      </svg>

      <div class="food-plate__days">
        <div
          v-for="(day, index) in days"
          :key="`${day.label}-${index}`"
          class="food-plate__day"
          :class="{ 'food-plate__day--done': day.done }"
        >
          <span class="food-plate__day-label">{{ day.label }}</span>
          <span class="food-plate__day-dot">
            <svg v-if="day.done" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3.5 8.2 6.4 11 12.5 5" />
            </svg>
          </span>
        </div>
      </div>
    </div>

    <p class="food-plate__count">
      <strong>{{ current }}</strong>
      <span>/ {{ target }} dias na semana</span>
    </p>

    <div class="food-plate__actions">
      <button type="button" class="food-plate__btn" aria-label="Remover um dia" @click="emit('decrement')">−</button>
      <button type="button" class="food-plate__btn food-plate__btn--primary" aria-label="Marcar refeição livre" @click="emit('increment')">+</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 5 },
})

const emit = defineEmits(['increment', 'decrement'])

const weekLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

const days = computed(() =>
  weekLabels.map((label, index) => ({
    label,
    done: index < props.current,
  })),
)
</script>

<style scoped>
.food-plate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.food-plate__card {
  width: 100%;
  max-width: 17rem;
  padding: 0.75rem 0.65rem 0.85rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8faf5 0%, #fff 100%);
  border: 1px solid #e0e8da;
}

.food-plate__icon {
  display: block;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto 0.65rem;
}

.food-plate__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.22rem;
  max-width: 14.5rem;
  margin: 0 auto;
}

.food-plate__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
}

.food-plate__day-label {
  font-size: 0.58rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.food-plate__day-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  border: 2px solid #d4dfc8;
  background: #fff;
  color: #fff;
  transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.food-plate__day--done .food-plate__day-dot {
  background: linear-gradient(145deg, #9aa88f, #8B967C);
  border-color: #8B967C;
  transform: scale(1.04);
}

.food-plate__count {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.food-plate__count strong {
  font-size: 1.15rem;
  color: var(--cf-pink-dark);
}

.food-plate__actions {
  display: flex;
  gap: 0.5rem;
}

.food-plate__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
}

.food-plate__btn--primary {
  background: var(--cf-pink);
  border-color: var(--cf-pink);
  color: #fff;
}
</style>
