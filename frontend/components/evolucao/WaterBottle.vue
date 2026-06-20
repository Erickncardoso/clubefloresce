<template>
  <div class="water-bottle" :aria-label="`Água: ${displayCurrent} de ${displayTarget}`">
    <div class="water-bottle__viz" aria-hidden="true">
      <svg class="water-bottle__svg" viewBox="0 0 88 176" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath :id="clipId">
            <path :d="bottleInnerPath" />
          </clipPath>
          <linearGradient :id="gradWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a8e4fa" />
            <stop offset="35%" stop-color="#6dbde8" />
            <stop offset="100%" stop-color="#3d8fc4" />
          </linearGradient>
          <linearGradient :id="gradShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fff" stop-opacity="0.55" />
            <stop offset="45%" stop-color="#fff" stop-opacity="0" />
            <stop offset="100%" stop-color="#fff" stop-opacity="0.12" />
          </linearGradient>
          <filter :id="filterShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#5ba4d9" flood-opacity="0.18" />
          </filter>
        </defs>

        <!-- Tampa -->
        <rect x="35" y="5" width="18" height="6" rx="3" fill="#6eb5e0" />
        <rect x="37" y="11" width="14" height="3" rx="1.5" fill="#8ecae8" />
        <ellipse cx="44" cy="11" rx="7" ry="1.5" fill="#5aa8d4" opacity="0.35" />

        <!-- Corpo da garrafa (vidro) -->
        <path
          :d="bottleOuterPath"
          fill="#f4fbff"
          stroke="#a8d4ef"
          stroke-width="2"
          stroke-linejoin="round"
          :filter="`url(#${filterShadow})`"
        />

        <!-- Água (clipada no interior) -->
        <g :clip-path="`url(#${clipId})`">
          <rect
            x="28"
            :y="waterTop"
            width="34"
            :height="waterHeightPx"
            :fill="`url(#${gradWater})`"
          />
          <ellipse
            v-if="fillPercent > 2"
            cx="44"
            :cy="waterTop"
            rx="16"
            ry="3"
            fill="#b8e8fa"
            opacity="0.85"
          >
            <animate attributeName="rx" values="14;17;14" dur="2.8s" repeatCount="indefinite" />
          </ellipse>
          <ellipse
            v-if="fillPercent > 2"
            cx="44"
            :cy="waterTop + 1.5"
            rx="18"
            ry="2"
            fill="#fff"
            opacity="0.35"
          />
        </g>

        <!-- Brilho no vidro -->
        <path
          :d="bottleInnerPath"
          :fill="`url(#${gradShine})`"
          opacity="0.7"
          pointer-events="none"
        />

        <!-- Marcas de nível -->
        <g class="water-bottle__marks" opacity="0.35">
          <line
            v-for="mark in levelMarks"
            :key="mark"
            x1="28"
            :y1="mark"
            x2="60"
            :y2="mark"
            stroke="#5ba4d9"
            stroke-width="1"
            stroke-dasharray="3 4"
          />
        </g>

        <!-- Contorno interno -->
        <path
          :d="bottleInnerPath"
          fill="none"
          stroke="#c5e4f5"
          stroke-width="1"
          opacity="0.6"
        />

        <!-- Reflexo lateral -->
        <path
          d="M 31 48 C 30 72, 30 102, 31 126"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
          stroke-linecap="round"
          opacity="0.45"
        />

        <!-- Litros no centro -->
        <text
          x="44"
          y="98"
          text-anchor="middle"
          dominant-baseline="middle"
          class="water-bottle__label"
          :class="{ 'water-bottle__label--filled': fillPercent > 45 }"
        >
          {{ displayCurrent }}
        </text>
      </svg>
    </div>

    <p class="water-bottle__count">
      <strong>{{ displayCurrent }}</strong>
      <span>/ {{ displayTarget }}</span>
    </p>

    <div class="water-bottle__actions">
      <button type="button" class="water-bottle__btn" aria-label="Remover 250 ml" @click="emit('decrement')">−</button>
      <button type="button" class="water-bottle__btn water-bottle__btn--primary" aria-label="Adicionar 250 ml" @click="emit('increment')">+</button>
    </div>
    <p class="water-bottle__hint">+250 ml por toque</p>
  </div>
</template>

<script setup>
import { useConfetti } from '~/composables/useConfetti'

const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 2 },
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

const uid = String(useId()).replace(/[^a-zA-Z0-9]/g, '') || 'wb'
const clipId = `wb-clip-${uid}`
const gradWater = `wb-water-${uid}`
const gradShine = `wb-shine-${uid}`
const filterShadow = `wb-shadow-${uid}`

const FILL_TOP = 34
const FILL_BOTTOM = 142
const FILL_RANGE = FILL_BOTTOM - FILL_TOP

const bottleOuterPath = `
  M 38 14
  L 38 32
  C 31 36, 26 44, 26 54
  L 26 138
  L 26 144
  Q 26 146 28 146
  L 60 146
  Q 62 146 62 144
  L 62 138
  L 62 54
  C 62 44, 57 36, 50 32
  L 50 14
  Z
`

const bottleInnerPath = `
  M 39 32
  L 39 34
  C 32 38, 28 46, 28 56
  L 28 134
  L 28 140
  Q 28 142 30 142
  L 58 142
  Q 60 142 60 140
  L 60 134
  L 60 56
  C 60 46, 56 38, 51 34
  L 51 32
  Z
`

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, (props.current / props.target) * 100)
})

const waterHeightPx = computed(() => Math.max(0, (fillPercent.value / 100) * FILL_RANGE))

const waterTop = computed(() => FILL_BOTTOM - waterHeightPx.value)

const levelMarks = computed(() => {
  const marks = []
  for (let i = 1; i <= 3; i += 1) {
    marks.push(FILL_BOTTOM - (FILL_RANGE * i) / 4)
  }
  return marks
})

function formatLiters(value) {
  const rounded = Math.round(value * 4) / 4
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',')
  return `${text} L`
}

const displayCurrent = computed(() => formatLiters(props.current))
const displayTarget = computed(() => formatLiters(props.target))
</script>

<style scoped>
.water-bottle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.water-bottle__viz {
  width: 5.5rem;
  height: 10.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.water-bottle__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.water-bottle__label {
  font-size: 11px;
  font-weight: 800;
  fill: #2f6f9e;
  font-family: inherit;
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.75);
  stroke-width: 2.5px;
}

.water-bottle__label--filled {
  fill: #fff;
  stroke: rgba(47, 111, 158, 0.35);
}

.water-bottle__count {
  margin: 0.1rem 0 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.water-bottle__count strong {
  font-size: 1.2rem;
  color: #5ba4d9;
}

.water-bottle__hint {
  margin: 0;
  font-size: 0.62rem;
  color: var(--cf-text-muted);
}

.water-bottle__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.water-bottle__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--cf-text);
  cursor: pointer;
}

.water-bottle__btn--primary {
  background: #5ba4d9;
  border-color: #5ba4d9;
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .water-bottle__svg animate {
    display: none;
  }
}
</style>
