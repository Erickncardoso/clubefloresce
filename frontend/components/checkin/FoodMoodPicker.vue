<template>
  <div class="food-mood-picker" role="group" aria-label="Como foi sua alimentação hoje?">
    <button
      v-for="face in faces"
      :key="face.value"
      type="button"
      class="food-mood-btn"
      :class="{ selected: modelValue === face.value }"
      :aria-pressed="modelValue === face.value"
      :aria-label="face.label"
      @click="$emit('update:modelValue', face.value)"
    >
      <CheckinNotoEmojiLottie
        :src="face.lottie"
        :speed="modelValue === face.value ? 1.15 : 1"
      />
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, default: null },
})

defineEmits(['update:modelValue'])

const NOTO_LOTTIE = 'https://fonts.gstatic.com/s/e/notoemoji/latest'

const faces = [
  { value: 1, label: 'Muito ruim', lottie: `${NOTO_LOTTIE}/1f62b/lottie.json` },
  { value: 2, label: 'Ruim', lottie: `${NOTO_LOTTIE}/1f615/lottie.json` },
  { value: 3, label: 'Regular', lottie: `${NOTO_LOTTIE}/1f610/lottie.json` },
  { value: 4, label: 'Boa', lottie: `${NOTO_LOTTIE}/1f642/lottie.json` },
  { value: 5, label: 'Excelente', lottie: `${NOTO_LOTTIE}/1f604/lottie.json` },
]
</script>

<style scoped>
.food-mood-picker {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.1rem 0;
}

.food-mood-btn {
  flex: 1;
  min-width: 0;
  max-width: 4rem;
  aspect-ratio: 1;
  padding: 0;
  border: 1.5px solid var(--cf-border);
  border-radius: 16px;
  background: #f6f6f4;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.15s ease, background 0.15s ease;
}

.food-mood-btn:active {
  transform: scale(0.95);
}

.food-mood-btn.selected {
  border-color: var(--cf-pink);
  background: var(--cf-pink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .food-mood-btn:active,
  .food-mood-btn.selected {
    transform: none;
  }
}
</style>
