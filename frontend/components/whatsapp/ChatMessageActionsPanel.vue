<template>
  <!-- Painel flutuante com emoji bar + menu de ações -->
  <Teleport to="body">
    <div
      v-if="openMessage && !openMessage.isContactShare"
      class="message-actions-floater-host"
      :style="hostStyle"
    >
      <div class="message-actions-floater-inner">
        <div
          v-show="!openMessage.fromMe"
          class="message-reaction-bar message-reaction-bar--floater"
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
            @click="emit('react-quick', { message: openMessage, emoji: em })"
          >{{ em }}</button>
          <button
            type="button"
            class="reaction-chip reaction-chip-more"
            aria-label="Mais reacoes"
            @click="toggleReactionPicker"
          >+</button>
        </div>
        <div v-if="reactionPickerOpen && !openMessage.fromMe" class="message-reaction-picker-pop">
          <em-emoji-picker
            locale="pt"
            per-line="10"
            preview-position="none"
            skin-tone-position="none"
            @emoji-select="onPickerSelect"
            @emoji-click="onPickerSelect"
            @click="onPickerDomClick"
          />
        </div>

        <div
          class="message-actions-menu-panel"
          :style="menuStyle"
          @click.stop
          @mousedown.stop
          @pointerdown.stop
        >
          <ul class="message-actions-menu" role="menu">
            <li>
              <button type="button" class="ma-item" @click="emit('reply', openMessage)">
                <Reply class="ma-ico" /> Responder
              </button>
            </li>
            <li>
              <button type="button" class="ma-item" @click="emit('copy', openMessage)">
                <Copy class="ma-ico" /> Copiar
              </button>
            </li>
            <li>
              <button
                type="button"
                class="ma-item"
                :disabled="openMessage.fromMe"
                @click="toggleReactionPicker"
              >
                <Smile class="ma-ico" /> Reagir
              </button>
            </li>
            <li v-if="!openMessage.fromMe">
              <button type="button" class="ma-item" @click="emit('react-remove', openMessage)">
                <Ban class="ma-ico" /> Remover reação
              </button>
            </li>
            <li>
              <button type="button" class="ma-item" @click="emit('forward', openMessage)">
                <Forward class="ma-ico" /> Encaminhar
              </button>
            </li>
            <li>
              <button type="button" class="ma-item" @click="emit('pin', openMessage)">
                <Pin class="ma-ico" /> Fixar
              </button>
            </li>
            <li>
              <button type="button" class="ma-item" @click="emit('star', openMessage)">
                <Star class="ma-ico" /> Favoritar
              </button>
            </li>
            <li v-if="openMessage.fromMe && openMessage.text && !openMessage.isMedia">
              <button type="button" class="ma-item" @click="emit('edit', openMessage)">
                <Pencil class="ma-ico" /> Editar
              </button>
            </li>
            <li class="ma-sep" role="separator" />
            <li>
              <button type="button" class="ma-item ma-item-danger" @click="emit('delete', openMessage)">
                <Trash2 class="ma-ico" /> Apagar
              </button>
            </li>
          </ul>
        </div>
      </div>
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
import { onMounted, ref } from 'vue'
import { init as initEmojiMart } from 'emoji-mart'
import emojiData from '@emoji-mart/data'
import { Reply, Copy, Smile, Ban, Forward, Pin, Star, Pencil, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  openMessage: { type: Object, default: null },
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
  'reply', 'copy', 'react-quick', 'react-open', 'react-remove',
  'forward', 'pin', 'star', 'edit', 'delete',
  'close-reactions-detail', 'reactions-tab-change', 'reactions-row-click',
])

const reactionPickerOpen = ref(false)
const lastEmojiSelection = ref({ value: '', ts: 0 })

const toggleReactionPicker = () => {
  if (props?.openMessage?.fromMe) return
  reactionPickerOpen.value = !reactionPickerOpen.value
}

const unifiedToNative = (value) => String(value || '')
  .split('-')
  .map((hex) => Number.parseInt(hex, 16))
  .filter((code) => Number.isFinite(code))
  .map((code) => String.fromCodePoint(code))
  .join('')

const onPickerSelect = (event) => {
  const pickFromSkins = (value) => {
    const skinNative = value?.skins?.[0]?.native
    return String(skinNative || '').trim()
  }

  const detail = event?.detail || event || {}
  const emojiNative = String(
    detail?.native ||
    detail?.emoji?.native ||
    pickFromSkins(detail?.emoji) ||
    detail?.emoji ||
    pickFromSkins(detail) ||
    unifiedToNative(detail?.unified || detail?.emoji?.unified || '') ||
    ''
  ).trim()
  if (!emojiNative || !props?.openMessage) return
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) return
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  emit('react-quick', { message: props.openMessage, emoji: emojiNative })
  reactionPickerOpen.value = false
}

const onPickerDomClick = (event) => {
  if (!props?.openMessage) return
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
  }
  if (!emojiNative) return
  const now = Date.now()
  if (lastEmojiSelection.value.value === emojiNative && now - lastEmojiSelection.value.ts < 80) return
  lastEmojiSelection.value = { value: emojiNative, ts: now }
  emit('react-quick', { message: props.openMessage, emoji: emojiNative })
  reactionPickerOpen.value = false
}

onMounted(() => {
  if (typeof window !== 'undefined' && !window.__waEmojiMartInitialized) {
    initEmojiMart({ data: emojiData })
    window.__waEmojiMartInitialized = true
  }
})
</script>

<style scoped>
.message-reaction-picker-pop {
  margin-top: 6px;
  align-self: flex-end;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}
</style>
