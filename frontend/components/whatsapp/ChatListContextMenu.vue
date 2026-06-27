<template>
  <Teleport to="body">
    <div
      v-if="chat && anchorRect"
      ref="menuRoot"
      class="chat-context-menu"
      :style="menuStyle"
      role="menu"
      @click.stop
      @mousedown.stop
    >
      <template v-for="item in staticMenuItems" :key="item.id">
        <!-- Silenciar: submenu ou reativar -->
        <div
          v-if="item.id === 'mute' && !item.isMuted"
          class="chat-context-menu-item-wrap"
          @mouseenter="muteSubmenuOpen = true"
          @mouseleave="muteSubmenuOpen = false"
        >
          <button
            type="button"
            class="chat-context-menu-item chat-context-menu-item--has-sub"
            role="menuitem"
            aria-haspopup="true"
            :aria-expanded="muteSubmenuOpen ? 'true' : 'false'"
          >
            <component :is="item.icon" class="chat-context-menu-icon" aria-hidden="true" />
            <span class="chat-context-menu-copy">
              <span class="chat-context-menu-label">{{ item.label }}</span>
            </span>
            <ChevronRight class="chat-context-menu-chevron" aria-hidden="true" />
          </button>
          <div v-show="muteSubmenuOpen" class="chat-context-submenu" role="menu">
            <button
              v-for="opt in muteDurationOptions"
              :key="opt.code"
              type="button"
              class="chat-context-submenu-item"
              role="menuitem"
              @click="onSelect(`mute:${opt.code}`)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <button
          v-else-if="item.id === 'mute' && item.isMuted"
          type="button"
          class="chat-context-menu-item"
          role="menuitem"
          @click="onSelect('mute:0')"
        >
          <component :is="item.icon" class="chat-context-menu-icon" aria-hidden="true" />
          <span class="chat-context-menu-copy">
            <span class="chat-context-menu-label">{{ item.label }}</span>
            <small v-if="item.subtitle" class="chat-context-menu-sub">{{ item.subtitle }}</small>
          </span>
        </button>

        <button
          v-else
          type="button"
          class="chat-context-menu-item"
          role="menuitem"
          @click="onSelect(item.id)"
        >
          <component :is="item.icon" class="chat-context-menu-icon" aria-hidden="true" />
          <span class="chat-context-menu-copy">
            <span class="chat-context-menu-label">{{ item.label }}</span>
            <small v-if="item.subtitle" class="chat-context-menu-sub">{{ item.subtitle }}</small>
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  Archive,
  Bell,
  BellOff,
  Pin,
  Tag,
  Mail,
  Heart,
  Ban,
  MinusCircle,
  Trash2,
  ChevronRight,
} from 'lucide-vue-next'
import {
  getChatMuteSubtitle,
  MUTE_DURATION_OPTIONS,
} from '~/composables/whatsapp/useWhatsappChatListActions.js'

const props = defineProps({
  chat: { type: Object, default: null },
  anchorRect: { type: Object, default: null },
})

const emit = defineEmits(['select', 'close'])

const menuRoot = ref(null)
const muteSubmenuOpen = ref(false)
const muteDurationOptions = MUTE_DURATION_OPTIONS

const staticMenuItems = computed(() => {
  const chat = props.chat
  if (!chat) return []
  const isMuted = Boolean(chat.isMuted)
  const isPinned = Boolean(chat.isPinned)
  const isBlocked = Boolean(chat.isBlocked || chat.wa_isBlocked)
  const isArchived = Boolean(chat.isArchived || chat.wa_archived)
  const isGroup = Boolean(chat.isGroup) || String(chat.chatJid || '').endsWith('@g.us')

  const items = [
    {
      id: 'archive',
      label: isArchived ? 'Desarquivar conversa' : 'Arquivar conversa',
      icon: Archive,
    },
    {
      id: 'mute',
      label: isMuted ? 'Reativar notificações' : 'Silenciar notificações',
      subtitle: isMuted ? getChatMuteSubtitle(chat) : '',
      icon: isMuted ? BellOff : Bell,
      isMuted,
    },
    {
      id: 'pin',
      label: isPinned ? 'Desafixar conversa' : 'Fixar conversa',
      icon: Pin,
    },
    {
      id: 'label',
      label: 'Etiquetar conversa',
      icon: Tag,
    },
    {
      id: 'unread',
      label: 'Marcar como não lida',
      icon: Mail,
    },
    {
      id: 'favorite',
      label: 'Adicionar aos Favoritos',
      icon: Heart,
    },
  ]

  if (!isGroup) {
    items.push({
      id: 'block',
      label: isBlocked ? 'Desbloquear' : 'Bloquear',
      icon: Ban,
    })
  }

  items.push(
    { id: 'clear', label: 'Limpar conversa', icon: MinusCircle },
    { id: 'delete', label: 'Apagar conversa', icon: Trash2 },
  )

  return items
})

const menuStyle = computed(() => {
  const rect = props.anchorRect
  if (!rect) return { display: 'none' }
  const menuWidth = 280
  const padding = 8
  let left = rect.right + 4
  let top = rect.top

  if (typeof window !== 'undefined') {
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, rect.left - menuWidth - 4)
    }
    const estimatedHeight = staticMenuItems.value.length * 48 + 12
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - estimatedHeight - padding)
    }
  }

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${menuWidth}px`,
    zIndex: 10050,
  }
})

const onSelect = (actionId) => {
  emit('select', actionId)
  emit('close')
}

const onGlobalPointerDown = (event) => {
  const root = menuRoot.value
  if (!root) return
  if (root.contains(event.target)) return
  emit('close')
}

const onGlobalKeydown = (event) => {
  if (event.key === 'Escape') emit('close')
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
