<template>
  <Teleport to="body">
    <Transition name="quick-goal-sheet">
      <div
        v-if="open"
        class="quick-goal-overlay"
        @click.self="close"
        @keydown.esc="close"
      >
        <section
          class="quick-goal-sheet"
          :class="`quick-goal-sheet--${goalId}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <span class="quick-goal-handle" aria-hidden="true" />

          <header class="quick-goal-head">
            <span class="quick-goal-head-icon" aria-hidden="true">
              <component :is="activeIcon" />
            </span>
            <div>
              <h2 :id="titleId">{{ activeGoal.label }}</h2>
              <p>{{ sheetSubtitle }}</p>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="quick-goal-close"
              aria-label="Fechar"
              @click="close"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="quick-goal-status">
            <span>Hoje</span>
            <strong>{{ currentStatus }}</strong>
          </div>

          <div v-if="goalId === 'water'" class="quick-goal-water-options">
            <button
              v-for="option in waterOptions"
              :key="option.kind"
              type="button"
              class="quick-goal-water-option"
              :disabled="goalComplete"
              @click="addWater(option.ml)"
            >
              <span class="quick-goal-vessel" aria-hidden="true">
                <EvolucaoWaterVesselIcon :kind="option.kind" :fill-percent="70" />
              </span>
              <span>
                <strong>{{ option.label }}</strong>
                <small>+ {{ option.ml }} ml</small>
              </span>
            </button>
          </div>

          <button
            v-else-if="goalId === 'food'"
            type="button"
            class="quick-goal-primary"
            :disabled="foodTodaySelected"
            @click="registerFood"
          >
            <Check v-if="foodTodaySelected" aria-hidden="true" />
            <Plus v-else aria-hidden="true" />
            {{ foodTodaySelected ? 'Hoje já foi registrado' : 'Registrar refeição livre hoje' }}
          </button>

          <button
            v-else-if="goalId === 'exercise'"
            type="button"
            class="quick-goal-primary"
            :disabled="goalComplete"
            @click="registerExercise"
          >
            <Plus aria-hidden="true" />
            {{ goalComplete ? 'Meta semanal concluída' : 'Registrar 1 treino' }}
          </button>

          <div v-else-if="goalId === 'sleep'" class="quick-goal-sleep">
            <div class="quick-goal-sleep-times">
              <div>
                <Moon aria-hidden="true" />
                <span>Dormir</span>
                <strong>{{ formatClock(sleepSchedule.bedMinutes) }}</strong>
              </div>
              <div>
                <Sun aria-hidden="true" />
                <span>Acordar</span>
                <strong>{{ formatClock(sleepSchedule.wakeMinutes) }}</strong>
              </div>
            </div>
            <button type="button" class="quick-goal-primary" @click="registerSleep">
              <Check aria-hidden="true" />
              Registrar {{ formatDuration(sleepSchedule.durationMinutes) }} de sono
            </button>
          </div>

          <p v-if="goalComplete && goalId === 'water'" class="quick-goal-complete">
            <Check aria-hidden="true" />
            Meta de hidratação concluída hoje
          </p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Check, Cookie, Droplets, Dumbbell, Moon, Plus, Sun, X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  goalId: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const {
  todaySummary,
  sleepSchedule,
  incrementGoal,
  setSleepSchedule,
  getFoodSelectedDays,
  toggleFoodDay,
  weekdayIndex,
} = usePatientGoals()
const {
  waterVesselSettings,
  hydrateWaterVessels,
} = useWaterVesselSettings()

const closeButton = ref(null)
const returnFocus = ref(null)

const GOAL_FALLBACKS = {
  water: { id: 'water', label: 'Água', target: 2 },
  food: { id: 'food', label: 'Refeição livre', target: 7 },
  exercise: { id: 'exercise', label: 'Exercício', target: 3 },
  sleep: { id: 'sleep', label: 'Sono', target: 8 },
}

const activeSummary = computed(() =>
  todaySummary.value.find((item) => item.goal.id === props.goalId),
)
const activeGoal = computed(() =>
  activeSummary.value?.goal
  || GOAL_FALLBACKS[props.goalId]
  || { id: props.goalId, label: 'Meta', target: 1 },
)
const activeIcon = computed(() => ({
  water: Droplets,
  food: Cookie,
  exercise: Dumbbell,
  sleep: Moon,
}[props.goalId] || Droplets))
const titleId = computed(() => `quick-goal-${props.goalId}-title`)
const goalComplete = computed(() => Number(activeSummary.value?.percent || 0) >= 100)
const foodTodaySelected = computed(() =>
  getFoodSelectedDays().includes(weekdayIndex()),
)
const waterOptions = computed(() => [
  { kind: 'glass', label: 'Copo', ml: waterVesselSettings.value.glassMl },
  { kind: 'bottle', label: 'Garrafa', ml: waterVesselSettings.value.bottleMl },
])
const sheetSubtitle = computed(() => ({
  water: 'O que você acabou de beber?',
  food: 'Registre o dia com um único toque.',
  exercise: 'Adicione o treino desta semana.',
  sleep: 'Confirme os horários já configurados.',
}[props.goalId] || 'Registre seu progresso.'))
const currentStatus = computed(() => {
  const summary = activeSummary.value
  if (!summary) return 'Sem registro'
  if (props.goalId === 'water') {
    return `${formatLiters(summary.progress)} de ${formatLiters(summary.goal.target)} L`
  }
  if (props.goalId === 'food') {
    const days = Number(summary.progress || 0)
    return `${days} ${days === 1 ? 'dia' : 'dias'} nesta semana`
  }
  if (props.goalId === 'exercise') {
    return `${summary.progress} de ${summary.goal.target} treinos`
  }
  return `${formatDuration(sleepSchedule.value.durationMinutes)} de sono`
})

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('evo-goal-modal-open', isOpen)
    }
    if (isOpen) {
      returnFocus.value = document.activeElement
      nextTick(() => closeButton.value?.focus())
    } else {
      nextTick(() => returnFocus.value?.focus?.())
    }
  },
)

onMounted(hydrateWaterVessels)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('evo-goal-modal-open')
  }
})

function close() {
  emit('close')
}

function addWater(ml) {
  incrementGoal('water', Number(ml) / 1000)
  close()
}

function registerFood() {
  if (!foodTodaySelected.value) {
    toggleFoodDay(weekdayIndex())
  }
  close()
}

function registerExercise() {
  if (!goalComplete.value) {
    incrementGoal('exercise', 1)
  }
  close()
}

function registerSleep() {
  setSleepSchedule(sleepSchedule.value.bedMinutes, sleepSchedule.value.wakeMinutes)
  close()
}

function formatLiters(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatClock(value) {
  const total = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function formatDuration(value) {
  const total = Math.max(0, Math.round(Number(value) || 0))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
}
</script>

<style scoped>
.quick-goal-overlay {
  position: fixed;
  inset: 0;
  z-index: 25000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(20, 24, 28, 0.38);
  overscroll-behavior: contain;
}

.quick-goal-sheet {
  --quick-accent: #6f7863;
  --quick-soft: #f1f3ef;
  width: 100%;
  max-width: 430px;
  max-height: 78dvh;
  overflow-y: auto;
  padding: 0.55rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  border-radius: 1.25rem 1.25rem 0 0;
  background: #fff;
  overscroll-behavior: contain;
}

.quick-goal-sheet--water {
  --quick-accent: #4a8fc4;
  --quick-soft: #edf5fb;
}

.quick-goal-sheet--food {
  --quick-accent: #9d7268;
  --quick-soft: #f8f1ef;
}

.quick-goal-sheet--exercise {
  --quick-accent: #5f8f58;
  --quick-soft: #eff5ed;
}

.quick-goal-sheet--sleep {
  --quick-accent: #6b74b8;
  --quick-soft: #f0f1f8;
}

.quick-goal-handle {
  display: block;
  width: 2.25rem;
  height: 0.25rem;
  margin: 0 auto 0.85rem;
  border-radius: 999px;
  background: #d2d2d7;
}

.quick-goal-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.quick-goal-head-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--quick-soft);
  color: var(--quick-accent);
  flex-shrink: 0;
}

.quick-goal-head-icon svg,
.quick-goal-close svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.8;
}

.quick-goal-head > div {
  min-width: 0;
}

.quick-goal-head h2 {
  margin: 0;
  color: #202124;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.quick-goal-head p {
  margin: 0.15rem 0 0;
  color: #6e6e73;
  font-size: 0.68rem;
  line-height: 1.35;
}

.quick-goal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f2f2f4;
  color: #5f5f65;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.quick-goal-status {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0 0.85rem;
  padding: 0.8rem 0;
  border-top: 1px solid #ececf0;
  border-bottom: 1px solid #ececf0;
}

.quick-goal-status span {
  color: #6e6e73;
  font-size: 0.7rem;
}

.quick-goal-status strong {
  color: var(--quick-accent);
  font-size: 0.9rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.quick-goal-water-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.quick-goal-water-option {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 5rem;
  padding: 0.7rem;
  border: 1px solid #dce7ef;
  border-radius: 0.9rem;
  background: #fff;
  color: #202124;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

.quick-goal-water-option:disabled {
  cursor: default;
  opacity: 0.48;
}

.quick-goal-vessel {
  display: block;
  width: 2rem;
  height: 3.4rem;
  flex-shrink: 0;
}

.quick-goal-water-option strong,
.quick-goal-water-option small {
  display: block;
}

.quick-goal-water-option strong {
  font-size: 0.82rem;
  font-weight: 500;
}

.quick-goal-water-option small {
  margin-top: 0.22rem;
  color: #6e6e73;
  font-size: 0.65rem;
}

.quick-goal-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.9rem;
  padding: 0.7rem 1rem;
  border: 0;
  border-radius: 0.78rem;
  background: var(--quick-accent);
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
}

.quick-goal-primary:disabled {
  background: #e5e5ea;
  color: #6e6e73;
  cursor: default;
}

.quick-goal-primary svg,
.quick-goal-complete svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.quick-goal-sleep-times {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 0.75rem;
  border: 1px solid #e5e5ea;
  border-radius: 0.9rem;
  overflow: hidden;
}

.quick-goal-sleep-times > div {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  align-items: center;
  column-gap: 0.45rem;
  padding: 0.75rem;
}

.quick-goal-sleep-times > div + div {
  border-left: 1px solid #e5e5ea;
}

.quick-goal-sleep-times svg {
  grid-row: 1 / 3;
  width: 1rem;
  height: 1rem;
  color: var(--quick-accent);
  stroke-width: 1.8;
}

.quick-goal-sleep-times span {
  color: #6e6e73;
  font-size: 0.6rem;
}

.quick-goal-sleep-times strong {
  font-size: 0.82rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.quick-goal-complete {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.85rem;
  color: #4a8fc4;
  font-size: 0.72rem;
}

.quick-goal-close:focus-visible,
.quick-goal-water-option:focus-visible,
.quick-goal-primary:focus-visible {
  outline: 2px solid var(--quick-accent);
  outline-offset: 2px;
}

.quick-goal-water-option:not(:disabled):active,
.quick-goal-primary:not(:disabled):active {
  opacity: 0.78;
}

@media (hover: hover) {
  .quick-goal-close:hover {
    background: #e8e8eb;
  }

  .quick-goal-water-option:not(:disabled):hover {
    background: var(--quick-soft);
  }

  .quick-goal-primary:not(:disabled):hover {
    filter: brightness(0.92);
  }
}

.quick-goal-sheet-enter-active,
.quick-goal-sheet-leave-active {
  transition: background-color 0.2s ease;
}

.quick-goal-sheet-enter-active .quick-goal-sheet,
.quick-goal-sheet-leave-active .quick-goal-sheet {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.quick-goal-sheet-enter-from,
.quick-goal-sheet-leave-to {
  background: rgba(20, 24, 28, 0);
}

.quick-goal-sheet-enter-from .quick-goal-sheet,
.quick-goal-sheet-leave-to .quick-goal-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .quick-goal-sheet-enter-active,
  .quick-goal-sheet-leave-active,
  .quick-goal-sheet-enter-active .quick-goal-sheet,
  .quick-goal-sheet-leave-active .quick-goal-sheet {
    transition-duration: 0.01ms;
  }
}
</style>
