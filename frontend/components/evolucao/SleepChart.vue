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
          <circle cx="100" cy="100" :r="RING_R" class="sleep-clock__ring-bg" />

          <circle
            cx="100"
            cy="100"
            :r="RING_R"
            class="sleep-clock__ring-active"
            :stroke-dasharray="`${sleepArcLength} ${RING_CIRCUMFERENCE}`"
            stroke-dashoffset="0"
            :transform="`rotate(${sleepArcRotation} 100 100)`"
          />

          <g class="sleep-clock__ticks">
            <circle
              v-for="tick in hourTicks"
              :key="`tick-${tick}`"
              :cx="tick.x"
              :cy="tick.y"
              r="1.3"
              class="sleep-clock__tick-dot"
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

          <circle cx="100" cy="100" r="46" class="sleep-clock__face" />

          <text x="100" y="96" text-anchor="middle" class="sleep-clock__duration">
            <tspan class="sleep-clock__duration-h">{{ durationParts.h }}</tspan>
            <tspan class="sleep-clock__duration-sep"> : </tspan>
            <tspan class="sleep-clock__duration-m">{{ durationParts.m }}</tspan>
          </text>

          <g
            class="sleep-clock__handle"
            :transform="`translate(${moonPos.x}, ${moonPos.y})`"
            @pointerdown="(e) => startDrag('bed', e)"
          >
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--moon" />
            <g class="sleep-clock__handle-glyph" transform="translate(-7,-7)">
              <path fill="#6b7fb8" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" transform="scale(0.58) translate(2,2)" />
            </g>
          </g>

          <g
            class="sleep-clock__handle"
            :transform="`translate(${sunPos.x}, ${sunPos.y})`"
            @pointerdown="(e) => startDrag('wake', e)"
          >
            <circle :r="HANDLE_R" class="sleep-clock__handle-bg sleep-clock__handle-bg--sun" />
            <g class="sleep-clock__handle-glyph" transform="translate(-7,-7)">
              <g transform="scale(0.58) translate(2,2)">
                <circle cx="12" cy="12" r="4" fill="#f0a830" />
                <path fill="none" stroke="#f0a830" stroke-width="2" stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <div class="sleep-clock__cards">
        <div class="sleep-clock__card">
          <div class="sleep-clock__card-icon sleep-clock__card-icon--night" aria-hidden="true">
            <svg class="sleep-clock__ui-icon sleep-clock__ui-icon--on-dark" viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </div>
          <div class="sleep-clock__card-copy">
            <span class="sleep-clock__card-label">Dormir</span>
            <strong class="sleep-clock__card-time">{{ bedLabel }}</strong>
          </div>
          <div class="sleep-clock__card-actions">
            <button type="button" aria-label="Adiantar horário de dormir" @click="emitShift('bed', -15)">
              <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M5 12h14" /></svg>
            </button>
            <button type="button" aria-label="Atrasar horário de dormir" @click="emitShift('bed', 15)">
              <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <div class="sleep-clock__card">
          <div class="sleep-clock__card-icon sleep-clock__card-icon--day" aria-hidden="true">
            <svg class="sleep-clock__ui-icon sleep-clock__ui-icon--on-light" viewBox="0 0 24 24" width="14" height="14">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </div>
          <div class="sleep-clock__card-copy">
            <span class="sleep-clock__card-label">Acordar</span>
            <strong class="sleep-clock__card-time">{{ wakeLabel }}</strong>
          </div>
          <div class="sleep-clock__card-actions">
            <button type="button" aria-label="Acordar mais cedo" @click="emitShift('wake', -15)">
              <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M5 12h14" /></svg>
            </button>
            <button type="button" aria-label="Acordar mais tarde" @click="emitShift('wake', 15)">
              <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>
      </div>

      <p class="sleep-clock__meta">
        Meta {{ target }}h · hoje {{ durationHoursLabel }}h
        <svg v-if="metGoal" class="sleep-clock__meta-ok-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5" />
        </svg>
      </p>
    </div>
  </div>
</template>

<script setup>
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
const RING_R = 78
const HANDLE_R = 11
const TICK_R = 68
const NUMBER_R = 56
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

const svgEl = ref(null)
const dragKind = ref(null)
const lastDragMinutes = ref(null)

const bedMinutes = computed(() => props.schedule.bedMinutes ?? 23 * 60)
const wakeMinutes = computed(() => props.schedule.wakeMinutes ?? 7 * 60 + 20)
const durationMinutes = computed(() => {
  if (props.schedule.durationMinutes) return props.schedule.durationMinutes
  return Math.round((props.schedule.durationHours || 0) * 60)
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
  const h = props.schedule.durationHours || 0
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
})
const metGoal = computed(() => (props.schedule.durationHours || 0) >= props.target)

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

const hourTicks = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const pos = polar(TICK_R, hourLabelAngle(index + 1))
    return { x: pos.x, y: pos.y }
  }),
)

const clockHours = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const n = index + 1
    const pos = polar(NUMBER_R, hourLabelAngle(n))
    return { n, x: pos.x, y: pos.y + 4 }
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

function resolveMinutesOnDial(angleDeg, kind, currentMinutes) {
  let a = angleDeg + 90
  a = ((a % 360) + 360) % 360
  const hourOnDial = (a / 360) * 12
  const h12 = Math.floor(hourOnDial) % 12
  const min = Math.round((hourOnDial - Math.floor(hourOnDial)) * 60 / 15) * 15

  const base = h12 * 60 + min
  const candidates = [base, base + 12 * 60].map((value) => normalizeMinutes(value))

  if (kind === 'bed') {
    const evening = candidates.filter((value) => {
      const h = Math.floor(value / 60)
      return h >= 18 || h < 6
    })
    if (evening.length === 1) return evening[0]
    if (evening.length > 1) {
      return evening.reduce((best, value) =>
        Math.abs(value - currentMinutes) < Math.abs(best - currentMinutes) ? value : best,
      )
    }
    return candidates.reduce((best, value) => (value >= 12 * 60 ? value : best), candidates[0])
  }

  const morning = candidates.filter((value) => {
    const h = Math.floor(value / 60)
    return h >= 5 && h <= 11
  })
  if (morning.length === 1) return morning[0]
  if (morning.length > 1) {
    return morning.reduce((best, value) =>
      Math.abs(value - currentMinutes) < Math.abs(best - currentMinutes) ? value : best,
    )
  }

  const am = candidates.filter((value) => Math.floor(value / 60) < 12)
  if (am.length) return am[0]
  return candidates[0]
}

function formatClock(minutes) {
  const total = normalizeMinutes(minutes)
  const h24 = Math.floor(total / 60)
  const m = total % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
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
  return resolveMinutesOnDial(angleDeg, dragKind.value, current)
}

function startDrag(kind, event) {
  dragKind.value = kind
  lastDragMinutes.value = null
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (!dragKind.value) return
  const minutes = minutesFromPointer(event)
  if (minutes === lastDragMinutes.value) return
  lastDragMinutes.value = minutes

  if (dragKind.value === 'bed') {
    emit('set-schedule', { bedMinutes: minutes, wakeMinutes: wakeMinutes.value })
  } else {
    emit('set-schedule', { bedMinutes: bedMinutes.value, wakeMinutes: minutes })
  }
}

function stopDrag() {
  dragKind.value = null
  lastDragMinutes.value = null
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
})
</script>

<style scoped>
.sleep-clock {
  width: 100%;
}

.sleep-clock__panel {
  padding: 1rem 0.85rem 0.85rem;
  background: linear-gradient(180deg, #eef8ec 0%, #fff 42%);
  border: 1px solid #dceee0;
  box-shadow: 0 8px 24px rgba(106, 171, 106, 0.12);
}

.sleep-clock__ui-icon--on-dark {
  color: #f5d76e;
}

.sleep-clock__ui-icon--on-light {
  color: #e8941a;
}

.sleep-clock__dial-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.85rem;
  padding: 0.5rem 0;
}

.sleep-clock__svg {
  width: min(100%, 15.5rem);
  height: auto;
  touch-action: none;
  overflow: visible;
}

.sleep-clock__ring-bg {
  fill: none;
  stroke: #e3f2e0;
  stroke-width: 14;
}

.sleep-clock__ring-active {
  fill: none;
  stroke: #7ec87a;
  stroke-width: 14;
  stroke-linecap: round;
  transition: stroke-dasharray 0.35s ease, transform 0.35s ease;
}

.sleep-clock__tick-dot {
  fill: #c5dcc2;
}

.sleep-clock__number {
  fill: #9bb898;
  font-size: 8px;
  font-weight: 600;
  text-anchor: middle;
}

.sleep-clock__face {
  fill: #fff;
  stroke: #edf5eb;
  stroke-width: 1;
}

.sleep-clock__duration {
  font-family: var(--cf-font, system-ui, sans-serif);
  fill: #4f9a4c;
  font-weight: 800;
}

.sleep-clock__duration-h,
.sleep-clock__duration-m {
  font-size: 18px;
}

.sleep-clock__duration-sep {
  font-size: 15px;
  opacity: 0.65;
}

.sleep-clock__handle {
  cursor: grab;
}

.sleep-clock__handle:active {
  cursor: grabbing;
}

.sleep-clock__handle-bg {
  fill: #fff;
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.sleep-clock__handle-bg--moon {
  stroke: #8ecf8a;
}

.sleep-clock__handle-bg--sun {
  stroke: #f0c060;
}

.sleep-clock__handle-glyph {
  pointer-events: none;
}

.sleep-clock__handle-glyph path,
.sleep-clock__handle-glyph circle {
  pointer-events: none;
}

.sleep-clock__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.sleep-clock__card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.5rem;
  border-radius: 14px;
  background: #f6f8f6;
  border: 1px solid #e8ece8;
}

.sleep-clock__card-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sleep-clock__card-icon--night {
  background: linear-gradient(135deg, #2a3555 0%, #4a5a8a 100%);
}

.sleep-clock__card-icon--day {
  background: linear-gradient(135deg, #ffe9a8 0%, #ffd060 100%);
}

.sleep-clock__card-label {
  display: block;
  font-size: 0.62rem;
  color: var(--cf-text-muted);
  font-weight: 600;
}

.sleep-clock__card-time {
  display: block;
  font-size: 0.72rem;
  color: var(--cf-text);
  line-height: 1.2;
}

.sleep-clock__card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sleep-clock__card-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border: 1px solid #dceee0;
  border-radius: 6px;
  background: #fff;
  color: #5a9a57;
  cursor: pointer;
  padding: 0;
}

.sleep-clock__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  margin: 0.75rem 0 0;
  font-size: 0.68rem;
  color: var(--cf-text-muted);
}

.sleep-clock__meta-ok-icon {
  color: #4f9a4c;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sleep-clock__ring-active {
    transition: none;
  }
}
</style>
