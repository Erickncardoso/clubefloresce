<template>
  <div class="onb-shell">
    <header v-if="showHeader" class="onb-shell__header">
      <button
        v-if="showBack"
        type="button"
        class="onb-shell__back"
        aria-label="Voltar"
        @click="emit('back')"
      >
        <ArrowLeft class="onb-shell__back-icon" aria-hidden="true" />
      </button>
      <div v-else class="onb-shell__back-spacer" aria-hidden="true" />

      <div
        v-if="progressTotal > 0"
        class="onb-shell__progress"
        role="progressbar"
        :aria-valuenow="progressCurrent"
        :aria-valuemin="0"
        :aria-valuemax="progressTotal"
        :aria-label="`Passo ${progressCurrent} de ${progressTotal}`"
      >
        <span
          class="onb-shell__progress-fill"
          :style="{ width: `${Math.max(8, (progressCurrent / progressTotal) * 100)}%` }"
        />
      </div>
      <div v-else class="onb-shell__progress-spacer" aria-hidden="true" />
    </header>

    <main class="onb-shell__main">
      <slot />
    </main>

    <footer v-if="showFooter" class="onb-shell__footer">
      <button
        type="button"
        class="onb-shell__continue"
        :disabled="continueDisabled || saving"
        @click="emit('continue')"
      >
        {{ saving ? 'Salvando…' : continueLabel }}
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ArrowLeft } from 'lucide-vue-next'

defineProps({
  showHeader: { type: Boolean, default: true },
  showBack: { type: Boolean, default: true },
  showFooter: { type: Boolean, default: true },
  progressCurrent: { type: Number, default: 0 },
  progressTotal: { type: Number, default: 0 },
  continueLabel: { type: String, default: 'Continuar' },
  continueDisabled: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'continue'])
</script>

<style scoped>
.onb-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: var(--cf-text);
  overflow-x: hidden;
  max-width: 100%;
  min-width: 0;
}

.onb-shell__header {
  display: grid;
  grid-template-columns: 2.75rem 1fr 2.75rem;
  align-items: center;
  gap: 0.5rem;
  padding: calc(env(safe-area-inset-top, 0px) + 0.65rem) 1.1rem 0.75rem;
}

.onb-shell__back,
.onb-shell__back-spacer {
  width: 2.35rem;
  height: 2.35rem;
}

.onb-shell__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: #f3f4f6;
  color: var(--cf-text);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.onb-shell__back-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.onb-shell__progress,
.onb-shell__progress-spacer {
  height: 0.28rem;
  border-radius: 999px;
}

.onb-shell__progress {
  background: #ececec;
  overflow: hidden;
}

.onb-shell__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--cf-green-dark, #566137);
  transition: width 0.2s ease;
}

.onb-shell__main {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  padding: 0.75rem 1.35rem;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.onb-shell__footer {
  padding: 0.75rem 1.35rem calc(env(safe-area-inset-bottom, 0px) + 1rem);
}

.onb-shell__continue {
  width: 100%;
  min-height: 3.1rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green-dark, #566137);
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s ease;
}

.onb-shell__continue:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .onb-shell__progress-fill {
    transition: none;
  }
}
</style>
