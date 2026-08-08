<template>
  <div v-if="open" class="send-contacts-backdrop" @click.self="$emit('cancel')">
    <section class="send-contacts-modal" role="dialog" aria-modal="true" aria-label="Enviar contatos">
      <header class="send-contacts-header">
        <button type="button" class="send-contacts-close" @click="$emit('cancel')">✕</button>
        <h3>Enviar contatos</h3>
      </header>

      <div class="send-contacts-search-wrap">
        <input
          :value="searchQuery"
          class="send-contacts-search"
          type="text"
          placeholder="Pesquisar nome ou número"
          :disabled="sending"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
      </div>

      <p v-if="feedback" class="send-contacts-feedback">{{ feedback }}</p>

      <div class="send-contacts-list">
        <button
          v-for="contact in contacts"
          :key="contact.id"
          type="button"
          class="send-contacts-row"
          :disabled="sending"
          @click="$emit('toggle', contact.id)"
        >
          <span class="send-contacts-check" :class="{ 'is-selected': isSelected(contact.id) }" />
          <span class="send-contacts-avatar">
            <img v-if="contact.avatarUrl" :src="contact.avatarUrl" :alt="contact.name" />
            <span v-else>{{ contact.name.charAt(0).toUpperCase() }}</span>
          </span>
          <span class="send-contacts-main">
            <strong>{{ contact.name }}</strong>
            <small v-if="contact.subtitle">{{ contact.subtitle }}</small>
          </span>
        </button>
      </div>

      <footer class="send-contacts-footer">
        <button type="button" class="send-contacts-confirm" :disabled="sending || !selectedIds.length" @click="$emit('confirm')">
          {{ sending ? 'Enviando...' : 'Enviar contato(s)' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  contacts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  feedback: { type: String, default: '' }
})

defineEmits(['cancel', 'confirm', 'toggle', 'update:searchQuery'])

const isSelected = (id) => props.selectedIds.includes(id)
</script>

<style scoped>
.send-contacts-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.52); z-index: 10090; display: flex; justify-content: center; align-items: center; padding: 14px; }
.send-contacts-modal { width: min(430px, 100%); max-height: 88vh; border-radius: 16px; background: #111b21; color: #e9edef; display: flex; flex-direction: column; overflow: hidden; }
.send-contacts-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px 8px; }
.send-contacts-header h3 { margin: 0; font-size: 1.35rem; font-weight: 700; }
.send-contacts-close { border: none; background: transparent; color: #e9edef; font-size: 1.1rem; cursor: pointer; }
.send-contacts-search-wrap { padding: 0 16px 10px; }
.send-contacts-search { width: 100%; height: 44px; border-radius: 999px; border: 2px solid #00a884; background: transparent; color: #e9edef; padding: 0 16px; font-size: 0.98rem; }
.send-contacts-feedback { margin: 0 16px 10px; color: #fca5a5; font-size: 0.85rem; }
.send-contacts-list { padding: 0 10px 10px; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
.send-contacts-row { width: 100%; border: none; background: transparent; color: inherit; padding: 10px 8px; border-radius: 10px; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; }
.send-contacts-row:hover { background: rgba(255, 255, 255, 0.04); }
.send-contacts-check { width: 16px; height: 16px; border-radius: 4px; border: 2px solid rgba(233, 237, 237, 0.5); }
.send-contacts-check.is-selected { background: #00a884; border-color: #00a884; }
.send-contacts-avatar { width: 52px; height: 52px; border-radius: 999px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; background: #22303a; font-weight: 700; }
.send-contacts-avatar img { width: 100%; height: 100%; object-fit: cover; }
.send-contacts-main { display: inline-flex; flex-direction: column; min-width: 0; }
.send-contacts-main strong { font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.send-contacts-main small { color: #9ca3af; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.send-contacts-footer { padding: 12px 16px 16px; }
.send-contacts-confirm { width: 100%; border: none; height: 44px; border-radius: 999px; background: #00a884; color: #052e16; font-weight: 700; cursor: pointer; }
.send-contacts-confirm:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
