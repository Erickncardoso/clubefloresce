<template>
  <aside class="chat-sidebar">
    <div class="sidebar-header">
      <h2 class="text-gradient">Chats</h2>
      <div class="header-actions">
        <button
          v-if="totalUnread > 0"
          class="btn-icon mark-all-read-btn"
          :title="`Marcar todos como lido (${totalUnread})`"
          :disabled="markingAllRead"
          @click="handleMarkAllRead"
        >
          <CheckCheck :class="{ spin: markingAllRead }" class="icon-small text-primary" />
        </button>
        <button class="btn-icon" title="Atualizar" @click="$emit('refresh')">
          <RefreshCw :class="{ spin: loading }" class="icon-small text-muted" />
        </button>
        <button class="btn-icon" title="Novo Chat">
          <MessageSquarePlus class="icon-small text-muted" />
        </button>
        <div ref="chatMenuRoot" class="chat-menu-root">
          <button
            class="btn-icon"
            title="Mais opções"
            :aria-expanded="chatMenuOpen ? 'true' : 'false'"
            @click.stop="toggleChatMenu"
          >
            <MoreVertical class="icon-small text-muted" />
          </button>
          <div v-if="chatMenuOpen" class="chat-header-menu" role="menu">
            <button
              v-for="item in chatHeaderMenuItems"
              :key="item.id"
              class="chat-header-menu-item"
              role="menuitem"
              @click="selectHeaderMenuItem(item.id)"
            >
              <component :is="item.icon" class="chat-header-menu-icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="search-box">
      <Search class="icon-small text-muted" />
      <input
        :value="modelValue"
        type="text"
        placeholder="Pesquisar conversas..."
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <div v-if="!loading" class="chat-list">
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="chat-item"
        :class="{ active: isActive(chat) }"
        @click="$emit('select', chat)"
      >
        <div class="chat-avatar">
          <img
            v-if="chat.avatarUrl"
            :src="chat.avatarUrl"
            :alt="chat.pushName || chat.name || 'Contato'"
            class="avatar-img"
          />
          <User v-else class="icon-medium" />
        </div>
        <div class="chat-info">
          <div class="chat-top">
            <h4>{{ chat.pushName || chat.name || (chat.id || '').replace('@s.whatsapp.net', '') }}</h4>
            <span class="chat-time text-muted text-xs">{{ formatTime(chat.lastMessageTime || chat.timestamp) }}</span>
          </div>
          <div class="chat-bottom">
            <p class="last-message text-muted">
              <span v-if="previewPrefix(chat)" class="last-message-prefix">{{ previewPrefix(chat) }}</span>
              <component
                :is="mediaPreviewIcon(chat.lastMessage)"
                v-if="mediaPreviewIcon(chat.lastMessage)"
                class="chat-preview-media-icon"
                aria-hidden="true"
              />
              {{ chat.lastMessage || 'Nenhuma mensagem' }}
            </p>
            <div class="chat-meta-right">
              <Pin v-if="chat.isPinned" class="chat-pin-icon is-active" />
              <span v-if="chat.unreadCount > 0" class="unread-badge">{{ chat.unreadCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="chats.length === 0" class="empty-state-mini">
        <p class="text-muted text-sm">Nenhum chat encontrado.</p>
      </div>
    </div>

    <div v-else class="loading-state-mini">
      <Loader class="spin icon-medium text-primary" />
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  RefreshCw,
  MessageSquarePlus,
  MoreVertical,
  Search,
  User,
  Pin,
  Loader,
  CheckCheck,
  Image as ImageIcon,
  Video,
  FileText,
  Sticker,
  Mic,
  UsersRound,
  Star,
  CheckSquare,
  Lock,
  LogOut
} from 'lucide-vue-next'

const props = defineProps({
  chats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
  isActive: { type: Function, required: true },
  previewPrefix: { type: Function, required: true },
  formatTime: { type: Function, required: true },
  onMarkAllRead: { type: Function, default: null }
})

const emit = defineEmits(['select', 'refresh', 'update:modelValue', 'mark-all-read', 'header-menu-action'])

const markingAllRead = ref(false)
const chatMenuOpen = ref(false)
const chatMenuRoot = ref(null)

const chatHeaderMenuItems = [
  { id: 'new-group', label: 'Novo grupo', icon: UsersRound },
  { id: 'favorites', label: 'Mensagens favoritas', icon: Star },
  { id: 'select-chats', label: 'Selecionar conversas', icon: CheckSquare },
  { id: 'mark-all-read', label: 'Marcar todas como lidas', icon: CheckCheck },
  { id: 'app-lock', label: 'Bloqueio do app', icon: Lock },
  { id: 'disconnect', label: 'Desconectar', icon: LogOut }
]

const totalUnread = computed(() =>
  props.chats.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
)

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

const closeChatMenu = () => { chatMenuOpen.value = false }
const toggleChatMenu = () => { chatMenuOpen.value = !chatMenuOpen.value }

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
  if (!root) return
  if (root.contains(event.target)) return
  closeChatMenu()
}

const onGlobalKeydown = (event) => {
  if (event.key === 'Escape') closeChatMenu()
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
  document.addEventListener('keydown', onGlobalKeydown, true)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  document.removeEventListener('keydown', onGlobalKeydown, true)
})
</script>

<style scoped>
.chat-menu-root {
  position: relative;
}

.chat-header-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 250px;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0f1418;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  z-index: 40;
}

.chat-header-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #f4f7fa;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.chat-header-menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.chat-header-menu-icon {
  width: 17px;
  height: 17px;
  color: #e6ebf0;
  flex-shrink: 0;
}
</style>
