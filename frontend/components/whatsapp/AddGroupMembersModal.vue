<template>
  <div v-if="open" class="add-members-overlay" @click.self="$emit('cancel')">
    <section class="add-members-dialog" role="dialog" aria-modal="true" aria-label="Adicionar membro">
      <header class="add-members-header">
        <button type="button" class="add-members-close" aria-label="Fechar" @click="$emit('cancel')">✕</button>
        <h3>Adicionar membro</h3>
      </header>

      <div class="add-members-search-wrap">
        <Search class="add-members-search-icon" />
        <input
          :value="searchQuery"
          class="add-members-search"
          type="text"
          placeholder="Pesquisar nome ou número"
          :disabled="sending"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
      </div>

      <p v-if="feedback" class="add-members-feedback">{{ feedback }}</p>
      <p v-else-if="loading && !contacts.length" class="add-members-status">Carregando contatos...</p>

      <div class="add-members-list">
        <p class="add-members-section-label">Contatos</p>
        <button
          v-for="contact in contacts"
          :key="contact.id"
          type="button"
          class="add-members-row"
          :disabled="sending"
          @click="$emit('toggle', contact.id)"
        >
          <span class="add-members-check" :class="{ 'is-selected': isSelected(contact.id) }" />
          <span class="add-members-avatar">
            <img v-if="contact.avatarUrl" :src="contact.avatarUrl" :alt="contact.name" loading="lazy" />
            <span v-else>{{ contactInitial(contact.name) }}</span>
          </span>
          <span class="add-members-main">
            <strong>{{ contact.name }}</strong>
            <small v-if="contact.subtitle">{{ contact.subtitle }}</small>
            <small v-else-if="contact.displayNumber">{{ contact.displayNumber }}</small>
          </span>
        </button>
        <p v-if="!loading && contacts.length === 0" class="add-members-empty">
          Nenhum contato disponível para adicionar.
        </p>
      </div>

      <footer v-if="selectedIds.length" class="add-members-footer">
        <button
          type="button"
          class="add-members-confirm"
          :disabled="sending || loading"
          @click="$emit('confirm')"
        >
          {{ sending ? 'Adicionando...' : `Adicionar (${selectedIds.length})` }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { Search } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  contacts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  feedback: { type: String, default: '' }
})

defineEmits(['cancel', 'confirm', 'toggle', 'update:searchQuery'])

const isSelected = (id) => props.selectedIds.includes(id)
const contactInitial = (name) => String(name || '?').charAt(0).toUpperCase()
</script>

<style scoped>
.add-members-overlay {
  position: absolute;
  inset: 0;
  z-index: 24;
  background: rgba(11, 20, 26, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.add-members-dialog {
  width: min(440px, calc(100% - 24px));
  max-height: min(620px, calc(100% - 24px));
  border-radius: 4px;
  background: #ffffff;
  color: #111b21;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}
.add-members-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px 12px;
  flex-shrink: 0;
}
.add-members-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 400;
  color: #111b21;
}
.add-members-close {
  border: none;
  background: transparent;
  color: #54656f;
  font-size: 1.15rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.add-members-search-wrap {
  position: relative;
  padding: 0 24px 12px;
  flex-shrink: 0;
}
.add-members-search-icon {
  position: absolute;
  left: 38px;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #54656f;
  pointer-events: none;
}
.add-members-search {
  width: 100%;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #f0f2f5;
  color: #111b21;
  padding: 0 14px 0 36px;
  font-size: 0.92rem;
  outline: none;
}
.add-members-search:focus {
  box-shadow: 0 0 0 1px #008069;
}
.add-members-feedback {
  margin: 0 24px 8px;
  color: #d32f2f;
  font-size: 0.82rem;
  flex-shrink: 0;
}
.add-members-status {
  margin: 0 24px 8px;
  color: #667781;
  font-size: 0.82rem;
  flex-shrink: 0;
}
.add-members-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 8px;
  min-height: 0;
}
.add-members-section-label {
  margin: 0;
  padding: 8px 16px 4px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #008069;
}
.add-members-row {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
}
.add-members-row:hover:not(:disabled) { background: #f5f6f6; }
.add-members-row:disabled { opacity: 0.6; cursor: not-allowed; }
.add-members-check {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 2px solid #8696a0;
  flex-shrink: 0;
  position: relative;
}
.add-members-check.is-selected {
  background: #008069;
  border-color: #008069;
}
.add-members-check.is-selected::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.add-members-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #dfe5e7;
  font-weight: 500;
  color: #54656f;
  flex-shrink: 0;
}
.add-members-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-members-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}
.add-members-main strong {
  font-size: 1rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.add-members-main small {
  color: #667781;
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.add-members-empty {
  margin: 16px;
  color: #667781;
  font-size: 0.88rem;
  text-align: center;
}
.add-members-footer {
  padding: 12px 24px 20px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  border-top: 1px solid #e9edef;
}
.add-members-confirm {
  border: none;
  min-width: 120px;
  height: 40px;
  border-radius: 999px;
  background: #008069;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0 20px;
}
.add-members-confirm:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
