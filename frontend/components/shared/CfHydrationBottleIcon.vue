<template>
  <svg
    class="cf-hydration-bottle"
    :class="`cf-hydration-bottle--${variant}`"
    :width="size"
    :height="height"
    :viewBox="`0 0 ${VB_W} ${VB_H}`"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <clipPath :id="clipId">
        <path :d="innerPath" />
      </clipPath>
      <linearGradient :id="waterGradId" x1="12" y1="8" x2="12" y2="28" gradientUnits="userSpaceOnUse">
        <stop stop-color="#cceff4" />
        <stop offset="1" stop-color="#99e2ed" />
      </linearGradient>
      <linearGradient :id="glassGradId" x1="8" y1="7" x2="16" y2="27" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff" stop-opacity="0.55" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <filter v-if="variant === 'featured' && !flat" :id="shadowId" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1" stdDeviation="0.8" flood-color="#00b2ca" flood-opacity="0.12" />
      </filter>
    </defs>

    <g :filter="variant === 'featured' && !flat ? `url(#${shadowId})` : undefined">
      <!-- Água (nível dinâmico) -->
      <g :clip-path="`url(#${clipId})`">
        <rect
          :x="5.2"
          :y="waterTop"
          width="13.6"
          :height="26.8 - waterTop"
          :fill="`url(#${waterGradId})`"
        />
        <path
          v-if="fill > 0.08"
          :d="wavePath"
          fill="#fff"
          opacity="0.28"
        />
        <rect x="5.2" y="7.2" width="13.6" height="20" :fill="flat ? 'transparent' : `url(#${glassGradId})`" />
      </g>

      <!-- Logo sobre fundo claro -->
      <g :clip-path="`url(#${clipId})`">
        <ellipse
          cx="12"
          :cy="logoCenterY"
          :rx="logoBackdropRx"
          :ry="logoBackdropRy"
          fill="#fff"
          :opacity="variant === 'featured' ? 0.92 : 0.88"
        />
        <g :transform="logoTransform">
          <path :d="LOGO_PATH" fill="#8B967C" />
        </g>
      </g>

      <!-- Contorno -->
      <path
        :d="outlinePath"
        stroke="currentColor"
        :stroke-width="variant === 'featured' ? 1.25 : 1.1"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Tampa -->
      <path
        d="M8.4 1.35h7.2a1.1 1.1 0 0 1 1.1 1.1v1.05h-9.4V2.45a1.1 1.1 0 0 1 1.1-1.1Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path d="M8.75 1.55h6.5" stroke="currentColor" stroke-width="0.55" stroke-linecap="round" opacity="0.35" />

      <!-- Brilho lateral -->
      <path
        d="M7.35 9.5c0 0 .35 5.2.3 10.4"
        stroke="#fff"
        stroke-width="0.75"
        stroke-linecap="round"
        opacity="0.5"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  size: { type: [Number, String], default: 18 },
  /** 0–1 — altura visual da água */
  fill: { type: Number, default: 0.62 },
  variant: {
    type: String,
    default: 'inline',
    validator: (value) => ['inline', 'featured'].includes(value),
  },
  /** Visual plano — sem brilho/sombra extra */
  flat: { type: Boolean, default: false },
})

const VB_W = 24
const VB_H = 32

const clipId = `cf-hydration-bottle-${useId()}`
const waterGradId = `cf-hydration-water-${useId()}`
const glassGradId = `cf-hydration-glass-${useId()}`
const shadowId = `cf-hydration-shadow-${useId()}`

const outlinePath = [
  'M 8.35 1.2 H 15.65',
  'C 16.65 1.2 17.45 2 17.45 3 V 4.15',
  'H 18.15 C 18.95 4.15 19.6 4.8 19.6 5.6 V 6.35',
  'C 19.6 6.85 19.3 7.25 18.85 7.45',
  'V 23.85',
  'C 18.85 27.15 16.15 29.35 12 29.35',
  'C 7.85 29.35 5.15 27.15 5.15 23.85',
  'V 7.45',
  'C 4.7 7.25 4.4 6.85 4.4 6.35',
  'V 5.6',
  'C 4.4 4.8 5.05 4.15 5.85 4.15',
  'H 6.55 V 3',
  'C 6.55 2 7.35 1.2 8.35 1.2 Z',
].join(' ')

const innerPath = [
  'M 6.85 7.55 H 17.15',
  'C 17.85 7.55 18.35 8.05 18.35 8.75',
  'V 23.65',
  'C 18.35 26.55 15.55 28.55 12 28.55',
  'C 8.45 28.55 5.65 26.55 5.65 23.65',
  'V 8.75',
  'C 5.65 8.05 6.15 7.55 6.85 7.55 Z',
].join(' ')

const LOGO_PATH = 'M155.824 17.1086C156.582 17.0763 157.34 17.0538 158.099 17.0412C184.16 16.5015 209.347 26.4534 228.011 44.665C250.637 66.5895 261.738 97.8363 262.372 128.978C262.993 159.472 257.438 185.54 235.35 208.005C229.673 213.77 223.406 218.925 216.652 223.379C210.643 227.277 204.287 230.736 198.169 234.441C181.399 244.589 166.11 256.248 155.026 272.615C143.275 289.967 138.912 307.971 139.488 328.752C139.96 345.802 146.302 368.858 158.852 380.921C154.083 363.161 154.615 336.578 159.175 318.924C166.43 290.893 184.621 266.948 209.671 252.457C223.898 244.157 238.942 237.508 250.301 225.056C257.932 216.69 263.747 206.856 266.697 195.878C266.994 194.774 267.798 190.648 268.576 190.058L268.782 190.257C268.821 192.265 269.167 194.545 269.315 196.601C269.576 200.793 269.809 204.987 270.013 209.182C270.319 215.768 270.139 223.758 270.096 230.404C269.513 238.834 269.786 247.679 268.833 256.2C267.958 264.042 266.944 271.675 265.684 279.442C260.509 311.355 250.655 344.018 226.869 367.178C208.203 385.35 187.335 392.568 161.54 392.256C132.084 391.901 107.095 381.993 86.4579 360.59C67.2473 340.667 58.1768 315.376 55.0841 288.239C54.3622 281.906 54.3604 275.053 54.2375 268.696C54.0646 257.407 54.0142 246.119 54.0861 234.83L54.1379 193.055C54.1322 185.667 53.952 178.193 54.0677 170.824C45.4126 173.723 37.2318 177.883 29.7892 183.17C27.0848 185.072 24.3101 187.741 21.532 189.404C15.6194 186.647 20.9248 183.024 23.7274 180.236C32.5276 171.481 42.5649 166.435 54.1169 162.535C53.918 154.604 54.0974 146.145 54.1254 138.195C54.197 128.244 54.3936 118.29 55.7488 108.417C63.0401 55.2961 101.993 19.3133 155.824 17.1086ZM88.247 153.574C101.801 151.346 115.575 150.761 129.269 151.831C131.189 151.964 134.472 152.142 136.116 152.873C137.42 153.828 136.648 157.507 135.921 158.593C135.508 159.21 133.876 159.259 133.204 159.218C125.68 158.754 118.195 158.273 110.648 158.712C105.82 159.002 101.004 159.463 96.2097 160.095C94.0279 160.388 90.086 161.121 88.0724 161.231L87.8282 240.096C87.7327 251.14 87.7274 262.186 87.8127 273.229C87.9631 290.133 88.4401 306.557 92.6653 323.08C98.2014 344.732 112.185 368.252 132.309 379.295C140.16 383.449 148.561 386.752 157.556 387.069C153.922 382.647 150.603 379.308 147.401 374.432C131.753 350.924 127.878 324.174 130.612 296.508C133.848 263.298 149.702 235.365 171.019 210.323C184.736 194.208 200.96 178.197 211.238 159.4C229.515 125.977 229.013 75.7768 204.945 45.2279C195.4 33.1141 178.982 24.4757 163.25 25.2176C159.103 25.328 155.691 25.4228 151.554 26.0619C137.689 28.2843 124.955 35.0576 115.358 45.3163C96.9506 64.6922 90.8746 92.4328 89.2253 118.307C88.4705 130.148 88.6142 141.764 88.247 153.574ZM166.55 384.983C167.475 385.81 168.411 386.463 169.685 386.594C174.564 387.097 180.094 385.758 184.734 384.268C220.3 372.862 242.748 335.704 248.551 300.393C248.733 299.284 250.175 290.69 249.995 289.927C241.961 299.661 230.171 307.915 218.766 313.236C202.519 320.817 186.481 325.824 175.519 341.111C167.41 352.42 163.468 364.88 164.395 378.906C164.538 381.056 165.229 383.261 166.55 384.983Z'

const height = computed(() => {
  const width = Number(props.size) || 18
  return Math.round((width * VB_H) / VB_W * 10) / 10
})

const normalizedFill = computed(() => Math.min(1, Math.max(0.12, props.fill)))

const waterTop = computed(() => {
  const innerTop = 7.2
  const innerBottom = 28.4
  return innerBottom - (innerBottom - innerTop) * normalizedFill.value
})

const wavePath = computed(() => {
  const y = waterTop.value + 0.35
  return `M5.2 ${y} C7.4 ${y - 0.45} 9.2 ${y + 0.45} 12 ${y} C14.8 ${y - 0.45} 16.6 ${y + 0.45} 18.8 ${y} V28.8 H5.2 Z`
})

const logoCenterY = computed(() => (props.variant === 'featured' ? 16.2 : 16.5))
const logoBackdropRx = computed(() => (props.variant === 'featured' ? 4.1 : 3.35))
const logoBackdropRy = computed(() => (props.variant === 'featured' ? 5.2 : 4.25))

const logoTransform = computed(() => {
  const targetH = props.variant === 'featured' ? 11.5 : 9.2
  const scale = targetH / 415
  const logoW = 295 * scale
  const x = (VB_W - logoW) / 2
  const y = logoCenterY.value - targetH / 2 + 0.5
  return `translate(${x} ${y}) scale(${scale})`
})
</script>

<style scoped>
.cf-hydration-bottle {
  display: block;
  flex-shrink: 0;
  color: var(--mph-water, #00b2ca);
}

.cf-hydration-bottle--featured {
  color: #0099ad;
}
</style>
