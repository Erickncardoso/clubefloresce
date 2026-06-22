<template>
  <div class="exercise-track" :aria-label="`Exercício: ${current} de ${target} treinos esta semana`">
    <div class="exercise-track__panel">
      <div class="exercise-track__top">
        <span class="exercise-track__label">Esta semana</span>
        <span class="exercise-track__pct">{{ fillPercent }}%</span>
      </div>

      <p class="exercise-track__stat">
        <strong>{{ current }}</strong>
        <span>/ {{ target }} {{ target === 1 ? 'treino' : 'treinos' }}</span>
      </p>

      <div
        class="exercise-track__bar"
        role="progressbar"
        :aria-valuenow="fillPercent"
        aria-valuemin="0"
        aria-valuemax="100"
        :style="{ gridTemplateColumns: `repeat(${Math.max(1, target)}, minmax(0, 1fr))` }"
      >
        <div
          v-for="segment in segments"
          :key="segment.index"
          class="exercise-track__segment"
          :class="{
            'exercise-track__segment--done': segment.done,
            'exercise-track__segment--next': segment.active,
          }"
        />
      </div>

      <p class="exercise-track__status">{{ statusMessage }}</p>
    </div>

    <div class="exercise-track__actions">
      <button
        type="button"
        class="exercise-track__btn exercise-track__btn--ghost"
        aria-label="Remover um treino"
        :disabled="current <= 0"
        @click="emit('decrement')"
      >
        <Minus class="exercise-track__btn-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="exercise-track__btn exercise-track__btn--primary"
        aria-label="Registrar treino"
        @click="emit('increment')"
      >
        <Plus class="exercise-track__btn-icon" aria-hidden="true" />
        Registrar treino
      </button>
    </div>
  </div>
</template>

<script setup>
import { Minus, Plus } from 'lucide-vue-next'
import { useConfetti } from '~/composables/useConfetti'

const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 3 },
})

const emit = defineEmits(['increment', 'decrement'])

const { burstRain } = useConfetti()

watch(
  () => props.current,
  (current, previous) => {
    if (!props.target || current < props.target) return
    const before = previous ?? 0
    if (before < props.target) burstRain()
  },
)

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, Math.round((props.current / props.target) * 100))
})

const segments = computed(() =>
  Array.from({ length: Math.max(1, props.target) }, (_, index) => {
    const sessionIndex = index + 1
    return {
      index: sessionIndex,
      done: sessionIndex <= props.current,
      active: sessionIndex === props.current + 1,
    }
  }),
)

const statusMessage = computed(() => {
  if (!props.target) return 'Defina sua meta semanal de movimento.'
  if (props.current >= props.target) return 'Meta semanal concluída. Excelente consistência!'
  if (props.current === 0) return 'Comece com um treino leve hoje.'
  const remaining = props.target - props.current
  return remaining === 1
    ? 'Falta 1 treino para fechar a semana.'
    : `Faltam ${remaining} treinos para fechar a semana.`
})
</script>

<style scoped>
.exercise-track {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.exercise-track__panel {
  padding: 0;
}

.exercise-track__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.exercise-track__label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.exercise-track__pct {
  font-size: 0.75rem;
  font-weight: 800;
  color: #5f8f58;
}

.exercise-track__stat {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0 0 0.65rem;
}

.exercise-track__stat strong {
  font-size: 1.45rem;
  line-height: 1;
  font-weight: 800;
  color: #466741;
}

.exercise-track__stat span {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.exercise-track__bar {
  display: grid;
  gap: 0.3rem;
  margin-bottom: 0.55rem;
}

.exercise-track__segment {
  height: 0.45rem;
  border-radius: 999px;
  background: #e3ebe0;
}

.exercise-track__segment--done {
  background: #5f8f58;
}

.exercise-track__segment--next {
  background: #b8d4b3;
}

.exercise-track__status {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: rgba(28, 24, 22, 0.52);
}

.exercise-track__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.exercise-track__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.55rem;
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.exercise-track__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.exercise-track__btn--ghost {
  width: 2.55rem;
  height: 2.55rem;
  min-height: 2.55rem;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.exercise-track__btn--primary {
  flex: 1;
  border: none;
  background: #5f8f58;
  color: #fff;
  box-shadow: 0 4px 12px rgba(95, 143, 88, 0.22);
}

.exercise-track__btn-icon {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
