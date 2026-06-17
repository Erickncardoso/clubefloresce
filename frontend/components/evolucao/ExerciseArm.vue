<template>
  <div class="exercise-arm" :aria-label="`Exercício: ${current} de ${target} vezes na semana`">
    <div class="exercise-arm__card" aria-hidden="true">
      <div class="exercise-arm__rings">
        <svg class="exercise-arm__ring-svg" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="exerciseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8bc284" />
              <stop offset="100%" stop-color="#5f8f58" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="48" fill="none" stroke="#e8f0e6" stroke-width="10" />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="url(#exerciseGradient)"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="ringCircumference"
            :stroke-dashoffset="ringOffset"
            transform="rotate(-90 60 60)"
          />
        </svg>

        <div class="exercise-arm__center">
          <svg viewBox="0 0 24 24" width="28" height="28" class="exercise-arm__dumbbell" aria-hidden="true">
            <rect x="2" y="9" width="3" height="6" rx="1" fill="#5f8f58" />
            <rect x="19" y="9" width="3" height="6" rx="1" fill="#5f8f58" />
            <rect x="5" y="10.5" width="14" height="3" rx="1.5" fill="#7cb075" />
          </svg>
          <strong>{{ current }}/{{ target }}</strong>
        </div>
      </div>

      <div class="exercise-arm__sessions">
        <div
          v-for="index in target"
          :key="index"
          class="exercise-arm__session"
          :class="{ 'exercise-arm__session--done': index <= current }"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="2" y="8" width="3.5" height="8" rx="1" fill="currentColor" />
            <rect x="18.5" y="8" width="3.5" height="8" rx="1" fill="currentColor" />
            <rect x="5.5" y="10" width="13" height="4" rx="2" fill="currentColor" opacity="0.85" />
          </svg>
          <span>{{ index }}ª</span>
        </div>
      </div>
    </div>

    <p class="exercise-arm__count">
      <strong>{{ current }}</strong>
      <span>/ {{ target }} {{ target === 1 ? 'treino' : 'treinos' }} esta semana</span>
    </p>

    <div class="exercise-arm__actions">
      <button type="button" class="exercise-arm__btn" aria-label="Remover um treino" @click="emit('decrement')">−</button>
      <button type="button" class="exercise-arm__btn exercise-arm__btn--primary" aria-label="Registrar treino" @click="emit('increment')">+</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 3 },
})

const emit = defineEmits(['increment', 'decrement'])

const ringCircumference = 2 * Math.PI * 48

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, (props.current / props.target) * 100)
})

const ringOffset = computed(() => ringCircumference - (fillPercent.value / 100) * ringCircumference)
</script>

<style scoped>
.exercise-arm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.exercise-arm__card {
  width: 100%;
  max-width: 16rem;
  padding: 0.85rem 0.75rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #f7fbf5 0%, #fff 100%);
  border: 1px solid #e3eddf;
}

.exercise-arm__rings {
  position: relative;
  width: 7.5rem;
  height: 7.5rem;
  margin: 0 auto 0.75rem;
}

.exercise-arm__ring-svg {
  width: 100%;
  height: 100%;
}

.exercise-arm__ring-svg circle:last-of-type {
  transition: stroke-dashoffset 0.45s ease;
}

.exercise-arm__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
}

.exercise-arm__center strong {
  font-size: 1rem;
  color: #5f8f58;
}

.exercise-arm__dumbbell {
  animation: exercise-lift 2.4s ease-in-out infinite;
}

.exercise-arm__sessions {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.exercise-arm__session {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 2.6rem;
  padding: 0.35rem 0.25rem;
  border-radius: 12px;
  color: #b8ccb3;
  background: #f3f7f1;
  border: 1px solid #e3eddf;
  font-size: 0.58rem;
  font-weight: 700;
  transition: color 0.25s ease, background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.exercise-arm__session--done {
  color: #4f7f49;
  background: #edf6ea;
  border-color: #cfe4c9;
  transform: translateY(-1px);
}

.exercise-arm__count {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.exercise-arm__count strong {
  font-size: 1.15rem;
  color: #6d9a66;
}

.exercise-arm__actions {
  display: flex;
  gap: 0.5rem;
}

.exercise-arm__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
}

.exercise-arm__btn--primary {
  background: #6d9a66;
  border-color: #6d9a66;
  color: #fff;
}

@keyframes exercise-lift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .exercise-arm__dumbbell,
  .exercise-arm__ring-svg circle:last-of-type,
  .exercise-arm__session {
    animation: none;
    transition: none;
  }
}
</style>
