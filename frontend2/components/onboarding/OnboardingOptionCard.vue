<template>
  <button
    type="button"
    class="onb-option"
    :class="{ 'onb-option--selected': selected }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span v-if="iconDots" class="onb-option__icon" aria-hidden="true">
      <span
        v-for="(dot, index) in iconDots"
        :key="index"
        class="onb-option__dot"
        :style="dotStyle(dot)"
      />
    </span>
    <span class="onb-option__copy">
      <strong>{{ title }}</strong>
      <span v-if="subtitle">{{ subtitle }}</span>
    </span>
  </button>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  selected: { type: Boolean, default: false },
  iconDots: { type: Array, default: null },
})

const emit = defineEmits(['select'])

function dotStyle(dot) {
  if (!dot || typeof dot !== 'object') return {}
  return {
    gridColumn: dot.col,
    gridRow: dot.row,
  }
}
</script>

<style scoped>
.onb-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  padding: 1rem 1.05rem;
  border: none;
  border-radius: 1.15rem;
  background: #f3f4f6;
  text-align: center;
  font-family: inherit;
  color: var(--cf-text, #1c1816);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.onb-option:active {
  transform: scale(0.985);
}

.onb-option--selected {
  background: var(--cf-green-dark, #566137);
  color: #fff;
}

.onb-option--selected .onb-option__copy strong,
.onb-option--selected .onb-option__copy span {
  color: #fff;
}

.onb-option__icon {
  display: grid;
  grid-template-columns: repeat(3, 0.35rem);
  grid-template-rows: repeat(3, 0.35rem);
  gap: 0.18rem;
  flex-shrink: 0;
}

.onb-option__dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.85;
}

.onb-option__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.18rem;
  min-width: 0;
  width: 100%;
  text-align: center;
}

.onb-option__copy strong {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
}

.onb-option__copy span {
  font-size: 0.76rem;
  line-height: 1.35;
  opacity: 0.72;
  color: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .onb-option {
    transition: none;
  }

  .onb-option:active {
    transform: none;
  }
}
</style>
