<template>
  <div class="wa-contact-picker">
    <div class="wa-contact-picker__search-wrap">
      <Search class="wa-contact-picker__search-icon" aria-hidden="true" />
      <input
        :value="searchQuery"
        class="wa-contact-picker__search"
        type="search"
        placeholder="Pesquisar nome ou número"
        :disabled="loading"
        @input="$emit('update:searchQuery', $event.target.value)"
        @keydown.enter.prevent="$emit('search')"
      />
    </div>

    <p v-if="selectedCount > 0" class="wa-contact-picker__selected-count">
      {{ selectedCount }} selecionado{{ selectedCount === 1 ? '' : 's' }}
    </p>

    <p v-if="feedback" class="wa-contact-picker__feedback">{{ feedback }}</p>
    <p v-else-if="loading && !contacts.length" class="wa-contact-picker__status">Carregando contatos...</p>

    <div class="wa-contact-picker__list" role="listbox" aria-label="Contatos">
      <button
        v-for="contact in contacts"
        :key="contact.id"
        type="button"
        class="wa-contact-picker__row"
        role="option"
        :aria-selected="isSelected(contact.id)"
        @click="$emit('toggle', contact.id)"
      >
        <span class="wa-contact-picker__check" :class="{ 'is-selected': isSelected(contact.id) }" aria-hidden="true" />
        <span class="wa-contact-picker__avatar">
          <img v-if="contact.avatarUrl" :src="contact.avatarUrl" :alt="contact.name" loading="lazy">
          <span v-else>{{ initial(contact.name) }}</span>
        </span>
        <span class="wa-contact-picker__main">
          <strong>{{ contact.name }}</strong>
          <small>{{ contact.displayNumber || contact.number }}</small>
        </span>
      </button>

      <p v-if="!loading && contacts.length === 0" class="wa-contact-picker__empty">
        Nenhum contato encontrado.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Search } from 'lucide-vue-next'

const props = defineProps({
  contacts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  feedback: { type: String, default: '' },
})

defineEmits(['toggle', 'update:searchQuery', 'search'])

const selectedCount = computed(() => props.selectedIds.length)
const isSelected = (id) => props.selectedIds.includes(id)
const initial = (name) => String(name || '?').charAt(0).toUpperCase()
</script>

<style scoped>
.wa-contact-picker {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.wa-contact-picker__search-wrap {
  position: relative;
}

.wa-contact-picker__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #54656f;
  pointer-events: none;
}

.wa-contact-picker__search {
  width: 100%;
  height: auto;
  min-height: 2.75rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  border: 1.5px solid var(--admin-border, #e8ece9);
  background: #fff;
  color: var(--text-main, #333d3b);
  padding: 0.75rem 14px 0.75rem 36px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.wa-contact-picker__search:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.15);
}

.wa-contact-picker__selected-count {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary, #8B967C);
}

.wa-contact-picker__feedback,
.wa-contact-picker__status,
.wa-contact-picker__empty {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.wa-contact-picker__list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.wa-contact-picker__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.wa-contact-picker__row:last-child {
  border-bottom: none;
}

.wa-contact-picker__row:hover {
  background: #f8fafc;
}

.wa-contact-picker__check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  flex-shrink: 0;
}

.wa-contact-picker__check.is-selected {
  border-color: var(--primary, #8B967C);
  background: var(--primary, #8B967C);
  box-shadow: inset 0 0 0 3px #fff;
}

.wa-contact-picker__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: #e8edf2;
  color: #54656f;
  font-weight: 700;
  font-size: 0.95rem;
}

.wa-contact-picker__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wa-contact-picker__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wa-contact-picker__main strong {
  font-size: 0.92rem;
  font-weight: 600;
  color: #111b21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wa-contact-picker__main small {
  font-size: 0.78rem;
  color: #667781;
}
</style>
