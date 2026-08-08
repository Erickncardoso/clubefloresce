<template>
  <div class="exercise-track" :aria-label="`Exercício: ${current} de ${target} treinos esta semana`">
    <template v-if="compact">
      <div class="exercise-track__compact-summary">
        <div>
          <span>Progresso semanal</span>
          <strong>{{ current }} <small>de {{ target }} treinos</small></strong>
        </div>
        <div
          class="exercise-track__compact-segments"
          role="progressbar"
          aria-label="Treinos concluídos"
          :aria-valuenow="fillPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :style="{ gridTemplateColumns: `repeat(${Math.max(1, target)}, minmax(0, 1fr))` }"
        >
          <span
            v-for="segment in segments"
            :key="`compact-${segment.index}`"
            :class="{ 'exercise-track__compact-segment--done': segment.done }"
          />
        </div>
      </div>

      <button
        v-if="!readonly"
        type="button"
        class="exercise-track__open"
        @click="emit('open-editor')"
      >
        <Plus aria-hidden="true" />
        {{ current > 0 ? 'Editar treinos' : 'Registrar treino' }}
      </button>
    </template>

    <template v-else>
    <div class="exercise-track__panel">
      <div class="exercise-track__top">
        <span class="exercise-track__label">Treinos da semana</span>
        <span class="exercise-track__remaining">{{ remainingLabel }}</span>
      </div>

      <div class="exercise-track__overview">
        <p class="exercise-track__stat">
          <strong>{{ current }}</strong>
          <span>de {{ target }}</span>
        </p>

        <div
          class="exercise-track__bar"
          role="progressbar"
          aria-label="Treinos concluídos"
          :aria-valuenow="fillPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :style="{ gridTemplateColumns: `repeat(${Math.max(1, target)}, minmax(0, 1fr))` }"
        >
          <span
            v-for="segment in segments"
            :key="segment.index"
            class="exercise-track__segment"
            :class="{
              'exercise-track__segment--done': segment.done,
              'exercise-track__segment--next': segment.active,
            }"
          >
            <Check v-if="segment.done" aria-hidden="true" />
            <span v-else>{{ segment.index }}</span>
          </span>
        </div>
      </div>

      <p class="exercise-track__status">{{ statusMessage }}</p>
    </div>

    <div v-if="!readonly" class="exercise-track__actions">
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
    </template>
  </div>
</template>

<script setup>
import { Check, Minus, Plus } from 'lucide-vue-next'
import { useConfetti } from '~/composables/useConfetti'

const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 3 },
  readonly: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['increment', 'decrement', 'open-editor'])

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

const remainingLabel = computed(() => {
  const remaining = Math.max(0, props.target - props.current)
  if (remaining === 0) return 'Meta concluída'
  return remaining === 1 ? 'Falta 1 treino' : `Faltam ${remaining} treinos`
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
  gap: 0.85rem;
}

.exercise-track__panel {
  padding: 0;
}

.exercise-track__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.exercise-track__compact-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.75rem;
}

.exercise-track__compact-summary > div:first-child {
  min-width: 0;
}

.exercise-track__compact-summary span,
.exercise-track__compact-summary strong {
  display: block;
}

.exercise-track__compact-summary > div:first-child > span {
  color: #6f786c;
  font-size: 0.62rem;
}

.exercise-track__compact-summary strong {
  margin-top: 0.2rem;
  color: #466741;
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.exercise-track__compact-summary small {
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0;
}

.exercise-track__compact-segments {
  display: grid;
  gap: 0.3rem;
  width: min(48%, 10rem);
}

.exercise-track__compact-segments span {
  height: 1.75rem;
  border: 1px solid #dfe7dd;
  border-radius: 0.55rem;
  background: #f1f5f0;
}

.exercise-track__compact-segments .exercise-track__compact-segment--done {
  border-color: #5f8f58;
  background: #5f8f58;
}

.exercise-track__open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid #5f8f58;
  border-radius: 0.72rem;
  background: #5f8f58;
  color: #fff;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.16s ease, transform 0.16s ease;
}

.exercise-track__open svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.exercise-track__open:focus-visible {
  outline: 2px solid #466741;
  outline-offset: 2px;
}

.exercise-track__open:active {
  transform: scale(0.98);
}

.exercise-track__label {
  color: #60705d;
  font-size: 0.68rem;
  font-weight: 500;
}

.exercise-track__remaining {
  color: #6f786c;
  font-size: 0.62rem;
}

.exercise-track__overview {
  display: grid;
  grid-template-columns: 4.25rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.exercise-track__stat {
  margin: 0;
  text-align: center;
}

.exercise-track__stat strong {
  display: block;
  font-size: 2rem;
  line-height: 1;
  font-weight: 500;
  color: #466741;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}

.exercise-track__stat span {
  display: block;
  margin-top: 0.25rem;
  color: #7a8178;
  font-size: 0.62rem;
  font-weight: 400;
}

.exercise-track__bar {
  display: grid;
  gap: 0.45rem;
}

.exercise-track__segment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 2.65rem;
  border: 1px solid #dce5da;
  border-radius: 0.72rem;
  background: #f4f7f3;
  color: #879184;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.exercise-track__segment--done {
  border-color: #5f8f58;
  background: #5f8f58;
  color: #fff;
}

.exercise-track__segment--next {
  border-color: #9fbd9a;
  background: #edf4eb;
  color: #5f8f58;
}

.exercise-track__segment > svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2.5;
}

.exercise-track__status {
  margin: 0.75rem 0 0;
  color: #737873;
  font-size: 0.66rem;
  line-height: 1.4;
  text-align: center;
}

.exercise-track__actions {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  gap: 0.5rem;
}

.exercise-track__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  border-radius: 0.72rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.16s ease, transform 0.16s ease;
}

.exercise-track__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.exercise-track__btn--ghost {
  width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #dfe4de;
  background: #fff;
  color: #5f685d;
  box-shadow: none;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.exercise-track__btn--primary {
  flex: 1;
  border: none;
  background: #5f8f58;
  color: #fff;
  box-shadow: none;
}

.exercise-track__btn-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.exercise-track__btn:focus-visible {
  outline: 2px solid #466741;
  outline-offset: 2px;
}

.exercise-track__btn:active:not(:disabled) {
  transform: scale(0.98);
}

@media (hover: hover) {
  .exercise-track__open:hover {
    background: #527d4c;
  }

  .exercise-track__btn--ghost:hover:not(:disabled) {
    background: #f3f5f2;
  }

  .exercise-track__btn--primary:hover {
    background: #527d4c;
  }
}

@media (prefers-reduced-motion: reduce) {
  .exercise-track__btn,
  .exercise-track__open {
    transition: none;
  }
}
</style>
