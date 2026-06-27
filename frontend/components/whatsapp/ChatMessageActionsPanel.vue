<template>
  <!-- Painel flutuante com emoji bar + menu de ações -->
  <Teleport to="body">
    <div
      v-if="openMessage && !openMessage.isContactShare"
      class="message-actions-floater-host"
      :style="hostStyle"
    >
      <div class="message-actions-floater-inner">
        <Transition name="reaction-bar-fade" appear>
          <div
            v-if="showReactionBar"
            :key="`${openMessage.id}-${actionMenuMode}`"
            class="message-reaction-bar message-reaction-bar--floater message-reaction-bar--wa-light"
            :style="reactionStyle"
            role="group"
            aria-label="Reacoes rapidas"
            @click.stop
            @mousedown.stop
            @pointerdown.stop
          >
            <button
              v-for="em in quickReactions"
              :key="em"
              type="button"
              class="reaction-chip"
              :aria-label="`Reagir com ${em}`"
              @click="onQuickReact(em)"
            >{{ em }}</button>
            <button
              ref="moreButtonRef"
              type="button"
              class="reaction-chip reaction-chip-more"
              data-reaction-more-btn
              aria-label="Mais reacoes"
              :aria-expanded="reactionEmojiPickerOpen ? 'true' : 'false'"
              @click.stop="toggleReactionPicker"
            >
              <Plus class="reaction-chip-plus-icon" aria-hidden="true" />
            </button>
          </div>
        </Transition>

        <div
          v-show="actionMenuMode !== 'reactions'"
          class="message-actions-menu-panel"
          :style="menuStyle"
          @click.stop
          @mousedown.stop
          @pointerdown.stop
        >
          <ul class="message-actions-menu" role="menu">
            <li v-for="item in menuItems" :key="item.id">
              <button
                v-if="item.id !== 'sep'"
                type="button"
                class="ma-item"
                role="menuitem"
                @click="onMenuAction(item.id)"
              >
                <component :is="item.icon" class="ma-ico" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </button>
              <span v-else class="ma-sep" role="separator" />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Picker de emoji fora do floater — não empurra a barra de reações -->
  <Teleport to="body">
    <div
      v-if="reactionEmojiPickerOpen && openMessage"
      data-wa-reaction-picker-portal="true"
      class="message-reaction-picker-portal message-reaction-picker-pop"
      :style="reactionPickerFixedStyle"
      @wheel.stop
    >
      <em-emoji-picker
        locale="pt"
        per-line="10"
        preview-position="none"
        skin-tone-position="none"
        @click="onPickerDomClick"
      />
    </div>
  </Teleport>

  <!-- Modal de detalhes das reações -->
  <Teleport to="body">
    <div
      v-if="reactionsDetailMessage"
      class="reactions-detail-backdrop"
      @click.self="emit('close-reactions-detail')"
    >
      <div
        class="reactions-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reações da mensagem"
        @click.stop
      >
        <div class="reactions-detail-tabs">
          <button
            type="button"
            class="reactions-detail-tab"
            :class="{ 'is-active': activeReactionsTab === 'all' }"
            @click="emit('reactions-tab-change', 'all')"
          >
            <span class="reactions-detail-tab-label">Todas</span>
            <span class="reactions-detail-tab-count">{{ reactionsDetailMessage.reactions?.length || 0 }}</span>
          </button>
          <button
            v-for="t in reactionsEmojiTabs"
            :key="t.emoji"
            type="button"
            class="reactions-detail-tab reactions-detail-tab--emoji"
            :class="{ 'is-active': activeReactionsTab === t.emoji }"
            @click="emit('reactions-tab-change', t.emoji)"
          >
            <span class="reactions-detail-tab-emoji">{{ t.emoji }}</span>
            <span class="reactions-detail-tab-count">{{ t.count }}</span>
          </button>
        </div>
        <div class="reactions-detail-sep" />
        <div class="reactions-detail-list">
          <button
            v-for="(row, rIdx) in reactionsListRows"
            :key="`${row.reactorKey}-${rIdx}`"
            type="button"
            class="reactions-detail-row"
            :class="{ 'is-clickable-remove': row.fromMe && !reactionsDetailMessage.fromMe }"
            @click="emit('reactions-row-click', row)"
          >
            <div class="reactions-detail-avatar" aria-hidden="true">
              {{ (row.senderLabel || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="reactions-detail-meta">
              <div class="reactions-detail-name">
                <span v-if="isGroupChat && !row.fromMe" class="reactions-detail-tilde">~</span>{{ row.senderLabel }}
              </div>
              <div v-if="row.fromMe && !reactionsDetailMessage.fromMe" class="reactions-detail-hint">
                Clique para remover
              </div>
              <div v-else-if="!row.fromMe && row.senderJid" class="reactions-detail-sub">
                {{ formatJid(row.senderJid) }}
              </div>
            </div>
            <span class="reactions-detail-e" aria-hidden="true">{{ row.emoji }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { init as initEmojiMart } from 'emoji-mart'
import emojiData from '@emoji-mart/data'
import {
  Reply,
  Copy,
  Smile,
  Forward,
  Pin,
  Star,
  Trash2,
  Plus,
  Info,
  MessageSquareReply,
  FileText,
} from 'lucide-vue-next'
import {
  closeReactionEmojiPicker,
  openReactionEmojiPicker,
} from '~/composables/whatsapp/useWhatsappMessageActions.js'
import {
  reactionEmojiPickerOpen,
  reactionPickerFixedStyle,
} from '~/composables/whatsapp/useWhatsappState.js'

const props = defineProps({
  openMessage: { type: Object, default: null },
  actionMenuMode: { type: String, default: 'full' },
  hostStyle: { type: [String, Object], default: '' },
  reactionStyle: { type: [String, Object], default: '' },
  menuStyle: { type: [String, Object], default: '' },
  quickReactions: { type: Array, default: () => [] },
  reactionsDetailMessage: { type: Object, default: null },
  activeReactionsTab: { type: String, default: 'all' },
  reactionsEmojiTabs: { type: Array, default: () => [] },
  reactionsListRows: { type: Array, default: () => [] },
  isGroupChat: { type: Boolean, default: false },
  formatJid: { type: Function, default: (j) => j },
})

const emit = defineEmits([
  'reply', 'copy', 'react-quick', 'react-open', 'react-remove', 'open-reactions-mode',
  'forward', 'pin', 'star', 'edit', 'delete', 'message-info', 'commercial-broadcast', 'add-to-notes',
  'close-reactions-detail', 'reactions-tab-change', 'reactions-row-click',
])

const moreButtonRef = ref(null)
const lastEmojiSelection = ref({ value: '', ts: 0 })

const showReactionBar = computed(() => Boolean(props.openMessage))

const menuItems = computed(() => {
  const items = [
    { id: 'message-info', label: 'Dados da mensagem', icon: Info },
    { id: 'reply', label: 'Responder', icon: Reply },
    { id: 'copy', label: 'Copiar', icon: Copy },
    { id: 'react', label: 'Reagir', icon: Smile },
    { id: 'forward', label: 'Encaminhar', icon: Forward },
    { id: 'commercial-broadcast', label: 'Nova transmissão comercial', icon: MessageSquareReply },
    { id: 'pin', label: 'Fixar', icon: Pin },
    { id: 'star', label: 'Favoritar', icon: Star },
    { id: 'add-to-notes', label: 'Adicionar texto às notas', icon: FileText },
    { id: 'sep' },
    { id: 'delete', label: 'Apagar', icon: Trash2 },
  ]
  return items
})

watch(
  () => [props.openMessage?.id, props.actionMenuMode],
  () => { closeReactionEmojiPicker() },
)

const toggleReactionPicker = () => {
  if (reactionEmojiPickerOpen.value) {
    closeReactionEmojiPicker()
    return
  }
  openReactionEmojiPicker(moreButtonRef.value)
}

const onQuickReact = (emoji) => {
  closeReactionEmojiPicker()
  emit('react-quick', { message: props.openMessage, emoji })
}

const onMenuAction = (actionId) => {
  const msg = props.openMessage
  if (!msg) return
  switch (actionId) {
    case 'message-info':
      emit('message-info', msg)
      break
    case 'reply':
      emit('reply', msg)
      break
    case 'copy':
      emit('copy', msg)
      break
    case 'react':
      emit('open-reactions-mode', msg)
      break
    case 'forward':
      emit('forward', msg)
      break
    case 'commercial-broadcast':
      emit('commercial-broadcast', msg)
      break
    case 'pin':
      emit('pin', msg)
      break
    case 'star':
      emit('star', msg)
      break
    case 'add-to-notes':
      emit('add-to-notes', msg)
      break
    case 'delete':
      emit('delete', msg)
      break
    default:
      break
  }
}

const unifiedToNative = (value) => String(value || '')
  .split('-')
  .map((hex) => Number.parseInt(hex, 16))
  .filter((code) => Number.isFinite(code))
  .map((code) => String.fromCodePoint(code))
  .join('')

const onPickerDomClick = (event) => {
  const path = Array.isArray(event?.composedPath?.()) ? event.composedPath() : []
  let emojiNative = ''
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    const native = node?.getAttribute?.('native')
    if (native) {
      emojiNative = String(native).trim()
      break
    }
    const emoji = node?.getAttribute?.('emoji')
    if (emoji) {
      emojiNative = String(emoji).trim()
      break
    }
    const unified = node?.getAttribute?.('data-unified') || node?.getAttribute?.('unified')
    if (unified) {
      emojiNative = unifiedToNative(unified)
      if (emojiNative) break
    }
  }
  if (!emojiNative || !props?.openMessage) return
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) return
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  emit('react-quick', { message: props.openMessage, emoji: emojiNative })
  closeReactionEmojiPicker()
}

onMounted(() => {
  if (typeof window !== 'undefined' && !window.__waEmojiMartInitialized) {
    initEmojiMart({ data: emojiData })
    window.__waEmojiMartInitialized = true
  }
})
</script>
