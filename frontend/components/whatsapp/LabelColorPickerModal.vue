<template>
  <Teleport to="body">
    <div v-if="open" class="label-color-overlay" @click.self="$emit('cancel')">
      <div class="label-color-modal" role="dialog" aria-modal="true" aria-label="Escolher cor">
        <header class="label-color-header">
          <button type="button" class="label-color-close" aria-label="Fechar" @click="$emit('cancel')">
            <X class="label-color-close-icon" />
          </button>
          <h2 class="label-color-title">Escolher cor</h2>
        </header>

        <div class="label-color-grid" role="listbox" aria-label="Cores disponíveis">
          <button
            v-for="(hex, index) in colors"
            :key="`${hex}-${index}`"
            type="button"
            class="label-color-swatch"
            :class="{ 'is-selected': selectedIndex === index }"
            :style="{ backgroundColor: hex }"
            :aria-label="`Cor ${index + 1}`"
            :aria-selected="selectedIndex === index ? 'true' : 'false'"
            role="option"
            @click="selectedIndex = index"
          />
        </div>

        <footer class="label-color-footer">
          <button type="button" class="label-color-btn label-color-btn--ghost" @click="$emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="label-color-btn label-color-btn--primary"
            :disabled="saving"
            @click="onSave"
          >
            <Loader v-if="saving" class="spin label-color-btn-icon" />
            Salvar
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X, Loader } from 'lucide-vue-next'
import { WA_LABEL_COLOR_HEX, resolveLabelColorIndex } from '~/composables/whatsapp/useWhatsappLabels.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  label: { type: Object, default: null },
})

const emit = defineEmits(['cancel', 'save'])

const colors = WA_LABEL_COLOR_HEX
const selectedIndex = ref(0)

watch(
  () => [props.open, props.label],
  () => {
    if (!props.open) return
    selectedIndex.value = resolveLabelColorIndex(props.label || {})
  },
  { immediate: true },
)

const onSave = () => {
  emit('save', {
    labelid: String(props.label?.id || props.label?.labelid || ''),
    name: String(props.label?.name || '').trim(),
    color: selectedIndex.value,
  })
}
</script>

<style scoped>
.label-color-overlay {
  position: fixed;
  inset: 0;
  z-index: 10085;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.label-color-modal {
  width: min(100%, 420px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
}

.label-color-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px 10px;
}

.label-color-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  cursor: pointer;
}

.label-color-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.label-color-close-icon {
  width: 20px;
  height: 20px;
}

.label-color-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: #111b21;
}

.label-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 18px 16px;
  padding: 18px 24px 8px;
}

.label-color-swatch {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(11, 20, 26, 0.08);
}

.label-color-swatch.is-selected::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid #111b21;
  border-radius: 999px;
}

.label-color-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 20px 20px;
}

.label-color-btn {
  min-width: 96px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.label-color-btn--ghost {
  background: transparent;
  color: #1daa61;
}

.label-color-btn--primary {
  background: #111b21;
  color: #fff;
}

.label-color-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.label-color-btn-icon {
  width: 16px;
  height: 16px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
