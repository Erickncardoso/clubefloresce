<template>
  <NuxtLayout name="dashboard">
    <div class="chat-wrapper animate-fade-in">
      <div class="chat-container glass-card">

        <!-- Sidebar: Lista de Chats -->
        <ChatSidebar
          v-model="searchQuery"
          :chats="filteredChats"
          :loading="loadingChats"
          :is-active="isActiveChatListItem"
          :preview-prefix="chatListPreviewPrefix"
          :format-time="formatTime"
          :on-mark-all-read="markAllChatsAsRead"
          @select="selectChat"
          @refresh="loadChats(true)"
          @header-menu-action="handleSidebarHeaderMenuAction"
        />

        <!-- Main: Janela de Mensagens -->
        <main class="chat-main">
          <div v-if="!selectedChat" class="empty-chat-state">
            <div class="empty-icon-wrap">
              <MessageCircle class="icon-xxl text-primary" />
            </div>
            <h3>Bem-vindo ao Chat ao Vivo</h3>
            <p class="text-muted">Selecione uma conversa ao lado para começar a interagir com seus leads.</p>
            <span class="secure-badge"><Lock class="icon-tiny" /> Criptografado de ponta a ponta</span>
          </div>

          <div v-else class="active-chat">
            <!-- Header do Chat -->
            <ChatHeader :chat="selectedChat" @open-group-info="openGroupInfoModal" />

            <!-- Corpo de Mensagens + painel de ações -->
            <!-- chatBodyRef do estado é preenchido dentro de ChatBody.vue -->
            <ChatBody
              :messages="renderedMessages"
              :is-group="Boolean(selectedChat.isGroup)"
              :loading-messages="loadingMessages"
              :action-menu-message-id="actionMenuMessageId"
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
              :on-download-media="downloadMessageMedia"
              :on-open-reactions-detail="openReactionsDetail"
              :on-open-conversation="handleOpenConversation"
              :on-open-business-profile="handleOpenBusinessProfile"
              :on-add-to-group="addSharedContactToGroup"
              :on-save-contact="openSaveContactModal"
              :on-text-click="(e) => onFormattedMessageClick(e, handleOpenConversation)"
              :on-jump-to-replied-message="jumpToRepliedMessage"
              :on-poll-vote="sendPollVote"
              :on-open-document="openDocumentViewer"
              @reply="startReplyToMessage"
              @copy="copyMessagePlain"
              @react-quick="({ message, emoji }) => sendMessageReaction(message, emoji)"
              @react-open="onReactMenuItem"
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
              @send="sendMessage"
              @clear-reply="clearReplyingTo"
              @attach="triggerFilePicker(chatFooterRef?.mediaInputEl, sending, selectedChat, 'image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv')"
              @menu-action="handleFooterMenuAction"
              @media-change="onFooterMediaChange"
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
              :form="pollComposerForm"
              @cancel="closePollComposer"
              @confirm="submitPollComposer"
              @update:form="pollComposerForm = $event"
            />
            <InteractivePreviewSideModal
              :open="pollComposerOpen"
              :form="pollComposerForm"
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
            <GroupInfoModal
              :open="groupInfoModalOpen"
              :loading="groupInfoLoading"
              :error-message="groupInfoError"
              :group-info="groupInfoData"
              :chat="selectedChat"
              :muted="Boolean(groupMutedChats[String(selectedChat?.chatJid || '')])"
              :favorite="Boolean(groupFavoriteChats[String(selectedChat?.chatJid || '')])"
              :media-count="groupInfoMediaDocsCount"
              :preview-items="groupInfoPreviewItems"
              :member-items="groupInfoMemberItems"
              @close="closeGroupInfoModal"
              @request-members="handleGroupInfoAddMembers"
              @request-description="handleGroupInfoDescription"
              @request-media-docs="handleGroupInfoMediaDocs"
              @request-starred-messages="handleGroupInfoStarredMessages"
              @request-toggle-mute="handleGroupInfoToggleMute"
              @request-group-permissions="handleGroupInfoPermissions"
              @request-invite-link="handleGroupInfoInviteLink"
              @request-member-changes="groupInfoError = 'Historico de mudancas de membros sera integrado na proxima etapa.'"
              @request-toggle-favorite="handleGroupInfoToggleFavorite"
              @request-leave-group="handleGroupInfoLeave"
              @request-open-media="handleGroupInfoOpenMedia"
              @request-search="groupInfoError = 'Busca interna de membros sera integrada na proxima etapa.'"
            />
            <GroupMediaDocsModal
              :open="groupMediaModalOpen"
              :active-tab="groupMediaActiveTab"
              :media-items="groupInfoMediaItems"
              :document-items="groupInfoDocumentItems"
              :link-items="groupInfoLinkItems"
              @close="groupMediaModalOpen = false"
              @update:active-tab="groupMediaActiveTab = $event"
              @open-item="handleGroupInfoOpenMedia"
            />
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

      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, watchEffect } from 'vue'
import { MessageCircle, Lock } from 'lucide-vue-next'

// ─── Componentes ──────────────────────────────────────────────────────────────
import ChatSidebar from '~/components/whatsapp/ChatSidebar.vue'
import ChatHeader from '~/components/whatsapp/ChatHeader.vue'
import ChatBody from '~/components/whatsapp/ChatBody.vue'
import ChatFooter from '~/components/whatsapp/ChatFooter.vue'
import PollComposerModal from '~/components/whatsapp/PollComposerModal.vue'
import InteractivePreviewSideModal from '~/components/whatsapp/InteractivePreviewSideModal.vue'
import SendContactsModal from '~/components/whatsapp/SendContactsModal.vue'
import CreateGroupModal from '~/components/whatsapp/CreateGroupModal.vue'
import GroupInfoModal from '~/components/whatsapp/GroupInfoModal.vue'
import GroupMediaDocsModal from '~/components/whatsapp/GroupMediaDocsModal.vue'
import MediaComposerModal from '~/components/whatsapp/MediaComposerModal.vue'
import DocumentViewerModal from '~/components/whatsapp/DocumentViewerModal.vue'
import SaveContactModal from '~/components/whatsapp/SaveContactModal.vue'
import GroupPickerModal from '~/components/whatsapp/GroupPickerModal.vue'
import BusinessProfileModal from '~/components/whatsapp/BusinessProfileModal.vue'

// ─── Composables ──────────────────────────────────────────────────────────────
import { useWhatsappState, messageActionsCoords, replyingTo } from '~/composables/whatsapp/useWhatsappState.js'
import { useWhatsappUtils } from '~/composables/whatsapp/useWhatsappUtils.js'
import { bytesToJpegDataUrl } from '~/composables/whatsapp/useWhatsappUtils.js'
import { getAuthToken, getProxyBase, fetchWhatsappSessionConnected } from '~/composables/whatsapp/useWhatsappApi.js'
import { getWhatsappApiBase, isWhatsappConnectedFromStatusPayload } from '~/composables/whatsapp/useWhatsappApi.js'
import { useWhatsappChats } from '~/composables/whatsapp/useWhatsappChats.js'
import { useWhatsappContacts } from '~/composables/whatsapp/useWhatsappContacts.js'
import { useWhatsappMessages } from '~/composables/whatsapp/useWhatsappMessages.js'
import { useWhatsappMessageActions } from '~/composables/whatsapp/useWhatsappMessageActions.js'
import { useWhatsappBusinessProfile } from '~/composables/whatsapp/useWhatsappBusinessProfile.js'
import { useWhatsappSharedContacts } from '~/composables/whatsapp/useWhatsappSharedContacts.js'
import {
  createGroup as createGroupApi,
  getGroupInfo as getGroupInfoApi,
  getGroupInviteInfo as getGroupInviteInfoApi,
  leaveGroup as leaveGroupApi,
  resetGroupInviteCode as resetGroupInviteCodeApi,
  updateGroupAnnounce as updateGroupAnnounceApi,
  updateGroupDescription as updateGroupDescriptionApi,
  updateGroupLocked as updateGroupLockedApi,
  updateGroupParticipants as updateGroupParticipantsApi
} from '~/composables/whatsapp/useWhatsappGroupsApi.js'

// ─── Estado compartilhado ─────────────────────────────────────────────────────
const {
  chats, loadingChats, searchQuery,
  selectedChat, messages, loadingMessages,
  newMessage, sending, mediaInputRef,
  // mediaInputRef é sincronizado com ChatFooter via watchEffect
  actionMenuMessageId, reactionsDetailMessage, reactionsDetailTab,
  downloadingMediaById, chatActionFeedback,
  saveContactModalOpen, savingContact, saveContactFeedback, saveContactForm,
  addToGroupModalOpen, addToGroupLoading, addToGroupSearch,
  addToGroupFeedback, addToGroupSelectedGroupJid,
  businessProfileModalOpen, businessProfileLoading,
  businessProfileModalData, businessProfileCatalog,
  senderAvatarDirectory
} = useWhatsappState()

// ─── Utilitários ──────────────────────────────────────────────────────────────
const { formatTime, formatJidAsPhoneLine, formatWhatsappTextForDisplay } = useWhatsappUtils()

// ─── Chats ────────────────────────────────────────────────────────────────────
const {
        loadChats, selectChat, sendMessage, refreshChatPreview, refreshSelectedChatMessages,
        startRealtimeSync, stopRealtimeSync, resetWhatsappAfterDisconnect,
        isActiveChatListItem, chatListPreviewPrefix, markAllChatsAsRead,
        resetChatsRuntimeCaches
      } = useWhatsappChats()

// ─── Contatos ────────────────────────────────────────────────────────────────
const {
  restoreContactsFromCache, syncContactsDirectoryIfNeeded,
  resolveSenderName: resolveSenderNameBase, getMessageSenderAvatarUrl, getMessageSenderInitial
} = useWhatsappContacts()

/** Garante uso do chat aberto (grupo) mesmo quando a mensagem não traz isGroup/remoteJid. */
const resolveMessageSenderDisplayName = (msg) => resolveSenderNameBase(msg, selectedChat)

// ─── Mensagens ────────────────────────────────────────────────────────────────
const {
  renderedMessages, getMessageMergeKey, downloadMessageMedia,
  hasRenderableReactionPill, getReactionPillEmojis, showReactionPillCount,
  shouldHideAutoMediaLabelInBubble,
  extractUazapiJpegThumbDataUrl
} = useWhatsappMessages()

// ─── Ações de mensagem ────────────────────────────────────────────────────────
const {
  messageQuickReactions, openMessageActionMenu, toggleMessageActionMenu,
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
const pollComposerOpen = ref(false)
const pollComposerSending = ref(false)
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
const sendContactsSelectedIds = ref([])
const createGroupModalOpen = ref(false)
const createGroupSending = ref(false)
const createGroupFeedback = ref('')
const createGroupName = ref('')
const createGroupSearchQuery = ref('')
const createGroupContacts = ref([])
const createGroupSelectedIds = ref([])
const groupInfoModalOpen = ref(false)
const groupInfoLoading = ref(false)
const groupInfoError = ref('')
const groupInfoData = ref(null)
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
  if (!searchQuery.value) return chats.value
  const q = searchQuery.value.toLowerCase()
  return chats.value.filter(
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
      const mediaUrl = String(msg?.mediaUrl || '').trim()
      const thumbUrl = String(extractUazapiJpegThumbDataUrl(msg?.content) || '').trim()
      const mediaType = String(msg?.mediaType || msg?.type || 'media').toLowerCase()
      const mediaUrlLooksLikeImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(mediaUrl)
      const mediaUrlLooksLikeVideo = /\.(mp4|mov|webm|mkv)(\?|$)/i.test(mediaUrl)
      const previewUrl = mediaType.includes('video')
        ? thumbUrl
        : (thumbUrl || (mediaUrlLooksLikeImage && !mediaUrlLooksLikeVideo ? mediaUrl : ''))
      const label = mediaType.includes('video') ? 'Vídeo' : mediaType.includes('sticker') ? 'Figurinha' : 'Imagem'
      return {
        id: String(msg?.id || msg?.messageid || `media-${index}`),
        kind: 'media',
        previewUrl,
        mediaUrl: mediaUrl || previewUrl,
        mediaType,
        label,
        timestamp: Number(msg?.timestamp || 0)
      }
    })
    .filter((item) => item.previewUrl || item.mediaType.includes('video'))
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

const extractExtendedLinkPreviewImage = (msg) => {
  const c = msg?.content && typeof msg.content === 'object' ? msg.content : {}
  const ext =
    c?.extendedTextMessage ||
    c?.message?.extendedTextMessage ||
    c?.ephemeralMessage?.message?.extendedTextMessage ||
    c?.viewOnceMessage?.message?.extendedTextMessage ||
    c?.viewOnceMessageV2?.message?.extendedTextMessage ||
    {}
  const candidates = [
    ext?.jpegThumbnail,
    ext?.thumbnail,
    ext?.thumb,
    ext?.previewThumbnail,
    ext?.canonicalThumbnail,
    ext?.thumbnailDirectPath,
    ext?.thumbnailUrl,
    ext?.canonicalUrl
  ]
  for (const candidate of candidates) {
    const asString = String(candidate || '').trim()
    if (asString.startsWith('http://') || asString.startsWith('https://') || asString.startsWith('data:image/')) {
      return asString
    }
    const dataUrl = bytesToJpegDataUrl(candidate)
    if (dataUrl) return dataUrl
  }
  return ''
}

const groupInfoLinkItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  const regex = /(https?:\/\/[^\s]+)/gi
  const links = []
  source.forEach((msg, msgIndex) => {
    const text = String(msg?.text || '').trim()
    if (!text) return
    const matches = text.match(regex) || []
    matches.forEach((href, hrefIndex) => {
      const c = msg?.content && typeof msg.content === 'object' ? msg.content : {}
      const ext =
        c?.extendedTextMessage ||
        c?.message?.extendedTextMessage ||
        c?.ephemeralMessage?.message?.extendedTextMessage ||
        c?.viewOnceMessage?.message?.extendedTextMessage ||
        c?.viewOnceMessageV2?.message?.extendedTextMessage ||
        {}
      const title = String(ext?.title || ext?.canonicalTitle || '').trim()
      const description = String(ext?.description || '').trim()
      const matchedText = String(ext?.matchedText || '').trim()
      const extThumb = String(extractExtendedLinkPreviewImage(msg) || '').trim()
      const fallbackThumb = String(extractUazapiJpegThumbDataUrl(msg?.content) || '').trim()
      const previewImage = extThumb || fallbackThumb || (String(msg?.mediaType || '').toLowerCase() === 'image' ? String(msg?.mediaUrl || '').trim() : '')
      links.push({
        id: `${String(msg?.id || msg?.messageid || `link-${msgIndex}`)}-${hrefIndex}`,
        kind: 'link',
        href: String(href || '').trim(),
        title: title || String(href || '').trim(),
        description: description || '',
        matchedText: matchedText || '',
        previewImage,
        messageText: text,
        senderLabel: String(msg?.senderDisplayName || '').trim(),
        timeLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        dayLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long' }) : '',
        previewUrl: '',
        timestamp: Number(msg?.timestamp || 0)
      })
    })
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
      if (String(entry.matchedText || '').trim()) points += 10
      if (String(entry.senderLabel || '').trim()) points += 5
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

const groupInfoPreviewItems = computed(() => {
  const mixed = [
    ...groupInfoMediaItems.value.slice(0, 12),
    ...groupInfoDocumentItems.value.slice(0, 12).map((item) => ({
      ...item,
      previewUrl: '',
      label: 'DOC'
    })),
    ...groupInfoLinkItems.value.slice(0, 12).map((item) => ({
      ...item,
      previewUrl: String(item?.previewImage || '').trim(),
      label: 'LINK'
    }))
  ]
  return mixed.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 4)
})

const groupInfoMediaDocsCount = computed(
  () => groupInfoMediaItems.value.length + groupInfoDocumentItems.value.length + groupInfoLinkItems.value.length
)

const groupInfoMemberItems = computed(() => {
  const participantsRaw = Array.isArray(groupInfoData.value?.Participants)
    ? groupInfoData.value.Participants
    : (Array.isArray(groupInfoData.value?.participants) ? groupInfoData.value.participants : [])

  return participantsRaw.map((participant, index) => {
    const jid = String(participant?.JID || participant?.jid || participant?.id || participant?.phone || '').trim()
    const digits = jid.includes('@') ? jid.split('@')[0].replace(/\D/g, '') : jid.replace(/\D/g, '')
    const avatarUrl = String(
      participant?.image ||
      participant?.imagePreview ||
      senderAvatarDirectory.value?.[jid] ||
      senderAvatarDirectory.value?.[`${digits}@s.whatsapp.net`] ||
      senderAvatarDirectory.value?.[digits] ||
      ''
    ).trim()
    const name = String(
      participant?.Name ||
      participant?.name ||
      participant?.PushName ||
      participant?.pushName ||
      (digits ? formatJidAsPhoneLine(`${digits}@s.whatsapp.net`) : '') ||
      'Contato'
    ).trim()
    const subtitle = digits ? formatJidAsPhoneLine(`${digits}@s.whatsapp.net`) : ''
    return {
      id: String(jid || participant?.id || `member-${index}`),
      jid,
      name,
      subtitle,
      initial: String(name || '?').charAt(0).toUpperCase(),
      avatarUrl,
      isAdmin: Boolean(participant?.IsAdmin || participant?.isAdmin || participant?.admin)
    }
  })
})

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
    .slice(0, 6)
  if (!candidates.length) return
  const marks = { ...autoMediaPrefetchAttemptedById.value }
  for (const item of candidates) marks[item.id] = true
  autoMediaPrefetchAttemptedById.value = marks
  await Promise.allSettled(candidates.map((item) => downloadMessageMedia(item)))
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

const jumpToRepliedMessage = (msg) => {
  const targetId = String(msg?.replyParentMessageId || '').trim()
  if (!targetId || typeof document === 'undefined') return

  const escapeForSelector = (value) => (
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(value)
      : String(value).replace(/"/g, '\\"')
  )

  let targetEl = document.querySelector(`.chat-body [data-message-provider-id="${escapeForSelector(targetId)}"]`)
  if (!targetEl) targetEl = document.querySelector(`.chat-body [data-message-internal-id="${escapeForSelector(targetId)}"]`)
  if (!targetEl) targetEl = document.querySelector(`.chat-body [data-message-id="${escapeForSelector(targetId)}"]`)

  // Fallback para IDs truncados/parciais que algumas respostas usam.
  if (!targetEl) {
    const candidates = Array.from(document.querySelectorAll('.chat-body [data-message-provider-id], .chat-body [data-message-internal-id], .chat-body [data-message-id]'))
    targetEl = candidates.find((el) => {
      const providerId = String(el.getAttribute('data-message-provider-id') || '').trim()
      const internalId = String(el.getAttribute('data-message-internal-id') || '').trim()
      const localId = String(el.getAttribute('data-message-id') || '').trim()
      const related = String(el.getAttribute('data-message-related-ids') || '').split('|').map((v) => String(v || '').trim()).filter(Boolean)
      const values = [providerId, internalId, localId, ...related].filter(Boolean)
      return values.some((value) => value === targetId || value.endsWith(targetId) || targetId.endsWith(value))
    }) || null
  }

  if (!targetEl) return

  targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  targetEl.classList.add('is-quoted-target')
  setTimeout(() => targetEl.classList.remove('is-quoted-target'), 1600)
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
  resetPollComposer()
}

const submitPollComposer = async () => {
  if (!selectedChat.value?.chatJid || pollComposerSending.value) return
  const type = String(pollComposerForm.value?.type || 'poll').trim().toLowerCase()
  const text = String(pollComposerForm.value?.text || '').trim()
  const choices = String(pollComposerForm.value?.choicesText || '')
    .split('\n')
    .map((v) => String(v || '').trim())
    .filter(Boolean)
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
    if (!text || choices.length < 2) return
  } else if (type === 'carousel') {
    if (!text || parseCarouselCards().length < 1) return
  } else if (type === 'request-payment') {
    if (!selectedChat.value?.chatJid || !text || !String(pollComposerForm.value?.amount || '').trim()) return
  } else if (type === 'pix-button') {
    if (!selectedChat.value?.chatJid || !String(pollComposerForm.value?.pixKey || '').trim()) return
  } else if (!text || !choices.length) {
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
    if (!response.ok) throw new Error(responsePayload?.message || responsePayload?.error || 'Falha ao enviar mensagem interativa')
    await selectChat(selectedChat.value)
    closePollComposer()
  } catch (error) {
    console.error('Erro ao enviar mensagem interativa:', error)
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
    const avatarUrl = String(
      row?.image ||
      row?.imagePreview ||
      row?.avatarUrl ||
      row?.avatar ||
      chatAvatarByNumber.get(number) ||
      ''
    ).trim()
    const subtitle = String(row?.about || row?.status || '').trim()
    const maybeJid = String(row?.jid || '').trim()
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
      lookupCandidates
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

const hydrateMissingContactAvatars = async (contacts, onUpdate) => {
  const pending = contacts.filter((item) => !item.avatarUrl).slice(0, 12)
  if (!pending.length) return

  const chunkSize = 2
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
  const rows = await fetchAddressBookContacts()
  const normalized = normalizeContactRows(rows)
  createGroupContacts.value = normalized
  hydrateMissingContactAvatars(normalized, (nextRows) => { createGroupContacts.value = nextRows }).catch(() => {})
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

const loadSendContactsList = async () => {
  const rows = await fetchAddressBookContacts()
  const normalized = normalizeContactRows(rows)
  sendContactsList.value = normalized
  hydrateMissingContactAvatars(normalized, (nextRows) => { sendContactsList.value = nextRows }).catch(() => {})
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
  const openInteractiveComposer = (type) => {
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
  if (actionId === 'select-chats') {
    chatActionFeedback.value = 'Selecao multipla de conversas sera disponibilizada em breve.'
    return
  }
  if (actionId === 'app-lock') {
    chatActionFeedback.value = 'Bloqueio do app sera disponibilizado em breve.'
  }
}

const closeGroupInfoModal = () => {
  groupInfoModalOpen.value = false
  groupInfoLoading.value = false
  groupInfoError.value = ''
}

const requireGroupJid = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid || !groupjid.endsWith('@g.us')) {
    throw new Error('Grupo invalido para esta acao')
  }
  return groupjid
}

const refreshOpenedGroupInfo = async () => {
  const groupjid = requireGroupJid()
  const data = await getGroupInfoApi({
    groupjid,
    getInviteLink: true,
    getRequestsParticipants: false,
    force: true
  })
  groupInfoData.value = data
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

const handleGroupInfoAddMembers = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  const raw = typeof window !== 'undefined'
    ? window.prompt('Digite os numeros para adicionar (separados por virgula):', '')
    : ''
  const participants = String(raw || '')
    .split(',')
    .map((item) => String(item || '').replace(/\D/g, ''))
    .filter((item) => item.length >= 10)
  if (!participants.length) {
    groupInfoError.value = 'Nenhum numero valido informado.'
    return
  }
  await updateGroupParticipantsApi({ groupjid, action: 'add', participants })
  await refreshOpenedGroupInfo()
})

const handleGroupInfoInviteLink = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  const inviteInfo = await getGroupInviteInfoApi({ groupjid })
  const inviteLink = String(inviteInfo?.inviteLink || inviteInfo?.invite_link || '').trim()
  if (inviteLink) {
    groupInfoError.value = `Link de convite: ${inviteLink}`
    return
  }
  await resetGroupInviteCodeApi({ groupjid })
  const refreshedInviteInfo = await getGroupInviteInfoApi({ groupjid })
  const refreshedLink = String(refreshedInviteInfo?.inviteLink || refreshedInviteInfo?.invite_link || '').trim()
  groupInfoError.value = refreshedLink ? `Link de convite: ${refreshedLink}` : 'Convite atualizado com sucesso.'
  await refreshOpenedGroupInfo()
})

const handleGroupInfoPermissions = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  const currentAnnounce = Boolean(groupInfoData.value?.IsAnnounce)
  const currentLocked = Boolean(groupInfoData.value?.IsLocked)
  const shouldToggleAnnounce = typeof window !== 'undefined'
    ? window.confirm(`Permissoes de envio: atualmente ${currentAnnounce ? 'somente admins' : 'todos membros'}. Deseja alternar?`)
    : false
  if (shouldToggleAnnounce) {
    await updateGroupAnnounceApi({ groupjid, announce: !currentAnnounce })
  }
  const shouldToggleLocked = typeof window !== 'undefined'
    ? window.confirm(`Permissao de edicao: atualmente ${currentLocked ? 'somente admins' : 'todos membros'}. Deseja alternar?`)
    : false
  if (shouldToggleLocked) {
    await updateGroupLockedApi({ groupjid, locked: !currentLocked })
  }
  await refreshOpenedGroupInfo()
})

const handleGroupInfoDescription = async () => runGroupInfoAction(async () => {
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
  const current = Boolean(groupMutedChats.value[groupjid])
  groupMutedChats.value = { ...groupMutedChats.value, [groupjid]: !current }
  groupInfoError.value = !current ? 'Notificacoes silenciadas localmente.' : 'Notificacoes reativadas localmente.'
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
  groupMediaModalOpen.value = true
}

const handleGroupInfoStarredMessages = () => {
  const starred = (Array.isArray(renderedMessages.value) ? renderedMessages.value : [])
    .filter((msg) => Boolean(msg?.isStarred || msg?.starred || msg?.favorite))
  groupInfoError.value = starred.length
    ? `Foram encontradas ${starred.length} mensagens favoritas.`
    : 'Nenhuma mensagem favorita encontrada.'
}

const handleGroupInfoOpenMedia = (item) => {
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
  if (!selectedChat.value?.isGroup || !selectedChat.value?.chatJid) return
  groupInfoModalOpen.value = true
  groupInfoLoading.value = true
  groupInfoError.value = ''
  try {
    const data = await getGroupInfoApi({
      groupjid: selectedChat.value.chatJid,
      getInviteLink: true,
      getRequestsParticipants: false,
      force: true
    })
    groupInfoData.value = data
  } catch (error) {
    groupInfoError.value = String(error?.message || 'Falha ao carregar dados do grupo')
  } finally {
    groupInfoLoading.value = false
  }
}

watch(actionMenuMessageId, (newId) => {
  if (newId) nextTick(() => layoutMessageActionsPanel())
  else if (messageActionsCoords?.value) messageActionsCoords.value = null
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

onMounted(async () => {
  restoreAvatarCache()
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGlobalPointerDown, true)
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
  const sessionJid = String(
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
  if (typeof window !== 'undefined' && sessionJid && prevSessionJid && sessionJid !== prevSessionJid) {
    // Sessão trocou (escaneou outro WhatsApp): limpa estado e caches para não “misturar” chats.
    resetWhatsappAfterDisconnect()
    resetChatsRuntimeCaches()
  }
  if (typeof window !== 'undefined' && sessionJid) localStorage.setItem('wa_session_jid', sessionJid)
  await restoreContactsFromCache()
  await syncContactsDirectoryIfNeeded(true)
  await loadChats(true, { lightSync: true })
  loadChats(true, { silent: true }).catch(() => {})
  startRealtimeSync()
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onGlobalPointerDown, true)
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
