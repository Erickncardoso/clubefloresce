<template>
  <div v-if="open" class="create-group-backdrop" @click.self="$emit('cancel')">
    <div class="create-group-modal">
      <header class="create-group-header">
        <h3>Criar novo grupo</h3>
        <button class="create-group-close" @click="$emit('cancel')">✕</button>
      </header>

      <div class="create-group-body">
        <label class="create-group-label">Nome do grupo</label>
        <input
          :value="groupName"
          type="text"
          class="create-group-input"
          placeholder="Ex.: Grupo de suporte"
          :disabled="sending"
          @input="$emit('update:group-name', $event.target.value)"
        />

        <label class="create-group-label">Participantes</label>
        <input
          :value="searchQuery"
          type="text"
          class="create-group-input"
          placeholder="Buscar por nome ou número..."
          :disabled="sending"
          @input="$emit('update:search-query', $event.target.value)"
        />

        <div class="create-group-list">
          <button
            v-for="contact in contacts"
            :key="contact.id"
            class="create-group-item"
            :class="{ 'is-selected': selectedIds.includes(contact.id) }"
            :disabled="sending"
            @click="$emit('toggle', contact.id)"
          >
            <img v-if="contact.avatarUrl" :src="contact.avatarUrl" class="create-group-avatar" :alt="contact.name" />
            <div v-else class="create-group-avatar fallback">{{ contact.name?.charAt(0) || '?' }}</div>
            <div class="create-group-main">
              <strong>{{ contact.name }}</strong>
              <small>{{ contact.number }}</small>
            </div>
          </button>
          <p v-if="contacts.length === 0" class="create-group-empty">Nenhum contato encontrado.</p>
        </div>

        <p class="create-group-help">Selecione ao menos 1 participante além de você.</p>
        <p v-if="feedback" class="create-group-feedback">{{ feedback }}</p>
      </div>

      <footer class="create-group-footer">
        <button class="btn-secondary" :disabled="sending" @click="$emit('cancel')">Cancelar</button>
        <button class="btn-primary" :disabled="sending || !canSubmit" @click="$emit('confirm')">
          {{ sending ? 'Criando...' : 'Criar grupo' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  contacts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  feedback: { type: String, default: '' }
})

defineEmits(['cancel', 'confirm', 'toggle', 'update:group-name', 'update:search-query'])

const canSubmit = computed(() => String(props.groupName || '').trim().length > 0 && props.selectedIds.length > 0)
</script>

<style scoped>
.create-group-backdrop { position: fixed; inset: 0; background: rgba(8, 15, 22, 0.72); display: grid; place-items: center; z-index: 90; }
.create-group-modal { width: min(520px, calc(100vw - 32px)); max-height: min(86vh, 760px); overflow: hidden; border-radius: 16px; background: #111b21; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; }
.create-group-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.create-group-header h3 { margin: 0; font-size: 1rem; color: #e9edef; }
.create-group-close { border: none; background: transparent; color: #aebac1; cursor: pointer; font-size: 1rem; }
.create-group-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; overflow: auto; }
.create-group-label { color: #d1d7db; font-size: 0.86rem; }
.create-group-input { width: 100%; height: 40px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.12); background: #202c33; color: #e9edef; padding: 0 12px; outline: none; }
.create-group-input:focus { border-color: rgba(37, 211, 102, 0.58); }
.create-group-list { border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; background: #0b141a; overflow: auto; max-height: 320px; }
.create-group-item { width: 100%; border: none; background: transparent; color: #e9edef; padding: 10px 12px; display: flex; align-items: center; gap: 10px; text-align: left; cursor: pointer; }
.create-group-item:hover { background: rgba(255, 255, 255, 0.06); }
.create-group-item.is-selected { background: rgba(37, 211, 102, 0.14); }
.create-group-avatar { width: 34px; height: 34px; border-radius: 999px; object-fit: cover; }
.create-group-avatar.fallback { display: grid; place-items: center; background: #3b4a54; color: #d1d7db; font-weight: 700; text-transform: uppercase; }
.create-group-main { min-width: 0; display: flex; flex-direction: column; }
.create-group-main strong, .create-group-main small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.create-group-main small { color: #8696a0; font-size: 0.78rem; }
.create-group-empty { margin: 10px; color: #8696a0; font-size: 0.86rem; }
.create-group-help { margin: 0; color: #8696a0; font-size: 0.78rem; }
.create-group-feedback { margin: 0; color: #ffb4ab; font-size: 0.85rem; }
.create-group-footer { padding: 12px 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: flex-end; gap: 8px; }
.btn-secondary, .btn-primary { border: none; height: 38px; padding: 0 14px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-secondary { background: #202c33; color: #d1d7db; }
.btn-primary { background: #25d366; color: #04130a; }
.btn-secondary:disabled, .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
