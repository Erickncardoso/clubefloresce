<template>
  <Teleport to="body">
    <div v-if="open" class="quick-reply-delete-overlay" @click.self="$emit('cancel')">
      <div class="quick-reply-delete-modal" role="dialog" aria-modal="true" aria-label="Apagar resposta rápida">
        <h2 class="quick-reply-delete-title">Apagar resposta rápida?</h2>
        <p class="quick-reply-delete-text">
          A resposta <strong>/{{ shortcutLabel }}</strong> será removida permanentemente.
        </p>
        <footer class="quick-reply-delete-footer">
          <button type="button" class="quick-reply-delete-btn quick-reply-delete-btn--ghost" @click="$emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="quick-reply-delete-btn quick-reply-delete-btn--danger"
            :disabled="saving"
            @click="$emit('confirm')"
          >
            <Loader v-if="saving" class="spin quick-reply-delete-btn-icon" />
            Apagar
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Loader } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  reply: { type: Object, default: null },
})

defineEmits(['cancel', 'confirm'])

const shortcutLabel = computed(() => String(props.reply?.shortCut || '').trim() || 'atalho')
</script>

<style scoped>
.quick-reply-delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 10090;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.quick-reply-delete-modal {
  width: min(100%, 420px);
  padding: 22px 24px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
}

.quick-reply-delete-title {
  margin: 0 0 10px;
  font-size: 1.0625rem;
  font-weight: 500;
  color: #111b21;
}

.quick-reply-delete-text {
  margin: 0 0 20px;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #54656f;
}

.quick-reply-delete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.quick-reply-delete-btn {
  min-width: 96px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.quick-reply-delete-btn--ghost {
  background: transparent;
  color: #00a884;
}

.quick-reply-delete-btn--danger {
  background: #ea0038;
  color: #fff;
}

.quick-reply-delete-btn--danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-reply-delete-btn-icon {
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
