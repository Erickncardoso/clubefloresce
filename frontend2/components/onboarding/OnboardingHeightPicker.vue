<template>
  <div class="onb-height" :aria-label="`Altura: ${formatHeightLabel(modelValue)}`">
    <div class="onb-height__viewport" ref="viewportRef">
      <div class="onb-height__highlight" aria-hidden="true" />
      <div
        ref="scrollRef"
        class="onb-height__scroll"
        tabindex="0"
        @scroll.passive="onScroll"
      >
        <div class="onb-height__spacer" aria-hidden="true" />
        <button
          v-for="value in values"
          :key="value"
          type="button"
          class="onb-height__item"
          :class="{ 'onb-height__item--active': value === modelValue }"
          @click="selectValue(value)"
        >
          <span class="onb-height__label">{{ formatHeightDisplay(value) }} m</span>
        </button>
        <div class="onb-height__spacer" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Number, default: 165 },
  min: { type: Number, default: 140 },
  max: { type: Number, default: 210 },
})

const emit = defineEmits(['update:modelValue'])

const scrollRef = ref(null)
const viewportRef = ref(null)
const isProgrammatic = ref(false)

const values = computed(() => {
  const list = []
  for (let value = props.min; value <= props.max; value += 1) {
    list.push(value)
  }
  return list
})

const ITEM_HEIGHT = 44

function formatHeightDisplay(cm) {
  return (cm / 100).toFixed(2)
}

function formatHeightLabel(cm) {
  return `${formatHeightDisplay(cm)} metros`
}

function selectValue(value) {
  emit('update:modelValue', value)
  scrollToValue(value, true)
}

function scrollToValue(value, smooth = false) {
  const el = scrollRef.value
  if (!el) return
  const index = values.value.indexOf(value)
  if (index < 0) return
  isProgrammatic.value = true
  el.scrollTo({
    top: index * ITEM_HEIGHT,
    behavior: smooth ? 'smooth' : 'auto',
  })
  requestAnimationFrame(() => {
    isProgrammatic.value = false
  })
}

function onScroll() {
  if (isProgrammatic.value) return
  const el = scrollRef.value
  if (!el) return
  const index = Math.round(el.scrollTop / ITEM_HEIGHT)
  const value = values.value[Math.max(0, Math.min(values.value.length - 1, index))]
  if (value != null && value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}

watch(
  () => props.modelValue,
  (value) => {
    scrollToValue(value)
  },
)

onMounted(() => {
  scrollToValue(props.modelValue)
})
</script>

<style scoped>
.onb-height {
  width: 100%;
}

.onb-height__viewport {
  position: relative;
  height: 11rem;
  overflow: hidden;
}

.onb-height__highlight {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2.75rem;
  transform: translateY(-50%);
  border-radius: 0.95rem;
  background: #f3f4f6;
  pointer-events: none;
  z-index: 0;
}

.onb-height__scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.onb-height__scroll::-webkit-scrollbar {
  display: none;
}

.onb-height__spacer {
  height: calc(50% - 1.375rem);
}

.onb-height__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 2.75rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(28, 24, 22, 0.42);
  scroll-snap-align: center;
  cursor: pointer;
}

.onb-height__label {
  display: inline-block;
  min-width: 4.75rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.onb-height__item--active {
  color: var(--cf-text);
  font-size: 1.25rem;
  font-weight: 800;
}
</style>
