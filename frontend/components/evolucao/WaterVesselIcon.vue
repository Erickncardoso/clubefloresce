<template>
  <svg
    class="water-vessel"
    :class="{ 'water-vessel--animated': animated && safeFill > 0 }"
    viewBox="0 0 64 88"
    role="img"
    :aria-label="kind === 'glass' ? 'Copo de água' : 'Garrafa de água'"
  >
    <defs>
      <clipPath :id="clipId">
        <path :d="vesselPath" />
      </clipPath>
      <clipPath :id="waterClipId">
        <rect x="8" :y="waterTop" width="48" :height="88 - waterTop" />
      </clipPath>
    </defs>

    <g :clip-path="`url(#${clipId})`">
      <g v-if="safeFill > 0" class="water-vessel__wave water-vessel__wave--back">
        <path class="water-vessel__fill water-vessel__fill--back" :d="waveBackFillPath" />
      </g>
      <g v-if="safeFill > 0" class="water-vessel__wave water-vessel__wave--front">
        <path class="water-vessel__fill" :d="waveFillPath" />
      </g>
      <path
        v-if="safeFill > 0"
        class="water-vessel__wave-highlight"
        :d="waveLinePath"
      />

      <g
        v-if="safeFill > 8"
        class="water-vessel__bubbles"
        :clip-path="`url(#${waterClipId})`"
      >
        <circle class="water-vessel__bubble water-vessel__bubble--one" cx="25" cy="70" r="1.5" />
        <circle class="water-vessel__bubble water-vessel__bubble--two" cx="38" cy="75" r="1.1" />
        <circle class="water-vessel__bubble water-vessel__bubble--three" cx="33" cy="63" r="0.9" />
      </g>
    </g>

    <path class="water-vessel__body" :d="vesselPath" />

    <template v-if="kind === 'bottle'">
      <rect class="water-vessel__cap" x="25" y="3" width="14" height="7" rx="2.2" />
      <path class="water-vessel__cap-line" d="M28 5.3h8M28 7.7h8" />
      <path class="water-vessel__detail" d="M26 15h12M21 76Q32 79 43 76" />
      <path class="water-vessel__shine" d="M21 38C19.5 48 19.8 62 21 70" />
    </template>

    <path
      v-else
      class="water-vessel__detail"
      d="M18 24h28"
    />
  </svg>
</template>

<script setup>
const props = defineProps({
  kind: {
    type: String,
    default: 'glass',
    validator: (value) => ['glass', 'bottle'].includes(value),
  },
  fillPercent: {
    type: Number,
    default: 70,
  },
  animated: {
    type: Boolean,
    default: false,
  },
})

const uid = String(useId()).replace(/[^a-zA-Z0-9]/g, '') || 'vessel'
const clipId = `water-vessel-${uid}`
const waterClipId = `water-level-${uid}`

const safeFill = computed(() => Math.max(0, Math.min(100, Number(props.fillPercent) || 0)))

const vesselPath = computed(() => (
  props.kind === 'bottle'
    ? 'M26 10H38V20C38 24 40 26 43 28C47 31 49 35 49 40V74C49 79 46 82 42 83H22C18 82 15 79 15 74V40C15 35 17 31 21 28C24 26 26 24 26 20Z'
    : 'M14 16H50L45 78C45 81 43 82 40 82H24C21 82 19 81 19 78Z'
))

const waterTop = computed(() => {
  const top = props.kind === 'bottle' ? 22 : 17
  const bottom = 81
  return bottom - ((bottom - top) * safeFill.value) / 100
})

const waveLinePath = computed(() => {
  const y = waterTop.value
  return `M-32 ${y} Q-24 ${y - 1.15} -16 ${y} T0 ${y} T16 ${y} T32 ${y} T48 ${y} T64 ${y} T80 ${y} T96 ${y}`
})

const waveFillPath = computed(() => `${waveLinePath.value} V88 H-32 Z`)

const waveBackFillPath = computed(() => {
  const y = waterTop.value - 0.55
  return `M-40 ${y} Q-32 ${y + 0.9} -24 ${y} T-8 ${y} T8 ${y} T24 ${y} T40 ${y} T56 ${y} T72 ${y} T88 ${y} T104 ${y} V88 H-40 Z`
})
</script>

<style scoped>
.water-vessel {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.water-vessel__body {
  fill: rgba(91, 164, 217, 0.04);
  stroke: #8fc5e7;
  stroke-width: 2;
  stroke-linejoin: round;
}

.water-vessel__fill {
  fill: #63b2df;
}

.water-vessel__fill--back {
  fill: #8bcbea;
}

.water-vessel__wave-highlight {
  fill: none;
  stroke: rgba(220, 245, 255, 0.78);
  stroke-width: 1.4;
  stroke-linecap: round;
}

.water-vessel__cap {
  fill: #65aeda;
}

.water-vessel__cap-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.58);
  stroke-width: 0.8;
  stroke-linecap: round;
}

.water-vessel__detail {
  fill: none;
  stroke: #c4e1f1;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.water-vessel__shine {
  fill: none;
  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 1.6;
  stroke-linecap: round;
}

.water-vessel__bubble {
  fill: rgba(235, 249, 255, 0.82);
  opacity: 0.7;
}

.water-vessel--animated .water-vessel__wave {
  transform-box: view-box;
  transform-origin: center;
}

.water-vessel--animated .water-vessel__wave--front {
  animation: water-wave-front 7.5s linear infinite;
}

.water-vessel--animated .water-vessel__wave--back {
  animation: water-wave-back 10.5s linear infinite;
}

.water-vessel--animated .water-vessel__wave-highlight {
  transform-box: view-box;
  transform-origin: center;
  animation: water-wave-highlight 7s ease-in-out infinite;
}

.water-vessel--animated .water-vessel__bubble {
  transform-box: fill-box;
  transform-origin: center;
  animation: water-bubble-rise 4.8s ease-in-out infinite;
}

.water-vessel--animated .water-vessel__bubble--two {
  animation-delay: -1.1s;
  animation-duration: 5.8s;
}

.water-vessel--animated .water-vessel__bubble--three {
  animation-delay: -2s;
  animation-duration: 4.4s;
}

@keyframes water-wave-front {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-16px);
  }
}

@keyframes water-wave-back {
  from {
    transform: translateX(-8px);
  }

  to {
    transform: translateX(8px);
  }
}

@keyframes water-wave-highlight {
  0%,
  100% {
    transform: translateX(-2px);
    opacity: 0.48;
  }

  50% {
    transform: translateX(2px);
    opacity: 0.72;
  }
}

@keyframes water-bubble-rise {
  0% {
    transform: translateY(5px) scale(0.72);
    opacity: 0;
  }

  28% {
    opacity: 0.72;
  }

  100% {
    transform: translateY(-16px) scale(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .water-vessel--animated .water-vessel__wave,
  .water-vessel--animated .water-vessel__wave-highlight,
  .water-vessel--animated .water-vessel__bubble {
    animation: none;
  }
}
</style>
