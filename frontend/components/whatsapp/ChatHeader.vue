<template>
  <header class="chat-header">
    <template v-if="searchOpen">
      <button type="button" class="btn-icon chat-header-action" title="Voltar" @click="closeSearch">
        <ArrowLeft class="icon-small text-muted" />
      </button>
      <div class="chat-header-search">
        <Search class="icon-small text-muted chat-header-search-icon" />
        <input
          ref="searchInputRef"
          :value="messageSearchQuery"
          type="text"
          class="chat-header-search-input"
          placeholder="Pesquisar mensagens"
          @input="$emit('update:messageSearchQuery', $event.target.value)"
          @keydown.esc.prevent="closeSearch"
        />
      </div>
    </template>

    <template v-else>
      <button
        type="button"
        class="chat-contact-info chat-contact-btn"
        :disabled="!chat"
        :title="isGroupChat ? 'Dados do grupo' : 'Dados do contato'"
        @click="handleInfoClick"
      >
        <span class="chat-avatar chat-header-avatar">
          <img
            v-if="chat?.avatarUrl"
            :src="chat.avatarUrl"
            :alt="displayTitle"
            class="avatar-img"
          />
          <User v-else class="icon-medium" />
        </span>
        <span class="chat-contact-text">
          <h3>{{ displayTitle }}</h3>
        </span>
      </button>
      <div class="chat-actions">
        <button class="btn-icon chat-header-action" title="Pesquisar mensagens" @click="openSearch">
          <Search class="icon-small text-muted" />
        </button>
        <button class="btn-icon chat-header-action" title="Mais opções" @click="$emit('open-menu')">
          <MoreVertical class="icon-small text-muted" />
        </button>
      </div>
    </template>
  </header>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { User, MoreVertical, Search, ArrowLeft } from 'lucide-vue-next'
import { isGroupJid } from '~/composables/whatsapp/useWhatsappUtils.js'
import { resolveChatListDisplayName } from '~/composables/whatsapp/useWhatsappContacts.js'

const props = defineProps({
  chat: { type: Object, default: null },
  messageSearchQuery: { type: String, default: '' }
})

const emit = defineEmits([
  'open-menu',
  'open-group-info',
  'open-contact-info',
  'update:messageSearchQuery',
  'search-open-change'
])

const searchOpen = ref(false)
const searchInputRef = ref(null)

const isGroupChat = computed(() => {
  if (!props.chat) return false
  return Boolean(props.chat.isGroup || props.chat.wa_isGroup) || isGroupJid(props.chat.chatJid || props.chat.wa_chatid || props.chat.chatid || '')
})

const displayTitle = computed(() =>
  props.chat ? resolveChatListDisplayName(props.chat) : ''
)

const openSearch = async () => {
  searchOpen.value = true
  emit('search-open-change', true)
  await nextTick()
  searchInputRef.value?.focus()
}

const closeSearch = () => {
  searchOpen.value = false
  emit('update:messageSearchQuery', '')
  emit('search-open-change', false)
}

const handleInfoClick = () => {
  if (!props.chat) return
  if (isGroupChat.value) {
    emit('open-group-info')
    return
  }
  emit('open-contact-info')
}
</script>

<style scoped>
.chat-contact-btn {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  flex: 1;
}
.chat-contact-btn:disabled {
  cursor: default;
}
.chat-contact-btn:not(:disabled):hover {
  opacity: 0.88;
}
.chat-contact-text {
  min-width: 0;
}
.chat-contact-text h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-header-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  background: #fff;
}
.chat-header-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #111b21;
}
.chat-header-search-icon {
  flex-shrink: 0;
}
</style>
