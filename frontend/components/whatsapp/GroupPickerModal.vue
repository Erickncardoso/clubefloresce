<template>
  <div v-if="open" class="group-picker-modal-backdrop" @click.self="$emit('cancel')">
    <div class="group-picker-modal">
      <div class="group-picker-header">
        <button type="button" class="group-picker-close" @click="$emit('cancel')">✕</button>
        <h4>Grupos</h4>
      </div>

      <div class="group-picker-search">
        <Search class="icon-small text-muted" />
        <input
          :value="searchQuery"
          type="text"
          placeholder="Pesquisar grupos"
          :disabled="loading"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
      </div>

      <div class="group-picker-list">
        <button
          v-for="group in groups"
          :key="group.chatJid"
          type="button"
          class="group-picker-item"
          :class="{ selected: selectedGroupJid === group.chatJid }"
          @click="$emit('update:selectedGroupJid', group.chatJid)"
        >
          <div class="group-picker-avatar">
            <img v-if="group.avatarUrl" :src="group.avatarUrl" :alt="group.pushName || group.name || 'Grupo'" />
            <User v-else class="icon-small" />
          </div>
          <div class="group-picker-content">
            <div class="group-picker-name">{{ group.pushName || group.name || group.chatJid }}</div>
            <div class="group-picker-role">{{ group.isAdmin ? 'Você é admin' : 'Você não é admin' }}</div>
          </div>
        </button>

        <div v-if="groups.length === 0" class="group-picker-empty">
          Nenhum grupo encontrado.
        </div>
      </div>

      <p v-if="feedback" class="group-picker-feedback">{{ feedback }}</p>

      <div class="group-picker-actions">
        <button type="button" class="group-picker-cancel" @click="$emit('cancel')">Cancelar</button>
        <button
          type="button"
          class="group-picker-confirm"
          :disabled="!selectedGroupJid || loading"
          @click="$emit('confirm')"
        >
          {{ loading ? 'Adicionando...' : 'Adicionar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Search, User } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  selectedGroupJid: { type: String, default: '' },
  feedback: { type: String, default: '' }
})

defineEmits(['confirm', 'cancel', 'update:searchQuery', 'update:selectedGroupJid'])
</script>
