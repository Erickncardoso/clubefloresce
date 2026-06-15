<template>
  <div v-if="showSelection || showMode" class="bella-swap-actions" role="group" :aria-label="ariaLabel">
    <template v-if="showSelection">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="bella-swap-btn"
        :disabled="disabled"
        @click="emit('select', option)"
      >
        {{ option.label }}
      </button>
    </template>

    <template v-else-if="showMode">
      <button
        type="button"
        class="bella-swap-btn bella-swap-btn--primary"
        :disabled="disabled"
        @click="emit('mode', 'show_suggestions')"
      >
        Ver sugestões
      </button>
      <p class="bella-swap-hint">Ou digite abaixo o alimento que quer incluir no lugar.</p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  getSwapMessageMeta,
  getSwapOptions,
  hasActiveSwapMode,
  hasActiveSwapSelection,
} from '~/utils/bella-swap'

const props = defineProps({
  message: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'mode'])

const showSelection = computed(() => hasActiveSwapSelection(props.message))
const showMode = computed(() => !showSelection.value && hasActiveSwapMode(props.message))
const options = computed(() => getSwapOptions(props.message))

const ariaLabel = computed(() => {
  const step = getSwapMessageMeta(props.message)?.swapStep
  if (step === 'food') return 'Alimentos da refeição'
  if (step === 'meal') return 'Refeições do plano'
  return 'Opções de substituição'
})
</script>

<style scoped>
.bella-swap-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
  margin-top: 0.65rem;
  width: 100%;
}

.bella-swap-btn {
  width: 100%;
  padding: 0.62rem 0.85rem;
  border: 1px solid var(--cf-border, #e4e4e0);
  border-radius: var(--cf-radius-xl, 1rem);
  background: #fff;
  color: var(--cf-text, #141414);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
}

.bella-swap-btn:hover:not(:disabled) {
  background: var(--cf-green-soft, #edf3eb);
  border-color: #c8dcc4;
}

.bella-swap-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.bella-swap-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-btn--primary {
  background: var(--cf-green-soft, #edf3eb);
  border-color: #c8dcc4;
  color: var(--cf-green-dark, #4d7348);
  text-align: center;
}

.bella-swap-hint {
  margin: 0.1rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--cf-text-muted, #525252);
}
</style>
