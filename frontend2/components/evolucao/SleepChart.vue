<template>
  <div
    class="sleep-clock"
    :aria-label="`Sono: ${durationLabel} hoje. Dormir ${bedLabel}, acordar ${wakeLabel}`"
  >
    <template v-if="compact">
      <div class="sleep-clock__compact-summary">
        <div class="sleep-clock__compact-duration">
          <span>Tempo de sono</span>
          <strong>{{ durationLabel }}</strong>
          <small>Meta de {{ target }}h</small>
        </div>

        <div class="sleep-clock__compact-times">
          <div>
            <span class="sleep-clock__compact-icon" aria-hidden="true">
              <Moon />
            </span>
            <span>Dormir</span>
            <strong>{{ bedLabel }}</strong>
          </div>
          <div>
            <span class="sleep-clock__compact-icon sleep-clock__compact-icon--sun" aria-hidden="true">
              <Sun />
            </span>
            <span>Acordar</span>
            <strong>{{ wakeLabel }}</strong>
          </div>
        </div>
      </div>

      <button
        v-if="!readonly"
        type="button"
        class="sleep-clock__open"
        @click="emit('open-editor')"
      >
        <Moon aria-hidden="true" />
        Ajustar sono
      </button>
    </template>

    <template v-else>
    <div class="sleep-clock__panel cf-squircle">
      <div class="sleep-clock__dial-wrap">
        <svg
          ref="svgEl"
          viewBox="0 0 200 200"
          class="sleep-clock__svg"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" :r="RING_R" class="sleep-clock__ring-bg" />

          <circle
            cx="100"
            cy="100"
            :r="RING_R"
            class="sleep-clock__ring-active"
            stroke="#6B74B8"
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
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--moon" />
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
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--sun" />
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
          <div v-if="!readonly" class="sleep-clock__card-actions">
            <button type="button" class="sleep-clock__step-btn" aria-label="Adiantar horário de dormir" @click="emitShift('bed', -15)">
              <Minus class="sleep-clock__step-icon" aria-hidden="true" />
            </button>
            <span class="sleep-clock__step-label">15 min</span>
            <button type="button" class="sleep-clock__step-btn sleep-clock__step-btn--primary" aria-label="Atrasar horário de dormir" @click="emitShift('bed', 15)">
              <Plus class="sleep-clock__step-icon" aria-hidden="true" />
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
          <div v-if="!readonly" class="sleep-clock__card-actions">
            <button type="button" class="sleep-clock__step-btn" aria-label="Acordar mais cedo" @click="emitShift('wake', -15)">
              <Minus class="sleep-clock__step-icon" aria-hidden="true" />
            </button>
            <span class="sleep-clock__step-label">15 min</span>
            <button type="button" class="sleep-clock__step-btn sleep-clock__step-btn--primary sleep-clock__step-btn--sun" aria-label="Acordar mais tarde" @click="emitShift('wake', 15)">
              <Plus class="sleep-clock__step-icon" aria-hidden="true" />
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
    </template>
  </div>
</template>

<script setup>
import { Check, Minus, Moon, Plus, Sun } from 'lucide-vue-next'

const props = defineProps({
  target: { type: Number, default: 8 },
  readonly: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
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

const emit = defineEmits(['shift-bed', 'shift-wake', 'set-schedule', 'open-editor'])

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

.sleep-clock__compact-summary {
  display: grid;
  grid-template-columns: minmax(5.5rem, 0.72fr) minmax(0, 1.35fr);
  align-items: center;
  gap: 1rem;
  min-height: 5rem;
}

.sleep-clock__compact-duration {
  text-align: center;
}

.sleep-clock__compact-duration span,
.sleep-clock__compact-duration strong,
.sleep-clock__compact-duration small {
  display: block;
}

.sleep-clock__compact-duration > span {
  color: #74778a;
  font-size: 0.62rem;
}

.sleep-clock__compact-duration strong {
  margin-top: 0.2rem;
  color: #555c98;
  font-size: 1.55rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.sleep-clock__compact-duration small {
  margin-top: 0.28rem;
  color: #858797;
  font-size: 0.58rem;
}

.sleep-clock__compact-times {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid #ececf1;
  border-bottom: 1px solid #ececf1;
}

.sleep-clock__compact-times > div {
  display: grid;
  grid-template-columns: 1.7rem minmax(0, 1fr);
  align-items: center;
  column-gap: 0.45rem;
  min-width: 0;
  padding: 0.55rem 0.4rem;
}

.sleep-clock__compact-times > div:first-child {
  border-right: 1px solid #ececf1;
}

.sleep-clock__compact-icon {
  display: flex;
  grid-row: 1 / 3;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  background: #eef0fb;
  color: #6b74b8;
}

.sleep-clock__compact-icon--sun {
  background: #fff4dc;
  color: #d49a2a;
}

.sleep-clock__compact-icon svg {
  width: 0.85rem;
  height: 0.85rem;
  stroke-width: 2;
}

.sleep-clock__compact-times span:not(.sleep-clock__compact-icon),
.sleep-clock__compact-times strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sleep-clock__compact-times span:not(.sleep-clock__compact-icon) {
  color: #7d7f8d;
  font-size: 0.56rem;
}

.sleep-clock__compact-times strong {
  color: #353641;
  font-size: 0.8rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.sleep-clock__open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.75rem;
  margin-top: 0.75rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid #6b74b8;
  border-radius: 0.72rem;
  background: #6b74b8;
  color: #fff;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.16s ease, transform 0.16s ease;
}

.sleep-clock__open svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 2;
}

.sleep-clock__open:focus-visible {
  outline: 2px solid #555c98;
  outline-offset: 2px;
}

.sleep-clock__open:active {
  transform: scale(0.98);
}

.sleep-clock__panel {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.sleep-clock__dial-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.9rem;
  padding: 0;
}

.sleep-clock__svg {
  width: min(100%, 13.25rem);
  height: auto;
  touch-action: none;
  overflow: visible;
}

.sleep-clock__ring-bg {
  fill: none;
  stroke: #e8e9f0;
  stroke-width: 11;
}

.sleep-clock__ring-active {
  fill: none;
  stroke-width: 11;
  stroke-linecap: round;
}

.sleep-clock__tick-line {
  stroke: #d8dae7;
  stroke-width: 1.2;
  stroke-linecap: round;
}

.sleep-clock__number {
  fill: #989cab;
  font-size: 7.5px;
  font-weight: 500;
  font-family: var(--cf-font, system-ui, sans-serif);
  text-anchor: middle;
}

.sleep-clock__face {
  fill: #fff;
}

.sleep-clock__face-ring {
  fill: none;
  stroke: #ececf2;
  stroke-width: 1;
}

.sleep-clock__duration {
  font-family: var(--cf-font, system-ui, sans-serif);
  fill: #4f568f;
  font-weight: 500;
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
  fill: #85899b;
  font-size: 7px;
  font-weight: 400;
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
  stroke-width: 2;
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
  gap: 0;
  border-top: 1px solid #ececf0;
  border-bottom: 1px solid #ececf0;
}

.sleep-clock__card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.8rem 0.65rem;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.sleep-clock__card:first-child {
  border-right: 1px solid #ececf0;
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
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  flex-shrink: 0;
  background: #eef0fb;
  color: #6b7fb8;
}

.sleep-clock__card-icon--day {
  background: #fff4dc;
  color: #d49a2a;
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
  font-weight: 400;
  color: var(--cf-text-muted);
}

.sleep-clock__card-time {
  display: block;
  margin-top: 0.12rem;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.sleep-clock__card-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.25rem;
}

.sleep-clock__step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid #e0e0e5;
  border-radius: 0.72rem;
  background: #fff;
  color: var(--cf-green-dark, #6f7863);
  cursor: pointer;
  padding: 0;
  box-shadow: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
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
  font-size: 0.56rem;
  font-weight: 400;
  color: var(--cf-text-muted);
  white-space: nowrap;
}

.sleep-clock__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3rem 0.4rem;
  margin-top: 0.75rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
  font-size: 0.66rem;
  color: #777982;
}

.sleep-clock__meta--ok {
  background: transparent;
}

.sleep-clock__meta strong {
  color: #555c98;
  font-weight: 500;
}

.sleep-clock__meta-dot {
  opacity: 0.45;
}

.sleep-clock__meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  background: #fff;
  color: var(--cf-green-dark, #6f7863);
  font-size: 0.62rem;
  font-weight: 500;
}

.sleep-clock__meta-check {
  width: 0.75rem;
  height: 0.75rem;
  stroke-width: 3;
}

.sleep-clock__step-btn:focus-visible {
  outline: 2px solid #555c98;
  outline-offset: 2px;
}

@media (hover: hover) {
  .sleep-clock__open:hover {
    background: #5b63a4;
  }

  .sleep-clock__step-btn:hover {
    background: #f4f4f6;
  }

  .sleep-clock__step-btn--primary:hover {
    background: #737f68;
  }

  .sleep-clock__step-btn--sun:hover {
    background: #d9a438;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sleep-clock__handle,
  .sleep-clock__step-btn,
  .sleep-clock__open {
    transition: none;
  }
}
</style>
