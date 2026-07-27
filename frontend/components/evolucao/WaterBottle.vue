<template>
  <div class="water-intake" :aria-label="`Água: ${displayCurrent} de ${displayTarget}`">
    <div v-if="!readonly" class="water-intake__picker">
      <p class="water-intake__picker-label">Escolha o recipiente</p>
      <div class="water-intake__options" aria-label="Volume a registrar">
        <button
          v-for="option in vesselOptions"
          :key="option.id"
          type="button"
          class="water-intake__option"
          :class="{ 'water-intake__option--active': selectedVessel === option.id }"
          :aria-pressed="selectedVessel === option.id"
          @click="selectedVessel = option.id"
        >
          <span class="water-intake__option-icon" aria-hidden="true">
            <EvolucaoWaterVesselIcon
              :kind="option.id"
              :fill-percent="72"
              :animated="selectedVessel === option.id"
            />
          </span>
          <span class="water-intake__option-copy">
            <strong>{{ option.label }}</strong>
            <span>{{ formatMilliliters(option.amount) }}</span>
          </span>
          <span class="water-intake__option-check" aria-hidden="true">
            <Check v-if="selectedVessel === option.id" />
          </span>
        </button>
      </div>
    </div>

    <div class="water-intake__summary">
      <div class="water-intake__visual" aria-hidden="true">
        <EvolucaoWaterVesselIcon
          :kind="selectedOption.id"
          :fill-percent="fillPercent"
          animated
        />
      </div>
      <div class="water-intake__summary-copy">
        <span>{{ readonly ? 'Consumo registrado' : 'Próximo registro' }}</span>
        <strong>{{ readonly ? displayCurrent : formatMilliliters(selectedOption.amount) }}</strong>
        <p>{{ displayCurrent }} de {{ displayTarget }}</p>
      </div>
    </div>

    <div v-if="!readonly" class="water-intake__actions">
      <button
        type="button"
        class="water-intake__undo"
        :aria-label="`Remover ${formatMilliliters(selectedOption.amount)}`"
        :disabled="current <= 0"
        @click="emit('decrement', selectedOption.amount)"
      >
        <Minus aria-hidden="true" />
        Remover
      </button>
      <button
        type="button"
        class="water-intake__add"
        :aria-label="`Adicionar ${formatMilliliters(selectedOption.amount)}`"
        @click="emit('increment', selectedOption.amount)"
      >
        <Plus aria-hidden="true" />
        Adicionar {{ formatMilliliters(selectedOption.amount) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { Check, Minus, Plus } from 'lucide-vue-next'
import { useConfetti } from '~/composables/useConfetti'

const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 2 },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['increment', 'decrement'])
const { burstRain } = useConfetti()
const { waterVesselSettings, hydrateWaterVessels } = useWaterVesselSettings()

const literFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const milliliterFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const vesselOptions = computed(() => [
  { id: 'glass', label: 'Copo', amount: waterVesselSettings.value.glassMl / 1000 },
  { id: 'bottle', label: 'Garrafa', amount: waterVesselSettings.value.bottleMl / 1000 },
])

const selectedVessel = ref('glass')
const selectedOption = computed(() =>
  vesselOptions.value.find((option) => option.id === selectedVessel.value) || vesselOptions.value[0],
)

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, (props.current / props.target) * 100)
})

watch(
  () => props.current,
  (current, previous) => {
    if (!props.target || current < props.target) return
    if ((previous ?? 0) < props.target) burstRain()
  },
)

onMounted(hydrateWaterVessels)

function formatLiters(value) {
  const rounded = Math.round(value * 100) / 100
  return `${literFormatter.format(rounded)} L`
}

function formatMilliliters(value) {
  return `${milliliterFormatter.format(Math.round(value * 1000))} ml`
}

const displayCurrent = computed(() => formatLiters(props.current))
const displayTarget = computed(() => formatLiters(props.target))
</script>

<style scoped>
.water-intake {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.water-intake__picker-label {
  margin: 0 0 0.45rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: #737378;
}

.water-intake__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.water-intake__option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 3.25rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid #e2e2e7;
  border-radius: 0.75rem;
  background: #fff;
  color: var(--cf-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.water-intake__option--active {
  border-color: #7bb7dc;
  background: #f1f8fc;
}

.water-intake__option-icon {
  width: 1.5rem;
  height: 2.1rem;
  flex-shrink: 0;
}

.water-intake__option-copy {
  min-width: 0;
}

.water-intake__option-copy strong,
.water-intake__option-copy span {
  display: block;
}

.water-intake__option-copy strong {
  font-size: 0.76rem;
  font-weight: 500;
}

.water-intake__option-copy span {
  margin-top: 0.1rem;
  font-size: 0.62rem;
  color: #7f7f85;
  font-variant-numeric: tabular-nums;
}

.water-intake__option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  border: 1px solid #d9d9de;
  border-radius: 50%;
  color: #fff;
  flex-shrink: 0;
}

.water-intake__option--active .water-intake__option-check {
  border-color: #5ba4d9;
  background: #5ba4d9;
}

.water-intake__option-check svg {
  width: 0.65rem;
  height: 0.65rem;
  stroke-width: 2.5;
}

.water-intake__summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 7.5rem;
  padding: 0.65rem 1rem;
  border-radius: 0.8rem;
  background: #f8fafb;
}

.water-intake__visual {
  width: 3.5rem;
  height: 5.4rem;
  flex-shrink: 0;
}

.water-intake__summary-copy {
  min-width: 7.5rem;
}

.water-intake__summary-copy > span {
  display: block;
  font-size: 0.64rem;
  color: #7f7f85;
}

.water-intake__summary-copy strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.water-intake__summary-copy p {
  margin: 0.28rem 0 0;
  font-size: 0.68rem;
  color: #737378;
  font-variant-numeric: tabular-nums;
}

.water-intake__actions {
  display: grid;
  grid-template-columns: minmax(5.5rem, 0.72fr) minmax(0, 1.5fr);
  gap: 0.5rem;
}

.water-intake__undo,
.water-intake__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.72rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.water-intake__undo {
  border: 1px solid #dedee3;
  background: #fff;
  color: #5f5f65;
}

.water-intake__add {
  border: 1px solid #5ba4d9;
  background: #5ba4d9;
  color: #fff;
}

.water-intake__undo:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.water-intake__undo svg,
.water-intake__add svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.water-intake__option:focus-visible,
.water-intake__undo:focus-visible,
.water-intake__add:focus-visible {
  outline: 2px solid #2f759f;
  outline-offset: 2px;
}

.water-intake__option:active,
.water-intake__undo:active:not(:disabled),
.water-intake__add:active {
  transform: scale(0.98);
}

@media (hover: hover) {
  .water-intake__option:hover {
    border-color: #a9cee5;
    background: #f7fbfd;
  }

  .water-intake__option--active:hover {
    border-color: #5ba4d9;
    background: #edf7fc;
  }

  .water-intake__undo:hover:not(:disabled) {
    background: #f5f5f7;
  }

  .water-intake__add:hover {
    background: #4b96c5;
  }
}

@media (max-width: 350px) {
  .water-intake__option {
    gap: 0.4rem;
    padding-inline: 0.45rem;
  }

  .water-intake__summary {
    gap: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .water-intake__option {
    transition: none;
  }
}
</style>
