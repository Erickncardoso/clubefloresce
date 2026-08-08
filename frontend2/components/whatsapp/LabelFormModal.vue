<template>
  <Teleport to="body">
    <div v-if="open" class="label-form-overlay" @click.self="$emit('cancel')">
      <div class="label-form-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="label-form-header">
          <button type="button" class="label-form-close" aria-label="Fechar" @click="$emit('cancel')">
            <X class="label-form-close-icon" />
          </button>
          <h2 class="label-form-title">{{ title }}</h2>
        </header>

        <form class="label-form-body" @submit.prevent="onSubmit">
          <div class="label-form-field-row">
            <WhatsappLabelTagIcon :color-hex="previewColorHex" large />
            <label class="label-form-field">
              <span class="label-form-field-label">Etiqueta</span>
              <input
                v-model="localName"
                type="text"
                class="label-form-input"
                maxlength="80"
                required
                autofocus
                placeholder="Etiqueta"
              />
            </label>
          </div>

          <p v-if="error" class="label-form-error">{{ error }}</p>

          <footer class="label-form-footer">
            <button type="button" class="label-form-btn label-form-btn--ghost" @click="$emit('cancel')">
              Cancelar
            </button>
            <button
              type="submit"
              class="label-form-btn label-form-btn--primary"
              :disabled="saving || !localName.trim()"
            >
              <Loader v-if="saving" class="spin label-form-btn-icon" />
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { X, Loader } from 'lucide-vue-next'
import WhatsappLabelTagIcon from './WhatsappLabelTagIcon.vue'
import { resolveLabelColorHex, WA_LABEL_COLOR_HEX } from '~/composables/whatsapp/useWhatsappLabels.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  label: { type: Object, default: null },
})

const emit = defineEmits(['cancel', 'save'])

const localName = ref('')

const title = computed(() => (props.label?.id ? 'Editar etiqueta' : 'Adicionar etiqueta'))

const previewColorHex = computed(() => {
  if (props.label?.colorHex) return resolveLabelColorHex(props.label)
  return WA_LABEL_COLOR_HEX[2]
})

watch(
  () => [props.open, props.label],
  () => {
    if (!props.open) return
    localName.value = String(props.label?.name || '').trim()
  },
  { immediate: true },
)

const onSubmit = () => {
  const name = localName.value.trim()
  if (!name) return
  emit('save', {
    labelid: props.label?.id ? String(props.label.id) : 'new',
    name,
    color: props.label?.color ?? 2,
  })
}
</script>

<style scoped>
.label-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 10080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.label-form-modal {
  width: min(100%, 440px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
}

.label-form-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px 8px;
}

.label-form-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  cursor: pointer;
}

.label-form-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.label-form-close-icon {
  width: 20px;
  height: 20px;
}

.label-form-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: #111b21;
}

.label-form-body {
  padding: 8px 20px 20px;
}

.label-form-field-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.label-form-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label-form-field-label {
  font-size: 0.8125rem;
  color: #667781;
}

.label-form-input {
  width: 100%;
  border: none;
  border-bottom: 2px solid #111b21;
  padding: 8px 0 10px;
  font: inherit;
  font-size: 1rem;
  color: #111b21;
  background: transparent;
  outline: none;
}

.label-form-error {
  margin: 12px 0 0;
  color: #ea0038;
  font-size: 0.875rem;
}

.label-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}

.label-form-btn {
  min-width: 96px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.label-form-btn--ghost {
  background: transparent;
  color: #1daa61;
}

.label-form-btn--primary {
  background: #111b21;
  color: #fff;
}

.label-form-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.label-form-btn-icon {
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
