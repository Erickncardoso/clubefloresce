<template>
  <header class="chat-header">
    <div class="chat-contact-info" :class="{ 'is-clickable': Boolean(chat?.isGroup) }" @click="handleInfoClick">
      <div class="chat-avatar">
        <img
          v-if="chat?.avatarUrl"
          :src="chat.avatarUrl"
          :alt="chat.pushName || chat.name || 'Contato'"
          class="avatar-img"
        />
        <User v-else class="icon-medium" />
      </div>
      <div>
        <h3>{{ chat?.pushName || chat?.name || (chat?.chatJid || '').replace('@s.whatsapp.net', '') }}</h3>
        <p class="text-muted text-xs font-mono">{{ (chat?.chatJid || '').replace('@s.whatsapp.net', '') }}</p>
      </div>
    </div>
    <div class="chat-actions">
      <button class="btn-icon" title="Ver Perfil CRM" @click="$emit('open-crm')">
        <Contact class="icon-small text-muted" />
      </button>
      <button class="btn-icon" title="Mais opções" @click="$emit('open-menu')">
        <MoreVertical class="icon-small text-muted" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { User, Contact, MoreVertical } from 'lucide-vue-next'

const props = defineProps({
  chat: { type: Object, default: null }
})

const emit = defineEmits(['open-crm', 'open-menu', 'open-group-info'])

const handleInfoClick = () => {
  if (!props.chat?.isGroup) return
  emit('open-group-info')
}
</script>

<style scoped>
.chat-contact-info.is-clickable {
  cursor: pointer;
}
</style>
