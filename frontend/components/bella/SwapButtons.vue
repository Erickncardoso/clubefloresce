<template>
  <div v-if="showSelection || showMode || showRestart" class="bella-swap-actions" role="group" :aria-label="ariaLabel">
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

      <button
        v-if="isSuggestionStep"
        type="button"
        class="bella-swap-btn bella-swap-btn--outline"
        :disabled="disabled"
        @click="emit('custom')"
      >
        Nenhuma agrada? Escreva outro alimento
      </button>
      <p v-if="isSuggestionStep" class="bella-swap-hint">
        Ou toque acima em uma sugestão. Se preferir outro alimento, use o botão e digite abaixo.
      </p>
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

    <template v-else-if="showRestart">
      <button
        type="button"
        class="bella-swap-btn bella-swap-btn--primary"
        :disabled="disabled"
        @click="emit('restart')"
      >
        Fazer nova substituição
      </button>
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
  showRestart: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'mode', 'custom', 'restart'])

const showSelection = computed(() => hasActiveSwapSelection(props.message))
const showMode = computed(() => !showSelection.value && hasActiveSwapMode(props.message))
const showRestart = computed(() => !showSelection.value && !showMode.value && props.showRestart)
const options = computed(() => getSwapOptions(props.message))
const isSuggestionStep = computed(() => getSwapMessageMeta(props.message)?.swapStep === 'suggestion')

const ariaLabel = computed(() => {
  if (showRestart.value) return 'Nova substituição'
  const step = getSwapMessageMeta(props.message)?.swapStep
  if (step === 'food') return 'Alimentos da refeição'
  if (step === 'meal') return 'Refeições do plano'
  if (step === 'suggestion') return 'Sugestões equivalentes'
  return 'Opções de substituição'
})
</script>

<style scoped>
.bella-swap-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  margin-top: 0.75rem;
  width: 100%;
}

.bella-swap-btn {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--cf-border, #e4e4e0);
  border-radius: 0.85rem;
  background: #fff;
  color: var(--cf-text, #141414);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.bella-swap-btn:hover:not(:disabled) {
  background: var(--cf-pink-soft, #faecef);
  border-color: #e0c4c6;
}

.bella-swap-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: var(--cf-pink-soft, #faecef);
}

.bella-swap-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-btn--primary {
  background: var(--cf-pink-soft, #faecef);
  border-color: #e0c4c6;
  color: var(--cf-pink-dark, #a06267);
  text-align: center;
  font-weight: 700;
}

.bella-swap-btn--outline {
  text-align: center;
  border-style: dashed;
  color: var(--cf-pink-dark, #a06267);
  background: #fff;
}

.bella-swap-hint {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--cf-text-muted, #525252);
  text-align: center;
}
</style>
