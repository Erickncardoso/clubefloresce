<template>
  <Teleport to="body">
    <div v-if="open" class="label-delete-overlay" @click.self="$emit('cancel')">
      <div class="label-delete-modal" role="dialog" aria-modal="true" aria-label="Apagar etiqueta">
        <h2 class="label-delete-title">Deseja apagar a etiqueta?</h2>
        <p class="label-delete-text">
          A etiqueta será removida de todas as mensagens, dos contatos e da lista de etiquetas após ser apagada.
          Tem certeza de que deseja apagar essa etiqueta?
        </p>
        <footer class="label-delete-footer">
          <button type="button" class="label-delete-btn label-delete-btn--ghost" @click="$emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="label-delete-btn label-delete-btn--primary"
            :disabled="saving"
            @click="$emit('confirm')"
          >
            <Loader v-if="saving" class="spin label-delete-btn-icon" />
            OK
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { Loader } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

defineEmits(['cancel', 'confirm'])
</script>

<style scoped>
.label-delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 10090;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.label-delete-modal {
  width: min(100%, 440px);
  padding: 22px 24px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
}

.label-delete-title {
  margin: 0 0 12px;
  font-size: 1.0625rem;
  font-weight: 500;
  color: #111b21;
}

.label-delete-text {
  margin: 0 0 22px;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #54656f;
}

.label-delete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.label-delete-btn {
  min-width: 96px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.label-delete-btn--ghost {
  background: transparent;
  color: #1daa61;
}

.label-delete-btn--primary {
  background: #111b21;
  color: #fff;
}

.label-delete-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.label-delete-btn-icon {
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
