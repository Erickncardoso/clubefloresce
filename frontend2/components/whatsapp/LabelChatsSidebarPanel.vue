<template>
  <div class="label-chats-sidebar">
    <header class="label-chats-header">
      <template v-if="selectionCount > 0">
        <button type="button" class="label-chats-icon-btn" aria-label="Limpar seleção" @click="$emit('clear-selection')">
          <X class="label-chats-header-icon" />
        </button>
        <h2 class="label-chats-title">{{ selectionLabel }}</h2>
        <div class="label-chats-header-actions">
          <button
            type="button"
            class="label-chats-icon-btn"
            aria-label="Adicionar etiqueta"
            :disabled="bulkSaving"
            @click="$emit('add-label')"
          >
            <Tags class="label-chats-header-icon" />
          </button>
          <button
            type="button"
            class="label-chats-icon-btn"
            aria-label="Remover etiqueta"
            :disabled="bulkSaving"
            @click="$emit('remove-label')"
          >
            <Tag class="label-chats-header-icon label-chats-remove-icon" />
          </button>
        </div>
      </template>

      <template v-else>
        <button type="button" class="label-chats-icon-btn" aria-label="Voltar" @click="$emit('back')">
          <ArrowLeft class="label-chats-header-icon" />
        </button>
        <div class="label-chats-title-wrap">
          <WhatsappLabelTagIcon :color-hex="label?.colorHex" />
          <h2 class="label-chats-title">{{ label?.name || 'Etiqueta' }}</h2>
        </div>
        <span class="label-chats-header-spacer" aria-hidden="true" />
      </template>
    </header>

    <div v-if="loading" class="label-chats-state">
      <Loader class="spin label-chats-loader" />
    </div>

    <div v-else-if="!chats.length" class="label-chats-state">
      <p class="label-chats-empty">Nenhuma conversa com esta etiqueta.</p>
    </div>

    <div v-else class="label-chats-list">
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="label-chat-item"
        :class="{ 'is-selected': isSelected(chat) }"
        @click="onRowClick(chat, $event)"
      >
        <label class="label-chat-check-wrap" @click.stop>
          <input
            type="checkbox"
            class="label-chat-check"
            :checked="isSelected(chat)"
            :aria-label="`Selecionar ${chatDisplayName(chat)}`"
            @change="toggleSelect(chat)"
          />
        </label>

        <div class="label-chat-avatar">
          <img
            v-if="chatAvatarUrl(chat)"
            :src="chatAvatarUrl(chat)"
            :alt="chatDisplayName(chat)"
            class="label-chat-avatar-img"
          />
          <User v-else class="label-chat-avatar-fallback" />
        </div>

        <div class="label-chat-copy">
          <div class="label-chat-top">
            <div class="label-chat-title-row">
              <span class="label-chat-name">{{ chatDisplayName(chat) }}</span>
              <span v-if="chatLabels(chat).length" class="label-chat-tags">
                <span
                  v-for="item in chatLabels(chat)"
                  :key="`${chat.id}-${item.id}`"
                  class="label-chat-tag"
                  :title="item.name"
                >
                  <svg class="label-chat-tag-icon" viewBox="0 0 18 12" aria-hidden="true">
                    <path
                      :fill="item.colorHex"
                      d="M1.25 1.1C1.25.77 1.52.5 1.85.5h7.05c.22 0 .43.09.58.24l6.32 5.26a.75.75 0 0 1 0 1.15L9.48 12.26a.85.85 0 0 1-.58.24H1.85A1.35 1.35 0 0 1 .5 11.15V1.85c0-.41.34-.75.75-.75z"
                    />
                  </svg>
                </span>
              </span>
            </div>
            <span class="label-chat-time">{{ formatListTime(chat.lastMessageTime || chat.timestamp) }}</span>
          </div>
          <p class="label-chat-preview">{{ previewText(chat) || 'Nenhuma mensagem' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowLeft, X, Tags, Tag, Loader, User } from 'lucide-vue-next'
import WhatsappLabelTagIcon from './WhatsappLabelTagIcon.vue'
import { whatsappLabelsById, resolveChatLabelViews } from '~/composables/whatsapp/useWhatsappLabels.js'
import { resolveChatListLastMessage, enrichMissingChatAvatars } from '~/composables/whatsapp/useWhatsappChats.js'
import { resolveChatListDisplayName, resolveChatListAvatarUrl } from '~/composables/whatsapp/useWhatsappContacts.js'

const props = defineProps({
  label: { type: Object, default: null },
  chats: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  bulkSaving: { type: Boolean, default: false },
  formatListTime: { type: Function, required: true },
  chatSelectionKey: { type: Function, required: true },
})

const emit = defineEmits([
  'back',
  'clear-selection',
  'toggle-select',
  'add-label',
  'remove-label',
  'open-chat',
])

const selectionCount = computed(() => (Array.isArray(props.selectedKeys) ? props.selectedKeys.length : 0))

const selectionLabel = computed(() => {
  const count = selectionCount.value
  return count === 1 ? '1 selecionada' : `${count} selecionadas`
})

const chatDisplayName = (chat) => resolveChatListDisplayName(chat)
const chatAvatarUrl = (chat) => resolveChatListAvatarUrl(chat)
const previewText = (chat) => resolveChatListLastMessage(chat)
const chatLabels = (chat) => resolveChatLabelViews(chat, whatsappLabelsById.value)

const isSelected = (chat) => {
  const key = props.chatSelectionKey(chat)
  return Boolean(key && props.selectedKeys.includes(key))
}

const toggleSelect = (chat) => {
  emit('toggle-select', chat)
}

const onRowClick = (chat, event) => {
  if (event?.target instanceof Element && event.target.closest('.label-chat-check-wrap')) return
  if (selectionCount.value > 0) {
    toggleSelect(chat)
    return
  }
  emit('open-chat', chat)
}
</script>

<style scoped>
.label-chats-sidebar {
  position: absolute;
  inset: 0;
  z-index: 19;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
}

.label-chats-header {
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

.label-chats-header:has(.label-chats-header-actions) {
  grid-template-columns: 40px 1fr auto;
}

.label-chats-title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.label-chats-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-chats-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.label-chats-header-spacer {
  width: 40px;
  height: 40px;
}

.label-chats-icon-btn {
  position: relative;
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

.label-chats-icon-btn:hover:not(:disabled) {
  background: rgba(11, 20, 26, 0.06);
}

.label-chats-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.label-chats-header-icon {
  width: 20px;
  height: 20px;
}

.label-chats-remove-icon {
  position: relative;
}

.label-chats-icon-btn:has(.label-chats-remove-icon)::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 2px;
  background: currentColor;
  transform: rotate(-35deg);
  border-radius: 999px;
  pointer-events: none;
}

.label-chats-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.label-chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px 12px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  background: #fff;
}

.label-chat-item:hover,
.label-chat-item.is-selected {
  background: #f5f6f6;
}

.label-chat-check-wrap {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
}

.label-chat-check {
  width: 18px;
  height: 18px;
  accent-color: #111b21;
  cursor: pointer;
}

.label-chat-avatar {
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

.label-chat-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.label-chat-avatar-fallback {
  width: 24px;
  height: 24px;
  color: #8696a0;
}

.label-chat-copy {
  min-width: 0;
  flex: 1;
}

.label-chat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.label-chat-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.label-chat-name {
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-chat-tags {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.label-chat-tag-icon {
  width: 16px;
  height: 11px;
  display: block;
}

.label-chat-time {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: #667781;
}

.label-chat-preview {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #667781;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-chats-state {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.label-chats-empty {
  margin: 0;
  color: #667781;
  font-size: 0.92rem;
  text-align: center;
}

.label-chats-loader {
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
