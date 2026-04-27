<template>
  <div class="chat-body" ref="chatBodyRef">
    <!-- Chat de GRUPO: exibe nome e avatar do remetente -->
    <GroupMessageList
      v-if="isGroup"
      :messages="messages"
      :action-menu-message-id="actionMenuMessageId"
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
      :on-download-media="onDownloadMedia"
      :on-open-reactions-detail="onOpenReactionsDetail"
      :on-open-conversation="onOpenConversation"
      :on-open-business-profile="onOpenBusinessProfile"
      :on-add-to-group="onAddToGroup"
      :on-save-contact="onSaveContact"
      :on-text-click="onTextClick"
      :on-jump-to-replied-message="onJumpToRepliedMessage"
      :on-poll-vote="onPollVote"
      :on-open-document="onOpenDocument"
    />

    <!-- Chat PRIVADO: sem nome nem avatar de remetente -->
    <PrivateMessageList
      v-else
      :messages="messages"
      :action-menu-message-id="actionMenuMessageId"
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
      :on-download-media="onDownloadMedia"
      :on-open-reactions-detail="onOpenReactionsDetail"
      :on-open-conversation="onOpenConversation"
      :on-open-business-profile="onOpenBusinessProfile"
      :on-add-to-group="onAddToGroup"
      :on-save-contact="onSaveContact"
      :on-text-click="onTextClick"
      :on-jump-to-replied-message="onJumpToRepliedMessage"
      :on-poll-vote="onPollVote"
      :on-open-document="onOpenDocument"
    />

    <!-- Painel de ações flutuante e modal de reações -->
    <ChatMessageActionsPanel
      :open-message="openMessage"
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
      @react-remove="$emit('react-remove', $event)"
      @forward="$emit('forward', $event)"
      @pin="$emit('pin', $event)"
      @star="$emit('star', $event)"
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
import GroupMessageList from './GroupMessageList.vue'
import PrivateMessageList from './PrivateMessageList.vue'
import ChatMessageActionsPanel from './ChatMessageActionsPanel.vue'
import { chatBodyRef } from '~/composables/whatsapp/useWhatsappState.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  isGroup: { type: Boolean, default: false },
  loadingMessages: { type: Boolean, default: false },
  actionMenuMessageId: { type: String, default: null },
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
  onDownloadMedia: { type: Function, required: true },
  onOpenReactionsDetail: { type: Function, required: true },
  onOpenConversation: { type: Function, required: true },
  onOpenBusinessProfile: { type: Function, required: true },
  onAddToGroup: { type: Function, required: true },
  onSaveContact: { type: Function, required: true },
  onTextClick: { type: Function, required: true },
  onJumpToRepliedMessage: { type: Function, required: true },
  onPollVote: { type: Function, required: true },
  onOpenDocument: { type: Function, required: true }
})

defineEmits([
  'reply', 'copy', 'react-quick', 'react-open', 'react-remove',
  'forward', 'pin', 'star', 'edit', 'delete',
  'close-reactions-detail', 'reactions-tab-change', 'reactions-row-click'
])

// chatBodyRef é importado do state e usado como ref do DOM diretamente
</script>
