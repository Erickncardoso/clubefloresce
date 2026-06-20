<template>
  <div
    class="sleep-clock"
    :aria-label="`Sono: ${durationLabel} hoje. Dormir ${bedLabel}, acordar ${wakeLabel}`"
  >
    <div class="sleep-clock__panel cf-squircle">
      <div class="sleep-clock__dial-wrap">
        <svg
          ref="svgEl"
          viewBox="0 0 200 200"
          class="sleep-clock__svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sleepArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#a8b59d" />
              <stop offset="100%" stop-color="#8B967C" />
            </linearGradient>
            <filter id="sleepHandleShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#6f7863" flood-opacity="0.14" />
            </filter>
          </defs>

          <circle cx="100" cy="100" :r="RING_R" class="sleep-clock__ring-bg" />

          <circle
            cx="100"
            cy="100"
            :r="RING_R"
            class="sleep-clock__ring-active"
            stroke="url(#sleepArcGrad)"
            :stroke-dasharray="`${sleepArcLength} ${RING_CIRCUMFERENCE}`"
            stroke-dashoffset="0"
            :transform="`rotate(${sleepArcRotation} 100 100)`"
          />

          <g class="sleep-clock__ticks">
            <line
              v-for="tick in hourTickLines"
              :key="`tick-${tick.n}`"
              :x1="tick.x1"
              :y1="tick.y1"
              :x2="tick.x2"
              :y2="tick.y2"
              class="sleep-clock__tick-line"
            />
          </g>

          <g class="sleep-clock__numbers">
            <text
              v-for="hour in clockHours"
              :key="hour.n"
              :x="hour.x"
              :y="hour.y"
              class="sleep-clock__number"
            >{{ hour.n }}</text>
          </g>

          <circle cx="100" cy="100" r="48" class="sleep-clock__face" />
          <circle cx="100" cy="100" r="48" class="sleep-clock__face-ring" />

          <text x="100" y="93" text-anchor="middle" class="sleep-clock__duration">
            <tspan class="sleep-clock__duration-h">{{ durationParts.h }}</tspan>
            <tspan class="sleep-clock__duration-sep">:</tspan>
            <tspan class="sleep-clock__duration-m">{{ durationParts.m }}</tspan>
          </text>
          <text x="100" y="110" text-anchor="middle" class="sleep-clock__duration-caption">de sono</text>

          <g
            class="sleep-clock__handle"
            :class="{ 'sleep-clock__handle--active': dragKind === 'bed' }"
            :transform="`translate(${moonPos.x}, ${moonPos.y})`"
            @pointerdown="(e) => startDrag('bed', e)"
          >
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--moon" filter="url(#sleepHandleShadow)" />
            <circle :r="HANDLE_R - 2" class="sleep-clock__handle-inner sleep-clock__handle-inner--moon" />
            <g class="sleep-clock__handle-glyph sleep-clock__handle-glyph--moon" transform="scale(0.52) translate(-12,-12)">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </g>
          </g>

          <g
            class="sleep-clock__handle"
            :class="{ 'sleep-clock__handle--active': dragKind === 'wake' }"
            :transform="`translate(${sunPos.x}, ${sunPos.y})`"
            @pointerdown="(e) => startDrag('wake', e)"
          >
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--sun" filter="url(#sleepHandleShadow)" />
            <circle :r="HANDLE_R - 2" class="sleep-clock__handle-inner sleep-clock__handle-inner--sun" />
            <g class="sleep-clock__handle-glyph sleep-clock__handle-glyph--sun">
              <circle r="3.2" />
              <path d="M0 -6.2v1.6M0 4.6v1.6M-5.4 -3.1l1.1 1.1M4.3 3.8l1.1 1.1M-6.2 0h1.6M4.6 0h1.6M-5.4 3.1l1.1-1.1M4.3 -3.8l1.1-1.1" />
            </g>
          </g>
        </svg>
      </div>

      <div class="sleep-clock__cards">
        <div class="sleep-clock__card sleep-clock__card--night">
          <div class="sleep-clock__card-top">
            <span class="sleep-clock__card-icon" aria-hidden="true">
              <Moon class="sleep-clock__card-icon-svg" />
            </span>
            <div class="sleep-clock__card-copy">
              <span class="sleep-clock__card-label">Dormir</span>
              <strong class="sleep-clock__card-time">{{ bedLabel }}</strong>
            </div>
          </div>
          <div class="sleep-clock__card-actions">
            <button type="button" class="sleep-clock__step-btn" aria-label="Adiantar horário de dormir" @click="emitShift('bed', -15)">
              <Minus class="sleep-clock__step-icon" />
            </button>
            <span class="sleep-clock__step-label">15 min</span>
            <button type="button" class="sleep-clock__step-btn sleep-clock__step-btn--primary" aria-label="Atrasar horário de dormir" @click="emitShift('bed', 15)">
              <Plus class="sleep-clock__step-icon" />
            </button>
          </div>
        </div>

        <div class="sleep-clock__card sleep-clock__card--day">
          <div class="sleep-clock__card-top">
            <span class="sleep-clock__card-icon sleep-clock__card-icon--day" aria-hidden="true">
              <Sun class="sleep-clock__card-icon-svg" />
            </span>
            <div class="sleep-clock__card-copy">
              <span class="sleep-clock__card-label">Acordar</span>
              <strong class="sleep-clock__card-time">{{ wakeLabel }}</strong>
            </div>
          </div>
          <div class="sleep-clock__card-actions">
            <button type="button" class="sleep-clock__step-btn" aria-label="Acordar mais cedo" @click="emitShift('wake', -15)">
              <Minus class="sleep-clock__step-icon" />
            </button>
            <span class="sleep-clock__step-label">15 min</span>
            <button type="button" class="sleep-clock__step-btn sleep-clock__step-btn--primary sleep-clock__step-btn--sun" aria-label="Acordar mais tarde" @click="emitShift('wake', 15)">
              <Plus class="sleep-clock__step-icon" />
            </button>
          </div>
        </div>
      </div>

      <div class="sleep-clock__meta" :class="{ 'sleep-clock__meta--ok': metGoal }">
        <span>Meta {{ target }}h</span>
        <span class="sleep-clock__meta-dot" aria-hidden="true">·</span>
        <span>Hoje <strong>{{ durationHoursLabel }}h</strong></span>
        <span v-if="metGoal" class="sleep-clock__meta-badge">
          <Check class="sleep-clock__meta-check" aria-hidden="true" />
          Meta atingida
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Check, Minus, Moon, Plus, Sun } from 'lucide-vue-next'

const props = defineProps({
  target: { type: Number, default: 8 },
  schedule: {
    type: Object,
    default: () => ({
      bedMinutes: 23 * 60,
      wakeMinutes: 7 * 60 + 20,
      durationHours: 8,
      durationMinutes: 500,
    }),
  },
})

const emit = defineEmits(['shift-bed', 'shift-wake', 'set-schedule'])

const CX = 100
const CY = 100
const RING_R = 76
const HANDLE_R = 13
const TICK_OUTER = 70
const TICK_INNER = 64
const NUMBER_R = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

const svgEl = ref(null)
const dragKind = ref(null)
const draftBed = ref(23 * 60)
const draftWake = ref(7 * 60 + 20)

watch(
  () => props.schedule,
  (schedule) => {
    if (dragKind.value) return
    draftBed.value = schedule?.bedMinutes ?? 23 * 60
    draftWake.value = schedule?.wakeMinutes ?? 7 * 60 + 20
  },
  { immediate: true, deep: true },
)

const bedMinutes = computed(() => draftBed.value)
const wakeMinutes = computed(() => draftWake.value)

const durationMinutes = computed(() => {
  let diff = wakeMinutes.value - bedMinutes.value
  if (diff <= 0) diff += 1440
  return diff
})

const durationParts = computed(() => {
  const total = durationMinutes.value
  const h = Math.floor(total / 60)
  const m = total % 60
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
  }
})

const durationLabel = computed(() => `${durationParts.value.h}:${durationParts.value.m}`)
const durationHoursLabel = computed(() => {
  const hours = durationMinutes.value / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
})
const metGoal = computed(() => durationMinutes.value / 60 >= props.target)

const bedLabel = computed(() => formatClock(bedMinutes.value))
const wakeLabel = computed(() => formatClock(wakeMinutes.value))

const moonPos = computed(() => polar(RING_R, dialAngle(bedMinutes.value)))
const sunPos = computed(() => polar(RING_R, dialAngle(wakeMinutes.value)))

const sleepSweepDegrees = computed(() => {
  const start = dialAngle(bedMinutes.value)
  const end = dialAngle(wakeMinutes.value)
  let sweep = end - start
  if (sweep <= 0) sweep += 360
  return sweep
})

const sleepArcLength = computed(() => (sleepSweepDegrees.value / 360) * RING_CIRCUMFERENCE)
const sleepArcRotation = computed(() => dialAngle(bedMinutes.value))

const hourTickLines = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const angle = hourLabelAngle(index + 1)
    const outer = polar(TICK_OUTER, angle)
    const inner = polar(TICK_INNER, angle)
    return { n: index + 1, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y }
  }),
)

const clockHours = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const n = index + 1
    const pos = polar(NUMBER_R, hourLabelAngle(n))
    return { n, x: pos.x, y: pos.y + 3.5 }
  }),
)

function normalizeMinutes(minutes) {
  return ((minutes % 1440) + 1440) % 1440
}

function dialAngle(minutes) {
  const total = normalizeMinutes(minutes)
  const h24 = Math.floor(total / 60)
  const mi = total % 60
  const hourOnDial = (h24 % 12) + mi / 60
  return (hourOnDial / 12) * 360 - 90
}

function hourLabelAngle(hour) {
  return (hour / 12) * 360 - 90
}

function polar(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

function resolveMinutesOnDial(angleDeg, kind, currentMinutes, otherMinutes) {
  let a = angleDeg + 90
  a = ((a % 360) + 360) % 360
  const hourOnDial = (a / 360) * 12
  const h12 = Math.floor(hourOnDial) % 12
  const min = Math.round((hourOnDial - Math.floor(hourOnDial)) * 60 / 15) * 15

  const base = h12 * 60 + min
  const candidates = [base, base + 12 * 60].map((value) => normalizeMinutes(value))

  function score(candidate) {
    const bed = kind === 'bed' ? candidate : otherMinutes
    const wake = kind === 'wake' ? candidate : otherMinutes
    let diff = wake - bed
    if (diff <= 0) diff += 1440
    const hours = diff / 60
    const hour = Math.floor(candidate / 60)

    let penalty = Math.abs(candidate - currentMinutes) / 30
    if (hours < 3 || hours > 14) penalty += 100
    if (kind === 'bed' && hour >= 6 && hour < 18) penalty += 40
    if (kind === 'wake' && (hour < 4 || hour > 12)) penalty += 25
    penalty += Math.abs(hours - 8) * 1.5
    return penalty
  }

  return candidates.reduce((best, value) => (score(value) < score(best) ? value : best))
}

function formatClock(minutes) {
  const total = normalizeMinutes(minutes)
  const h24 = Math.floor(total / 60)
  const m = total % 60
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function emitShift(kind, delta) {
  if (kind === 'bed') emit('shift-bed', delta)
  else emit('shift-wake', delta)
}

function minutesFromPointer(event) {
  const el = svgEl.value
  if (!el || !dragKind.value) return 0
  const ctm = el.getScreenCTM()
  if (!ctm) return 0
  const pt = el.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgPt = pt.matrixTransform(ctm.inverse())
  const x = svgPt.x - CX
  const y = svgPt.y - CY
  const angleDeg = (Math.atan2(y, x) * 180) / Math.PI
  const current = dragKind.value === 'bed' ? bedMinutes.value : wakeMinutes.value
  const other = dragKind.value === 'bed' ? wakeMinutes.value : bedMinutes.value
  return resolveMinutesOnDial(angleDeg, dragKind.value, current, other)
}

function startDrag(kind, event) {
  dragKind.value = kind
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function onPointerMove(event) {
  if (!dragKind.value) return
  const minutes = minutesFromPointer(event)
  if (dragKind.value === 'bed') {
    draftBed.value = minutes
  } else {
    draftWake.value = minutes
  }
}

function commitDrag() {
  if (!dragKind.value) return
  emit('set-schedule', { bedMinutes: draftBed.value, wakeMinutes: draftWake.value })
  dragKind.value = null
}

function stopDrag() {
  commitDrag()
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
})
</script>

<style scoped>
.sleep-clock {
  width: 100%;
}

.sleep-clock__panel {
  padding: 1.1rem 0.95rem 1rem;
  background: linear-gradient(165deg, #f7fbf6 0%, #fff 55%, #fafdf9 100%);
  border: 1px solid #e3ebe1;
  box-shadow: 0 10px 28px rgba(77, 115, 72, 0.08);
}

.sleep-clock__dial-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  padding: 0.35rem 0 0.15rem;
}

.sleep-clock__svg {
  width: min(100%, 16.25rem);
  height: auto;
  touch-action: none;
  overflow: visible;
}

.sleep-clock__ring-bg {
  fill: none;
  stroke: #e8f0e6;
  stroke-width: 12;
}

.sleep-clock__ring-active {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
}

.sleep-clock__tick-line {
  stroke: #d4e4d0;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.sleep-clock__number {
  fill: #a8bda4;
  font-size: 7.5px;
  font-weight: 600;
  font-family: var(--cf-font, system-ui, sans-serif);
  text-anchor: middle;
}

.sleep-clock__face {
  fill: #fff;
}

.sleep-clock__face-ring {
  fill: none;
  stroke: #edf5eb;
  stroke-width: 1.5;
}

.sleep-clock__duration {
  font-family: var(--cf-font, system-ui, sans-serif);
  fill: var(--cf-green-dark, #6f7863);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.sleep-clock__duration-h,
.sleep-clock__duration-m {
  font-size: 19px;
}

.sleep-clock__duration-sep {
  font-size: 16px;
  opacity: 0.45;
}

.sleep-clock__duration-caption {
  font-family: var(--cf-font, system-ui, sans-serif);
  fill: #8aa886;
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.sleep-clock__handle {
  cursor: grab;
  transition: transform 0.15s ease;
}

.sleep-clock__handle--active {
  cursor: grabbing;
}

.sleep-clock__handle-bg {
  fill: #fff;
  stroke-width: 2.5;
}

.sleep-clock__handle-bg--moon {
  stroke: #7c8fd4;
}

.sleep-clock__handle-bg--sun {
  stroke: #e8b44a;
}

.sleep-clock__handle-inner {
  fill: none;
  stroke-width: 1;
  opacity: 0.35;
}

.sleep-clock__handle-inner--moon {
  stroke: #7c8fd4;
}

.sleep-clock__handle-inner--sun {
  stroke: #e8b44a;
}

.sleep-clock__handle-glyph {
  pointer-events: none;
}

.sleep-clock__handle-glyph--moon path {
  fill: #6b7fb8;
}

.sleep-clock__handle-glyph--sun {
  fill: #e8a830;
  stroke: #e8a830;
  stroke-width: 1.2;
  stroke-linecap: round;
}

.sleep-clock__handle-glyph--sun circle {
  fill: #e8a830;
  stroke: none;
}

.sleep-clock__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.sleep-clock__card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.7rem 0.65rem 0.65rem;
  border-radius: 1rem;
  border: 1px solid transparent;
}

.sleep-clock__card--night {
  background: linear-gradient(160deg, #f0f3fa 0%, #fff 100%);
  border-color: #e2e8f4;
}

.sleep-clock__card--day {
  background: linear-gradient(160deg, #fff9ec 0%, #fff 100%);
  border-color: #f5e8c8;
}

.sleep-clock__card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.sleep-clock__card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 0.75rem;
  flex-shrink: 0;
  background: linear-gradient(145deg, #3d4f7a 0%, #5a6fa0 100%);
  color: #f5e6a8;
  box-shadow: 0 4px 10px rgba(61, 79, 122, 0.2);
}

.sleep-clock__card-icon--day {
  background: linear-gradient(145deg, #f5c842 0%, #ffe08a 100%);
  color: #c47a10;
  box-shadow: 0 4px 10px rgba(232, 180, 74, 0.25);
}

.sleep-clock__card-icon-svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 2.2;
}

.sleep-clock__card-copy {
  min-width: 0;
}

.sleep-clock__card-label {
  display: block;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.sleep-clock__card-time {
  display: block;
  margin-top: 0.12rem;
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.sleep-clock__card-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.35rem;
}

.sleep-clock__step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e3ebe1;
  border-radius: 0.65rem;
  background: #fff;
  color: var(--cf-green-dark, #6f7863);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease, transform 0.15s ease;
}

.sleep-clock__step-btn:active {
  transform: scale(0.96);
}

.sleep-clock__step-btn--primary {
  background: var(--cf-green, #8B967C);
  border-color: var(--cf-green, #8B967C);
  color: #fff;
}

.sleep-clock__step-btn--sun {
  background: #e8b44a;
  border-color: #e8b44a;
  color: #fff;
}

.sleep-clock__step-icon {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2.5;
}

.sleep-clock__step-label {
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  white-space: nowrap;
}

.sleep-clock__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.28rem 0.35rem;
  margin-top: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  background: #f3f7f2;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.sleep-clock__meta--ok {
  background: var(--cf-green-soft, #eef0eb);
}

.sleep-clock__meta strong {
  color: var(--cf-green-dark, #6f7863);
  font-weight: 700;
}

.sleep-clock__meta-dot {
  opacity: 0.45;
}

.sleep-clock__meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #fff;
  color: var(--cf-green-dark, #6f7863);
  font-size: 0.62rem;
  font-weight: 700;
}

.sleep-clock__meta-check {
  width: 0.75rem;
  height: 0.75rem;
  stroke-width: 3;
}
</style>
