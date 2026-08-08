<template>
  <Teleport to="body">
    <div v-if="open" class="label-assign-overlay" @click.self="$emit('cancel')">
      <div class="label-assign-modal" role="dialog" aria-modal="true" aria-label="Adicionar etiqueta">
        <header class="label-assign-header">
          <button type="button" class="label-assign-close" aria-label="Fechar" @click="$emit('cancel')">
            <X class="label-assign-close-icon" />
          </button>
          <h2 class="label-assign-title">Adicionar etiqueta</h2>
        </header>

        <div class="label-assign-list">
          <button
            v-for="item in labels"
            :key="item.id"
            type="button"
            class="label-assign-item"
            :disabled="saving"
            @click="$emit('select', item)"
          >
            <WhatsappLabelTagIcon :color-hex="item.colorHex" />
            <span class="label-assign-item-name">{{ item.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'
import WhatsappLabelTagIcon from './WhatsappLabelTagIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
  labels: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

defineEmits(['cancel', 'select'])
</script>

<style scoped>
.label-assign-overlay {
  position: fixed;
  inset: 0;
  z-index: 10090;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.label-assign-modal {
  width: min(100%, 420px);
  max-height: min(80vh, 560px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.label-assign-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px 10px;
  flex-shrink: 0;
}

.label-assign-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  cursor: pointer;
}

.label-assign-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.label-assign-close-icon {
  width: 20px;
  height: 20px;
}

.label-assign-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: #111b21;
}

.label-assign-list {
  overflow-y: auto;
  padding: 8px 0 12px;
}

.label-assign-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.label-assign-item:hover:not(:disabled) {
  background: #f5f6f6;
}

.label-assign-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-assign-item-name {
  font-size: 1rem;
  color: #111b21;
}
</style>
