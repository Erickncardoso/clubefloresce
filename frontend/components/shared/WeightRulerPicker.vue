<template>
  <div class="weight-ruler" :class="{ 'weight-ruler--dragging': isDragging }">
    <div class="weight-ruler__shell">
      <div class="weight-ruler__card">
        <div class="weight-ruler__viewport" ref="viewportRef">
          <div class="weight-ruler__readout" aria-live="polite">
            <span class="weight-ruler__readout-value">{{ formatDisplayValue(displayValue) }}</span>
            <span class="weight-ruler__readout-unit">kg</span>
          </div>

          <div class="weight-ruler__pointer" aria-hidden="true">
            <span class="weight-ruler__pointer-line" />
            <span class="weight-ruler__pointer-tick" />
          </div>

          <div
            ref="scrollRef"
            class="weight-ruler__scroll"
            role="slider"
            :aria-valuemin="min"
            :aria-valuemax="max"
            :aria-valuenow="displayValue"
            :aria-label="ariaLabel"
            tabindex="0"
            @scroll.passive="onScroll"
            @pointerdown="onPointerDown"
            @keydown="onKeydown"
          >
            <div class="weight-ruler__track">
              <div
                v-for="(tick, index) in ticks"
                :key="index"
                class="weight-ruler__tick-col"
                :class="{ 'weight-ruler__tick-col--major': tick.major }"
              >
                <span
                  v-if="tick.label != null"
                  class="weight-ruler__label"
                >
                  {{ tick.label }}
                </span>
                <span class="weight-ruler__tick" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const TICK_WIDTH = 10

const props = defineProps({
  modelValue: { type: Number, default: null },
  min: { type: Number, default: 40 },
  max: { type: Number, default: 150 },
  step: { type: Number, default: 0.5 },
  ariaLabel: { type: String, default: 'Selecionar peso em quilogramas' },
})

const emit = defineEmits(['update:modelValue'])

const scrollRef = ref(null)
const activeIndex = ref(0)
const isDragging = ref(false)
const isProgrammaticScroll = ref(false)

const ticks = computed(() => {
  const list = []
  const steps = Math.round((props.max - props.min) / props.step)
  for (let i = 0; i <= steps; i += 1) {
    const value = roundValue(props.min + i * props.step)
    const intVal = Math.round(value)
    const isWhole = Math.abs(value - intVal) < 0.001
    list.push({
      value,
      major: isWhole,
      label: isWhole && intVal % 5 === 0 ? intVal : null,
    })
  }
  return list
})

const displayValue = computed(() => ticks.value[activeIndex.value]?.value ?? props.min)

function roundValue(value) {
  const precision = props.step < 1 ? 1 : 0
  return Number(value.toFixed(precision))
}

function formatDisplayValue(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '--'
  const fixed = n.toFixed(1)
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
}

function findIndexForValue(value) {
  if (value == null || !Number.isFinite(value)) {
    return Math.round((70 - props.min) / props.step)
  }
  const clamped = Math.max(props.min, Math.min(props.max, roundValue(value)))
  return Math.round((clamped - props.min) / props.step)
}

function indexFromScroll(scrollLeft) {
  return Math.max(0, Math.min(ticks.value.length - 1, Math.round(scrollLeft / TICK_WIDTH)))
}

function scrollLeftForIndex(index) {
  return Math.max(0, Math.min(ticks.value.length - 1, index)) * TICK_WIDTH
}

function scrollToIndex(index, behavior = 'auto') {
  const el = scrollRef.value
  if (!el) return

  const target = Math.max(0, Math.min(ticks.value.length - 1, index))
  const left = scrollLeftForIndex(target)

  isProgrammaticScroll.value = true
  activeIndex.value = target
  el.scrollTo({ left, behavior })

  if (behavior === 'auto') {
    el.scrollLeft = left
    window.requestAnimationFrame(() => {
      isProgrammaticScroll.value = false
    })
    return
  }

  window.setTimeout(() => {
    isProgrammaticScroll.value = false
  }, 320)
}

function emitCurrentValue() {
  const value = ticks.value[activeIndex.value]?.value
  if (value == null) return
  if (props.modelValue !== value) {
    emit('update:modelValue', value)
  }
}

function settleScroll() {
  const el = scrollRef.value
  if (!el || isDragging.value) return

  const index = indexFromScroll(el.scrollLeft)
  scrollToIndex(index, 'auto')
  emitCurrentValue()
}

function onScroll() {
  if (isProgrammaticScroll.value) return

  const el = scrollRef.value
  if (!el) return

  const index = indexFromScroll(el.scrollLeft)
  if (index !== activeIndex.value) {
    activeIndex.value = index
  }

  if (isDragging.value) return

  window.clearTimeout(scrollEndTimer)
  scrollEndTimer = window.setTimeout(() => {
    if (isProgrammaticScroll.value || isDragging.value) return
    settleScroll()
  }, 120)
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  isDragging.value = true
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointerup', onPointerUp, { once: true })
  window.addEventListener('pointercancel', onPointerUp, { once: true })
}

function onPointerUp() {
  isDragging.value = false
  window.clearTimeout(scrollEndTimer)
  settleScroll()
}

function onKeydown(event) {
  let delta = 0
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = 1
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -1
  if (!delta) return

  event.preventDefault()
  const next = activeIndex.value + delta
  scrollToIndex(next, 'smooth')
  window.setTimeout(() => emitCurrentValue(), 340)
}

let scrollEndTimer = null

watch(
  () => props.modelValue,
  (value) => {
    if (isDragging.value || isProgrammaticScroll.value) return
    const index = findIndexForValue(value)
    if (index !== activeIndex.value) {
      scrollToIndex(index)
    }
  },
)

onMounted(() => {
  nextTick(() => {
    const index = findIndexForValue(props.modelValue)
    scrollToIndex(index)
    if (props.modelValue == null) {
      emitCurrentValue()
    }
  })
})

onBeforeUnmount(() => {
  window.clearTimeout(scrollEndTimer)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})
</script>

<style scoped>
.weight-ruler {
  width: 100%;
}

.weight-ruler__shell {
  padding: 0.65rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--cf-pink-soft) 72%, #e8e4f4);
}

.weight-ruler__card {
  padding: 0.85rem 0.55rem 0.65rem;
  border-radius: 16px;
  background: var(--cf-surface);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.weight-ruler__viewport {
  position: relative;
  padding-top: 2.35rem;
}

.weight-ruler__readout {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.weight-ruler__readout-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--cf-text);
  font-variant-numeric: tabular-nums;
}

.weight-ruler__readout-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.weight-ruler__pointer {
  position: absolute;
  left: 50%;
  bottom: 0.15rem;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.weight-ruler__pointer-line {
  display: block;
  width: 2px;
  height: 2.35rem;
  margin-bottom: 0.1rem;
  border-radius: 999px;
  background: var(--cf-text);
}

.weight-ruler__pointer-tick {
  display: block;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 7px solid var(--cf-text);
}

.weight-ruler__scroll {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  touch-action: pan-x;
  cursor: grab;
  padding-bottom: 0.15rem;
}

.weight-ruler--dragging .weight-ruler__scroll {
  cursor: grabbing;
  scroll-snap-type: none;
}

.weight-ruler__scroll::-webkit-scrollbar {
  display: none;
}

.weight-ruler__track {
  display: flex;
  align-items: flex-end;
  height: 3rem;
  padding-inline: calc(50% - 5px);
}

.weight-ruler__tick-col {
  flex: 0 0 10px;
  width: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.weight-ruler__label {
  min-height: 0.85rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: #b8b8b8;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.weight-ruler__tick {
  display: block;
  width: 1px;
  height: 10px;
  background: #d4d4d4;
  border-radius: 1px;
}

.weight-ruler__tick-col--major .weight-ruler__tick {
  height: 18px;
  width: 1.5px;
  background: #b8b8b8;
}
</style>
