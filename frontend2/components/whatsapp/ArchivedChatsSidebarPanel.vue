<template>
  <div class="archived-chats-sidebar">
    <header class="archived-chats-header">
      <button type="button" class="archived-chats-icon-btn" aria-label="Voltar" @click="$emit('close')">
        <ArrowLeft class="archived-chats-header-icon" />
      </button>
      <h2 class="archived-chats-title">Arquivadas</h2>
      <span class="archived-chats-header-spacer" aria-hidden="true" />
    </header>

    <p class="archived-chats-hint">
      Essas conversas são desarquivadas quando você recebe novas mensagens. Para mudar essa configuração,
      abra o WhatsApp no seu celular e acesse
      <strong>Configurações &gt; Conversas</strong>.
    </p>

    <div v-if="loading" class="archived-chats-state">
      <Loader class="spin archived-chats-loader" />
    </div>

    <div v-else-if="!chats.length" class="archived-chats-state">
      <p class="archived-chats-empty">Nenhuma conversa arquivada.</p>
    </div>

    <div v-else class="archived-chats-list">
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="archived-chat-item"
        :class="{ 'is-context-open': contextMenuChat?.id === chat.id }"
        role="button"
        tabindex="0"
        @click="onChatClick(chat)"
        @keydown.enter.prevent="onChatClick(chat)"
      >
        <div class="archived-chat-avatar">
          <img
            v-if="chatAvatarUrl(chat)"
            :src="chatAvatarUrl(chat)"
            :alt="chatDisplayName(chat)"
            class="archived-chat-avatar-img"
          />
          <User v-else class="archived-chat-avatar-fallback" />
        </div>

        <div class="archived-chat-copy">
          <div class="archived-chat-top">
            <span class="archived-chat-name">{{ chatDisplayName(chat) }}</span>
            <div class="archived-chat-meta">
              <span class="archived-chat-time">{{ formatListTime(chat.lastMessageTime || chat.timestamp) }}</span>
              <div class="archived-chat-meta-bottom">
                <BellOff v-if="isChatMuted(chat)" class="archived-chat-mute-icon" aria-label="Silenciada" />
                <button
                  type="button"
                  class="archived-chat-chevron"
                  aria-label="Opções da conversa"
                  :aria-expanded="contextMenuChat?.id === chat.id ? 'true' : 'false'"
                  @click.stop="openContextMenu(chat, $event)"
                >
                  <ChevronDown class="archived-chat-chevron-icon" />
                </button>
              </div>
            </div>
          </div>
          <p class="archived-chat-preview">{{ previewText(chat) || 'Nenhuma mensagem' }}</p>
        </div>
      </div>
    </div>

    <ChatListContextMenu
      :chat="contextMenuChat"
      :anchor-rect="contextMenuAnchor"
      archived-view
      @select="onContextMenuAction"
      @close="closeContextMenu"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Loader, User, BellOff, ChevronDown } from 'lucide-vue-next'
import ChatListContextMenu from '~/components/whatsapp/ChatListContextMenu.vue'
import {
  resolveChatListLastMessage,
  resolveChatListPresencePreview,
} from '~/composables/whatsapp/useWhatsappChats.js'
import {
  resolveChatListDisplayName,
  resolveChatListAvatarUrl,
} from '~/composables/whatsapp/useWhatsappContacts.js'
import { resolveChatIsMuted } from '~/composables/whatsapp/useWhatsappUtils.js'
import { runChatListContextAction } from '~/composables/whatsapp/useWhatsappChatListActions.js'

defineProps({
  chats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  formatListTime: { type: Function, required: true },
})

const emit = defineEmits(['close', 'select'])

const contextMenuChat = ref(null)
const contextMenuAnchor = ref(null)

const chatDisplayName = (chat) => resolveChatListDisplayName(chat)
const chatAvatarUrl = (chat) => resolveChatListAvatarUrl(chat)
const previewText = (chat) => resolveChatListPresencePreview(chat) || resolveChatListLastMessage(chat)
const isChatMuted = (chat) => resolveChatIsMuted(chat)

const onChatClick = (chat) => {
  emit('select', chat)
}

const closeContextMenu = () => {
  contextMenuChat.value = null
  contextMenuAnchor.value = null
}

const openContextMenu = (chat, event) => {
  if (contextMenuChat.value?.id === chat.id) {
    closeContextMenu()
    return
  }
  const target = event?.currentTarget
  const rect = target?.getBoundingClientRect?.()
  if (!rect) return
  contextMenuChat.value = chat
  contextMenuAnchor.value = {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

const onContextMenuAction = (actionId) => {
  const chat = contextMenuChat.value
  closeContextMenu()
  if (!chat) return
  runChatListContextAction(actionId, chat)
}

const onGlobalKeydown = (event) => {
  if (event.key === 'Escape') closeContextMenu()
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('keydown', onGlobalKeydown, true)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onGlobalKeydown, true)
})
</script>

<style scoped>
.archived-chats-sidebar {
  position: absolute;
  inset: 0;
  z-index: 18;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
}

.archived-chats-header {
  flex-shrink: 0;
  min-height: 59px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e9edef;
  box-sizing: border-box;
}

.archived-chats-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archived-chats-header-spacer {
  width: 40px;
  height: 40px;
}

.archived-chats-icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.archived-chats-icon-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.archived-chats-header-icon {
  width: 20px;
  height: 20px;
}

.archived-chats-hint {
  flex-shrink: 0;
  margin: 0;
  padding: 14px 20px 16px;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #667781;
  border-bottom: 1px solid #e9edef;
}

.archived-chats-hint strong {
  font-weight: 600;
  color: #54656f;
}

.archived-chats-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.archived-chat-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f5;
  background: #fff;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.archived-chat-item:hover,
.archived-chat-item.is-context-open {
  background: #f5f6f6;
}

.archived-chat-item.is-context-open {
  background: #f0f2f5;
}

.archived-chat-avatar {
  width: 49px;
  height: 49px;
  border-radius: 999px;
  overflow: hidden;
  background: #dfe5e7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.archived-chat-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.archived-chat-avatar-fallback {
  width: 24px;
  height: 24px;
  color: #8696a0;
}

.archived-chat-copy {
  min-width: 0;
  flex: 1;
}

.archived-chat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.archived-chat-name {
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archived-chat-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.archived-chat-meta-bottom {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-height: 22px;
}

.archived-chat-chevron {
  display: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  flex-shrink: 0;
}

.archived-chat-chevron-icon {
  width: 18px;
  height: 18px;
}

.archived-chat-item:hover .archived-chat-chevron,
.archived-chat-item.is-context-open .archived-chat-chevron {
  display: inline-flex;
}

.archived-chat-item:hover .archived-chat-chevron:hover,
.archived-chat-item.is-context-open .archived-chat-chevron {
  background: rgba(11, 20, 26, 0.06);
}

.archived-chat-time {
  font-size: 0.75rem;
  color: #667781;
}

.archived-chat-mute-icon {
  width: 16px;
  height: 16px;
  color: #8696a0;
}

.archived-chat-preview {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #667781;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archived-chats-state {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.archived-chats-empty {
  margin: 0;
  color: #667781;
  font-size: 0.92rem;
  text-align: center;
}

.archived-chats-loader {
  width: 28px;
  height: 28px;
  color: #1daa61;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
