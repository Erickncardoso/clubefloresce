<template>
  <NuxtLayout name="dashboard">
    <div class="chat-wrapper whatsapp-chat-page animate-fade-in">
      <div class="chat-container">

        <!-- Sidebar: Lista de Chats -->
        <div
          class="chat-sidebar-shell"
          :class="{ 'chat-sidebar-shell--labels-panel': labelsSidebarOpen }"
        >
          <ChatSidebar
            v-model="searchQuery"
            v-model:list-filter="chatListFilter"
            :chats="filteredChats"
            :loading="loadingChats"
            :is-active="isActiveChatListItem"
            :preview-prefix="chatListPreviewPrefix"
            :format-time="formatTime"
            :format-list-time="formatChatListTime"
            :on-mark-all-read="markAllChatsAsRead"
            @select="selectChat"
            @refresh="loadChats(true)"
            @header-menu-action="handleSidebarHeaderMenuAction"
          />
          <Transition name="labels-panel-slide">
            <LabelsSidebarPanel
              v-if="labelsSidebarOpen && !hasActiveLabelView"
              class="labels-manage-panel"
              :items="labelsSidebarItems"
              :loading="labelsLoading"
              @close="closeLabelsSidebar"
              @add-new="openLabelFormModal()"
              @edit="openLabelFormModal"
              @choose-color="openLabelColorModal"
              @delete="openLabelDeleteModal"
              @open-chats="handleOpenLabelChats"
            />
          </Transition>
          <LabelChatsSidebarPanel
            v-if="labelsSidebarOpen && hasActiveLabelView"
            class="label-chats-manage-panel"
            :label="activeLabelView"
            :chats="activeLabelChats"
            :selected-keys="labelChatSelection"
            :loading="loadingChats"
            :bulk-saving="labelBulkSaving"
            :format-list-time="formatChatListTime"
            :chat-selection-key="canonicalChatListKey"
            @back="closeLabelChatsView"
            @clear-selection="clearLabelChatSelection"
            @toggle-select="toggleLabelChatSelection"
            @add-label="openLabelAssignPicker"
            @remove-label="handleBulkRemoveActiveLabel"
            @open-chat="handleLabelChatOpen"
          />
        </div>

        <!-- Main: Janela de Mensagens -->
        <main class="chat-main">
          <WhatsappWebEmpty v-if="!selectedChat" />

          <div
            v-else
            class="active-chat"
            :class="{
              'active-chat--contact-panel': contactInfoModalOpen || groupInfoModalOpen,
              'active-chat--quick-replies-panel': quickRepliesSidebarOpen,
            }"
          >
            <div class="active-chat-main">
            <!-- Header do Chat -->
            <ChatHeader
              :chat="selectedChat"
              v-model:message-search-query="messageSearchQuery"
              @open-group-info="openGroupInfoModal"
              @open-contact-info="openContactInfoModal"
              @open-menu="handleChatHeaderMenu"
            />

            <ChatPinnedBar
              v-if="pinnedMessagesInChat.length"
              :items="pinnedMessagesInChat"
              @jump="jumpToPinnedMessage"
            />

            <!-- Corpo de Mensagens + painel de ações -->
            <!-- chatBodyRef do estado é preenchido dentro de ChatBody.vue -->
            <ChatBody
              :messages="chatBodyDisplayMessages"
              :pin-timeline-events="chatPinTimelineEvents"
              :loading-older-messages="loadingOlderMessages"
              :is-group="Boolean(selectedChat.isGroup)"
              :contact-avatar-url="String(selectedChat?.avatarUrl || selectedChat?.image || selectedChat?.imagePreview || '')"
              :loading-messages="loadingMessages"
              :action-menu-message-id="actionMenuMessageId"
              :action-menu-mode="actionMenuMode"
              :downloading-media-by-id="downloadingMediaById"
              :chat-action-feedback="chatActionFeedback"
              :open-message="openActionMenuMessage"
              :host-style="messageActionsHostInlineStyle"
              :reaction-style="messageActionsReactionInlineStyle"
              :menu-style="messageActionsMenuInlineStyle"
              :quick-reactions="messageQuickReactions"
              :reactions-detail-message="reactionsDetailMessage"
              :active-reactions-tab="reactionsDetailTab"
              :reactions-emoji-tabs="reactionsDetailEmojiTabs"
              :reactions-list-rows="reactionsDetailListRows"
              :is-group-chat="Boolean(selectedChat?.isGroup)"
              :format-jid="formatJidAsPhoneLine"
              :get-sender-name="resolveMessageSenderDisplayName"
              :get-sender-avatar="getMessageSenderAvatarUrl"
              :get-sender-initial="getMessageSenderInitial"
              :get-shared-contact-avatar="getSharedContactAvatar"
              :is-contact-saved="isSharedContactSaved"
              :has-business-profile="hasSharedContactBusinessProfile"
              :should-hide-label="shouldHideAutoMediaLabelInBubble"
              :format-text="formatWhatsappTextForDisplay"
              :format-time="formatTime"
              :get-merge-key="getMessageMergeKey"
              :has-reaction-pill="hasRenderableReactionPill"
              :get-reaction-pill-emojis="getReactionPillEmojis"
              :show-reaction-pill-count="showReactionPillCount"
              :on-touch-start="onMessageTouchStart"
              :on-touch-move="onMessageTouchMove"
              :on-touch-end="onMessageTouchEnd"
              :on-context-menu="(e, msg) => openMessageActionMenu(e, msg)"
              :on-toggle-action-menu="toggleMessageActionMenu"
              :on-toggle-reaction-menu="toggleMessageReactionMenu"
              :on-download-media="downloadMessageMedia"
              :on-open-reactions-detail="openReactionsDetail"
              :on-open-conversation="handleOpenConversation"
              :on-open-business-profile="handleOpenBusinessProfile"
              :on-add-to-group="addSharedContactToGroup"
              :on-save-contact="openSaveContactModal"
              :on-text-click="(e) => onFormattedMessageClick(e, handleOpenConversation)"
              :on-jump-to-replied-message="jumpToRepliedMessage"
              :on-poll-vote="sendPollVote"
              :on-menu-option-click="sendInteractiveMenuReply"
              :on-open-document="openDocumentViewer"
              :on-audio-listened="markMessageAsPlayed"
              @reply="startReplyToMessage"
              @copy="copyMessagePlain"
              @react-quick="({ message, emoji }) => sendMessageReaction(message, emoji)"
              @react-open="onReactMenuItem"
              @open-reactions-mode="openMessageReactionMenu"
              @react-remove="(msg) => sendMessageReaction(msg, '')"
              @forward="forwardMessageStub"
              @pin="pinThisMessageInChat"
              @star="starMessageStub"
              @edit="editThisMessageText"
              @delete="deleteThisMessageForAll"
              @close-reactions-detail="reactionsDetailMessage = null"
              @reactions-tab-change="(tab) => { reactionsDetailTab = tab }"
              @reactions-row-click="onReactionsDetailRowClick"
            />

            <!-- Footer: reply bar + input -->
            <ChatFooter
              ref="chatFooterRef"
              v-model="newMessage"
              :replying-to="replyingTo"
              :sending="sending"
              :compose-locked="selectedGroupComposeLocked"
              :contact-blocked="selectedContactBlocked"
              :quick-replies-picker-open="quickRepliesPickerOpen"
              :quick-replies-items="filteredQuickReplies"
              :quick-replies-loading="quickRepliesLoading"
              :quick-replies-active-index="quickRepliesPickerActiveIndex"
              @update:quick-replies-active-index="quickRepliesPickerActiveIndex = $event"
              @send="handleSendMessage"
              @clear-reply="clearReplyingTo"
              @attach="triggerFilePicker(chatFooterRef?.mediaInputEl, sending, selectedChat, 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv')"
              @menu-action="handleFooterMenuAction"
              @media-change="onFooterMediaChange"
              @unblock="handleBlockedFooterUnblock"
              @delete-chat="handleBlockedFooterDeleteChat"
              @quick-reply-select="handleQuickReplyPickerSelect"
              @quick-replies-manage="openQuickRepliesManagePanel({ reload: true })"
              @quick-replies-keydown="handleQuickRepliesKeydown"
              @quick-replies-focus="syncQuickRepliesPickerFromMessage(newMessage, { forceOpen: true })"
              @quick-replies-close="closeQuickRepliesPicker()"
              @send-voice="handleSendVoice"
              @voice-error="handleVoiceRecorderError"
            />
            <MediaComposerModal
              :open="mediaComposerOpen"
              :files="mediaComposerFiles"
              :active-index="mediaComposerActiveIndex"
              :caption="mediaComposerCaption"
              :sending="mediaComposerSending"
              @close="closeMediaComposer"
              @add-more="triggerComposerAddMore"
              @send="confirmSendMediaComposer"
              @update:caption="mediaComposerCaption = $event"
              @insert-emoji="appendMediaComposerEmoji"
              @select-file="mediaComposerActiveIndex = $event"
            />
            <DocumentViewerModal
              :open="documentViewerOpen"
              :url="documentViewerUrl"
              :file-name="documentViewerName"
              :mime-type="documentViewerMimeType"
              @close="closeDocumentViewer"
            />
            <PollComposerModal
              :open="pollComposerOpen"
              :sending="pollComposerSending"
              :error="pollComposerError"
              :form="pollComposerForm"
              @cancel="closePollComposer"
              @confirm="submitPollComposer"
              @update:form="pollComposerForm = $event"
            />
            <SendContactsModal
              :open="sendContactsModalOpen"
              :sending="sendContactsSending"
              :contacts="filteredSendContacts"
              :selected-ids="sendContactsSelectedIds"
              :search-query="sendContactsSearchQuery"
              :feedback="sendContactsFeedback"
              @cancel="closeSendContactsModal"
              @confirm="confirmSendContacts"
              @toggle="toggleSendContactSelection"
              @update:search-query="sendContactsSearchQuery = $event"
            />
            <!-- Modais -->
            <SaveContactModal
              :open="saveContactModalOpen"
              :form="saveContactForm"
              :saving="savingContact"
              :feedback="saveContactFeedback"
              @confirm="confirmSaveContact"
              @cancel="closeSaveContactModal"
              @update:form="saveContactForm = $event"
            />

            <GroupPickerModal
              :open="addToGroupModalOpen"
              :groups="filteredGroupChats"
              :loading="addToGroupLoading"
              :search-query="addToGroupSearch"
              :selected-group-jid="addToGroupSelectedGroupJid"
              :feedback="addToGroupFeedback"
              @confirm="confirmAddSharedContactToGroup"
              @cancel="closeAddToGroupModal"
              @update:search-query="addToGroupSearch = $event"
              @update:selected-group-jid="addToGroupSelectedGroupJid = $event"
            />

            <BusinessProfileModal
              :open="businessProfileModalOpen"
              :loading="businessProfileLoading"
              :profile="businessProfileModalData"
              :catalog="businessProfileCatalog"
              :avatar-url="businessProfileAvatarUrl"
              :display-name="businessProfileDisplayName"
              :phone-label="businessProfilePhoneLabel"
              :primary-category="businessProfilePrimaryCategory"
              :primary-website="businessProfilePrimaryWebsite"
              :opening-label="businessProfileOpeningLabel"
              :hours-label="businessProfileHoursLabel"
              :weekly-schedule="businessProfileWeeklyScheduleRows"
              :address-line="businessProfileAddressLine"
              :email-label="businessProfileEmailLabel"
              :categories-label="businessProfileCategoriesLabel"
              @close="closeBusinessProfile"
            />
            <GroupMediaDocsModal
              v-if="groupMediaModalOpen && !contactInfoModalOpen && !groupInfoModalOpen"
              open
              :active-tab="groupMediaActiveTab"
              :media-items="groupInfoMediaItems"
              :document-items="groupInfoDocumentItems"
              :link-items="groupInfoLinkItems"
              @close="groupMediaModalOpen = false"
              @update:active-tab="groupMediaActiveTab = $event"
              @open-item="handleChatPanelOpenMedia"
            />
            </div>
            <GroupInfoModal
              v-if="groupInfoModalOpen && groupSidePanelView === 'info'"
              :open="true"
              :loading="groupInfoLoading"
              :error-message="groupInfoError"
              :group-info="activeGroupInfoForPanel"
              :chat="selectedChat"
              :participants="groupInfoParticipantsRaw"
              :member-context="groupMemberLookupContext"
              :muted="Boolean(groupMutedChats[String(selectedChat?.chatJid || '')])"
              :favorite="Boolean(groupFavoriteChats[String(selectedChat?.chatJid || '')])"
              :media-count="groupInfoMediaDocsCount"
              :preview-items="groupInfoPreviewItems"
              :viewer-is-admin="selectedGroupViewerIsAdmin"
              @close="closeGroupInfoModal"
              @request-members="handleGroupInfoAddMembers"
              @request-edit-name="handleGroupInfoEditName"
              @request-description="handleGroupInfoDescription"
              @request-media-docs="handleGroupInfoMediaDocs"
              @request-starred-messages="handleGroupInfoStarredMessages"
              @request-toggle-mute="handleGroupInfoToggleMute"
              @request-group-permissions="handleGroupInfoPermissions"
              @request-invite-link="handleGroupInfoInviteLink"
              @request-member-changes="groupInfoError = 'Historico de mudancas de membros sera integrado na proxima etapa.'"
              @request-toggle-favorite="handleGroupInfoToggleFavorite"
              @request-leave-group="handleGroupInfoLeave"
              @request-open-media="handleChatPanelOpenMedia"
              @request-search="groupInfoError = 'Busca interna de membros sera integrada na proxima etapa.'"
            />
            <GroupPermissionsPanel
              v-if="groupInfoModalOpen && groupSidePanelView === 'permissions'"
              :open="true"
              :loading="groupInfoLoading"
              :saving="groupPermissionsSaving"
              :error-message="groupInfoError"
              :group-info="activeGroupInfoForPanel"
              :viewer-is-admin="selectedGroupViewerIsAdmin"
              @back="handleGroupPermissionsBack"
              @toggle="handleGroupPermissionToggle"
              @request-edit-admins="handleGroupInfoEditAdmins"
            />
            <AddGroupMembersModal
              v-if="groupInfoModalOpen && addGroupMembersOpen"
              :open="true"
              :loading="addGroupMembersLoading"
              :sending="addGroupMembersSending"
              :contacts="filteredAddGroupMembersContacts"
              :selected-ids="addGroupMembersSelectedIds"
              :search-query="addGroupMembersSearchQuery"
              :feedback="addGroupMembersFeedback"
              @cancel="handleGroupAddMembersBack"
              @confirm="confirmAddGroupMembers"
              @toggle="toggleAddGroupMembersSelection"
              @update:search-query="addGroupMembersSearchQuery = $event"
            />
            <GroupMediaDocsModal
              v-if="groupInfoModalOpen && groupSidePanelView === 'media'"
              embedded
              open
              :active-tab="groupMediaActiveTab"
              :media-items="groupInfoMediaItems"
              :document-items="groupInfoDocumentItems"
              :link-items="groupInfoLinkItems"
              @close="handleGroupMediaPanelBack"
              @update:active-tab="groupMediaActiveTab = $event"
              @open-item="handleChatPanelOpenMedia"
            />
            <ContactInfoModal
              v-if="contactInfoModalOpen && contactSidePanelView === 'contact'"
              :open="true"
              :loading="contactInfoLoading"
              :error-message="contactInfoError"
              :details="contactInfoDetails"
              :chat="selectedChat"
              :muted="Boolean(groupMutedChats[String(selectedChat?.chatJid || '')])"
              :favorite="Boolean(groupFavoriteChats[String(selectedChat?.chatJid || '')])"
              :media-count="groupInfoMediaDocsCount"
              :preview-items="groupInfoPreviewItems"
              @close="closeContactInfoModal"
              @request-search="handleContactInfoSearch"
              @request-edit-notes="handleContactInfoEditNotes"
              @request-media-docs="handleContactInfoMediaDocs"
              @request-open-media="handleChatPanelOpenMedia"
              @request-starred-messages="handleContactInfoStarredMessages"
              @request-toggle-mute="handleContactInfoToggleMute"
              @request-toggle-favorite="handleContactInfoToggleFavorite"
              @request-toggle-block="handleContactInfoToggleBlock"
              @request-clear-chat="handleContactInfoClearChat"
              @request-report="handleContactInfoReport"
              @request-delete-chat="handleContactInfoDeleteChat"
              @request-open-group="handleContactInfoOpenGroup"
            />
            <GroupMediaDocsModal
              v-if="contactInfoModalOpen && contactSidePanelView === 'media'"
              embedded
              open
              :active-tab="groupMediaActiveTab"
              :media-items="groupInfoMediaItems"
              :document-items="groupInfoDocumentItems"
              :link-items="groupInfoLinkItems"
              @close="handleContactMediaPanelBack"
              @update:active-tab="groupMediaActiveTab = $event"
              @open-item="handleChatPanelOpenMedia"
            />
            <Transition name="quick-replies-panel-slide">
              <QuickRepliesSidebarPanel
                v-if="quickRepliesSidebarOpen"
                class="quick-replies-manage-panel"
                :items="quickRepliesList"
                :loading="quickRepliesLoading"
                @close="closeQuickRepliesSidebar"
                @select="handleQuickReplyManageSelect"
                @add-new="openQuickReplyFormModal()"
                @edit="openQuickReplyFormModal"
                @delete="openQuickReplyDeleteModal"
              />
            </Transition>
          </div>
        </main>

        <CreateGroupModal
          :open="createGroupModalOpen"
          :sending="createGroupSending"
          :group-name="createGroupName"
          :search-query="createGroupSearchQuery"
          :contacts="filteredCreateGroupContacts"
          :selected-ids="createGroupSelectedIds"
          :feedback="createGroupFeedback"
          @cancel="closeCreateGroupModal"
          @confirm="confirmCreateGroup"
          @toggle="toggleCreateGroupSelection"
          @update:group-name="createGroupName = $event"
          @update:search-query="createGroupSearchQuery = $event"
        />

        <BlockContactConfirmModal
          :open="blockConfirmOpen"
          :display-name="blockDialogDisplayName"
          :loading="blockActionLoading"
          @cancel="closeBlockConfirmDialog"
          @confirm="handleConfirmBlockContact"
        />
        <UnblockContactConfirmModal
          :open="unblockConfirmOpen"
          :display-name="blockDialogDisplayName"
          :loading="blockActionLoading"
          @cancel="closeUnblockConfirmDialog"
          @confirm="handleConfirmUnblockContact"
        />
        <QuickReplyFormModal
          :open="quickReplyFormOpen"
          :reply="quickReplyEditing"
          :saving="quickRepliesSaving"
          :error="quickReplyFormError"
          @cancel="closeQuickReplyFormModal"
          @save="submitQuickReplyForm"
        />
        <LabelDeleteConfirmModal
          :open="labelDeleteOpen"
          :saving="labelsSaving"
          @cancel="closeLabelDeleteModal"
          @confirm="confirmLabelDelete"
        />
        <LabelColorPickerModal
          :open="labelColorOpen"
          :label="labelColorTarget"
          :saving="labelsSaving"
          @cancel="closeLabelColorModal"
          @save="submitLabelColor"
        />
        <LabelFormModal
          :open="labelFormOpen"
          :label="labelEditing"
          :saving="labelsSaving"
          :error="labelFormError"
          @cancel="closeLabelFormModal"
          @save="submitLabelForm"
        />
        <LabelAssignPickerModal
          :open="labelAssignPickerOpen"
          :labels="assignableLabels"
          :saving="labelBulkSaving"
          @cancel="closeLabelAssignPicker"
          @select="handleBulkAddLabel"
        />
        <QuickReplyDeleteConfirmModal
          :open="quickReplyDeleteOpen"
          :reply="quickReplyDeleting"
          :saving="quickRepliesSaving"
          @cancel="closeQuickReplyDeleteModal"
          @confirm="confirmQuickReplyDelete"
        />
        <BlockContactSnackbar
          :snackbar="blockContactSnackbar"
          @undo="handleUndoBlockContact"
          @dismiss="dismissBlockContactSnackbar"
        />

      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, watchEffect } from 'vue'
import { isGroupJid, normalizeJid, getStoredSessionJid, isGroupAnnounceRestricted } from '~/composables/whatsapp/useWhatsappUtils.js'

definePageMeta({ ssr: false })

// ─── Componentes ──────────────────────────────────────────────────────────────
import ChatSidebar from '~/components/whatsapp/ChatSidebar.vue'
import ChatHeader from '~/components/whatsapp/ChatHeader.vue'
import WhatsappWebEmpty from '~/components/whatsapp/WhatsappWebEmpty.vue'
import ChatPinnedBar from '~/components/whatsapp/ChatPinnedBar.vue'
import ChatBody from '~/components/whatsapp/ChatBody.vue'
import ChatFooter from '~/components/whatsapp/ChatFooter.vue'
import PollComposerModal from '~/components/whatsapp/PollComposerModal.vue'
import SendContactsModal from '~/components/whatsapp/SendContactsModal.vue'
import CreateGroupModal from '~/components/whatsapp/CreateGroupModal.vue'
import AddGroupMembersModal from '~/components/whatsapp/AddGroupMembersModal.vue'
import GroupInfoModal from '~/components/whatsapp/GroupInfoModal.vue'
import GroupPermissionsPanel from '~/components/whatsapp/GroupPermissionsPanel.vue'
import GroupMediaDocsModal from '~/components/whatsapp/GroupMediaDocsModal.vue'
import ContactInfoModal from '~/components/whatsapp/ContactInfoModal.vue'
import MediaComposerModal from '~/components/whatsapp/MediaComposerModal.vue'
import DocumentViewerModal from '~/components/whatsapp/DocumentViewerModal.vue'
import SaveContactModal from '~/components/whatsapp/SaveContactModal.vue'
import GroupPickerModal from '~/components/whatsapp/GroupPickerModal.vue'
import BusinessProfileModal from '~/components/whatsapp/BusinessProfileModal.vue'
import BlockContactConfirmModal from '~/components/whatsapp/BlockContactConfirmModal.vue'
import UnblockContactConfirmModal from '~/components/whatsapp/UnblockContactConfirmModal.vue'
import BlockContactSnackbar from '~/components/whatsapp/BlockContactSnackbar.vue'
import QuickRepliesSidebarPanel from '~/components/whatsapp/QuickRepliesSidebarPanel.vue'
import LabelsSidebarPanel from '~/components/whatsapp/LabelsSidebarPanel.vue'
import LabelChatsSidebarPanel from '~/components/whatsapp/LabelChatsSidebarPanel.vue'
import LabelAssignPickerModal from '~/components/whatsapp/LabelAssignPickerModal.vue'
import LabelFormModal from '~/components/whatsapp/LabelFormModal.vue'
import LabelColorPickerModal from '~/components/whatsapp/LabelColorPickerModal.vue'
import LabelDeleteConfirmModal from '~/components/whatsapp/LabelDeleteConfirmModal.vue'
import QuickReplyFormModal from '~/components/whatsapp/QuickReplyFormModal.vue'
import QuickReplyDeleteConfirmModal from '~/components/whatsapp/QuickReplyDeleteConfirmModal.vue'

// ─── Composables ──────────────────────────────────────────────────────────────
import { useWhatsappState, messageActionsCoords, replyingTo } from '~/composables/whatsapp/useWhatsappState.js'
import { useWhatsappUtils } from '~/composables/whatsapp/useWhatsappUtils.js'
import { getAuthToken, getProxyBase, fetchWhatsappSessionConnected } from '~/composables/whatsapp/useWhatsappApi.js'
import { getWhatsappApiBase, isWhatsappConnectedFromStatusPayload } from '~/composables/whatsapp/useWhatsappApi.js'
import { useWhatsappChats, canonicalChatListKey } from '~/composables/whatsapp/useWhatsappChats.js'
import { useWhatsappContacts } from '~/composables/whatsapp/useWhatsappContacts.js'
import { useWhatsappMessages } from '~/composables/whatsapp/useWhatsappMessages.js'
import {
  collectPinTimelineEvents,
  filterPinSystemTextMessages,
  mergePinTimelineEvents,
} from '~/composables/whatsapp/useWhatsappChatTimeline.js'
import { formatBuilderChoicesToUazapi } from '~/composables/whatsapp/useWhatsappInteractive.js'
import { useWhatsappMessageActions } from '~/composables/whatsapp/useWhatsappMessageActions.js'
import { useWhatsappBusinessProfile } from '~/composables/whatsapp/useWhatsappBusinessProfile.js'
import { fetchContactChatDetails } from '~/composables/whatsapp/useWhatsappChatDetails.js'
import { useWhatsappSharedContacts } from '~/composables/whatsapp/useWhatsappSharedContacts.js'
import {
  blockConfirmOpen,
  unblockConfirmOpen,
  blockDialogTarget,
  blockActionLoading,
  blockContactSnackbar,
  resolveChatDisplayName,
  openUnblockContactDialog,
  requestToggleBlockDialog,
  closeBlockConfirmDialog,
  closeUnblockConfirmDialog,
  executeBlockContact,
  executeUnblockContact,
  undoBlockContact,
  dismissBlockContactSnackbar,
  isPrivateChatBlocked,
} from '~/composables/whatsapp/useWhatsappBlockContact.js'
import { deleteChatFromList } from '~/composables/whatsapp/useWhatsappChatListActions.js'
import {
  quickRepliesSidebarOpen,
  quickRepliesPickerOpen,
  quickRepliesLoading,
  quickRepliesSaving,
  quickRepliesList,
  quickRepliesFilter,
  openQuickRepliesPicker,
  closeQuickRepliesPicker,
  openQuickRepliesManagePanel,
  closeQuickRepliesSidebar,
  filterQuickReplies,
  quickReplyComposerText,
  isTextQuickReply,
  saveQuickReply,
  deleteQuickReply,
  sendQuickReply,
  loadQuickReplies,
} from '~/composables/whatsapp/useWhatsappQuickReplies.js'
import {
  labelsSidebarOpen,
  labelsLoading,
  labelsSaving,
  whatsappLabelsById,
  activeLabelView,
  labelChatSelection,
  labelAssignPickerOpen,
  labelBulkSaving,
  openLabelsManagePanel,
  closeLabelsSidebar,
  openLabelChatsView,
  closeLabelChatsView,
  saveWhatsappLabel,
  deleteWhatsappLabel,
  buildLabelsSidebarItems,
  filterChatsByLabel,
} from '~/composables/whatsapp/useWhatsappLabels.js'
import {
  toggleLabelChatSelection,
  clearLabelChatSelection,
  bulkRemoveActiveLabelFromSelection,
  bulkAddLabelToSelection,
  openLabelAssignPicker,
  closeLabelAssignPicker,
  listAssignableWhatsappLabels,
} from '~/composables/whatsapp/useWhatsappLabelChats.js'
import {
  createGroup as createGroupApi,
  getGroupInfo as getGroupInfoApi,
  leaveGroup as leaveGroupApi,
  resetGroupInviteCode as resetGroupInviteCodeApi,
  updateGroupAnnounce as updateGroupAnnounceApi,
  updateGroupDescription as updateGroupDescriptionApi,
  updateGroupLocked as updateGroupLockedApi,
  updateGroupName as updateGroupNameApi,
  updateGroupParticipants as updateGroupParticipantsApi
} from '~/composables/whatsapp/useWhatsappGroupsApi.js'

// ─── Estado compartilhado ─────────────────────────────────────────────────────
const {
  chats, loadingChats, searchQuery,
  selectedChat, messages, loadingMessages, loadingOlderMessages,
  newMessage, sending, mediaInputRef,
  // mediaInputRef é sincronizado com ChatFooter via watchEffect
  actionMenuMessageId, actionMenuMode, reactionsDetailMessage, reactionsDetailTab,
  downloadingMediaById, chatActionFeedback,
  saveContactModalOpen, savingContact, saveContactFeedback, saveContactForm,
  addToGroupModalOpen, addToGroupLoading, addToGroupSearch,
  addToGroupFeedback, addToGroupSelectedGroupJid,
  businessProfileModalOpen, businessProfileLoading,
  businessProfileModalData, businessProfileCatalog,
  senderAvatarDirectory, persistedContactStates,
  contactsDirectory, groupParticipantsDirectory, groupParticipantsByJid,
  groupParticipantsByLid, observedSenderDirectory, lidToJidMap,
  optimisticPinTimelineByChatJid,
} = useWhatsappState()

// ─── Utilitários ──────────────────────────────────────────────────────────────
const { formatTime, formatChatListTime, formatJidAsPhoneLine, formatWhatsappTextForDisplay } = useWhatsappUtils()

// ─── Chats ────────────────────────────────────────────────────────────────────
const {
        loadChats, selectChat, sendMessage, sendInteractiveMenuReply, refreshChatPreview, refreshSelectedChatMessages, scrollToBottom,
        startRealtimeSync, stopRealtimeSync, resetWhatsappAfterDisconnect,
        isActiveChatListItem, chatListPreviewPrefix, markAllChatsAsRead,
        markMessageAsPlayed, resetChatsRuntimeCaches, enrichMissingChatAvatars,
      } = useWhatsappChats()

// ─── Contatos ────────────────────────────────────────────────────────────────
const {
  restoreContactsFromCache, syncContactsDirectoryIfNeeded,
  resolveSenderName: resolveSenderNameBase, getMessageSenderAvatarUrl, getMessageSenderInitial,
  loadGroupParticipantsDirectory, resolveViewerGroupMembership
} = useWhatsappContacts()

/** Garante uso do chat aberto (grupo) mesmo quando a mensagem não traz isGroup/remoteJid. */
const resolveMessageSenderDisplayName = (msg) => resolveSenderNameBase(msg, selectedChat)

// ─── Mensagens ────────────────────────────────────────────────────────────────
const {
  renderedMessages, pinnedMessagesInChat, getMessageMergeKey, downloadMessageMedia,
  hasRenderableReactionPill, getReactionPillEmojis, showReactionPillCount,
  shouldHideAutoMediaLabelInBubble,
  extractUazapiJpegThumbDataUrl,
  resolveMediaGalleryPreviewUrl
} = useWhatsappMessages()

const chatBodyDisplayMessages = computed(() => {
  try {
    const rendered = renderedMessages.value
    if (Array.isArray(rendered) && rendered.length > 0) {
      return filterPinSystemTextMessages(rendered)
    }
  } catch {
    // renderedMessages falhou — usa estado bruto abaixo
  }
  return filterPinSystemTextMessages(Array.isArray(messages.value) ? messages.value : [])
})

const chatPinTimelineEvents = computed(() => {
  const chatJid = normalizeJid(selectedChat.value?.chatJid || '')
  const fromMessages = collectPinTimelineEvents(messages.value, resolveMessageSenderDisplayName)
  const optimistic = chatJid
    ? (Array.isArray(optimisticPinTimelineByChatJid.value[chatJid])
      ? optimisticPinTimelineByChatJid.value[chatJid]
      : [])
    : []
  return mergePinTimelineEvents(fromMessages, optimistic)
})

const chatBodyMessages = computed(() => {
  const source = filterPinSystemTextMessages(
    Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  )
  const q = String(messageSearchQuery.value || '').trim().toLowerCase()
  if (!q) return source
  return source.filter((msg) => {
    const text = String(msg?.text || msg?.body || msg?.caption || '').toLowerCase()
    return text.includes(q)
  })
})

// ─── Ações de mensagem ────────────────────────────────────────────────────────
const {
  messageQuickReactions, openMessageActionMenu, toggleMessageActionMenu, toggleMessageReactionMenu, openMessageReactionMenu,
  openActionMenuMessage, reactionsDetailEmojiTabs, reactionsDetailListRows,
  messageActionsHostInlineStyle, messageActionsReactionInlineStyle, messageActionsMenuInlineStyle,
  onMessageTouchStart, onMessageTouchMove, onMessageTouchEnd,
  onGlobalPointerDown, onGlobalKeydown, onMessageActionsWindowResize,
  openReactionsDetail, sendMessageReaction, onReactionsDetailRowClick, onReactMenuItem,
  startReplyToMessage, clearReplyingTo, copyMessagePlain,
  deleteThisMessageForAll, editThisMessageText, pinThisMessageInChat,
  forwardMessageStub, starMessageStub, onFormattedMessageClick,
  triggerFilePicker,
  layoutMessageActionsPanel
} = useWhatsappMessageActions()

// ─── Perfil comercial ─────────────────────────────────────────────────────────
const {
  openBusinessProfile, closeBusinessProfile,
  businessProfileDisplayName, businessProfilePhoneLabel,
  businessProfilePrimaryCategory, businessProfilePrimaryWebsite,
  businessProfileOpeningLabel, businessProfileHoursLabel,
  businessProfileWeeklyScheduleRows, businessProfileAddressLine,
  businessProfileEmailLabel, businessProfileCategoriesLabel,
  businessProfileAvatarUrl
} = useWhatsappBusinessProfile()

// ─── Contatos compartilhados ──────────────────────────────────────────────────
const {
  isSharedContactSaved, hasSharedContactBusinessProfile, getSharedContactAvatar,
  openSaveContactModal, closeSaveContactModal, confirmSaveContact,
  addSharedContactToGroup, closeAddToGroupModal, confirmAddSharedContactToGroup,
  filteredGroupChats, openConversationFromSharedContact, openBusinessProfileFromSharedContact
} = useWhatsappSharedContacts()

// ─── Handlers locais ──────────────────────────────────────────────────────────

// chatBodyRef do estado é preenchido diretamente por ChatBody.vue via template ref
const chatFooterRef = ref(null)
const messageSearchQuery = ref('')
const chatListFilter = ref('all')

const filteredQuickReplies = computed(() =>
  filterQuickReplies(quickRepliesList.value, quickRepliesFilter.value)
)

const labelsSidebarItems = computed(() =>
  buildLabelsSidebarItems(chats.value, whatsappLabelsById.value)
)

const hasActiveLabelView = computed(() => Boolean(activeLabelView.value))

const activeLabelChats = computed(() => {
  const view = activeLabelView.value
  if (!view) return []
  const labelId = String(view.id || view.labelid || '').trim()
  return filterChatsByLabel(chats.value, labelId)
})

const assignableLabels = computed(() => listAssignableWhatsappLabels())

const labelFormOpen = ref(false)
const labelEditing = ref(null)
const labelFormError = ref('')
const labelColorOpen = ref(false)
const labelColorTarget = ref(null)
const labelDeleteOpen = ref(false)
const labelDeleting = ref(null)

const quickRepliesPickerActiveIndex = ref(0)

const quickReplyFormOpen = ref(false)
const quickReplyFormError = ref('')
const quickReplyEditing = ref(null)
const quickReplyDeleteOpen = ref(false)
const quickReplyDeleting = ref(null)

const syncQuickRepliesPickerFromMessage = (value = newMessage.value, { forceOpen = false } = {}) => {
  const text = String(value || '')
  if (!selectedChat.value || selectedGroupComposeLocked.value) return
  if (!text.startsWith('/')) {
    if (quickRepliesPickerOpen.value) closeQuickRepliesPicker()
    quickRepliesPickerActiveIndex.value = 0
    return
  }
  const query = text.slice(1)
  if (query.includes(' ')) {
    closeQuickRepliesPicker()
    quickRepliesPickerActiveIndex.value = 0
    return
  }
  quickRepliesFilter.value = query.trim()
  quickRepliesPickerActiveIndex.value = 0
  if (!quickRepliesPickerOpen.value || forceOpen) {
    void openQuickRepliesPicker(query.trim())
  }
}

const applyQuickReplyTextToComposer = async (reply) => {
  const text = quickReplyComposerText(reply)
  if (!text) return false
  newMessage.value = text
  await nextTick()
  chatFooterRef.value?.resizeMessageInput?.()
  chatFooterRef.value?.focusMessageInput?.('end')
  return true
}

const handleQuickReplyPickerSelect = async (reply) => {
  closeQuickRepliesPicker()
  quickRepliesPickerActiveIndex.value = 0
  if (isTextQuickReply(reply)) {
    await applyQuickReplyTextToComposer(reply)
    return
  }
  newMessage.value = ''
  const ok = await sendQuickReply(reply)
  if (!ok) chatActionFeedback.value = 'Não foi possível enviar a resposta rápida.'
}

const handleQuickRepliesKeydown = (event) => {
  const items = filteredQuickReplies.value
  if (!items.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    quickRepliesPickerActiveIndex.value = (quickRepliesPickerActiveIndex.value + 1) % items.length
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    quickRepliesPickerActiveIndex.value =
      (quickRepliesPickerActiveIndex.value - 1 + items.length) % items.length
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const reply = items[quickRepliesPickerActiveIndex.value]
    if (reply) void handleQuickReplyPickerSelect(reply)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeQuickRepliesPicker()
  }
}

const handleQuickReplyManageSelect = async (reply) => {
  const shortcut = String(reply?.shortCut || '').trim()
  if (!shortcut) return
  closeQuickRepliesSidebar()
  newMessage.value = `/${shortcut}`
  await nextTick()
  void openQuickRepliesPicker(shortcut)
}

const openQuickReplyFormModal = (reply = null) => {
  quickReplyFormError.value = ''
  quickReplyEditing.value = reply
  quickReplyFormOpen.value = true
}

const closeQuickReplyFormModal = () => {
  quickReplyFormOpen.value = false
  quickReplyEditing.value = null
  quickReplyFormError.value = ''
}

const submitQuickReplyForm = async (payload) => {
  try {
    quickReplyFormError.value = ''
    await saveQuickReply(payload)
    closeQuickReplyFormModal()
    chatActionFeedback.value = payload?.id ? 'Resposta rápida atualizada.' : 'Resposta rápida criada.'
  } catch (error) {
    quickReplyFormError.value = String(error?.message || 'Falha ao salvar resposta rápida')
  }
}

const openQuickReplyDeleteModal = (reply) => {
  quickReplyDeleting.value = reply
  quickReplyDeleteOpen.value = true
}

const closeQuickReplyDeleteModal = () => {
  quickReplyDeleteOpen.value = false
  quickReplyDeleting.value = null
}

const confirmQuickReplyDelete = async () => {
  const reply = quickReplyDeleting.value
  if (!reply?.id) return
  try {
    await deleteQuickReply(reply.id)
    closeQuickReplyDeleteModal()
    chatActionFeedback.value = 'Resposta rápida apagada.'
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao apagar resposta rápida')
  }
}

const openLabelFormModal = (label = null) => {
  labelFormError.value = ''
  labelEditing.value = label
  labelFormOpen.value = true
}

const closeLabelFormModal = () => {
  labelFormOpen.value = false
  labelEditing.value = null
  labelFormError.value = ''
}

const submitLabelForm = async (payload) => {
  try {
    labelFormError.value = ''
    await saveWhatsappLabel(payload)
    closeLabelFormModal()
    chatActionFeedback.value = payload?.labelid && payload.labelid !== 'new'
      ? 'Etiqueta atualizada.'
      : 'Etiqueta criada.'
  } catch (error) {
    labelFormError.value = String(error?.message || 'Falha ao salvar etiqueta')
  }
}

const openLabelColorModal = (label) => {
  labelColorTarget.value = label
  labelColorOpen.value = true
}

const closeLabelColorModal = () => {
  labelColorOpen.value = false
  labelColorTarget.value = null
}

const submitLabelColor = async (payload) => {
  try {
    await saveWhatsappLabel(payload)
    closeLabelColorModal()
    chatActionFeedback.value = 'Cor da etiqueta atualizada.'
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao atualizar cor')
  }
}

const openLabelDeleteModal = (label) => {
  labelDeleting.value = label
  labelDeleteOpen.value = true
}

const closeLabelDeleteModal = () => {
  labelDeleteOpen.value = false
  labelDeleting.value = null
}

const confirmLabelDelete = async () => {
  const label = labelDeleting.value
  if (!label?.id) return
  try {
    await deleteWhatsappLabel(label)
    closeLabelDeleteModal()
    chatActionFeedback.value = 'Etiqueta apagada.'
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao apagar etiqueta')
  }
}

const handleOpenLabelChats = (label) => {
  if (!label?.id && !label?.labelid) return
  openLabelChatsView(label)
  void syncContactsDirectoryIfNeeded()
  const labelId = String(label.id || label.labelid || '').trim()
  void enrichMissingChatAvatars({
    chatList: filterChatsByLabel(chats.value, labelId),
    limit: 30,
  })
}

const handleLabelChatOpen = (chat) => {
  if (!chat) return
  selectChat(chat)
}

const handleBulkRemoveActiveLabel = async () => {
  if (!labelChatSelection.value.length) return
  try {
    const count = await bulkRemoveActiveLabelFromSelection(chats.value)
    chatActionFeedback.value = count === 1
      ? 'Etiqueta removida de 1 conversa.'
      : `Etiqueta removida de ${count} conversas.`
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao remover etiqueta')
  }
}

const handleBulkAddLabel = async (label) => {
  if (!label?.id) return
  try {
    const count = await bulkAddLabelToSelection(chats.value, label.id)
    chatActionFeedback.value = count === 1
      ? 'Etiqueta adicionada em 1 conversa.'
      : `Etiqueta adicionada em ${count} conversas.`
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao adicionar etiqueta')
  }
}

const handleQuickReplyAddNew = () => {
  openQuickReplyFormModal()
}

const pollComposerOpen = ref(false)
const pollComposerSending = ref(false)
const pollComposerError = ref('')
const pollComposerForm = ref({
  type: 'poll',
  text: '',
  choicesText: '',
  footerText: '',
  listButton: 'Ver opções',
  imageButton: '',
  allowMultiple: false,
  carouselCardsText: '',
  amount: '',
  pixKey: '',
  pixType: 'EVP',
  pixName: '',
  paymentLink: '',
  fileUrl: '',
  fileName: '',
  boletoCode: '',
  invoiceNumber: '',
  itemName: ''
})
const sendContactsModalOpen = ref(false)
const sendContactsSending = ref(false)
const sendContactsFeedback = ref('')
const sendContactsSearchQuery = ref('')
const sendContactsList = ref([])
const addGroupMembersContacts = ref([])
const addGroupMembersOpen = ref(false)
const addGroupMembersSelectedIds = ref([])
const addGroupMembersSearchQuery = ref('')
const addGroupMembersSending = ref(false)
const addGroupMembersLoading = ref(false)
const addGroupMembersFeedback = ref('')
const addressBookNormalizedCache = ref([])
const sendContactsSelectedIds = ref([])
const createGroupModalOpen = ref(false)
const createGroupSending = ref(false)
const createGroupFeedback = ref('')
const createGroupName = ref('')
const createGroupSearchQuery = ref('')
const createGroupContacts = ref([])
const createGroupSelectedIds = ref([])
const groupInfoModalOpen = ref(false)
const groupSidePanelView = ref('info')
const groupInfoLoading = ref(false)
const groupInfoError = ref('')
const groupInfoData = ref(null)
const groupInfoLoadedJid = ref('')
const groupInfoLoadSeq = ref(0)
const groupPermissionsSaving = ref(false)
const contactInfoModalOpen = ref(false)
const contactSidePanelView = ref('contact')
const contactInfoLoading = ref(false)
const contactInfoError = ref('')
const contactInfoDetails = ref(null)
const groupMediaModalOpen = ref(false)
const groupMediaActiveTab = ref('media')
const mediaComposerOpen = ref(false)
const mediaComposerSending = ref(false)
const mediaComposerCaption = ref('')
const mediaComposerFiles = ref([])
const mediaComposerActiveIndex = ref(0)
const documentViewerOpen = ref(false)
const documentViewerUrl = ref('')
const documentViewerName = ref('')
const documentViewerMimeType = ref('')
const documentViewerObjectUrl = ref('')
const autoMediaPrefetchAttemptedById = ref({})
const pendingDocumentUploads = ref({})
const groupMutedChats = ref({})
const groupFavoriteChats = ref({})
const sessionJid = ref('')
const groupAccessByJid = ref({})

const selectedChatIsGroup = computed(() => {
  const chat = selectedChat.value
  if (!chat) return false
  return Boolean(chat.isGroup || chat.wa_isGroup) || isGroupJid(chat.chatJid || chat.wa_chatid || '')
})

const activeGroupInfoForPanel = computed(() => {
  const currentJid = normalizeJid(resolveSelectedChatJid())
  const loadedJid = normalizeJid(
    groupInfoLoadedJid.value ||
    groupInfoData.value?.JID ||
    groupInfoData.value?.jid ||
    groupInfoData.value?.groupjid ||
    ''
  )
  if (!currentJid || !loadedJid || currentJid !== loadedJid || !groupInfoData.value) return null
  return groupInfoData.value
})

const selectedGroupAccess = computed(() => {
  const jid = normalizeJid(resolveSelectedChatJid())
  if (!jid || !selectedChatIsGroup.value) {
    return { isAnnounce: false, viewerIsAdmin: false, loaded: false }
  }
  const cached = groupAccessByJid.value[jid]
  const modalJid = normalizeJid(groupInfoData.value?.JID || groupInfoData.value?.jid || groupInfoData.value?.groupjid || '')
  if (modalJid && modalJid === jid) {
    const participants = Array.isArray(groupInfoData.value?.Participants)
      ? groupInfoData.value.Participants
      : (Array.isArray(groupInfoData.value?.participants) ? groupInfoData.value.participants : [])
    const membership = resolveViewerGroupMembership(
      participants,
      sessionJid.value || getStoredSessionJid(),
      { lidMap: lidToJidMap.value, groupInfo: groupInfoData.value }
    )
    return {
      isAnnounce: isGroupAnnounceRestricted(groupInfoData.value),
      viewerIsAdmin: membership.isAdmin,
      loaded: true
    }
  }
  return cached || { isAnnounce: false, viewerIsAdmin: false, loaded: false }
})

const selectedGroupViewerIsAdmin = computed(() => Boolean(selectedGroupAccess.value.viewerIsAdmin))

const selectedGroupComposeLocked = computed(() => {
  const access = selectedGroupAccess.value
  if (!selectedChatIsGroup.value || !access.loaded) return false
  return access.isAnnounce && !access.viewerIsAdmin
})

const selectedContactBlocked = computed(() => {
  if (!selectedChat.value || selectedChatIsGroup.value) return false
  return isPrivateChatBlocked(selectedChat.value)
})

const blockDialogDisplayName = computed(() =>
  resolveChatDisplayName(blockDialogTarget.value || selectedChat.value)
)

const syncContactInfoBlockedState = (blocked) => {
  if (!contactInfoDetails.value) return
  contactInfoDetails.value = { ...contactInfoDetails.value, isBlocked: blocked }
}
const addressBookContactsCache = ref([])
const addressBookContactsCacheAt = ref(0)
const contactAvatarCache = ref({})
const AVATAR_CACHE_KEY = 'wa_contact_avatar_cache_v1'
const CONTACTS_CACHE_TTL_MS = 60 * 1000

// Sincroniza o mediaInputRef do estado com o elemento interno do ChatFooter
watchEffect(() => {
  if (chatFooterRef.value?.mediaInputEl) {
    mediaInputRef.value = chatFooterRef.value.mediaInputEl
  }
})

const filteredChats = computed(() => {
  let list = Array.isArray(chats.value) ? chats.value : []
  if (chatListFilter.value === 'unread') {
    list = list.filter((c) => Number(c?.unreadCount || 0) > 0)
  } else if (chatListFilter.value === 'groups') {
    list = list.filter((c) => Boolean(c?.isGroup || c?.wa_isGroup))
  }
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(
    (c) =>
      c.pushName?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.chatJid?.includes(q)
  )
})

const filteredSendContacts = computed(() => {
  const query = String(sendContactsSearchQuery.value || '').trim().toLowerCase()
  if (!query) return sendContactsList.value
  return sendContactsList.value.filter((item) =>
    String(item?.name || '').toLowerCase().includes(query) ||
    String(item?.number || '').toLowerCase().includes(query) ||
    String(item?.subtitle || '').toLowerCase().includes(query)
  )
})

const existingGroupMemberKeys = computed(() => {
  const participants = groupInfoParticipantsRaw.value
  const keys = new Set()
  participants.forEach((participant) => {
    const jid = String(participant?.JID || participant?.jid || participant?.PhoneNumber || '').trim()
    const lid = String(participant?.LID || participant?.lid || '').trim()
    const phoneFromJid = jid.includes('@') ? jid.split('@')[0].replace(/\D/g, '') : ''
    const phone = String(participant?.PhoneNumber || phoneFromJid || '').replace(/\D/g, '')
    if (phone.length >= 10) keys.add(phone)
    if (jid) keys.add(normalizeJid(jid))
    if (lid) keys.add(normalizeJid(lid))
  })
  return keys
})

const isContactAlreadyInGroup = (contact) => {
  const memberKeys = existingGroupMemberKeys.value
  const number = String(contact?.number || '').replace(/\D/g, '')
  if (number.length >= 10 && memberKeys.has(number)) return true
  const jid = normalizeJid(contact?.jid || '')
  if (jid && memberKeys.has(jid)) return true
  return false
}

const filteredAddGroupMembersContacts = computed(() => {
  const query = String(addGroupMembersSearchQuery.value || '').trim().toLowerCase()
  return addGroupMembersContacts.value.filter((item) => {
    if (isContactAlreadyInGroup(item)) return false
    if (!query) return true
    return String(item?.name || '').toLowerCase().includes(query) ||
      String(item?.number || '').includes(query) ||
      String(item?.displayNumber || '').includes(query) ||
      String(item?.subtitle || '').toLowerCase().includes(query)
  })
})

const filteredCreateGroupContacts = computed(() => {
  const query = String(createGroupSearchQuery.value || '').trim().toLowerCase()
  if (!query) return createGroupContacts.value
  return createGroupContacts.value.filter((item) =>
    String(item?.name || '').toLowerCase().includes(query) ||
    String(item?.number || '').toLowerCase().includes(query)
  )
})

const groupInfoMediaItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  return source
    .filter((msg) => {
      const mediaType = String(msg?.mediaType || '').toLowerCase()
      return ['image', 'video', 'sticker'].includes(mediaType)
    })
    .map((msg, index) => {
      const { previewUrl, mediaUrl, thumbUrl } = resolveMediaGalleryPreviewUrl(msg)
      const mediaType = String(msg?.mediaType || msg?.type || 'media').toLowerCase()
      const label = mediaType.includes('video') ? 'Vídeo' : mediaType.includes('sticker') ? 'Figurinha' : 'Imagem'
      return {
        id: String(msg?.id || msg?.messageid || `media-${index}`),
        kind: 'media',
        previewUrl,
        mediaUrl: mediaUrl || previewUrl,
        thumbUrl,
        mediaType,
        label,
        timestamp: Number(msg?.timestamp || 0)
      }
    })
    .filter((item) => Boolean(item.previewUrl || item.mediaUrl))
    .sort((a, b) => b.timestamp - a.timestamp)
})

const groupInfoDocumentItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  return source
    .filter((msg) => String(msg?.mediaType || '').toLowerCase() === 'document')
    .map((msg, index) => {
      const documentNode = msg?.content?.documentMessage || {}
      const fileName = String(documentNode?.fileName || msg?.text || `Documento ${index + 1}`).trim()
      const mediaUrl = String(msg?.mediaUrl || '').trim()
      const pageCountRaw = Number(documentNode?.pageCount || documentNode?.pageCountV2 || 0)
      const pageCount = Number.isFinite(pageCountRaw) && pageCountRaw > 0 ? Math.floor(pageCountRaw) : 0
      const mimeType = String(documentNode?.mimetype || documentNode?.mimeType || '').trim().toUpperCase() || 'DOC'
      const fileLengthRaw = Number(documentNode?.fileLength || documentNode?.fileSize || 0)
      const fileKb = Number.isFinite(fileLengthRaw) && fileLengthRaw > 0 ? `${Math.max(1, Math.round(fileLengthRaw / 1024))} KB` : ''
      const metadata = [pageCount ? `${pageCount} ${pageCount > 1 ? 'páginas' : 'página'}` : '', mimeType, fileKb].filter(Boolean).join(' · ')
      const previewImage = String(extractUazapiJpegThumbDataUrl(msg?.content) || '').trim()
      return {
        id: String(msg?.id || msg?.messageid || `doc-${index}`),
        kind: 'document',
        fileName,
        subtitle: metadata || 'Documento',
        previewUrl: previewImage,
        mediaUrl,
        timestamp: Number(msg?.timestamp || 0),
        senderLabel: String(msg?.senderDisplayName || '').trim() || 'Contato',
        dayLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long' }) : '',
        dateLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR') : '',
        timeLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
})

const linkUrlPattern = /(https?:\/\/[^\s<>"']+)/gi

const cleanLinkHref = (href) => String(href || '').trim().replace(/[)\],.;!?]+$/g, '')

const linkHostFromHref = (href) => {
  try {
    return new URL(String(href || '')).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

const isUrlLikeText = (value) => /^https?:\/\//i.test(String(value || '').trim())

const buildLinkPanelTitle = (linkPreview, href) => {
  const title = String(linkPreview?.title || '').trim()
  const source = String(linkPreview?.source || linkHostFromHref(href)).trim()
  if (title && title !== href && !isUrlLikeText(title)) return title
  return source || href
}

const buildLinkPanelDescription = (linkPreview, href, title) => {
  const description = String(linkPreview?.description || '').trim()
  if (!description || description === href || description === title || isUrlLikeText(description)) return ''
  return description
}

const buildLinkPanelCaption = (linkPreview, href) => {
  const caption = String(linkPreview?.bodyText || '').trim()
  if (!caption || caption === href || isUrlLikeText(caption)) return ''
  if (caption.includes(href)) return ''
  return caption
}

const groupInfoLinkItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  const links = []

  source.forEach((msg, msgIndex) => {
    const pushLink = (href, linkPreview = null) => {
      const cleanHref = cleanLinkHref(href)
      if (!cleanHref || !/^https?:\/\//i.test(cleanHref)) return
      const title = buildLinkPanelTitle(linkPreview, cleanHref)
      const description = linkPreview ? buildLinkPanelDescription(linkPreview, cleanHref, title) : ''
      const caption = linkPreview ? buildLinkPanelCaption(linkPreview, cleanHref) : ''
      const previewImage = String(linkPreview?.imageUrl || '').trim()
      const sourceLabel = String(linkPreview?.source || linkHostFromHref(cleanHref)).trim()

      links.push({
        id: `${String(msg?.id || msg?.messageid || `link-${msgIndex}`)}-${cleanHref}`,
        kind: 'link',
        href: cleanHref,
        title,
        description,
        caption,
        previewImage,
        source: sourceLabel,
        senderLabel: String(msg?.senderDisplayName || msg?.pushName || '').trim() || 'Contato',
        timeLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        dayLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long' }) : '',
        timestamp: Number(msg?.timestamp || 0)
      })
    }

    if (msg?.linkPreview?.url) {
      pushLink(msg.linkPreview.url, msg.linkPreview)
      return
    }

    const text = String(msg?.text || '').trim()
    if (!text) return
    const hrefSet = new Set()
    for (const match of text.match(linkUrlPattern) || []) {
      const clean = cleanLinkHref(match)
      if (clean) hrefSet.add(clean)
    }
    hrefSet.forEach((href) => pushLink(href, null))
  })
  const uniqueByHref = new Map()
  links.forEach((item) => {
    const key = String(item.href || '').toLowerCase()
    if (!key) return
    const current = uniqueByHref.get(key)
    if (!current) {
      uniqueByHref.set(key, item)
      return
    }

    const score = (entry) => {
      if (!entry || typeof entry !== 'object') return 0
      let points = 0
      if (String(entry.previewImage || '').trim()) points += 100
      if (String(entry.title || '').trim() && String(entry.title || '').trim() !== String(entry.href || '').trim()) points += 20
      if (String(entry.description || '').trim()) points += 15
      if (String(entry.caption || '').trim()) points += 8
      if (String(entry.source || '').trim()) points += 5
      return points
    }

    const currentScore = score(current)
    const incomingScore = score(item)
    if (incomingScore > currentScore) {
      uniqueByHref.set(key, item)
      return
    }
    if (incomingScore === currentScore && Number(item.timestamp || 0) > Number(current?.timestamp || 0)) {
      uniqueByHref.set(key, item)
    }
  })
  return Array.from(uniqueByHref.values()).sort((a, b) => b.timestamp - a.timestamp)
})

const groupInfoPreviewItems = computed(() =>
  groupInfoMediaItems.value
    .filter((item) => Boolean(item.previewUrl))
    .slice(0, 4)
)

const groupInfoMediaDocsCount = computed(
  () => groupInfoMediaItems.value.length + groupInfoDocumentItems.value.length + groupInfoLinkItems.value.length
)

const groupInfoParticipantsRaw = computed(() => {
  if (!groupInfoModalOpen.value) return []
  const data = activeGroupInfoForPanel.value
  if (!data) return []
  if (Array.isArray(data.Participants)) return data.Participants
  if (Array.isArray(data.participants)) return data.participants
  return []
})

const groupMemberLookupContext = computed(() => ({
  contactsDirectory: contactsDirectory.value,
  groupParticipantsDirectory: groupParticipantsDirectory.value,
  groupParticipantsByJid: groupParticipantsByJid.value,
  groupParticipantsByLid: groupParticipantsByLid.value,
  observedSenderDirectory: observedSenderDirectory.value,
  senderAvatarDirectory: senderAvatarDirectory.value,
  lidToJidMap: lidToJidMap.value
}))

const handleOpenConversation = (sharedContact) => {
  openConversationFromSharedContact(
    sharedContact,
    selectChat,
    loadChats,
    (chat) => Number(chat?.lastMessageTime || chat?.timestamp || 0)
  )
}

const handleOpenBusinessProfile = async (sharedContact) => {
  await openBusinessProfileFromSharedContact(sharedContact, {
    openBusinessProfileFn: openBusinessProfile,
    selectChatFn: selectChat,
    loadChatsFn: loadChats,
    getChatActivityTimestampFn: (chat) => Number(chat?.lastMessageTime || chat?.timestamp || 0),
    businessProfileStateSetter: ({ profile, catalog, categoriesMap }) => {
      businessProfileModalData.value = profile
      businessProfileCatalog.value = catalog
    }
  })
}

const closeMediaComposer = (force = false) => {
  if (mediaComposerSending.value && !force) return
  mediaComposerFiles.value.forEach((item) => {
    const url = String(item?.previewUrl || '').trim()
    if (url && url.startsWith('blob:') && typeof URL !== 'undefined') {
      try { URL.revokeObjectURL(url) } catch {}
    }
  })
  mediaComposerOpen.value = false
  mediaComposerCaption.value = ''
  mediaComposerFiles.value = []
  mediaComposerActiveIndex.value = 0
}

const triggerComposerAddMore = () => {
  triggerFilePicker(
    chatFooterRef.value?.mediaInputEl,
    sending.value || mediaComposerSending.value,
    selectedChat.value,
    'image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv'
  )
}

const normalizeMediaComposerFiles = (fileList) => {
  const buildDocumentFallbackThumbnail = (fileName = 'Documento') => {
    if (typeof document === 'undefined') return ''
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 360
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.fillStyle = '#0b2a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#123f44'
      ctx.fillRect(0, 0, canvas.width, 84)
      ctx.fillStyle = '#ff4d6d'
      ctx.fillRect(28, 122, 72, 88)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.fillText('PDF', 36, 175)
      const safeName = String(fileName || 'Documento').trim().slice(0, 42)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 30px Arial'
      ctx.fillText(safeName || 'Documento', 120, 168)
      return canvas.toDataURL('image/jpeg', 0.82)
    } catch {
      return ''
    }
  }

  const next = []
  Array.from(fileList || []).forEach((file, index) => {
    if (!file) return
    const mime = String(file.type || '').toLowerCase()
    const extension = String(file.name || '').split('.').pop() || ''
    const normalizedExtension = String(extension || '').trim().toLowerCase()
    const isPdfByMime = mime === 'application/pdf'
    const isPdfByExtension = normalizedExtension === 'pdf'
    const isPdfDocument = isPdfByMime || isPdfByExtension
    const type = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
        ? 'video'
        : mime.startsWith('audio/')
          ? 'audio'
          : 'document'
    const previewUrl = (type === 'image' || type === 'video' || isPdfDocument) ? URL.createObjectURL(file) : ''
    const sizeMb = Number(file.size || 0) / (1024 * 1024)
    next.push({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      type,
      previewUrl,
      documentThumbDataUrl: type === 'document' ? buildDocumentFallbackThumbnail(file.name || 'Documento') : '',
      name: String(file.name || 'Arquivo').trim(),
      sizeLabel: sizeMb > 0 ? `${sizeMb.toFixed(1)} MB` : '',
      extensionLabel: extension ? extension.toUpperCase() : (isPdfDocument ? 'PDF' : type.toUpperCase())
    })
  })
  return next
}

const onFooterMediaChange = (event) => {
  if (selectedGroupComposeLocked.value) return
  const files = normalizeMediaComposerFiles(event?.target?.files)
  event.target.value = ''
  if (!files.length || !selectedChat.value?.chatJid) return
  mediaComposerFiles.value = [...mediaComposerFiles.value, ...files]
  mediaComposerOpen.value = true
  mediaComposerActiveIndex.value = Math.max(0, mediaComposerFiles.value.length - files.length)
}

const appendMediaComposerEmoji = (emoji) => {
  mediaComposerCaption.value = String(emoji || '')
}

const upsertPendingDocumentMessages = (chatJid, files, caption) => {
  const targetChatJid = String(chatJid || '').trim()
  if (!targetChatJid || !Array.isArray(files) || !files.length) return []
  const now = Date.now()
  const pendingRows = files.map((item, idx) => {
    const pendingId = `pending-doc-${now}-${idx}-${Math.random().toString(36).slice(2, 8)}`
    pendingDocumentUploads.value[pendingId] = {
      chatJid: targetChatJid,
      fileName: String(item?.file?.name || item?.name || 'Documento').trim().toLowerCase(),
      createdAt: now
    }
    return {
      id: pendingId,
      messageid: pendingId,
      fromMe: true,
      timestamp: now + idx,
      text: String(caption || '').trim(),
      isMedia: true,
      mediaType: 'document',
      mediaUrl: '',
      previewUrl: String(item?.documentThumbDataUrl || '').trim(),
      documentFileName: String(item?.file?.name || item?.name || 'Documento').trim(),
      documentSizeBytes: Number(item?.file?.size || 0),
      mimetype: String(item?.file?.type || '').trim(),
      isPendingUpload: true,
      deliveryStatus: 'pending',
      deliveryIndicator: '⏳'
    }
  })
  messages.value = [...messages.value, ...pendingRows]
  return pendingRows.map((row) => row.id)
}

const reconcilePendingDocumentMessages = () => {
  const currentChatJid = String(selectedChat.value?.chatJid || '').trim()
  if (!currentChatJid) return
  const rendered = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  const deliveredDocNames = new Set(
    rendered
      .filter((msg) => msg && !msg.isPendingUpload && msg.fromMe && String(msg.mediaType || '').toLowerCase() === 'document')
      .map((msg) => String(msg.documentFileName || msg.fileName || msg.text || '').trim().toLowerCase())
      .filter(Boolean)
  )
  const now = Date.now()
  const toRemove = new Set()
  Object.entries(pendingDocumentUploads.value).forEach(([pendingId, meta]) => {
    if (String(meta?.chatJid || '') !== currentChatJid) return
    const matchedDelivered = meta?.fileName && deliveredDocNames.has(String(meta.fileName || '').toLowerCase())
    const expired = Number(now - Number(meta?.createdAt || now)) > 180000
    if (matchedDelivered || expired) {
      toRemove.add(pendingId)
      delete pendingDocumentUploads.value[pendingId]
    }
  })
  if (!toRemove.size) return
  messages.value = messages.value.filter((msg) => !toRemove.has(String(msg?.id || '')))
}

const preloadMissingMediaInBackground = async (items = []) => {
  const candidates = (Array.isArray(items) ? items : [])
    .filter((msg) =>
      msg &&
      msg.isMedia &&
      !msg.isPendingUpload &&
      !msg.mediaUrl &&
      String(msg.mediaType || '').toLowerCase() !== 'document' &&
      !autoMediaPrefetchAttemptedById.value[msg.id] &&
      !downloadingMediaById.value[msg.id]
    )
    .slice(0, 20)
  if (!candidates.length) return
  await Promise.allSettled(candidates.map(async (item) => {
    const ok = await downloadMessageMedia(item)
    if (ok) {
      autoMediaPrefetchAttemptedById.value = {
        ...autoMediaPrefetchAttemptedById.value,
        [item.id]: true,
      }
    }
  }))
}

const fileToBase64DataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const toPureBase64 = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const marker = 'base64,'
  const markerIndex = raw.indexOf(marker)
  if (markerIndex >= 0) return raw.slice(markerIndex + marker.length).trim()
  return raw
}

const sendMediaWithTimeout = async (proxyBase, payload, timeoutMs = 45000) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller
    ? setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
    : null
  try {
    const response = await fetch(`${proxyBase}/send/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(payload),
      signal: controller?.signal
    })
    const body = await response.json().catch(() => ({}))
    return { response, body }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const blobToBase64DataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

const handleVoiceRecorderError = (message) => {
  chatActionFeedback.value = String(message || 'Não foi possível gravar áudio.')
}

const handleSendVoice = async (payload) => {
  if (!selectedChat.value?.chatJid || sending.value || !payload?.blob) return
  const chatJid = selectedChat.value.chatJid
  const savedReplyingTo = replyingTo.value
  const mimeType = String(payload.mimeType || payload.blob.type || 'audio/webm').trim() || 'audio/webm'

  try {
    sending.value = true
    const base64File = await blobToBase64DataUrl(payload.blob)
    const requestPayload = {
      number: chatJid,
      type: 'ptt',
      file: toPureBase64(base64File),
      mimetype: mimeType,
    }
    if (savedReplyingTo?.messageid) requestPayload.replyid = savedReplyingTo.messageid

    const { response, body } = await sendMediaWithTimeout(getProxyBase(), requestPayload, 45000)
    if (!response.ok) {
      throw new Error(body?.message || body?.error || 'Falha ao enviar mensagem de voz')
    }

    replyingTo.value = null
    refreshChatPreview(chatJid, {
      lastMessage: '🎤 Mensagem de voz',
      lastMessageFromMe: true,
      lastMessagePrefix: '',
      lastMessageTime: Date.now(),
      wa_lastMessageTextVote: '🎤 Mensagem de voz',
    })
    await refreshSelectedChatMessages()
    scrollToBottom()
  } catch (error) {
    chatActionFeedback.value = String(error?.message || 'Falha ao enviar mensagem de voz')
  } finally {
    sending.value = false
  }
}

const confirmSendMediaComposer = async () => {
  if (!selectedChat.value?.chatJid || mediaComposerSending.value || !mediaComposerFiles.value.length) return
  const chatToRefresh = selectedChat.value
  mediaComposerSending.value = true
  try {
    const proxyBase = getProxyBase()
    const items = [...mediaComposerFiles.value]
    const caption = String(mediaComposerCaption.value || '').trim()
    const documentItems = items.filter((item) => String(item?.type || '').toLowerCase() === 'document')
    if (documentItems.length) {
      upsertPendingDocumentMessages(selectedChat.value.chatJid, documentItems, caption)
    }
    const hasDocument = items.some((item) => String(item?.type || '').toLowerCase() === 'document')
    const CONCURRENCY = hasDocument ? 1 : 2
    let cursor = 0
    let hasAsyncDocumentPending = false
    const looksLikeTimeoutError = (value) => {
      const t = String(value || '').trim().toLowerCase()
      return t.includes('timeout') || t.includes('timed out') || t.includes('gateway timeout')
    }
    const isDocAsyncPendingCase = (status, message, errorObj) => {
      const statusNum = Number(status || 0)
      if ([408, 502, 503, 504, 524].includes(statusNum)) return true
      if (looksLikeTimeoutError(message)) return true
      const errMsg = String(errorObj?.message || '').toLowerCase()
      const errName = String(errorObj?.name || '').toLowerCase()
      if (errName === 'aborterror') return true
      return errMsg.includes('timeout') || errMsg.includes('failed to fetch') || errMsg.includes('networkerror')
    }
    const scheduleBackgroundRefreshes = () => {
      const delays = [1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000, 55000, 70000, 90000, 120000]
      delays.forEach((delayMs) => {
        setTimeout(() => {
          if (normalizeJid(selectedChat.value?.chatJid || '') === normalizeJid(chatToRefresh?.chatJid || '')) {
            refreshSelectedChatMessages().catch(() => {})
          }
        }, delayMs)
      })
    }

    const worker = async () => {
      while (cursor < items.length) {
        const currentIndex = cursor++
        const item = items[currentIndex]
        const file = item?.file
        if (!file) continue
        const base64File = await fileToBase64DataUrl(file)
        const isDocumentType = String(item?.type || '').toLowerCase() === 'document'
        const normalizedMimeType = String(file.type || '').trim()
        const normalizedDocName = String(file.name || '').trim()
        const requestPayload = {
          number: selectedChat.value.chatJid,
          type: item.type,
          file: toPureBase64(base64File),
          mimetype: normalizedMimeType,
          text: caption,
          async: isDocumentType
        }
        if (isDocumentType && normalizedDocName) requestPayload.docName = normalizedDocName

        let response
        let body
        const requestTimeoutMs = (isDocumentType && requestPayload.async === true) ? 5000 : 20000
        try {
          ({ response, body } = await sendMediaWithTimeout(proxyBase, requestPayload, requestTimeoutMs))
        } catch (requestError) {
          if (isDocumentType && requestPayload.async === true && isDocAsyncPendingCase(0, '', requestError)) {
            hasAsyncDocumentPending = true
            continue
          }
          throw requestError
        }
        if (!response.ok && isDocumentType && requestPayload.async === true && isDocAsyncPendingCase(response.status, body?.message || body?.error || '', null)) {
          hasAsyncDocumentPending = true
          continue
        }
        if (!response.ok && (response.status === 504 || response.status === 502)) {
          try {
            ;({ response, body } = await sendMediaWithTimeout(proxyBase, requestPayload, 25000))
          } catch (retryError) {
            if (isDocumentType && requestPayload.async === true && isDocAsyncPendingCase(0, '', retryError)) {
              hasAsyncDocumentPending = true
              continue
            }
            throw retryError
          }
        }
        if (!response.ok && isDocumentType && requestPayload.async === true && isDocAsyncPendingCase(response.status, body?.message || body?.error || '', null)) {
          hasAsyncDocumentPending = true
          continue
        }
        const responseErrorMessage = String(body?.message || body?.error || '').trim()
        if (!response.ok && isDocumentType && requestPayload.async === true && isDocAsyncPendingCase(response.status, responseErrorMessage, null)) {
          hasAsyncDocumentPending = true
          continue
        }
        if (!response.ok) {
          throw new Error(body?.message || body?.error || `Falha ao enviar ${file.name}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()))
    mediaComposerSending.value = false
    closeMediaComposer(true)
    if (hasAsyncDocumentPending) {
      chatActionFeedback.value = 'Documento em processamento no servidor. Atualizando conversa em segundo plano...'
      scheduleBackgroundRefreshes()
    } else {
      selectChat(chatToRefresh).catch(() => {})
    }
  } catch (error) {
    const aborted = String(error?.name || '').toLowerCase() === 'aborterror'
    chatActionFeedback.value = aborted
      ? 'Tempo de envio excedido. Tente novamente com arquivo menor ou aguarde a conexão estabilizar.'
      : String(error?.message || 'Falha ao enviar arquivo(s)')
    mediaComposerSending.value = false
    return
  }
}

const jumpToMessageById = (targetId) => {
  const id = String(targetId || '').trim()
  if (!id || typeof document === 'undefined') return

  const escapeForSelector = (value) => (
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(value)
      : String(value).replace(/"/g, '\\"')
  )

  let targetEl = document.querySelector(`.chat-body [data-message-provider-id="${escapeForSelector(id)}"]`)
  if (!targetEl) targetEl = document.querySelector(`.chat-body [data-message-internal-id="${escapeForSelector(id)}"]`)
  if (!targetEl) targetEl = document.querySelector(`.chat-body [data-message-id="${escapeForSelector(id)}"]`)

  if (!targetEl) {
    const candidates = Array.from(document.querySelectorAll('.chat-body [data-message-provider-id], .chat-body [data-message-internal-id], .chat-body [data-message-id]'))
    targetEl = candidates.find((el) => {
      const providerId = String(el.getAttribute('data-message-provider-id') || '').trim()
      const internalId = String(el.getAttribute('data-message-internal-id') || '').trim()
      const localId = String(el.getAttribute('data-message-id') || '').trim()
      const related = String(el.getAttribute('data-message-related-ids') || '').split('|').map((v) => String(v || '').trim()).filter(Boolean)
      const values = [providerId, internalId, localId, ...related].filter(Boolean)
      return values.some((value) => value === id || value.endsWith(id) || id.endsWith(value))
    }) || null
  }

  if (!targetEl) return

  targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  targetEl.classList.add('is-quoted-target')
  setTimeout(() => targetEl.classList.remove('is-quoted-target'), 1600)
}

const jumpToRepliedMessage = (msg) => {
  jumpToMessageById(msg?.replyParentMessageId)
}

const jumpToPinnedMessage = (msg) => {
  jumpToMessageById(msg?.normalizedMessageId || msg?.messageid || msg?.id)
}

const resetPollComposer = () => {
  pollComposerForm.value = {
    type: 'poll',
    text: '',
    choicesText: '',
    footerText: '',
    listButton: 'Ver opções',
    imageButton: '',
    allowMultiple: false,
    carouselCardsText: '',
    amount: '',
    pixKey: '',
    pixType: 'EVP',
    pixName: '',
    paymentLink: '',
    fileUrl: '',
    fileName: '',
    boletoCode: '',
    invoiceNumber: '',
    itemName: ''
  }
}

const closePollComposer = () => {
  pollComposerOpen.value = false
  pollComposerSending.value = false
  pollComposerError.value = ''
  resetPollComposer()
}

const submitPollComposer = async () => {
  if (!selectedChat.value?.chatJid || pollComposerSending.value) return
  pollComposerError.value = ''
  const type = String(pollComposerForm.value?.type || 'poll').trim().toLowerCase()
  const text = String(pollComposerForm.value?.text || '').trim()
  const rawChoiceLines = String(pollComposerForm.value?.choicesText || '')
    .split('\n')
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  const choices = (type === 'button' || type === 'list')
    ? formatBuilderChoicesToUazapi(pollComposerForm.value?.choicesText, type)
    : rawChoiceLines
  const parseCarouselCards = () => {
    const raw = String(pollComposerForm.value?.carouselCardsText || '')
    const blocks = raw.split(/\n\s*\n/g).map((block) => block.trim()).filter(Boolean)
    return blocks.map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      const cardText = String(lines[0] || '').trim()
      const image = String(lines[1] || '').trim()
      const buttons = lines.slice(2)
        .map((line, index) => {
          const [btnTextRaw, btnIdRaw, btnTypeRaw] = line.split('|').map((v) => String(v || '').trim())
          const btnText = btnTextRaw || ''
          if (!btnText) return null
          const btnType = (btnTypeRaw || 'REPLY').toUpperCase()
          const allowed = ['REPLY', 'URL', 'COPY', 'CALL']
          const safeType = allowed.includes(btnType) ? btnType : 'REPLY'
          const btnId = btnIdRaw || btnText || `btn_${index + 1}`
          return { id: btnId, text: btnText, type: safeType }
        })
        .filter(Boolean)
      if (!cardText || !buttons.length) return null
      return {
        text: cardText,
        ...(image ? { image } : {}),
        buttons
      }
    }).filter(Boolean)
  }

  if (type === 'poll') {
    if (!text || choices.length < 2) {
      pollComposerError.value = 'Informe o texto e pelo menos 2 opções da enquete.'
      return
    }
  } else if (type === 'carousel') {
    if (!text || parseCarouselCards().length < 1) {
      pollComposerError.value = 'Informe o texto principal e pelo menos 1 cartão no carrossel.'
      return
    }
  } else if (type === 'request-payment') {
    if (!selectedChat.value?.chatJid || !text || !String(pollComposerForm.value?.amount || '').trim()) {
      pollComposerError.value = 'Informe o texto e o valor do pagamento.'
      return
    }
  } else if (type === 'pix-button') {
    if (!selectedChat.value?.chatJid || !String(pollComposerForm.value?.pixKey || '').trim()) {
      pollComposerError.value = 'Informe a chave PIX.'
      return
    }
  } else if (!text || !choices.length) {
    pollComposerError.value = type === 'button'
      ? 'Informe o texto principal e pelo menos 1 botão com rótulo preenchido.'
      : 'Informe o texto principal e pelo menos 1 opção.'
    return
  }

  pollComposerSending.value = true
  try {
    const proxyBase = getProxyBase()
    const token = getAuthToken()
    const selectableCount = Boolean(pollComposerForm.value?.allowMultiple) ? choices.length : 1
    let endpoint = '/send/menu'
    let requestPayload = {}

    if (type === 'carousel') {
      endpoint = '/send/carousel'
      requestPayload = {
        number: selectedChat.value.chatJid,
        text,
        carousel: parseCarouselCards(),
        readchat: true
      }
    } else if (type === 'request-payment') {
      endpoint = '/send/request-payment'
      requestPayload = {
        number: selectedChat.value.chatJid,
        text,
        amount: Number(pollComposerForm.value?.amount || 0),
        title: text,
        pixKey: String(pollComposerForm.value?.pixKey || '').trim(),
        pixType: String(pollComposerForm.value?.pixType || 'EVP').trim().toUpperCase(),
        pixName: String(pollComposerForm.value?.pixName || '').trim(),
        paymentLink: String(pollComposerForm.value?.paymentLink || '').trim(),
        fileUrl: String(pollComposerForm.value?.fileUrl || '').trim(),
        fileName: String(pollComposerForm.value?.fileName || '').trim(),
        boletoCode: String(pollComposerForm.value?.boletoCode || '').trim(),
        invoiceNumber: String(pollComposerForm.value?.invoiceNumber || '').trim(),
        itemName: String(pollComposerForm.value?.itemName || '').trim()
      }
      Object.keys(requestPayload).forEach((key) => {
        if (requestPayload[key] === '' || requestPayload[key] == null) delete requestPayload[key]
      })
    } else if (type === 'pix-button') {
      endpoint = '/send/pix-button'
      requestPayload = {
        number: selectedChat.value.chatJid,
        pixType: String(pollComposerForm.value?.pixType || 'EVP').trim().toUpperCase(),
        pixKey: String(pollComposerForm.value?.pixKey || '').trim(),
        pixName: String(pollComposerForm.value?.pixName || '').trim()
      }
      Object.keys(requestPayload).forEach((key) => {
        if (requestPayload[key] === '' || requestPayload[key] == null) delete requestPayload[key]
      })
    } else {
      requestPayload = {
        number: selectedChat.value.chatJid,
        type,
        text,
        choices
      }
      if ((type === 'button' || type === 'list') && String(pollComposerForm.value?.footerText || '').trim()) {
        requestPayload.footerText = String(pollComposerForm.value.footerText || '').trim()
      }
      if (type === 'list') {
        requestPayload.listButton = String(pollComposerForm.value?.listButton || 'Ver opções').trim() || 'Ver opções'
      }
      if (type === 'button' && String(pollComposerForm.value?.imageButton || '').trim()) {
        requestPayload.imageButton = String(pollComposerForm.value.imageButton || '').trim()
      }
      if (type === 'poll') {
        requestPayload.selectableCount = selectableCount
      }
    }

    const endpointCandidates = [endpoint]
    const payloadCandidates = [requestPayload]

    let response = null
    let responsePayload = {}
    let lastErrorMessage = ''

    for (const endpointCandidate of endpointCandidates) {
      let shouldTryNextEndpoint = false
      for (const payloadCandidate of payloadCandidates) {
        response = await fetch(`${proxyBase}${endpointCandidate}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadCandidate)
        })
        responsePayload = await response.json().catch(() => ({}))
        if (response.ok) {
          shouldTryNextEndpoint = false
          break
        }
        lastErrorMessage = String(responsePayload?.message || responsePayload?.error || '').trim()
        shouldTryNextEndpoint = false
        break
      }
      if (response?.ok) break
      if (!shouldTryNextEndpoint) break
    }

    if (!response) throw new Error('Falha ao enviar mensagem interativa')
    if (!response.ok) {
      throw new Error(
        lastErrorMessage ||
        responsePayload?.message ||
        responsePayload?.error ||
        'Falha ao enviar mensagem interativa'
      )
    }

    const previewText = type === 'pix-button'
      ? String(pollComposerForm.value?.pixName || 'PIX').trim()
      : (type === 'carousel' || type === 'request-payment')
      ? text
      : (choices[0]?.split('|')[0] || text)
    refreshChatPreview(selectedChat.value.chatJid, {
      lastMessage: previewText,
      lastMessageFromMe: true,
      lastMessagePrefix: '',
      lastMessageTime: Date.now(),
      wa_lastMessageTextVote: previewText,
    })
    closePollComposer()
    refreshSelectedChatMessages().catch(() => {})
    scrollToBottom()
  } catch (error) {
    console.error('Erro ao enviar mensagem interativa:', error)
    pollComposerError.value = String(error?.message || 'Falha ao enviar mensagem interativa')
  } finally {
    pollComposerSending.value = false
  }
}

const sendPollVote = async (message, option, optionIndex) => {
  if (!selectedChat.value?.chatJid || !message || !option) return
  const pollMessageId = String(message?.normalizedMessageId || message?.messageid || message?.id || '').trim()
  const pollId = String(message?.interactive?.pollId || '').trim()
  const idx = Number(optionIndex)
  if (!pollMessageId || !Number.isFinite(idx)) return

  const options = Array.isArray(message?.interactive?.options) ? message.interactive.options : []
  const maxSelectableRaw = Number(message?.interactive?.selectableCount || 1)
  const maxSelectable = Number.isFinite(maxSelectableRaw) && maxSelectableRaw > 1 ? Math.floor(maxSelectableRaw) : 1

  const meKey = '__me__'
  const existingSelections = Array.isArray(message?.interactive?.__voterSelections?.[meKey])
    ? message.interactive.__voterSelections[meKey].map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
    : []

  let nextSelections = []
  if (maxSelectable <= 1) {
    nextSelections = existingSelections.includes(idx) ? [] : [idx]
  } else if (existingSelections.includes(idx)) {
    nextSelections = existingSelections.filter((n) => n !== idx)
  } else {
    nextSelections = [...existingSelections, idx].slice(-maxSelectable)
  }

  const selectedOptions = nextSelections
    .map((i) => String(options[i]?.label || '').trim())
    .filter(Boolean)

  // Endpoint de voto da UAZAPI não está disponível nessa instância (405). Mantemos estado local consistente.
  messages.value = [
    ...messages.value,
    {
      id: `local-poll-vote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      messageid: '',
      chatid: selectedChat.value.chatJid,
      fromMe: true,
      type: 'pollVoteMessage',
      timestamp: Date.now(),
      vote: {
        pollId: pollId || pollMessageId,
        pollMessageId,
        selectedOptionIndexes: nextSelections,
        selectedOptions
      }
    }
  ]
  await refreshSelectedChatMessages()
}

const closeSendContactsModal = () => {
  sendContactsModalOpen.value = false
  sendContactsSending.value = false
  sendContactsFeedback.value = ''
  sendContactsSearchQuery.value = ''
  sendContactsSelectedIds.value = []
}

const closeAddGroupMembersPanel = () => {
  addGroupMembersOpen.value = false
  addGroupMembersSending.value = false
  addGroupMembersLoading.value = false
  addGroupMembersFeedback.value = ''
  addGroupMembersSearchQuery.value = ''
  addGroupMembersSelectedIds.value = []
}

const handleGroupAddMembersBack = () => {
  closeAddGroupMembersPanel()
}

const resetCreateGroupState = () => {
  createGroupSending.value = false
  createGroupFeedback.value = ''
  createGroupName.value = ''
  createGroupSearchQuery.value = ''
  createGroupSelectedIds.value = []
}

const closeCreateGroupModal = () => {
  createGroupModalOpen.value = false
  resetCreateGroupState()
}

const normalizeContactRows = (rows = []) => {
  const chatAvatarByNumber = new Map()
  ;(Array.isArray(chats.value) ? chats.value : []).forEach((chat) => {
    const candidates = [
      chat?.chatJid,
      chat?.wa_chatid,
      chat?.wa_chatlid,
      chat?.id,
      chat?.phone
    ].map((v) => String(v || '').trim()).filter(Boolean)
    const avatar = String(chat?.avatarUrl || chat?.image || chat?.imagePreview || '').trim()
    if (!avatar) return
    candidates.forEach((candidate) => {
      const digits = candidate.includes('@') ? candidate.split('@')[0].replace(/\D/g, '') : candidate.replace(/\D/g, '')
      if (digits.length >= 10 && !chatAvatarByNumber.has(digits)) {
        chatAvatarByNumber.set(digits, avatar)
      }
    })
  })

  const byContactKey = new Map()
  rows.forEach((row, index) => {
    const rawJid = String(row?.jid || row?.phone || row?.number || '').trim()
    const numberFromJid = rawJid.includes('@') ? rawJid.split('@')[0] : rawJid
    const number = String(numberFromJid || '').replace(/\D/g, '')

    const name = String(
      row?.contact_name ||
      row?.contactName ||
      row?.contact_FirstName ||
      row?.contactFirstName ||
      row?.name ||
      row?.pushName ||
      row?.verifiedName ||
      number
    ).trim()
    const maybeJid = String(row?.jid || '').trim()
    const avatarUrl = String(
      row?.image ||
      row?.imagePreview ||
      row?.avatarUrl ||
      row?.avatar ||
      chatAvatarByNumber.get(number) ||
      resolveCachedContactAvatar(number, maybeJid) ||
      ''
    ).trim()
    const subtitle = String(row?.about || row?.status || '').trim()
    const maybeLid = String(row?.lid || row?.wa_chatlid || '').trim()
    const lookupCandidates = [
      maybeJid,
      maybeLid,
      String(row?.phone || '').trim(),
      String(row?.number || '').trim(),
      number,
      number ? `${number}@s.whatsapp.net` : ''
    ].map((v) => String(v || '').trim()).filter(Boolean)
    const contactKey = String(row?.jid || row?.id || row?.phone || row?.number || `contact-${index}`).trim().toLowerCase()
    const normalized = {
      id: String(row?.id || row?.jid || row?.phone || row?.number || `contact-${index}`).trim(),
      jid: maybeJid || (number ? `${number}@s.whatsapp.net` : ''),
      number,
      name: name || number,
      avatarUrl,
      subtitle,
      lookupCandidates,
      displayNumber: number ? formatJidAsPhoneLine(`${number}@s.whatsapp.net`) : ''
    }
    if (!byContactKey.has(contactKey)) {
      byContactKey.set(contactKey, normalized)
      return
    }
    const existing = byContactKey.get(contactKey)
    const existingHasBetterName = String(existing?.name || '').replace(/\D/g, '').length < String(existing?.name || '').length
    const incomingHasBetterName = String(normalized.name || '').replace(/\D/g, '').length < String(normalized.name || '').length
    if (!existingHasBetterName && incomingHasBetterName) byContactKey.set(contactKey, normalized)
  })
  return Array.from(byContactKey.values())
}

const fetchContactAvatarByNumber = async (number) => {
  const digits = String(number || '').replace(/\D/g, '')
  if (digits.length < 10) return ''
  if (contactAvatarCache.value[digits]) return String(contactAvatarCache.value[digits] || '')
  const proxyBase = getProxyBase()
  const response = await fetch(`${proxyBase}/chat/details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ number: digits, preview: true })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return ''
  const avatar = String(payload?.imagePreview || payload?.image || payload?.chat?.imagePreview || payload?.chat?.image || '').trim()
  if (avatar) {
    contactAvatarCache.value = { ...contactAvatarCache.value, [digits]: avatar }
  }
  return avatar
}

const fetchContactAvatarByCandidate = async (candidate) => {
  const raw = String(candidate || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  const cacheKey = raw.toLowerCase()
  if (contactAvatarCache.value[cacheKey]) return String(contactAvatarCache.value[cacheKey] || '')
  if (digits.length >= 10 && contactAvatarCache.value[digits]) return String(contactAvatarCache.value[digits] || '')

  const requestValues = []
  if (raw.includes('@')) requestValues.push(raw)
  if (digits.length >= 10) {
    requestValues.push(digits)
    requestValues.push(`${digits}@s.whatsapp.net`)
    if (digits.startsWith('55') && digits.length >= 12) {
      const local = digits.slice(2)
      requestValues.push(local)
      requestValues.push(`${local}@s.whatsapp.net`)
      // BR fallback: tenta com e sem nono dígito
      if (local.length === 11 && local[2] === '9') {
        const withoutNine = `${local.slice(0, 2)}${local.slice(3)}`
        requestValues.push(`55${withoutNine}`)
        requestValues.push(`55${withoutNine}@s.whatsapp.net`)
      }
      if (local.length === 10) {
        const withNine = `${local.slice(0, 2)}9${local.slice(2)}`
        requestValues.push(`55${withNine}`)
        requestValues.push(`55${withNine}@s.whatsapp.net`)
      }
    }
  }

  const uniqueValues = Array.from(new Set(requestValues.map((v) => String(v || '').trim()).filter(Boolean)))
  if (!uniqueValues.length) return ''

  const proxyBase = getProxyBase()
  for (const requestValue of uniqueValues) {
    const response = await fetch(`${proxyBase}/chat/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ number: requestValue, preview: true })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) continue
    const avatar = String(payload?.imagePreview || payload?.image || payload?.chat?.imagePreview || payload?.chat?.image || '').trim()
    if (!avatar) continue
    const nextCache = { ...contactAvatarCache.value, [cacheKey]: avatar, [requestValue.toLowerCase()]: avatar }
    if (digits.length >= 10) nextCache[digits] = avatar
    contactAvatarCache.value = nextCache
    return avatar
  }

  return ''
}

const persistAvatarCache = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(contactAvatarCache.value || {}))
  } catch {}
}

const restoreAvatarCache = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(AVATAR_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      contactAvatarCache.value = parsed
    }
  } catch {}
}

const hydrateMissingContactAvatars = async (contacts, onUpdate, { limit = 12, chunkSize = 2 } = {}) => {
  const pending = contacts.filter((item) => !item.avatarUrl).slice(0, limit)
  if (!pending.length) return

  let next = [...contacts]
  for (let i = 0; i < pending.length; i += chunkSize) {
    const chunk = pending.slice(i, i + chunkSize)
    const avatars = await Promise.all(chunk.map(async (item) => {
      const candidates = Array.isArray(item?.lookupCandidates) ? item.lookupCandidates : []
      for (const candidate of candidates) {
        const avatar = await fetchContactAvatarByCandidate(candidate).catch(() => '')
        if (avatar) return avatar
      }
      const byNumber = await fetchContactAvatarByNumber(item.number).catch(() => '')
      if (byNumber) return byNumber
      const maybeJid = `${String(item.number || '').replace(/\D/g, '')}@s.whatsapp.net`
      return await fetchContactAvatarByCandidate(maybeJid).catch(() => '')
    }))
    let changed = false
    chunk.forEach((item, idx) => {
      const avatar = String(avatars[idx] || '').trim()
      if (!avatar) return
      next = next.map((row) => {
        if (row.number !== item.number) return row
        changed = true
        return { ...row, avatarUrl: avatar }
      })
    })
    if (changed) {
      onUpdate(next)
      persistAvatarCache()
    }
  }
}

const resolveCachedContactAvatar = (number, jid = '') => {
  const digits = String(number || '').replace(/\D/g, '')
  const cache = contactAvatarCache.value || {}
  const candidates = [
    digits,
    String(jid || '').trim().toLowerCase(),
    digits ? `${digits}@s.whatsapp.net` : ''
  ].filter(Boolean)
  for (const key of candidates) {
    const avatar = String(cache[key] || cache[key.toLowerCase()] || '').trim()
    if (avatar) return avatar
  }
  return ''
}

const startBackgroundContactAvatarHydration = (getContacts, setContacts, { limit = 60, chunkSize = 5 } = {}) => {
  const contacts = getContacts()
  if (!Array.isArray(contacts) || !contacts.length) return
  void hydrateMissingContactAvatars(
    contacts,
    (nextRows) => {
      setContacts(nextRows)
      addressBookNormalizedCache.value = nextRows
    },
    { limit, chunkSize }
  ).catch(() => {})
}

const fetchAddressBookContacts = async () => {
  if (Array.isArray(addressBookContactsCache.value) && addressBookContactsCache.value.length > 0) {
    const age = Date.now() - Number(addressBookContactsCacheAt.value || 0)
    if (age >= 0 && age < CONTACTS_CACHE_TTL_MS) return addressBookContactsCache.value
  }

  const proxyBase = getProxyBase()
  // Fonte primária e rápida: agenda do WhatsApp (contatos salvos)
  const savedRes = await fetch(`${proxyBase}/contacts?contactScope=address_book`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }
  })
  const savedPayload = await savedRes.json().catch(() => ([]))
  if (!savedRes.ok) throw new Error(savedPayload?.message || savedPayload?.error || 'Falha ao carregar contatos')
  const rows = Array.isArray(savedPayload) ? savedPayload : []
  addressBookContactsCache.value = rows
  addressBookContactsCacheAt.value = Date.now()
  return rows
}

const loadCreateGroupContacts = async () => {
  const normalized = await ensureAddressBookContactsNormalized()
  createGroupContacts.value = normalized
}

const ensureAddressBookContactsNormalized = async ({ force = false } = {}) => {
  const cacheAge = Date.now() - Number(addressBookContactsCacheAt.value || 0)
  const normalizedStale = !addressBookNormalizedCache.value.length || cacheAge >= CONTACTS_CACHE_TTL_MS
  if (!force && !normalizedStale) {
    return addressBookNormalizedCache.value
  }
  const rows = await fetchAddressBookContacts()
  const normalized = normalizeContactRows(rows)
  addressBookNormalizedCache.value = normalized
  return normalized
}

const prefetchAddressBookForGroupPanel = () => {
  if (addressBookNormalizedCache.value.length) {
    startBackgroundContactAvatarHydration(
      () => addressBookNormalizedCache.value,
      (nextRows) => { addressBookNormalizedCache.value = nextRows }
    )
    return
  }
  void ensureAddressBookContactsNormalized()
    .then((normalized) => {
      addressBookNormalizedCache.value = normalized
      startBackgroundContactAvatarHydration(
        () => addressBookNormalizedCache.value,
        (nextRows) => { addressBookNormalizedCache.value = nextRows }
      )
    })
    .catch(() => {})
}

const loadAddGroupMembersContacts = async ({ force = false } = {}) => {
  const normalized = await ensureAddressBookContactsNormalized({ force })
  addGroupMembersContacts.value = normalized
  startBackgroundContactAvatarHydration(
    () => addGroupMembersContacts.value,
    (nextRows) => { addGroupMembersContacts.value = nextRows }
  )
}

const openAddGroupMembersPanel = () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem adicionar membros.'
    return
  }
  addGroupMembersOpen.value = true
  addGroupMembersFeedback.value = ''
  addGroupMembersSearchQuery.value = ''
  addGroupMembersSelectedIds.value = ''

  if (addressBookNormalizedCache.value.length) {
    addGroupMembersContacts.value = addressBookNormalizedCache.value
    addGroupMembersLoading.value = false
    startBackgroundContactAvatarHydration(
      () => addGroupMembersContacts.value,
      (nextRows) => { addGroupMembersContacts.value = nextRows }
    )
    return
  }

  addGroupMembersLoading.value = true
  void loadAddGroupMembersContacts()
    .catch((error) => {
      addGroupMembersFeedback.value = String(error?.message || 'Falha ao carregar contatos')
    })
    .finally(() => {
      addGroupMembersLoading.value = false
    })
}

const openCreateGroupModal = async () => {
  createGroupModalOpen.value = true
  resetCreateGroupState()
  try {
    await loadCreateGroupContacts()
  } catch (error) {
    createGroupFeedback.value = String(error?.message || 'Falha ao carregar contatos')
  }
}

const toggleCreateGroupSelection = (id) => {
  const key = String(id || '').trim()
  if (!key || createGroupSending.value) return
  if (createGroupSelectedIds.value.includes(key)) {
    createGroupSelectedIds.value = createGroupSelectedIds.value.filter((item) => item !== key)
    return
  }
  createGroupSelectedIds.value = [...createGroupSelectedIds.value, key]
}

const confirmCreateGroup = async () => {
  if (createGroupSending.value) return
  const name = String(createGroupName.value || '').trim()
  if (!name) {
    createGroupFeedback.value = 'Informe o nome do grupo.'
    return
  }
  const selectedContacts = createGroupContacts.value.filter((item) => createGroupSelectedIds.value.includes(item.id))
  const participants = selectedContacts
    .map((item) => String(item.number || '').replace(/\D/g, ''))
    .filter((value) => value.length >= 10)
  if (participants.length < 1) {
    createGroupFeedback.value = 'Selecione pelo menos 1 participante com numero valido.'
    return
  }
  createGroupSending.value = true
  createGroupFeedback.value = ''
  try {
    await createGroupApi({ name, participants })
    await loadChats(true)
    closeCreateGroupModal()
  } catch (error) {
    createGroupFeedback.value = String(error?.message || 'Falha ao criar grupo')
    createGroupSending.value = false
  }
}

const toggleAddGroupMembersSelection = (id) => {
  const key = String(id || '').trim()
  if (!key || addGroupMembersSending.value) return
  if (addGroupMembersSelectedIds.value.includes(key)) {
    addGroupMembersSelectedIds.value = addGroupMembersSelectedIds.value.filter((item) => item !== key)
    return
  }
  addGroupMembersSelectedIds.value = [...addGroupMembersSelectedIds.value, key]
}

const confirmAddGroupMembers = async () => {
  if (addGroupMembersSending.value || addGroupMembersSelectedIds.value.length === 0) return
  const groupjid = normalizeJid(requireGroupJid())
  const selectedContacts = addGroupMembersContacts.value.filter((item) =>
    addGroupMembersSelectedIds.value.includes(item.id)
  )
  const participants = selectedContacts
    .map((item) => String(item.number || '').replace(/\D/g, ''))
    .filter((value, index, list) => value.length >= 10 && list.indexOf(value) === index)
  if (!participants.length) {
    addGroupMembersFeedback.value = 'Selecione contatos com numero valido.'
    return
  }
  addGroupMembersSending.value = true
  addGroupMembersFeedback.value = ''
  try {
    await updateGroupParticipantsApi({ groupjid, action: 'add', participants })
    await refreshOpenedGroupInfo()
    void loadGroupParticipantsDirectory(groupjid, { force: true }).catch(() => {})
    closeAddGroupMembersPanel()
    chatActionFeedback.value = participants.length === 1
      ? '1 membro adicionado ao grupo.'
      : `${participants.length} membros adicionados ao grupo.`
  } catch (error) {
    addGroupMembersFeedback.value = String(error?.message || 'Falha ao adicionar membros ao grupo')
  } finally {
    addGroupMembersSending.value = false
  }
}

const loadSendContactsList = async () => {
  const normalized = await ensureAddressBookContactsNormalized()
  sendContactsList.value = normalized
}

const openSendContactsModal = async () => {
  if (!selectedChat.value?.chatJid) return
  sendContactsModalOpen.value = true
  sendContactsFeedback.value = ''
  sendContactsSearchQuery.value = ''
  sendContactsSelectedIds.value = []
  try {
    await loadSendContactsList()
  } catch (error) {
    sendContactsFeedback.value = String(error?.message || 'Falha ao carregar contatos')
  }
}

const toggleSendContactSelection = (id) => {
  const key = String(id || '').trim()
  if (!key || sendContactsSending.value) return
  if (sendContactsSelectedIds.value.includes(key)) {
    sendContactsSelectedIds.value = sendContactsSelectedIds.value.filter((item) => item !== key)
    return
  }
  sendContactsSelectedIds.value = [...sendContactsSelectedIds.value, key]
}

const sendContactWithFallbackPayloads = async (contact) => {
  const proxyBase = getProxyBase()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }
  const targetRaw = String(selectedChat.value?.chatJid || '').trim()
  const targetDigits = targetRaw.includes('@') ? targetRaw.split('@')[0].replace(/\D/g, '') : targetRaw.replace(/\D/g, '')
  const contactJid = String(contact?.jid || '').trim()
  const phoneFromJid = contactJid.includes('@') ? contactJid.split('@')[0].replace(/\D/g, '') : ''
  const contactNumber = String(contact?.number || phoneFromJid || '').replace(/\D/g, '')
  const fullName = String(contact?.name || contactNumber).trim()
  if (!contactNumber) throw new Error(`Contato sem numero valido: ${fullName || 'sem nome'}`)
  if (!fullName) throw new Error('Contato sem nome valido para envio')

  const target = targetRaw.endsWith('@g.us') ? targetRaw : (targetDigits || targetRaw)
  if (!target) throw new Error('Chat de destino invalido para envio de contato')

  const payload = {
    number: target,
    fullName,
    phoneNumber: contactNumber
  }

  const response = await fetch(`${proxyBase}/send/contact`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(result?.message || result?.error || `Falha ao enviar contato (${response.status})`))
  }
  return true
}

const confirmSendContacts = async () => {
  if (!selectedChat.value?.chatJid || sendContactsSending.value || sendContactsSelectedIds.value.length === 0) return
  sendContactsSending.value = true
  sendContactsFeedback.value = ''
  try {
    const selectedItems = sendContactsList.value.filter((item) => sendContactsSelectedIds.value.includes(item.id))
    for (const contact of selectedItems) {
      await sendContactWithFallbackPayloads(contact)
    }
    await refreshSelectedChatMessages()
    closeSendContactsModal()
  } catch (error) {
    sendContactsFeedback.value = String(error?.message || 'Falha ao enviar contato(s)')
    sendContactsSending.value = false
  }
}

const handleFooterMenuAction = (actionId) => {
  if (!selectedChat.value) return
  if (selectedGroupComposeLocked.value) return
  if (actionId === 'quick-replies') {
    closeLabelsSidebar()
    void openQuickRepliesManagePanel({ reload: true })
    return
  }
  const openInteractiveComposer = (type) => {
    pollComposerError.value = ''
    pollComposerForm.value = {
      ...pollComposerForm.value,
      type: String(type || 'poll'),
      text: '',
      choicesText: '',
      footerText: '',
      listButton: 'Ver opções',
      imageButton: '',
      allowMultiple: false,
      carouselCardsText: '',
      amount: '',
      pixKey: '',
      pixType: 'EVP',
      pixName: '',
      paymentLink: '',
      fileUrl: '',
      fileName: '',
      boletoCode: '',
      invoiceNumber: '',
      itemName: ''
    }
    pollComposerOpen.value = true
  }
  if (actionId === 'photos-videos') {
    triggerFilePicker(chatFooterRef.value?.mediaInputEl, sending.value, selectedChat.value, 'image/*,video/*')
    return
  }
  if (actionId === 'audio') {
    triggerFilePicker(chatFooterRef.value?.mediaInputEl, sending.value, selectedChat.value, 'audio/*')
    return
  }
  if (actionId === 'interactive-button') {
    openInteractiveComposer('button')
    return
  }
  if (actionId === 'interactive-list') {
    openInteractiveComposer('list')
    return
  }
  if (actionId === 'interactive-carousel') {
    openInteractiveComposer('carousel')
    return
  }
  if (actionId === 'poll') {
    openInteractiveComposer('poll')
    return
  }
  if (actionId === 'contact') {
    openSendContactsModal()
    return
  }
  if (actionId === 'document') {
    triggerFilePicker(
      chatFooterRef.value?.mediaInputEl,
      sending.value,
      selectedChat.value,
      'application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv'
    )
  }
}

const disconnectWhatsappSession = async () => {
  const base = getProxyBase().replace(/\/proxy$/, '')
  const response = await fetch(`${base}/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Falha ao desconectar WhatsApp')
}

const handleSidebarHeaderMenuAction = async (actionId) => {
  if (actionId === 'new-group') {
    await openCreateGroupModal()
    return
  }
  if (actionId === 'quick-replies') {
    closeLabelsSidebar()
    await openQuickRepliesManagePanel({ reload: true })
    return
  }
  if (actionId === 'disconnect') {
    try {
      await disconnectWhatsappSession()
      resetWhatsappAfterDisconnect()
      await navigateTo('/dashboard/whatsapp/conexao')
    } catch (error) {
      chatActionFeedback.value = String(error?.message || 'Falha ao desconectar')
    }
    return
  }
  if (actionId === 'favorites') {
    chatActionFeedback.value = 'Mensagens favoritas sera disponibilizado em breve.'
    return
  }
  if (actionId === 'archived') {
    chatActionFeedback.value = 'Conversas arquivadas sera disponibilizado em breve.'
    return
  }
  if (actionId === 'labels') {
    closeQuickRepliesSidebar()
    closeQuickRepliesPicker()
    await openLabelsManagePanel({ reload: true })
    return
  }
  if (actionId === 'app-lock') {
    chatActionFeedback.value = 'Bloqueio do app sera disponibilizado em breve.'
    return
  }
}

watch(
  () => canonicalChatListKey(selectedChat.value || {}),
  (next, prev) => {
    if (!next || !prev || next === prev) return
    closeContactInfoModal()
    closeGroupInfoModal()
    closeQuickRepliesSidebar()
    closeQuickRepliesPicker()
    closeLabelsSidebar()
  }
)

const closeGroupInfoModal = () => {
  groupInfoLoadSeq.value += 1
  groupInfoModalOpen.value = false
  groupSidePanelView.value = 'info'
  groupInfoLoading.value = false
  groupInfoError.value = ''
  groupInfoData.value = null
  groupInfoLoadedJid.value = ''
  closeAddGroupMembersPanel()
}

const handleGroupMediaPanelBack = () => {
  groupSidePanelView.value = 'info'
}

const handleGroupPermissionsBack = () => {
  groupSidePanelView.value = 'info'
  groupInfoError.value = ''
}

const openGroupPermissionsPanel = () => {
  if (!selectedGroupViewerIsAdmin.value) return
  groupSidePanelView.value = 'permissions'
  groupInfoError.value = ''
}

const closeContactInfoModal = () => {
  contactInfoModalOpen.value = false
  contactSidePanelView.value = 'contact'
  contactInfoLoading.value = false
  contactInfoError.value = ''
}

const handleContactMediaPanelBack = () => {
  contactSidePanelView.value = 'contact'
}

const applyContactDetailsToChat = (details) => {
  if (!details || !selectedChat.value?.chatJid) return
  const jid = String(selectedChat.value.chatJid)
  if (details.avatarUrl) {
    selectedChat.value.avatarUrl = details.avatarUrl
    chats.value = chats.value.map((chat) => (
      chat.chatJid === jid
        ? {
          ...chat,
          avatarUrl: details.avatarUrl,
          name: details.displayName || chat.name,
          pushName: details.waName || chat.pushName
        }
        : chat
    ))
  }
}

const resolveSelectedChatJid = () =>
  String(selectedChat.value?.chatJid || selectedChat.value?.wa_chatid || selectedChat.value?.chatid || '').trim()

const syncGroupAccessFromInfo = (groupjid, groupInfo) => {
  const key = normalizeJid(groupjid)
  if (!key || !groupInfo) return
  const participants = Array.isArray(groupInfo?.Participants)
    ? groupInfo.Participants
    : (Array.isArray(groupInfo?.participants) ? groupInfo.participants : [])
  const membership = resolveViewerGroupMembership(
    participants,
    sessionJid.value || getStoredSessionJid(),
    { lidMap: lidToJidMap.value, groupInfo }
  )
  groupAccessByJid.value = {
    ...groupAccessByJid.value,
    [key]: {
      isAnnounce: isGroupAnnounceRestricted(groupInfo),
      viewerIsAdmin: membership.isAdmin,
      loaded: true
    }
  }
}

const refreshSelectedGroupAccess = async (groupjid, { force = false } = {}) => {
  const key = normalizeJid(groupjid)
  if (!key || !isGroupJid(key)) return
  if (!force && groupAccessByJid.value[key]?.loaded) return
  try {
    const data = await getGroupInfoApi({
      groupjid: key,
      getInviteLink: false,
      getRequestsParticipants: false,
      force
    })
    syncGroupAccessFromInfo(key, data)
  } catch {
    // Mantém composer liberado até confirmar restrição.
  }
}

const handleSendMessage = async () => {
  if (selectedGroupComposeLocked.value) return
  if (quickRepliesPickerOpen.value) return
  const text = String(newMessage.value || '').trim()
  if (text.startsWith('/') && !text.includes(' ')) {
    const query = text.slice(1).trim().toLowerCase()
    const match = quickRepliesList.value.find((reply) => String(reply?.shortCut || '').trim().toLowerCase() === query)
    if (match && isTextQuickReply(match)) {
      closeQuickRepliesPicker()
      await applyQuickReplyTextToComposer(match)
      return
    }
  }
  sendMessage()
}

const openContactInfoModal = async () => {
  const jid = resolveSelectedChatJid()
  if (!jid || selectedChatIsGroup.value) return
  closeGroupInfoModal()
  contactSidePanelView.value = 'contact'
  contactInfoModalOpen.value = true
  contactInfoLoading.value = true
  contactInfoError.value = ''
  try {
    const details = await fetchContactChatDetails(jid, {
      preview: false,
      force: true
    })
    contactInfoDetails.value = details
    applyContactDetailsToChat(details)
    void preloadMissingMediaInBackground(renderedMessages.value)
  } catch (error) {
    contactInfoError.value = String(error?.message || 'Falha ao carregar detalhes do contato')
  } finally {
    contactInfoLoading.value = false
  }
}

const handleChatHeaderMenu = () => {
  if (!selectedChat.value) return
  if (selectedChatIsGroup.value) {
    openGroupInfoModal()
    return
  }
  openContactInfoModal()
}

const handleContactInfoMediaDocs = () => {
  groupMediaActiveTab.value = 'media'
  contactSidePanelView.value = 'media'
  void preloadMissingMediaInBackground(renderedMessages.value)
}

const handleContactInfoPreviewMedia = (item) => {
  if (item) {
    handleChatPanelOpenMedia(item)
    return
  }
  handleContactInfoMediaDocs()
}

const handleContactInfoSearch = () => {
  chatActionFeedback.value = 'Busca na conversa será disponibilizada em breve.'
}

const handleContactInfoStarredMessages = () => {
  chatActionFeedback.value = 'Mensagens favoritas será disponibilizado em breve.'
}

const handleContactInfoEditNotes = () => {
  const notes = String(contactInfoDetails.value?.waNotes || contactInfoDetails.value?.lead?.notes || '').trim()
  chatActionFeedback.value = notes
    ? `Notas: ${notes}`
    : 'Edição de notas será disponibilizada em breve.'
}

const handleContactInfoClearChat = () => {
  chatActionFeedback.value = 'Limpar conversa será disponibilizado em breve.'
}

const handleContactInfoReport = () => {
  chatActionFeedback.value = 'Denúncia será disponibilizada em breve.'
}

const handleContactInfoToggleMute = () => {
  const chatJid = String(selectedChat.value?.chatJid || '').trim()
  if (!chatJid) return
  const current = Boolean(groupMutedChats.value[chatJid]) || Boolean(selectedChat.value?.isMuted)
  const next = !current
  groupMutedChats.value = { ...groupMutedChats.value, [chatJid]: next }
  refreshChatPreview(chatJid, { isMuted: next, muteEndTime: next ? -1 : 0 })
}

const handleContactInfoToggleFavorite = () => {
  const chatJid = String(selectedChat.value?.chatJid || '').trim()
  if (!chatJid) return
  const current = Boolean(groupFavoriteChats.value[chatJid])
  groupFavoriteChats.value = { ...groupFavoriteChats.value, [chatJid]: !current }
}

const handleContactInfoToggleBlock = () => {
  if (!selectedChat.value) return
  requestToggleBlockDialog(selectedChat.value)
}

const handleConfirmBlockContact = async (report) => {
  const ok = await executeBlockContact({ report: Boolean(report) })
  if (ok) syncContactInfoBlockedState(true)
}

const handleConfirmUnblockContact = async () => {
  const ok = await executeUnblockContact()
  if (ok) syncContactInfoBlockedState(false)
}

const handleUndoBlockContact = async () => {
  await undoBlockContact()
  syncContactInfoBlockedState(false)
}

const handleBlockedFooterUnblock = () => {
  if (!selectedChat.value) return
  openUnblockContactDialog(selectedChat.value)
}

const handleBlockedFooterDeleteChat = () => {
  if (!selectedChat.value) return
  void deleteChatFromList(selectedChat.value)
}

const handleContactInfoDeleteChat = () => {
  if (!selectedChat.value) return
  void deleteChatFromList(selectedChat.value)
}

const handleContactInfoBusinessProfile = async () => {
  if (!selectedChat.value) return
  await openBusinessProfile(selectedChat.value)
}

const handleContactInfoCrm = () => {
  navigateTo('/whatsapp/crm')
}

const handleContactInfoOpenGroup = (group) => {
  const jid = String(group?.jid || '').trim()
  if (!jid) return
  closeContactInfoModal()
  const existing = chats.value.find((chat) => String(chat?.chatJid || '') === jid)
  if (existing) {
    selectChat(existing)
    return
  }
  selectChat({
    id: jid,
    chatJid: jid,
    name: String(group?.name || 'Grupo').trim(),
    pushName: String(group?.name || 'Grupo').trim(),
    avatarUrl: '',
    isGroup: true,
    lastMessage: '',
    lastMessageTime: Date.now(),
    unreadCount: 0
  })
}

const requireGroupJid = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid || !groupjid.endsWith('@g.us')) {
    throw new Error('Grupo invalido para esta acao')
  }
  return groupjid
}

const refreshOpenedGroupInfo = async () => {
  const groupjid = normalizeJid(requireGroupJid())
  const loadSeq = ++groupInfoLoadSeq.value
  const data = await getGroupInfoApi({
    groupjid,
    getInviteLink: true,
    getRequestsParticipants: false,
    force: true
  })
  if (loadSeq !== groupInfoLoadSeq.value) return
  if (normalizeJid(resolveSelectedChatJid()) !== groupjid) return
  groupInfoData.value = data
  groupInfoLoadedJid.value = groupjid
  syncGroupAccessFromInfo(groupjid, data)
}

const runGroupInfoAction = async (action) => {
  if (groupInfoLoading.value) return
  groupInfoError.value = ''
  groupInfoLoading.value = true
  try {
    await action()
  } catch (error) {
    groupInfoError.value = String(error?.message || 'Falha ao executar acao do grupo')
  } finally {
    groupInfoLoading.value = false
  }
}

const handleGroupInfoAddMembers = () => {
  openAddGroupMembersPanel()
}

const handleGroupInfoInviteLink = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  let inviteLink = String(
    groupInfoData.value?.invite_link ||
    groupInfoData.value?.inviteLink ||
    ''
  ).trim()
  if (!inviteLink) {
    await refreshOpenedGroupInfo()
    inviteLink = String(groupInfoData.value?.invite_link || groupInfoData.value?.inviteLink || '').trim()
  }
  if (!inviteLink) {
    await resetGroupInviteCodeApi({ groupjid })
    await refreshOpenedGroupInfo()
    inviteLink = String(groupInfoData.value?.invite_link || groupInfoData.value?.inviteLink || '').trim()
  }
  if (!inviteLink) {
    groupInfoError.value = 'Nao foi possivel obter o link de convite.'
    return
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(inviteLink)
    groupInfoError.value = 'Link de convite copiado para a area de transferencia.'
    return
  }
  groupInfoError.value = `Link de convite: ${inviteLink}`
})

const handleGroupInfoPermissions = () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem alterar permissoes do grupo.'
    return
  }
  openGroupPermissionsPanel()
}

const handleGroupPermissionToggle = async (key, enabled) => {
  if (groupPermissionsSaving.value || !selectedGroupViewerIsAdmin.value) return
  const groupjid = normalizeJid(requireGroupJid())
  groupInfoError.value = ''
  groupPermissionsSaving.value = true
  try {
    if (key === 'membersCanEdit') {
      await updateGroupLockedApi({ groupjid, locked: !enabled })
    } else if (key === 'membersCanSend') {
      await updateGroupAnnounceApi({ groupjid, announce: !enabled })
    } else {
      groupInfoError.value = 'Esta permissao ainda nao pode ser alterada pela API.'
      return
    }
    await refreshOpenedGroupInfo()
    syncGroupAccessFromInfo(groupjid, groupInfoData.value)
  } catch (error) {
    groupInfoError.value = String(error?.message || 'Falha ao atualizar permissao do grupo')
  } finally {
    groupPermissionsSaving.value = false
  }
}

const handleGroupInfoEditAdmins = () => {
  groupInfoError.value = 'Promover ou rebaixar admins sera integrado na proxima etapa.'
}

const handleGroupInfoEditName = async () => runGroupInfoAction(async () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem editar o nome do grupo.'
    return
  }
  const groupjid = requireGroupJid()
  const current = String(
    groupInfoData.value?.Name ||
    groupInfoData.value?.name ||
    selectedChat.value?.pushName ||
    selectedChat.value?.name ||
    ''
  ).trim()
  const next = typeof window !== 'undefined'
    ? window.prompt('Novo nome do grupo:', current)
    : null
  if (next === null) return
  const name = String(next || '').trim()
  if (!name) {
    groupInfoError.value = 'Informe um nome valido para o grupo.'
    return
  }
  await updateGroupNameApi({ groupjid, name })
  await refreshOpenedGroupInfo()
  if (selectedChat.value) {
    selectedChat.value.name = name
    selectedChat.value.pushName = name
    chats.value = chats.value.map((chat) => (
      normalizeJid(chat.chatJid) === normalizeJid(groupjid)
        ? { ...chat, name, pushName: name }
        : chat
    ))
  }
})

const handleGroupInfoDescription = async () => runGroupInfoAction(async () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem editar a descricao do grupo.'
    return
  }
  const groupjid = requireGroupJid()
  const current = String(groupInfoData.value?.Topic || '').trim()
  const next = typeof window !== 'undefined'
    ? window.prompt('Nova descricao do grupo:', current)
    : null
  if (next === null) return
  await updateGroupDescriptionApi({ groupjid, description: String(next || '').trim() })
  await refreshOpenedGroupInfo()
})

const handleGroupInfoLeave = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  const confirmed = typeof window !== 'undefined' ? window.confirm('Deseja realmente sair deste grupo?') : false
  if (!confirmed) return
  await leaveGroupApi({ groupjid })
  closeGroupInfoModal()
  await loadChats(true)
  selectedChat.value = null
})

const handleGroupInfoToggleMute = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid) return
  const current = Boolean(groupMutedChats.value[groupjid]) || Boolean(selectedChat.value?.isMuted)
  const next = !current
  groupMutedChats.value = { ...groupMutedChats.value, [groupjid]: next }
  refreshChatPreview(groupjid, { isMuted: next, muteEndTime: next ? -1 : 0 })
  groupInfoError.value = next ? 'Notificacoes silenciadas localmente.' : 'Notificacoes reativadas localmente.'
}

const handleGroupInfoToggleFavorite = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid) return
  const current = Boolean(groupFavoriteChats.value[groupjid])
  groupFavoriteChats.value = { ...groupFavoriteChats.value, [groupjid]: !current }
  groupInfoError.value = !current ? 'Grupo marcado como favorito.' : 'Grupo removido dos favoritos.'
}

const handleGroupInfoMediaDocs = () => {
  groupMediaActiveTab.value = 'media'
  groupSidePanelView.value = 'media'
  void preloadMissingMediaInBackground(renderedMessages.value)
}

const handleGroupInfoStarredMessages = () => {
  const starred = (Array.isArray(renderedMessages.value) ? renderedMessages.value : [])
    .filter((msg) => Boolean(msg?.isStarred || msg?.starred || msg?.favorite))
  groupInfoError.value = starred.length
    ? `Foram encontradas ${starred.length} mensagens favoritas.`
    : 'Nenhuma mensagem favorita encontrada.'
}

const handleChatPanelOpenMedia = (item) => {
  const kind = String(item?.kind || '').toLowerCase()
  if (kind === 'document') {
    void openDocumentViewer({
      mediaUrl: item?.mediaUrl,
      fileURL: item?.mediaUrl,
      fileName: item?.fileName,
      mimeType: item?.mimeType
    })
    return
  }
  const url = String(item?.mediaUrl || item?.previewUrl || item?.href || '').trim()
  if (!url || typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openDocumentViewer = async (item) => {
  const url = String(item?.mediaUrl || item?.fileURL || item?.fileUrl || '').trim()
  if (!url) {
    chatActionFeedback.value = 'Documento ainda indisponível para visualização.'
    return
  }
  let viewerUrl = url
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        documentViewerObjectUrl.value = objectUrl
        viewerUrl = objectUrl
      }
    } catch {}
  }
  documentViewerUrl.value = viewerUrl
  documentViewerName.value = String(
    item?.documentFileName || item?.fileName || item?.name || item?.text || 'Documento'
  ).trim()
  documentViewerMimeType.value = String(item?.mimetype || item?.mimeType || '').trim()
  documentViewerOpen.value = true
}

const closeDocumentViewer = () => {
  documentViewerOpen.value = false
  if (documentViewerObjectUrl.value && typeof URL !== 'undefined') {
    try { URL.revokeObjectURL(documentViewerObjectUrl.value) } catch {}
  }
  documentViewerObjectUrl.value = ''
  documentViewerUrl.value = ''
  documentViewerName.value = ''
  documentViewerMimeType.value = ''
}

const openGroupInfoModal = async () => {
  const groupjid = normalizeJid(resolveSelectedChatJid())
  if (!groupjid || !isGroupJid(groupjid)) return
  closeContactInfoModal()
  const loadSeq = ++groupInfoLoadSeq.value
  groupInfoData.value = null
  groupInfoLoadedJid.value = ''
  groupInfoModalOpen.value = true
  groupSidePanelView.value = 'info'
  groupInfoLoading.value = true
  groupInfoError.value = ''
  try {
    const data = await getGroupInfoApi({
      groupjid,
      getInviteLink: true,
      getRequestsParticipants: false,
      force: true
    })
    if (loadSeq !== groupInfoLoadSeq.value) return
    if (normalizeJid(resolveSelectedChatJid()) !== groupjid) return
    groupInfoData.value = data
    groupInfoLoadedJid.value = groupjid
    syncGroupAccessFromInfo(groupjid, data)
  } catch (error) {
    if (loadSeq !== groupInfoLoadSeq.value) return
    groupInfoError.value = String(error?.message || 'Falha ao carregar dados do grupo')
  } finally {
    if (loadSeq === groupInfoLoadSeq.value) groupInfoLoading.value = false
  }
  void loadGroupParticipantsDirectory(groupjid, { force: true }).catch(() => {})
  prefetchAddressBookForGroupPanel()
}

watch(
  () => selectedChat.value?.chatJid || selectedChat.value?.id || '',
  () => { messageSearchQuery.value = '' }
)

watch(newMessage, (value) => {
  syncQuickRepliesPickerFromMessage(value)
})

watch(
  () => selectedChat.value?.chatJid || '',
  (chatJid) => {
    if (!chatJid) return
    if (!quickRepliesList.value.length) void loadQuickReplies()
  },
  { immediate: true }
)

watch(
  () => (selectedChatIsGroup.value ? normalizeJid(resolveSelectedChatJid()) : ''),
  (groupjid) => {
    if (!groupjid) return
    void refreshSelectedGroupAccess(groupjid, { force: false })
  },
  { immediate: true }
)

watch(actionMenuMessageId, (newId) => {
  if (newId) nextTick(() => layoutMessageActionsPanel())
  else if (messageActionsCoords?.value) messageActionsCoords.value = null
})

watch(actionMenuMode, () => {
  if (actionMenuMessageId.value) nextTick(() => layoutMessageActionsPanel())
})

watch(
  () => renderedMessages.value,
  (items) => {
    if (!selectedChat.value?.chatJid) return
    preloadMissingMediaInBackground(items)
    reconcilePendingDocumentMessages()
  },
  { immediate: true }
)

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

const WA_PAGE_SCROLL_LOCK = 'wa-chat-page-scroll-lock'

const lockPageScroll = () => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.add(WA_PAGE_SCROLL_LOCK)
  document.body.classList.add(WA_PAGE_SCROLL_LOCK)
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

const unlockPageScroll = () => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove(WA_PAGE_SCROLL_LOCK)
  document.body.classList.remove(WA_PAGE_SCROLL_LOCK)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
}

onMounted(async () => {
  lockPageScroll()
  restoreAvatarCache()
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGlobalPointerDown, false)
    document.addEventListener('keydown', onGlobalKeydown, true)
    window.addEventListener('resize', onMessageActionsWindowResize)
  }
  if (!getAuthToken()) {
    navigateTo('/')
    return
  }
  const base = getWhatsappApiBase()
  const token = getAuthToken()
  const statusPayload = base && token
    ? await fetch(`${base}/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.text().then((t) => ({ ok: r.ok, raw: t })))
      .catch(() => ({ ok: false, raw: '' }))
    : { ok: false, raw: '' }
  let statusData = {}
  try { statusData = statusPayload.raw ? JSON.parse(statusPayload.raw) : {} } catch { statusData = {} }
  const connectedSessionJid = String(
    statusData?.status?.jid ||
    statusData?.status?.instance?.jid ||
    statusData?.instance?.jid ||
    statusData?.instance?.instance?.jid ||
    ''
  ).trim()
  const prevSessionJid = typeof window !== 'undefined' ? String(localStorage.getItem('wa_session_jid') || '').trim() : ''
  const connected = statusPayload.ok ? isWhatsappConnectedFromStatusPayload(statusData) : await fetchWhatsappSessionConnected()
  if (!connected) {
    resetWhatsappAfterDisconnect()
    return
  }
  if (typeof window !== 'undefined' && connectedSessionJid && prevSessionJid && connectedSessionJid !== prevSessionJid) {
    // Sessão trocou (escaneou outro WhatsApp): limpa estado e caches para não “misturar” chats.
    resetWhatsappAfterDisconnect()
    resetChatsRuntimeCaches()
  }
  if (typeof window !== 'undefined' && connectedSessionJid) localStorage.setItem('wa_session_jid', connectedSessionJid)
  sessionJid.value = normalizeJid(connectedSessionJid || getStoredSessionJid())
  await restoreContactsFromCache()
  await syncContactsDirectoryIfNeeded(true)
  await loadChats(true, { lightSync: true })
  loadChats(true, { silent: true }).catch(() => {})
  startRealtimeSync()
})

onUnmounted(() => {
  unlockPageScroll()
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onGlobalPointerDown, false)
    document.removeEventListener('keydown', onGlobalKeydown, true)
    window.removeEventListener('resize', onMessageActionsWindowResize)
  }
  stopRealtimeSync()
})
</script>

<!-- Todos os estilos foram migrados para assets/css/whatsapp-*.css e registrados no nuxt.config.ts -->
<style scoped>
/* Arquivo intencionalmente vazio — estilos gerenciados globalmente em assets/css/ */
</style>
