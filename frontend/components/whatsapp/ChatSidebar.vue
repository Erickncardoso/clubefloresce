<template>
  <aside class="chat-sidebar">
    <div class="chat-sidebar-stack">
    <div class="chat-sidebar-main">
    <div class="chat-sidebar-top">
    <div class="sidebar-header">
      <h2>WhatsApp</h2>
      <div class="header-actions">
        <button class="btn-icon" title="Nova conversa">
          <MessageSquarePlus class="icon-small" />
        </button>
        <div ref="chatMenuRoot" class="chat-menu-root">
          <button
            ref="chatMenuTriggerRef"
            class="btn-icon"
            title="Mais opções"
            :aria-expanded="chatMenuOpen ? 'true' : 'false'"
            @click.stop="toggleChatMenu"
          >
            <MoreVertical class="icon-small" />
          </button>
          <Teleport to="body">
            <div
              v-if="chatMenuOpen"
              ref="chatHeaderMenuEl"
              class="chat-header-menu"
              :style="chatHeaderMenuStyle"
              role="menu"
              @click.stop
              @mousedown.stop
            >
              <template v-for="(item, index) in chatHeaderMenuItems" :key="item.type === 'separator' ? `sep-${index}` : item.id">
                <div
                  v-if="item.type === 'separator'"
                  class="chat-header-menu-separator"
                  role="separator"
                />
                <button
                  v-else
                  type="button"
                  class="chat-header-menu-item"
                  role="menuitem"
                  @click="selectHeaderMenuItem(item.id)"
                >
                  <component :is="item.icon" class="chat-header-menu-icon" />
                  <span>{{ item.label }}</span>
                </button>
              </template>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <div class="search-box">
      <Search class="icon-small" />
      <input
        :value="modelValue"
        type="text"
        placeholder="Pesquisar ou começar uma nova conversa"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <div class="chat-filters" role="tablist" aria-label="Filtrar conversas">
      <button
        v-for="filter in chatFilters"
        :key="filter.id"
        type="button"
        class="chat-filter-pill"
        :class="{ 'is-active': listFilter === filter.id }"
        role="tab"
        :aria-selected="listFilter === filter.id ? 'true' : 'false'"
        @click="$emit('update:listFilter', filter.id)"
      >
        {{ filter.label }}
      </button>
    </div>
    </div>

    <div
      v-if="initialSyncActive"
      class="chat-initial-sync-banner"
      role="status"
      aria-live="polite"
    >
      <Loader class="chat-initial-sync-banner__icon spin icon-small" aria-hidden="true" />
      <div class="chat-initial-sync-banner__copy">
        <strong>Mantenha o celular aberto com o WhatsApp ativo</strong>
        <p>
          Estamos sincronizando suas conversas{{ initialSyncChatCount ? ` (${initialSyncChatCount} encontradas)` : '' }}.
          Não feche o WhatsApp no aparelho até concluir{{ initialSyncElapsed ? ` · ${initialSyncElapsed}` : '' }}.
        </p>
      </div>
    </div>

    <div v-if="!loading" class="chat-list-scroll">
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="chat-item"
        :class="{
          active: isActive(chat),
          'is-context-open': contextMenuChat?.id === chat.id,
          'has-unread': Number(chat.unreadCount || 0) > 0 && !isActive(chat),
        }"
        @click="$emit('select', chat)"
      >
        <div class="chat-avatar">
          <img
            v-if="chatAvatarUrl(chat)"
            :src="chatAvatarUrl(chat)"
            :alt="chatDisplayName(chat)"
            class="avatar-img"
          />
          <User v-else class="icon-medium" />
        </div>
        <div class="chat-info">
          <div class="chat-top">
            <div class="chat-title-row">
              <h4 class="chat-display-name">{{ chatDisplayName(chat) }}</h4>
              <span v-if="chatLabels(chat).length" class="chat-label-tags">
                <span
                  v-for="label in chatLabels(chat)"
                  :key="`${chat.id}-${label.id}`"
                  class="chat-label-tag"
                  :title="label.name"
                  :aria-label="label.name"
                >
                  <svg class="chat-label-icon" viewBox="0 0 18 12" aria-hidden="true">
                    <path
                      :fill="label.colorHex"
                      d="M1.25 1.1C1.25.77 1.52.5 1.85.5h7.05c.22 0 .43.09.58.24l6.32 5.26a.75.75 0 0 1 0 1.15L9.48 12.26a.85.85 0 0 1-.58.24H1.85A1.35 1.35 0 0 1 .5 11.15V1.85c0-.41.34-.75.75-.75z"
                    />
                  </svg>
                </span>
              </span>
            </div>
            <div class="chat-top-meta">
              <span class="chat-time text-muted text-xs">{{ formatListTime(chat.lastMessageTime || chat.timestamp) }}</span>
              <button
                type="button"
                class="chat-item-chevron"
                aria-label="Opções da conversa"
                :aria-expanded="contextMenuChat?.id === chat.id ? 'true' : 'false'"
                @click.stop="openContextMenu(chat, $event)"
              >
                <ChevronDown class="chat-item-chevron-icon" />
              </button>
            </div>
          </div>
          <div class="chat-bottom">
            <p class="last-message" :class="{ 'last-message--presence': isPresencePreview(chat) }">
              <WhatsappDeliveryTicks
                v-if="showPreviewTicks(chat)"
                :status="previewDeliveryStatus(chat)"
                class="chat-preview-ticks"
              />
              <span v-if="previewPrefix(chat) && !isPresencePreview(chat)" class="last-message-prefix">{{ previewPrefix(chat) }}</span>
              <component
                :is="mediaPreviewIcon(previewText(chat))"
                v-if="!isPresencePreview(chat) && mediaPreviewIcon(previewText(chat))"
                class="chat-preview-media-icon"
                aria-hidden="true"
              />
              <span class="last-message-text">{{ previewText(chat) || 'Nenhuma mensagem' }}</span>
            </p>
            <div class="chat-meta-right">
              <span
                v-if="Number(chat.unreadCount || 0) > 0 && !isActive(chat)"
                class="unread-badge"
                :class="{ 'unread-badge--compact': Number(chat.unreadCount) <= 9 }"
                :aria-label="`${chat.unreadCount} mensagens não lidas`"
              >{{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}</span>
              <Pin v-if="chat.isPinned" class="chat-pin-icon is-active" aria-label="Conversa fixada" />
              <BellOff v-if="isChatMuted(chat)" class="chat-mute-icon" aria-label="Conversa silenciada" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="chats.length === 0" class="empty-state-mini">
        <p class="text-muted text-sm">Nenhum chat encontrado.</p>
        <p v-if="!initialSyncActive" class="text-muted text-xs empty-state-mini__hint">
          Se você acabou de conectar, aguarde a sincronização com o celular aberto.
        </p>
      </div>
    </div>

    <div v-else class="chat-list-scroll chat-list-scroll--center">
      <Loader class="spin icon-medium text-primary" />
    </div>

    <ChatListContextMenu
      :chat="contextMenuChat"
      :anchor-rect="contextMenuAnchor"
      @select="onContextMenuAction"
      @close="closeContextMenu"
    />
    </div>

    </div>
  </aside>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  MessageSquarePlus,
  MoreVertical,
  Search,
  User,
  Pin,
  BellOff,
  ChevronDown,
  Loader,
  CheckCheck,
  Image as ImageIcon,
  Video,
  FileText,
  Sticker,
  Mic,
  UsersRound,
  Archive,
  MessageSquareReply,
  Star,
  Tag,
  Lock,
  LogOut
} from 'lucide-vue-next'
import { whatsappLabelsById, resolveChatLabelViews } from '~/composables/whatsapp/useWhatsappLabels.js'
import {
  resolveChatListLastMessage,
  chatListDeliveryStatus,
  shouldShowChatListPreviewTicks,
  resolveChatListPresencePreview
} from '~/composables/whatsapp/useWhatsappChats.js'
import { resolveChatListDisplayName, resolveChatListAvatarUrl } from '~/composables/whatsapp/useWhatsappContacts.js'
import WhatsappDeliveryTicks from '~/components/whatsapp/WhatsappDeliveryTicks.vue'
import ChatListContextMenu from '~/components/whatsapp/ChatListContextMenu.vue'
import { runChatListContextAction } from '~/composables/whatsapp/useWhatsappChatListActions.js'
import { resolveChatIsMuted } from '~/composables/whatsapp/useWhatsappUtils.js'

const props = defineProps({
  chats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  initialSyncActive: { type: Boolean, default: false },
  initialSyncChatCount: { type: Number, default: 0 },
  initialSyncElapsed: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  listFilter: { type: String, default: 'all' },
  isActive: { type: Function, required: true },
  previewPrefix: { type: Function, required: true },
  formatTime: { type: Function, required: true },
  formatListTime: { type: Function, required: true },
  onMarkAllRead: { type: Function, default: null },
})

const emit = defineEmits([
  'select',   'refresh', 'update:modelValue', 'update:listFilter', 'mark-all-read', 'header-menu-action',
])

const markingAllRead = ref(false)
const chatMenuOpen = ref(false)
const isChatMuted = (chat) => resolveChatIsMuted(chat)
const CHAT_HEADER_MENU_WIDTH = 280

const chatMenuRoot = ref(null)
const chatMenuTriggerRef = ref(null)
const chatHeaderMenuEl = ref(null)
const chatHeaderMenuStyle = ref({})
const contextMenuChat = ref(null)
const contextMenuAnchor = ref(null)

const chatFilters = [
  { id: 'all', label: 'Tudo' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'groups', label: 'Grupos' }
]

const chatHeaderMenuItems = [
  { id: 'new-group', label: 'Novo grupo', icon: UsersRound },
  { id: 'archived', label: 'Arquivadas', icon: Archive },
  { id: 'quick-replies', label: 'Respostas rápidas', icon: MessageSquareReply },
  { id: 'favorites', label: 'Mensagens favoritas', icon: Star },
  { id: 'labels', label: 'Etiquetas', icon: Tag },
  { id: 'mark-all-read', label: 'Marcar todas como lidas', icon: CheckCheck },
  { id: 'wallpaper', label: 'Papel de parede', icon: ImageIcon },
  { type: 'separator' },
  { id: 'app-lock', label: 'Bloqueio do app', icon: Lock },
  { id: 'disconnect', label: 'Desconectar', icon: LogOut }
]

const chatDisplayName = (chat) => resolveChatListDisplayName(chat)
const chatAvatarUrl = (chat) => resolveChatListAvatarUrl(chat)
const chatLabels = (chat) => resolveChatLabelViews(chat, whatsappLabelsById.value)
const previewText = (chat) => resolveChatListPresencePreview(chat) || resolveChatListLastMessage(chat)
const isPresencePreview = (chat) => Boolean(resolveChatListPresencePreview(chat))
const showPreviewTicks = (chat) => shouldShowChatListPreviewTicks(chat)
const previewDeliveryStatus = (chat) => chatListDeliveryStatus(chat)

const handleMarkAllRead = async () => {
  if (markingAllRead.value) return
  markingAllRead.value = true
  try {
    if (props.onMarkAllRead) await props.onMarkAllRead()
  } finally {
    markingAllRead.value = false
  }
}

const mediaPreviewIcon = (lastMessage) => {
  const text = String(lastMessage || '').trim().toLowerCase()
  if (!text) return null
  if (text === 'foto' || text === 'imagem') return ImageIcon
  if (text === 'vídeo' || text === 'video') return Video
  if (text === 'documento') return FileText
  if (text === 'figurinha') return Sticker
  if (text === 'áudio' || text === 'audio') return Mic
  return null
}

const updateChatHeaderMenuPosition = () => {
  const trigger = chatMenuTriggerRef.value
  const sidebar = chatMenuRoot.value?.closest?.('.chat-sidebar')
  if (!trigger || !chatMenuOpen.value || !sidebar) return

  const sidebarRect = sidebar.getBoundingClientRect()
  const headerRect = sidebar.querySelector('.sidebar-header')?.getBoundingClientRect()
  const inset = 8
  const left = sidebarRect.right - CHAT_HEADER_MENU_WIDTH - inset
  const top = (headerRect?.bottom ?? trigger.getBoundingClientRect().bottom) + 8

  chatHeaderMenuStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${CHAT_HEADER_MENU_WIDTH}px`,
    zIndex: 10050,
  }
}

const closeChatMenu = () => { chatMenuOpen.value = false }
const toggleChatMenu = () => {
  chatMenuOpen.value = !chatMenuOpen.value
}

watch(chatMenuOpen, (open) => {
  if (!open) return
  nextTick(updateChatHeaderMenuPosition)
})

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

const selectHeaderMenuItem = async (actionId) => {
  closeChatMenu()
  if (actionId === 'mark-all-read') {
    await handleMarkAllRead()
    return
  }
  emit('header-menu-action', actionId)
}

const onGlobalPointerDown = (event) => {
  if (!chatMenuOpen.value) return
  const root = chatMenuRoot.value
  const menu = chatHeaderMenuEl.value
  if (root?.contains(event.target) || menu?.contains(event.target)) return
  closeChatMenu()
}

const onViewportChange = () => {
  if (chatMenuOpen.value) updateChatHeaderMenuPosition()
}

const onGlobalKeydown = (event) => {
  if (event.key === 'Escape') {
    closeChatMenu()
    closeContextMenu()
  }
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
  document.addEventListener('keydown', onGlobalKeydown, true)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  document.removeEventListener('keydown', onGlobalKeydown, true)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.chat-sidebar-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.chat-sidebar-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.chat-menu-root {
  position: relative;
}
</style>
