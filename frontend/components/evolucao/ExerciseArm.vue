<template>
  <div class="exercise-arm" :aria-label="`Exercício: ${current} de ${target} vezes na semana`">
    <div class="exercise-arm__scene" aria-hidden="true">
      <svg viewBox="0 0 120 100" class="exercise-arm__svg">
        <ellipse cx="28" cy="78" rx="16" ry="10" fill="#e8f0e6" />
        <path
          class="exercise-arm__torso"
          d="M28 68 Q34 52 42 44 Q48 38 56 36 L68 34 Q76 36 80 42"
          fill="none"
          stroke="#c5d4c0"
          stroke-width="8"
          stroke-linecap="round"
        />
        <path
          class="exercise-arm__forearm"
          d="M56 36 Q72 28 88 22"
          fill="none"
          stroke="#6d9a66"
          stroke-width="7"
          stroke-linecap="round"
        />
        <ellipse
          class="exercise-arm__bicep"
          cx="58"
          cy="36"
          :rx="bicepRx"
          :ry="bicepRy"
          fill="#6d9a66"
          :style="{ transformOrigin: '58px 36px' }"
        />
        <circle cx="90" cy="20" r="5.5" fill="#5a8554" class="exercise-arm__fist" />
        <path
          v-if="fillPercent >= 60"
          class="exercise-arm__flex-line"
          d="M52 30 Q58 24 64 28"
          fill="none"
          stroke="#4a7345"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <div v-if="fillPercent >= 100" class="exercise-arm__burst">💪</div>
    </div>

    <p class="exercise-arm__count">
      <strong>{{ current }}</strong>
      <span>/ {{ target }} {{ target === 1 ? 'vez' : 'vezes' }}</span>
    </p>

    <div class="exercise-arm__actions">
      <button type="button" class="exercise-arm__btn" aria-label="Remover uma sessão" @click="emit('decrement')">−</button>
      <button type="button" class="exercise-arm__btn exercise-arm__btn--primary" aria-label="Registrar exercício" @click="emit('increment')">+</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 3 },
})

const emit = defineEmits(['increment', 'decrement'])

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, Math.round((props.current / props.target) * 100))
})

const bicepRx = computed(() => 6 + (fillPercent.value / 100) * 10)
const bicepRy = computed(() => 5 + (fillPercent.value / 100) * 9)
</script>

<style scoped>
.exercise-arm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.exercise-arm__scene {
  position: relative;
  width: 7.5rem;
  height: 6.5rem;
}

.exercise-arm__svg {
  width: 100%;
  height: 100%;
}

.exercise-arm__bicep {
  transition: rx 0.45s cubic-bezier(0.34, 1.4, 0.64, 1), ry 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
  animation: arm-pulse 2.4s ease-in-out infinite;
}

.exercise-arm__fist {
  animation: fist-bump 2.4s ease-in-out infinite;
  transform-origin: 90px 20px;
}

.exercise-arm__flex-line {
  animation: flex-draw 0.6s ease forwards;
}

.exercise-arm__burst {
  position: absolute;
  top: 0;
  right: 0.5rem;
  font-size: 1rem;
  animation: burst-pop 0.8s ease;
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

@keyframes arm-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

@keyframes fist-bump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes flex-draw {
  from { stroke-dasharray: 20; stroke-dashoffset: 20; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes burst-pop {
  0% { transform: scale(0.4); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .exercise-arm__bicep,
  .exercise-arm__fist,
  .exercise-arm__flex-line,
  .exercise-arm__burst {
    animation: none;
    transition: none;
  }
}
</style>
