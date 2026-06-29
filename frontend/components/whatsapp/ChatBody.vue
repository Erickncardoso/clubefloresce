<template>
  <div class="chat-body" :style="wallpaperStyle">
    <div class="chat-body-scroll" ref="chatBodyRef">
    <div v-if="showLoading" class="chat-body-loading" aria-busy="true">
      <Loader class="spin chat-body-loading-icon" />
      <span>Carregando mensagens…</span>
    </div>

    <div v-else-if="showHistorySync" class="chat-body-empty" role="status">
      <p class="chat-body-empty__title">Sincronizando histórico desta conversa…</p>
      <p class="chat-body-empty__hint">Mantenha o WhatsApp aberto no celular. As mensagens devem aparecer em instantes.</p>
    </div>

    <div v-else-if="showEmpty" class="chat-body-empty" role="status">
      <p class="chat-body-empty__title">{{ emptyTitle }}</p>
      <p class="chat-body-empty__hint">{{ emptyHint }}</p>
      <button
        v-if="canRetryHistorySync"
        type="button"
        class="chat-body-empty__retry"
        @click="$emit('retry-history-sync')"
      >
        Tentar sincronizar de novo
      </button>
    </div>

    <GroupMessageList
      v-else-if="isGroup"
      :messages="displayMessages"
      :pin-timeline-events="pinTimelineEvents"
      :pinned-message-id-set="pinnedMessageIdSet"
      :loading-older-messages="loadingOlderMessages"
      :downloading-media-by-id="downloadingMediaById"
      :get-sender-name="getSenderName"
      :get-sender-avatar="getSenderAvatar"
      :get-sender-initial="getSenderInitial"
      :get-shared-contact-avatar="getSharedContactAvatar"
      :is-contact-saved="isContactSaved"
      :has-business-profile="hasBusinessProfile"
      :should-hide-label="shouldHideLabel"
      :format-text="formatText"
      :format-time="formatTime"
      :get-merge-key="getMergeKey"
      :has-reaction-pill="hasReactionPill"
      :get-reaction-pill-emojis="getReactionPillEmojis"
      :show-reaction-pill-count="showReactionPillCount"
      :on-touch-start="onTouchStart"
      :on-touch-move="onTouchMove"
      :on-touch-end="onTouchEnd"
      :on-context-menu="onContextMenu"
      :on-toggle-action-menu="onToggleActionMenu"
      :on-toggle-reaction-menu="onToggleReactionMenu"
      :on-download-media="onDownloadMedia"
      :on-open-reactions-detail="onOpenReactionsDetail"
      :on-open-conversation="onOpenConversation"
      :on-open-business-profile="onOpenBusinessProfile"
      :on-add-to-group="onAddToGroup"
      :on-save-contact="onSaveContact"
      :on-text-click="onTextClick"
      :on-jump-to-replied-message="onJumpToRepliedMessage"
      :on-poll-vote="onPollVote"
      :on-menu-option-click="onMenuOptionClick"
      :on-open-document="onOpenDocument"
      :on-audio-listened="onAudioListened"
    />

    <PrivateMessageList
      v-else
      :messages="displayMessages"
      :pin-timeline-events="pinTimelineEvents"
      :pinned-message-id-set="pinnedMessageIdSet"
      :loading-older-messages="loadingOlderMessages"
      :contact-avatar-url="contactAvatarUrl"
      :contact-display-name="contactDisplayName"
      :downloading-media-by-id="downloadingMediaById"
      :get-shared-contact-avatar="getSharedContactAvatar"
      :is-contact-saved="isContactSaved"
      :has-business-profile="hasBusinessProfile"
      :should-hide-label="shouldHideLabel"
      :format-text="formatText"
      :format-time="formatTime"
      :get-merge-key="getMergeKey"
      :has-reaction-pill="hasReactionPill"
      :get-reaction-pill-emojis="getReactionPillEmojis"
      :show-reaction-pill-count="showReactionPillCount"
      :on-touch-start="onTouchStart"
      :on-touch-move="onTouchMove"
      :on-touch-end="onTouchEnd"
      :on-context-menu="onContextMenu"
      :on-toggle-action-menu="onToggleActionMenu"
      :on-toggle-reaction-menu="onToggleReactionMenu"
      :on-download-media="onDownloadMedia"
      :on-open-reactions-detail="onOpenReactionsDetail"
      :on-open-conversation="onOpenConversation"
      :on-open-business-profile="onOpenBusinessProfile"
      :on-add-to-group="onAddToGroup"
      :on-save-contact="onSaveContact"
      :on-text-click="onTextClick"
      :on-jump-to-replied-message="onJumpToRepliedMessage"
      :on-poll-vote="onPollVote"
      :on-menu-option-click="onMenuOptionClick"
      :on-open-document="onOpenDocument"
      :on-audio-listened="onAudioListened"
    />

    </div>

    <!-- Painel de ações flutuante e modal de reações -->
    <ChatMessageActionsPanel
      :open-message="openMessage"
      :action-menu-mode="actionMenuMode"
      :host-style="hostStyle"
      :reaction-style="reactionStyle"
      :menu-style="menuStyle"
      :quick-reactions="quickReactions"
      :reactions-detail-message="reactionsDetailMessage"
      :active-reactions-tab="activeReactionsTab"
      :reactions-emoji-tabs="reactionsEmojiTabs"
      :reactions-list-rows="reactionsListRows"
      :is-group-chat="isGroup"
      :format-jid="formatJid"
      @reply="$emit('reply', $event)"
      @copy="$emit('copy', $event)"
      @react-quick="$emit('react-quick', $event)"
      @react-open="$emit('react-open', $event)"
      @open-reactions-mode="$emit('open-reactions-mode', $event)"
      @react-remove="$emit('react-remove', $event)"
      @forward="$emit('forward', $event)"
      @pin="$emit('pin', $event)"
      @star="$emit('star', $event)"
      @message-info="$emit('message-info', $event)"
      @commercial-broadcast="$emit('commercial-broadcast', $event)"
      @add-to-notes="$emit('add-to-notes', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @close-reactions-detail="$emit('close-reactions-detail')"
      @reactions-tab-change="$emit('reactions-tab-change', $event)"
      @reactions-row-click="$emit('reactions-row-click', $event)"
    />

    <Transition name="chat-toast-fade">
      <div v-if="chatActionFeedback" class="chat-action-toast" role="status">{{ chatActionFeedback }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Loader } from 'lucide-vue-next'
import GroupMessageList from './GroupMessageList.vue'
import PrivateMessageList from './PrivateMessageList.vue'
import ChatMessageActionsPanel from './ChatMessageActionsPanel.vue'
import { chatBodyRef } from '~/composables/whatsapp/useWhatsappState.js'
import {
  stickChatScrollToBottomIfNeeded,
  bindChatBodyScrollListeners,
  unbindChatBodyScrollListeners,
  scrollToBottomOnChatOpen,
} from '~/composables/whatsapp/useWhatsappScroll.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  pinTimelineEvents: { type: Array, default: () => [] },
  pinnedMessageIdSet: { type: Object, default: null },
  loadingOlderMessages: { type: Boolean, default: false },
  isGroup: { type: Boolean, default: false },
  contactAvatarUrl: { type: String, default: '' },
  contactDisplayName: { type: String, default: '' },
  loadingMessages: { type: Boolean, default: false },
  historySyncPending: { type: Boolean, default: false },
  hasChatPreview: { type: Boolean, default: false },
  wallpaperStyle: { type: Object, default: () => ({}) },
  actionMenuMode: { type: String, default: 'full' },
  downloadingMediaById: { type: Object, default: () => ({}) },
  chatActionFeedback: { type: String, default: '' },
  // Action panel props
  openMessage: { type: Object, default: null },
  hostStyle: { type: Object, default: () => ({}) },
  reactionStyle: { type: Object, default: () => ({}) },
  menuStyle: { type: Object, default: () => ({}) },
  quickReactions: { type: Array, default: () => [] },
  reactionsDetailMessage: { type: Object, default: null },
  activeReactionsTab: { type: String, default: 'all' },
  reactionsEmojiTabs: { type: Array, default: () => [] },
  reactionsListRows: { type: Array, default: () => [] },
  formatJid: { type: Function, required: true },
  // Message list props (passed-through as functions)
  getSenderName: { type: Function, required: true },
  getSenderAvatar: { type: Function, required: true },
  getSenderInitial: { type: Function, required: true },
  getSharedContactAvatar: { type: Function, required: true },
  isContactSaved: { type: Function, required: true },
  hasBusinessProfile: { type: Function, required: true },
  shouldHideLabel: { type: Function, required: true },
  formatText: { type: Function, required: true },
  formatTime: { type: Function, required: true },
  getMergeKey: { type: Function, required: true },
  hasReactionPill: { type: Function, required: true },
  getReactionPillEmojis: { type: Function, required: true },
  showReactionPillCount: { type: Function, required: true },
  onTouchStart: { type: Function, required: true },
  onTouchMove: { type: Function, required: true },
  onTouchEnd: { type: Function, required: true },
  onContextMenu: { type: Function, required: true },
  onToggleActionMenu: { type: Function, required: true },
  onToggleReactionMenu: { type: Function, required: true },
  onDownloadMedia: { type: Function, required: true },
  onOpenReactionsDetail: { type: Function, required: true },
  onOpenConversation: { type: Function, required: true },
  onOpenBusinessProfile: { type: Function, required: true },
  onAddToGroup: { type: Function, required: true },
  onSaveContact: { type: Function, required: true },
  onTextClick: { type: Function, required: true },
  onJumpToRepliedMessage: { type: Function, required: true },
  onPollVote: { type: Function, required: true },
  onMenuOptionClick: { type: Function, required: true },
  onOpenDocument: { type: Function, required: true },
  onAudioListened: { type: Function, default: null }
})

const displayMessages = computed(() => (Array.isArray(props.messages) ? props.messages : []))
const showLoading = computed(() => Boolean(props.loadingMessages) && displayMessages.value.length === 0)
const showHistorySync = computed(() =>
  !props.loadingMessages &&
  Boolean(props.historySyncPending) &&
  displayMessages.value.length === 0
)
const showEmpty = computed(() =>
  !props.loadingMessages &&
  !props.historySyncPending &&
  displayMessages.value.length === 0
)

const emptyTitle = computed(() =>
  props.hasChatPreview
    ? 'Histórico ainda não sincronizado'
    : 'Nenhuma mensagem nesta conversa'
)

const emptyHint = computed(() =>
  props.hasChatPreview
    ? 'Esta conversa tem preview na lista, mas a UAZAPI ainda não devolveu o histórico. Deixe o WhatsApp aberto no celular e toque em "Tentar sincronizar de novo". Novas mensagens chegam em tempo real.'
    : 'Quando alguém enviar uma mensagem, ela aparecerá aqui automaticamente.'
)

const canRetryHistorySync = computed(() => Boolean(props.hasChatPreview))

defineEmits([
  'reply', 'copy', 'react-quick', 'react-open', 'react-remove', 'open-reactions-mode',
  'forward', 'pin', 'star', 'message-info', 'commercial-broadcast', 'add-to-notes', 'edit', 'delete',
  'close-reactions-detail', 'reactions-tab-change', 'reactions-row-click', 'retry-history-sync'
])

onMounted(() => {
  nextTick(() => bindChatBodyScrollListeners())
})

onUnmounted(() => {
  unbindChatBodyScrollListeners()
})

watch(chatBodyRef, (el) => {
  if (el) nextTick(() => bindChatBodyScrollListeners())
})

watch(
  () => displayMessages.value.length,
  (nextLen, prevLen) => {
    if (nextLen <= prevLen) return
    if (prevLen === 0 || props.loadingMessages) {
      scrollToBottomOnChatOpen()
      return
    }
    stickChatScrollToBottomIfNeeded()
  },
  { flush: 'post' },
)

watch(
  () => props.loadingMessages,
  (loading, wasLoading) => {
    if (wasLoading && !loading && displayMessages.value.length > 0) {
      scrollToBottomOnChatOpen()
    }
  },
)
</script>
