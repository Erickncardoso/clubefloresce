<template>
  <div class="messages-container">
    <div v-if="loadingOlderMessages" class="chat-timeline-row chat-timeline-row--center chat-timeline-row--sync">
      <div class="chat-sync-banner" role="status">
        <RefreshCw class="chat-sync-banner__icon" aria-hidden="true" />
        <span>Sincronizando mensagens mais antigas. Clique para ver o progresso.</span>
      </div>
    </div>

    <template v-for="entry in displayEntries" :key="timelineEntryKey(entry)">
      <div
        v-if="entry.kind === '__timeline' && entry.timelineKind === 'date'"
        class="chat-timeline-row chat-timeline-row--center"
      >
        <div class="chat-date-pill" role="status">{{ entry.label }}</div>
      </div>

      <div
        v-else-if="entry.kind === '__timeline' && entry.timelineKind === 'system'"
        class="chat-timeline-row chat-timeline-row--center"
      >
        <div class="chat-system-pill" role="status">{{ entry.label }}</div>
      </div>

      <div
        v-else
      v-memo="[entry.primary.id, entry.primary.text, entry.primary.mediaUrl, entry.primary.deliveryStatus, entry.primary.reactions?.length, actionMenuMessageId === entry.primary.id, actionMenuMode, entry.kind, isMessagePinned(entry.primary)]"
      :data-message-index="entry.startIndex"
      :data-message-id="String(entry.primary.id)"
      :data-message-provider-id="String(entry.primary.normalizedMessageId || entry.primary.messageid || '')"
      :data-message-internal-id="String(entry.primary.normalizedInternalId || '')"
      :data-message-related-ids="entryRelatedIds(entry)"
      :data-message-actions-anchor="String(entry.primary.id)"
      class="message-bubble-wrapper"
      :class="[
        entry.primary.fromMe ? 'message-out' : 'message-in',
        { 'is-actions-open': actionMenuMessageId === entry.primary.id },
        { 'has-reaction-pill': hasReactionPill(entry.primary) },
      ]"
      @touchstart.passive="onTouchStart($event, entry.primary)"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @contextmenu.prevent="onContextMenu($event, entry.primary)"
    >
      <!-- Avatar do remetente (apenas grupos, apenas mensagens recebidas) -->
      <div v-if="!entry.primary.fromMe" class="msg-sender-avatar-wrap" aria-hidden="true">
        <img v-if="getSenderAvatar(entry.primary)" :src="getSenderAvatar(entry.primary)" class="msg-sender-avatar" alt="" />
        <span v-else class="msg-sender-avatar-fallback">{{ getSenderInitial(entry.primary, groupSenderLabel) }}</span>
      </div>

      <div
        class="message-bubble"
        :class="{
          'message-bubble--has-reactions': hasReactionPill(entry.primary),
          'message-bubble--poll-out': entry.primary.fromMe && entry.primary.interactive?.kind === 'poll',
          'message-bubble--menu': entry.primary.interactive?.kind === 'menu',
          'message-bubble--contact-out': entry.primary.fromMe && entry.primary.isContactShare,
          'message-bubble--document': entry.primary.mediaType === 'document',
          'message-bubble--link-preview': Boolean(entry.primary.linkPreview),
          'message-bubble--album': entry.kind === 'album',
          'message-bubble--image': entry.primary.mediaType === 'image' && entry.kind !== 'album',
          'message-bubble--video': entry.primary.mediaType === 'video',
          'message-bubble--audio': entry.primary.mediaType === 'audio'
        }"
      >
        <!-- Nome do remetente — re-resolve no render + fallback API (sender_pn / senderName) -->
        <p v-if="!entry.primary.fromMe && groupSenderLabel(entry.primary)" class="msg-sender">
          {{ groupSenderLabel(entry.primary) }}
        </p>
        <p v-if="!entry.primary.fromMe && groupSenderSecondaryLabel(entry.primary)" class="msg-sender-meta">
          {{ groupSenderSecondaryLabel(entry.primary) }}
        </p>

        <!-- Citação (reply) -->
        <div
          v-if="entry.primary.quoted"
          class="msg-quote"
          :class="{ 'msg-quote--with-thumb': Boolean(entry.primary.quoted.thumbDataUrl), 'is-clickable': Boolean(entry.primary.replyParentMessageId) }"
          @click.stop="onJumpToRepliedMessage(entry.primary)"
        >
          <div class="msg-quote-accent" aria-hidden="true" />
          <div class="msg-quote-inner">
            <div class="msg-quote-main">
              <div class="msg-quote-author">{{ entry.primary.quoted.authorName }}</div>
              <div v-if="entry.primary.quoted.kind === 'text'" class="msg-quote-line msg-quote-line--text">
                {{ entry.primary.quoted.textPreview }}
              </div>
              <div v-else class="msg-quote-line msg-quote-line--media">
                <Image v-if="entry.primary.quoted.kind === 'image'" class="msg-quote-ico" aria-hidden="true" />
                <Video v-else-if="entry.primary.quoted.kind === 'video'" class="msg-quote-ico" aria-hidden="true" />
                <Mic v-else-if="entry.primary.quoted.kind === 'audio'" class="msg-quote-ico" aria-hidden="true" />
                <Smile v-else-if="entry.primary.quoted.kind === 'sticker'" class="msg-quote-ico" aria-hidden="true" />
                <FileText v-else class="msg-quote-ico" aria-hidden="true" />
                <span>{{ entry.primary.quoted.mediaLabel }}</span>
              </div>
            </div>
            <img
              v-if="entry.primary.quoted.thumbDataUrl"
              :src="entry.primary.quoted.thumbDataUrl"
              class="msg-quote-thumb"
              alt=""
            />
          </div>
        </div>

        <WhatsappRichMessageBlock
          :is-forwarded="entry.primary.isForwarded"
          :link-preview="entry.primary.linkPreview"
        />

        <!-- Mídia -->
        <div v-if="entry.kind === 'album'" class="msg-image-album" :class="`msg-image-album--${Math.min(entry.items.length, 4)}`">
          <div
            v-for="(albumItem, albumIndex) in albumVisibleItems(entry.items)"
            :key="`album-${entry.primary.id}-${albumItem.id}`"
            class="msg-image-album-item"
          >
            <MessageImagePreview
              :thumb-url="albumItem.mediaThumbUrl"
              :full-url="albumItem.mediaUrl"
              :loading="Boolean(downloadingMediaById[albumItem.id])"
              @request-load="onDownloadMedia(albumItem)"
              @open="handleImageOpen(albumItem)"
            />
            <span
              v-if="albumOverflowCount(entry.items.length, albumIndex)"
              class="msg-image-album-overflow"
            >+{{ albumOverflowCount(entry.items.length, albumIndex) }}</span>
          </div>
        </div>
        <MessageImagePreview
          v-else-if="hasImagePreview(entry.primary)"
          :thumb-url="entry.primary.mediaThumbUrl"
          :full-url="entry.primary.mediaUrl"
          :loading="Boolean(downloadingMediaById[entry.primary.id])"
          @request-load="onDownloadMedia(entry.primary)"
          @open="handleImageOpen(entry.primary)"
        />
        <img v-if="entry.primary.mediaType === 'sticker' && entry.primary.mediaUrl" :src="entry.primary.mediaUrl" class="msg-sticker" alt="Figurinha enviada" />
        <video v-if="entry.primary.mediaType === 'video' && entry.primary.mediaUrl" :src="entry.primary.mediaUrl" controls class="msg-video"></video>
        <WhatsappAudioMessage
          v-if="entry.primary.mediaType === 'audio'"
          :src="entry.primary.mediaUrl || ''"
          :from-me="Boolean(entry.primary.fromMe)"
          :timestamp="formatTime(entry.primary.timestamp)"
          :delivery-status="entry.primary.deliveryStatus || ''"
          :is-edited="Boolean(entry.primary.isEdited)"
          :avatar-url="getSenderAvatar(entry.primary) || ''"
          :show-avatar="!entry.primary.fromMe"
          :duration-seconds="Number(entry.primary.audioDurationSeconds || 0)"
          :initial-listened="Boolean(entry.primary.audioPlayed)"
          :waveform-seed="String(entry.primary.id || entry.primary.messageid || '')"
          :loading="Boolean(downloadingMediaById[entry.primary.id])"
          :pinned="isMessagePinned(entry.primary)"
          @request-load="onDownloadMedia(entry.primary)"
          @listened="() => onAudioListened?.(entry.primary)"
        />
        <button
          v-if="entry.primary.mediaType === 'document'"
          class="msg-document-card"
          type="button"
          @click.stop="onOpenDocument(entry.primary)"
        >
          <img
            v-if="getDocumentThumb(entry.primary)"
            :src="getDocumentThumb(entry.primary)"
            class="msg-document-thumb"
            alt="Prévia do documento"
          />
          <div v-else class="msg-document-thumb msg-document-thumb--fallback">PDF</div>
          <div class="msg-document-meta">
            <span class="msg-document-icon">PDF</span>
            <div class="msg-document-texts">
              <strong>{{ getDocumentName(entry.primary) }}</strong>
              <small>{{ getDocumentSubtitle(entry.primary) }}</small>
              <small v-if="entry.primary.isPendingUpload" class="msg-document-uploading">
                <Loader class="msg-document-uploading-spinner" /> Enviando...
              </small>
            </div>
          </div>
        </button>
        <div v-if="entry.primary.interactive?.kind === 'poll'" class="msg-poll-card">
          <div class="msg-poll-main">
            <p class="msg-poll-title">{{ entry.primary.interactive.title }}</p>
            <p class="msg-poll-subtitle">Selecione uma opção</p>
            <div v-if="entry.primary.interactive.options.length" class="msg-poll-options">
              <div v-for="(opt, idx) in entry.primary.interactive.options" :key="`poll-opt-${entry.primary.id}-${idx}`" class="msg-poll-option">
                <button
                  type="button"
                  class="msg-poll-option-top msg-poll-option-top-btn"
                  :class="{ 'is-selected': isPollOptionSelected(entry.primary, idx) }"
                  @click.stop="onPollVote(entry.primary, opt, idx)"
                >
                  <div class="msg-poll-option-label-wrap">
                    <span class="msg-poll-option-radio" aria-hidden="true" />
                    <span class="msg-poll-option-label">{{ opt.label }}</span>
                  </div>
                  <div class="msg-poll-option-right">
                    <span v-for="voter in pollOptionVoterEntries(opt)" :key="`voter-${entry.primary.id}-${idx}-${voter.key}`" class="msg-poll-voter-avatar" :title="voter.name">
                      <img v-if="pollVoterAvatar(voter)" :src="pollVoterAvatar(voter)" :alt="voter.name" />
                      <span v-else>{{ pollVoterInitial(voter) }}</span>
                    </span>
                    <span class="msg-poll-option-votes">{{ Number(opt.votes || 0) }}</span>
                  </div>
                </button>
                <div class="msg-poll-bar-track">
                  <div
                    class="msg-poll-bar-fill"
                    :style="{ width: `${entry.primary.interactive.totalVotes > 0 ? Math.max(8, Math.round((Number(opt.votes || 0) / entry.primary.interactive.totalVotes) * 100)) : 8}%` }"
                  />
                </div>
                <p v-if="pollVotesExpandedByMessageId[entry.primary.id] && opt.voterNames?.length" class="msg-poll-voters">
                  {{ opt.voterNames.join(', ') }}
                </p>
              </div>
            </div>
            <WhatsappMessageTime
              :timestamp="entry.primary.timestamp"
              :format-time="formatTime"
              :is-edited="Boolean(entry.primary.isEdited)"
              :from-me="Boolean(entry.primary.fromMe)"
              :delivery-status="entry.primary.deliveryStatus || ''"
              :pinned="isMessagePinned(entry.primary)"
              extra-class="msg-time--poll"
            />
          </div>
          <button type="button" class="msg-poll-show-votes" @click.stop="togglePollVotes(entry.primary.id)">
            {{ pollVotesExpandedByMessageId[entry.primary.id] ? 'Ocultar votos' : 'Mostrar votos' }}
          </button>
        </div>

        <div v-else-if="entry.primary.interactive?.kind === 'menu'" class="msg-menu-card">
          <div
            v-if="entry.primary.interactive.menuType !== 'pix-button' && entry.primary.interactive.menuType !== 'request-payment'"
            class="msg-menu-header"
          >
            <div class="msg-menu-copy">
              <p class="msg-menu-title">{{ entry.primary.interactive.title }}</p>
              <p v-if="entry.primary.interactive.footerText" class="msg-menu-footer">{{ entry.primary.interactive.footerText }}</p>
            </div>
            <WhatsappMessageTime
              :timestamp="entry.primary.timestamp"
              :format-time="formatTime"
              :is-edited="Boolean(entry.primary.isEdited)"
              :from-me="Boolean(entry.primary.fromMe)"
              :delivery-status="entry.primary.deliveryStatus || ''"
              :pinned="isMessagePinned(entry.primary)"
              extra-class="msg-time--menu"
            />
          </div>
          <img
            v-if="entry.primary.interactive.imageButton && isMenuButtonImage(entry.primary.interactive.imageButton)"
            :src="entry.primary.interactive.imageButton"
            alt=""
            class="msg-menu-button-media"
          />
          <WhatsappPixMessageCard
            v-if="entry.primary.interactive.menuType === 'request-payment' || entry.primary.interactive.menuType === 'pix-button'"
            :variant="entry.primary.interactive.menuType"
            :pix-name="entry.primary.interactive.pixName"
            :pix-type="entry.primary.interactive.pixType"
            :pix-key="entry.primary.interactive.pixKey"
            :amount="entry.primary.interactive.amount"
            @action="onPixMenuAction(entry.primary)"
          >
            <template #meta>
              <WhatsappMessageTime
                :timestamp="entry.primary.timestamp"
                :format-time="formatTime"
                :is-edited="Boolean(entry.primary.isEdited)"
                :from-me="Boolean(entry.primary.fromMe)"
                :delivery-status="entry.primary.deliveryStatus || ''"
                :pinned="isMessagePinned(entry.primary)"
                extra-class="msg-time--menu"
              />
            </template>
          </WhatsappPixMessageCard>
          <p
            v-if="(entry.primary.interactive.menuType === 'pix-button' || entry.primary.interactive.menuType === 'request-payment') && entry.primary.interactive.footerText"
            class="msg-menu-footer msg-menu-footer--pix"
          >
            {{ entry.primary.interactive.footerText }}
          </p>
          <button
            v-else-if="entry.primary.interactive?.menuType === 'list'"
            type="button"
            class="msg-menu-list-btn"
            @click.stop="openListMenu(entry.primary)"
          >
            <span class="msg-menu-list-btn-ico" aria-hidden="true">≣</span>
            <span>{{ menuListButtonLabel(entry.primary) }}</span>
          </button>
          <div v-else-if="entry.primary.interactive?.menuType === 'carousel'" class="msg-menu-carousel">
            <article
              v-for="(card, cardIdx) in menuCarouselCards(entry.primary)"
              :key="`carousel-card-${entry.primary.id}-${cardIdx}`"
              class="msg-menu-carousel-card"
            >
              <WhatsappRemoteImage
                v-if="card.image"
                :src="card.image"
                class="msg-menu-carousel-media msg-menu-carousel-media--img"
              />
              <div v-else class="msg-menu-carousel-media" />
              <p class="msg-menu-carousel-title">{{ card.title }}</p>
              <button
                v-for="(action, actionIdx) in card.actions"
                :key="`carousel-action-${entry.primary.id}-${cardIdx}-${actionIdx}`"
                type="button"
                class="msg-menu-carousel-action"
                :class="{ 'is-copy-action': action.type === 'COPY' }"
                @click.stop="onMenuOptionClick(entry.primary, action)"
              >
                <span v-if="action.type === 'COPY'" class="msg-menu-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="msg-menu-action-ico" />
                <span class="msg-menu-action-label" :class="{ 'is-copy-label': action.type === 'COPY' }">{{ action.label }}</span>
              </button>
            </article>
          </div>
          <div v-else-if="entry.primary.interactive.options?.length" class="msg-menu-actions">
            <template
              v-for="(opt, idx) in entry.primary.interactive.options"
              :key="`menu-opt-${entry.primary.id}-${idx}`"
            >
              <div
                v-if="opt.isSection"
                class="msg-menu-action-row is-section"
              >
                <span class="msg-menu-section-label">{{ opt.label }}</span>
              </div>
              <button
                v-else
                type="button"
                class="msg-menu-action-row"
                @click.stop="onMenuOptionClick(entry.primary, opt)"
              >
                <span v-if="opt.buttonType === 'COPY'" class="msg-menu-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="msg-menu-action-ico" />
                <span class="msg-menu-action-label" :class="{ 'is-copy-label': opt.buttonType === 'COPY' }">{{ opt.label }}</span>
              </button>
            </template>
          </div>
        </div>

        <!-- Contato compartilhado -->
        <div v-if="entry.primary.isContactShare && entry.primary.sharedContact" class="shared-contact-card">
          <div class="shared-contact-main">
            <div class="shared-contact-avatar">
              <img
                v-if="getSharedContactAvatar(entry.primary.sharedContact)"
                :src="getSharedContactAvatar(entry.primary.sharedContact)"
                :alt="entry.primary.sharedContact.name || 'Contato'"
              />
              <User v-else class="icon-small" />
            </div>
            <div class="shared-contact-content">
              <div class="shared-contact-name">{{ entry.primary.sharedContact.name || 'Contato' }}</div>
            </div>
          </div>
          <WhatsappMessageTime
            :timestamp="entry.primary.timestamp"
            :format-time="formatTime"
            :is-edited="Boolean(entry.primary.isEdited)"
            :from-me="Boolean(entry.primary.fromMe)"
            :delivery-status="entry.primary.deliveryStatus || ''"
            :pinned="isMessagePinned(entry.primary)"
            extra-class="msg-time--contact"
          />
          <div class="shared-contact-actions">
            <button class="shared-contact-action" type="button" @click.stop="onOpenConversation(entry.primary.sharedContact)">Conversar</button>
            <button
              v-if="isContactSaved(entry.primary.sharedContact) && hasBusinessProfile(entry.primary.sharedContact)"
              class="shared-contact-action"
              type="button"
              @click.stop="onOpenBusinessProfile(entry.primary.sharedContact)"
            >Mostrar empresa</button>
            <button
              v-else-if="isContactSaved(entry.primary.sharedContact)"
              class="shared-contact-action"
              type="button"
              @click.stop="onAddToGroup(entry.primary.sharedContact)"
            >Adicionar a um grupo</button>
            <button
              v-else
              class="shared-contact-action"
              type="button"
              @click.stop="onSaveContact(entry.primary.sharedContact)"
            >Salvar contato</button>
          </div>
        </div>

        <!-- Texto formatado -->
        <p
          v-if="displayText(entry) && !entry.primary.interactive"
          class="msg-text wa-formatted"
          :class="{ 'msg-text--after-preview': entry.primary.linkPreview, 'msg-text--after-media': entry.kind === 'album' || entry.primary.mediaType === 'image' || entry.primary.mediaType === 'video' }"
          v-html="formatText(displayText(entry))"
          @click="onTextClick"
        />

        <a
          v-if="entry.primary.linkPreview?.url"
          :href="entry.primary.linkPreview.url"
          target="_blank"
          rel="noopener noreferrer"
          class="msg-link-url-line wa-link"
          @click.stop
        >{{ entry.primary.linkPreview.url }}</a>

        <!-- Metadados -->
        <WhatsappMessageTime
          v-if="entry.primary.interactive?.kind !== 'poll' && entry.primary.interactive?.kind !== 'menu' && !entry.primary.isContactShare && entry.primary.mediaType !== 'audio'"
          :timestamp="entry.primary.timestamp"
          :format-time="formatTime"
          :is-edited="Boolean(entry.primary.isEdited)"
          :from-me="Boolean(entry.primary.fromMe)"
          :delivery-status="entry.primary.deliveryStatus || ''"
          :pinned="isMessagePinned(entry.primary)"
          :extra-class="{ 'msg-time--document': entry.primary.mediaType === 'document', 'msg-time--media': entry.kind === 'album' || entry.primary.mediaType === 'image' || entry.primary.mediaType === 'video' }"
        />

        <!-- Botão de ações -->
        <button
          v-if="!entry.primary.isContactShare"
          type="button"
          class="msg-chevron-hint"
          :class="{ 'is-visible': actionMenuMessageId === entry.primary.id }"
          :aria-label="'Acoes da mensagem'"
          @click.stop="onToggleActionMenu($event, entry.primary)"
        >
          <ChevronDown class="icon-tiny" />
        </button>
      </div>

      <button
        v-if="hasReactionPill(entry.primary)"
        type="button"
        class="msg-reaction-pill"
        :aria-label="`Reações: ${entry.primary.reactions.length}`"
        @click.stop="onOpenReactionsDetail(entry.primary)"
      >
        <span
          v-for="(em, emIdx) in getReactionPillEmojis(entry.primary)"
          :key="`${entry.primary.id}-pill-${emIdx}`"
          class="msg-reaction-pill-emoji"
        >{{ em }}</span>
        <span v-if="showReactionPillCount(entry.primary)" class="msg-reaction-pill-count">{{ entry.primary.reactions.length }}</span>
      </button>

      <button
        v-if="!entry.primary.isContactShare"
        type="button"
        class="msg-reaction-hint"
        :class="{ 'is-visible': actionMenuMessageId === entry.primary.id && actionMenuMode === 'reactions' }"
        aria-label="Reagir à mensagem"
        @click.stop="onToggleReactionMenu($event, entry.primary)"
      >
        <Smile class="msg-reaction-hint-icon" aria-hidden="true" />
      </button>
    </div>
    </template>
  </div>

  <WhatsappImageViewerModal
    :open="imageViewer.open"
    :items="imageViewer.items"
    :index="imageViewer.index"
    :current="imageViewer.current"
    :sender-name="imageViewer.senderName"
    :sender-avatar="imageViewer.senderAvatar"
    :caption="imageViewer.caption"
    @close="closeImageViewer"
    @prev="prevImageViewerImage"
    @next="nextImageViewerImage"
    @select="setImageViewerIndex"
  />

  <WhatsappListPickerModal
    :open="Boolean(activeListMenuMessage)"
    :title="menuListButtonLabel(activeListMenuMessage)"
    :options="menuListSelectableOptions(activeListMenuMessage)"
    @close="closeListMenu"
    @select="onListOptionSelect"
  />
</template>

<script setup>
import { computed, reactive, ref, toRef } from 'vue'
import { Image, Video, Mic, Smile, FileText, User, ChevronDown, Loader, RefreshCw } from 'lucide-vue-next'
import { formatJidAsPhoneLine, extractDigitsFromJid, normalizeJid, bytesToJpegDataUrl } from '~/composables/whatsapp/useWhatsappUtils.js'
import MessageImagePreview from './MessageImagePreview.vue'
import WhatsappRichMessageBlock from './WhatsappRichMessageBlock.vue'
import WhatsappRemoteImage from './WhatsappRemoteImage.vue'
import WhatsappMessageTime from './WhatsappMessageTime.vue'
import WhatsappAudioMessage from './WhatsappAudioMessage.vue'
import WhatsappListPickerModal from './WhatsappListPickerModal.vue'
import WhatsappPixMessageCard from './WhatsappPixMessageCard.vue'
import WhatsappImageViewerModal from './WhatsappImageViewerModal.vue'
import { handleInteractiveMenuOptionClick } from '~/composables/whatsapp/useWhatsappInteractive.js'
import { useWhatsappImageAlbumEntries } from '~/composables/useWhatsappImageAlbumEntries.js'
import { expandGroupEntriesWithTimeline } from '~/composables/whatsapp/useWhatsappChatTimeline.js'
import { isMessageCurrentlyPinned } from '~/composables/whatsapp/useWhatsappMessages.js'
import { useWhatsappImageViewer } from '~/composables/whatsapp/useWhatsappImageViewer.js'
import { actionMenuMessageId, actionMenuMode } from '~/composables/whatsapp/useWhatsappState.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  downloadingMediaById: { type: Object, default: () => ({}) },
  // Resolvers de nome e avatar (exclusivos de grupos)
  getSenderName: { type: Function, required: true },
  getSenderAvatar: { type: Function, required: true },
  getSenderInitial: { type: Function, required: true },
  // Resolvers compartilhados
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
  // Handlers de interação
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
  onAudioListened: { type: Function, default: null },
  pinTimelineEvents: { type: Array, default: () => [] },
  pinnedMessageIdSet: { type: Object, default: null },
  loadingOlderMessages: { type: Boolean, default: false },
})

const isMessagePinned = (msg) => isMessageCurrentlyPinned(msg, props.pinnedMessageIdSet)

const { groupedEntries, albumVisibleItems, albumOverflowCount } = useWhatsappImageAlbumEntries(
  toRef(props, 'messages'),
  {
    mode: 'group',
    shouldHideLabel: (msg) => props.shouldHideLabel(msg)
  }
)

const displayEntries = computed(() =>
  expandGroupEntriesWithTimeline(groupedEntries.value, props.pinTimelineEvents)
)

const timelineEntryKey = (entry) => {
  if (entry?.kind === '__timeline') return `${entry.timelineKind}-${entry.key}`
  return entry?.key || `group-${entry?.primary?.id}`
}

const strTrim = (v) => (v == null ? '' : String(v).trim())

const messagesRef = toRef(props, 'messages')

const {
  imageViewer,
  handleImageOpen,
  closeImageViewer,
  setImageViewerIndex,
  prevImageViewerImage,
  nextImageViewerImage,
} = useWhatsappImageViewer({
  messagesSource: messagesRef,
  onDownloadMedia: (msg) => props.onDownloadMedia(msg),
  shouldHideLabel: (msg) => props.shouldHideLabel(msg),
  resolveSenderName: (msg) => groupSenderLabel(msg) || 'Contato',
  resolveSenderAvatar: (msg) => props.getSenderAvatar(msg) || '',
})

const pollVotesExpandedByMessageId = reactive({})
const activeListMenuMessage = ref(null)

const togglePollVotes = (messageId) => {
  const key = String(messageId || '').trim()
  if (!key) return
  pollVotesExpandedByMessageId[key] = !pollVotesExpandedByMessageId[key]
}

const menuListButtonLabel = (message) => {
  const custom = String(message?.interactive?.listButton || '').trim()
  if (custom) return custom
  return 'Abrir lista de opções'
}

const menuListSelectableOptions = (message) => {
  if (!message?.interactive) return []
  return (Array.isArray(message.interactive.options) ? message.interactive.options : [])
    .filter((opt) => !opt?.isSection)
    .map((opt) => ({
      id: String(opt?.id || opt?.label || '').trim(),
      label: String(opt?.label || '').trim(),
      description: String(opt?.description || '').trim()
    }))
    .filter((opt) => opt.label)
}

const openListMenu = (message) => {
  activeListMenuMessage.value = message || null
}

const closeListMenu = () => {
  activeListMenuMessage.value = null
}

const onMenuOptionClick = (message, opt) => {
  if (!message || !opt || opt.isSection) return
  props.onMenuOptionClick(message, opt)
}

const onPixMenuAction = (message) => {
  const interactive = message?.interactive
  if (!interactive) return
  if (interactive.menuType === 'pix-button') {
    handleInteractiveMenuOptionClick({
      buttonType: 'COPY',
      id: interactive.pixKey,
      label: 'Copiar chave Pix'
    })
    return
  }
  if (interactive.menuType === 'request-payment' && interactive.paymentLink) {
    handleInteractiveMenuOptionClick({
      buttonType: 'URL',
      id: interactive.paymentLink,
      label: 'Revisar e pagar'
    })
  }
}

const onListOptionSelect = (opt) => {
  const message = activeListMenuMessage.value
  closeListMenu()
  if (!message || !opt?.label) return
  props.onMenuOptionClick(message, {
    label: opt.label,
    id: opt.id || opt.label,
    description: opt.description || '',
    buttonType: 'REPLY',
  })
}

const isMenuButtonImage = (value) => {
  const src = String(value || '').trim()
  return /^https?:\/\//i.test(src) || src.startsWith('data:image/')
}

const menuCarouselCards = (message) => {
  const fromPayload = Array.isArray(message?.interactive?.carouselCards) ? message.interactive.carouselCards : []
  if (fromPayload.length) return fromPayload.slice(0, 6)
  const options = Array.isArray(message?.interactive?.options) ? message.interactive.options.filter((opt) => !opt?.isSection) : []
  const cards = []
  const size = Math.max(1, Math.ceil(options.length / 2))
  for (let i = 0; i < options.length; i += size) {
    cards.push({
      title: 'Texto do cartão',
      actions: options.slice(i, i + size).map((opt) => ({
        label: String(opt?.label || '').trim() || 'Nome do botão',
        type: String(opt?.buttonType || 'REPLY').toUpperCase()
      }))
    })
  }
  if (cards.length > 0) return cards.slice(0, 6)
  return [{ title: 'Texto do cartão', actions: [{ label: 'Nome do botão', type: 'REPLY' }, { label: 'Nome do botão', type: 'REPLY' }] }]
}

const isPollOptionSelected = (message, optionIndex) => {
  const selected = message?.interactive?.__voterSelections?.__me__
  return Array.isArray(selected) && selected.includes(optionIndex)
}

const pollOptionVoterEntries = (option) => {
  const entries = Array.isArray(option?.voterEntries) ? option.voterEntries : []
  return entries.slice(0, 3)
}

const pollVoterAvatar = (voter) => {
  const jid = normalizeJid(voter?.jid || '')
  if (!jid) return ''
  return props.getSenderAvatar({ senderJid: jid, sender: jid, participant: jid, sender_pn: jid })
}

const pollVoterInitial = (voter) => {
  const name = strTrim(voter?.name || '')
  return (name.charAt(0) || '?').toUpperCase()
}

const groupSenderLabel = (msg) => {
  const fromFn = props.getSenderName(msg)
  if (fromFn) return fromFn
  const cached = strTrim(msg.senderDisplayName)
  if (cached) return cached
  return (
    msg.senderName ||
    msg.pushName ||
    msg.participantName ||
    msg.content?.pushName ||
    msg.content?.participantName ||
    ''
  )
}

const isLikelyPhoneLabel = (value) => {
  const raw = strTrim(value)
  if (!raw) return false
  return raw.replace(/[^\d]/g, '').length >= 8
}

const extractSenderPhoneLabel = (msg) => {
  const candidates = [
    msg?.sender_pn,
    msg?.participant_pn,
    msg?.senderJid,
    msg?.sender
  ]
  for (const candidate of candidates) {
    const normalized = normalizeJid(candidate)
    if (!normalized || normalized.endsWith('@g.us') || normalized.endsWith('@lid')) continue
    if (!normalized.endsWith('@s.whatsapp.net')) continue
    const digits = extractDigitsFromJid(normalized)
    // Evita IDs técnicos longos que não são telefone real.
    if (digits.length < 10 || digits.length > 13) continue
    const formatted = formatJidAsPhoneLine(normalized)
    if (formatted) return formatted
  }
  return ''
}

const groupSenderSecondaryLabel = (msg) => {
  const primary = strTrim(groupSenderLabel(msg))
  const aliasCandidates = [
    msg?.senderName,
    msg?.pushName,
    msg?.participantName,
    msg?.content?.senderName,
    msg?.content?.pushName,
    msg?.content?.participantName
  ]
  const alias = aliasCandidates
    .map((value) => strTrim(value))
    .find((value) => value && !isLikelyPhoneLabel(value) && value.toLowerCase() !== primary.toLowerCase())
  if (alias) return alias

  const phone = extractSenderPhoneLabel(msg)
  if (phone && phone.toLowerCase() !== primary.toLowerCase()) return phone
  return ''
}

const hasImagePreview = (msg) => Boolean(msg) && msg.mediaType === 'image'

const entryRelatedIds = (entry) => {
  const items = Array.isArray(entry?.items) ? entry.items : []
  const values = items.flatMap((item) => [
    String(item?.id || '').trim(),
    String(item?.normalizedMessageId || item?.messageid || '').trim(),
    String(item?.normalizedInternalId || '').trim()
  ]).filter(Boolean)
  return Array.from(new Set(values)).join('|')
}

const displayText = (entry) => {
  const fromPrimary = strTrim(entry?.primary?.text)
  if (fromPrimary && !entry?.primary?.isContactShare && !props.shouldHideLabel(entry.primary)) return fromPrimary
  if (!Array.isArray(entry?.items) || entry.items.length <= 1) return ''
  // Legenda de álbum costuma vir na última imagem do lote.
  for (let k = entry.items.length - 1; k >= 0; k -= 1) {
    const item = entry.items[k]
    const text = strTrim(item?.text)
    if (text && !item?.isContactShare && !props.shouldHideLabel(item)) return text
  }
  return ''
}

const getDocumentNode = (msg) => {
  const c = msg?.content && typeof msg.content === 'object' ? msg.content : {}
  return (
    c?.documentMessage ||
    c?.DocumentMessage ||
    c?.message?.documentMessage ||
    c?.message?.DocumentMessage ||
    c?.ephemeralMessage?.message?.documentMessage ||
    c?.ephemeralMessage?.message?.DocumentMessage ||
    c?.viewOnceMessage?.message?.documentMessage ||
    c?.viewOnceMessage?.message?.DocumentMessage ||
    c?.viewOnceMessageV2?.message?.documentMessage ||
    c?.viewOnceMessageV2?.message?.DocumentMessage ||
    c?.documentWithCaptionMessage?.message?.documentMessage ||
    c?.ephemeralMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    c?.viewOnceMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    c?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    {}
  )
}

const getDocumentThumb = (msg) => {
  const node = getDocumentNode(msg)
  const c = msg?.content && typeof msg.content === 'object' ? msg.content : {}
  const candidates = [
    node?.jpegThumbnail,
    node?.JpegThumbnail,
    node?.thumbnail,
    node?.thumb,
    node?.preview,
    node?.thumbnailDirectPath,
    node?.thumbnailUrl,
    node?.previewThumbnail,
    c?.jpegThumbnail,
    c?.thumbnail,
    c?.previewThumbnail,
    msg?.previewUrl
  ]
  for (const candidate of candidates) {
    const asString = String(candidate || '').trim()
    if (asString.startsWith('http://') || asString.startsWith('https://') || asString.startsWith('data:image/')) {
      return asString
    }
    const dataUrl = bytesToJpegDataUrl(candidate)
    if (dataUrl) return dataUrl
  }
  const mediaUrl = String(msg?.mediaUrl || '').trim()
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(mediaUrl)) return mediaUrl
  return ''
}

const getDocumentName = (msg) => {
  const node = getDocumentNode(msg)
  const parseFileNameFromUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const noQuery = raw.split('?')[0].split('#')[0]
    const tail = noQuery.split('/').pop() || ''
    if (!tail) return ''
    try { return decodeURIComponent(tail).trim() } catch { return tail.trim() }
  }
  const fromUrl = parseFileNameFromUrl(msg?.mediaUrl || msg?.fileUrl || msg?.fileURL || msg?.url)
  const fileNameCandidates = [
    node?.fileName,
    node?.FileName,
    node?.filename,
    node?.Filename,
    node?.displayName,
    node?.title,
    msg?.sendPayload?.docName,
    msg?.docName,
    msg?.documentFileName,
    msg?.fileName,
    msg?.filename,
    msg?.documentName,
    fromUrl
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  const preferredWithExtension = fileNameCandidates.find((value) => /\.[a-z0-9]{2,6}$/i.test(value))
  return preferredWithExtension || fileNameCandidates[0] || String(msg?.text || 'Documento').trim()
}

const formatFileSize = (sizeRaw) => {
  const bytes = Number(sizeRaw || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.0', '')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const getDocumentSubtitle = (msg) => {
  const node = getDocumentNode(msg)
  const pages = Number(node?.pageCount || node?.PageCount || 0)
  const rawMimeType = String(node?.mimetype || node?.mimeType || node?.MimeType || '').trim()
  const normalizedMime = rawMimeType ? rawMimeType.replace('application/', '').toUpperCase() : ''
  const extension = String(getDocumentName(msg).split('.').pop() || '').trim().toUpperCase()
  const mimeType = normalizedMime || extension || 'DOC'
  const sizeRaw = Number(
    node?.fileLength || node?.FileLength || node?.fileSize || node?.FileSize ||
    msg?.documentSizeBytes || msg?.mediaSize || msg?.size || 0
  )
  const size = formatFileSize(sizeRaw)
  const pageLabel = Number.isFinite(pages) && pages > 0 ? `${pages} ${pages > 1 ? 'páginas' : 'página'}` : ''
  return [pageLabel, mimeType, size].filter(Boolean).join(' · ') || 'Documento'
}
</script>
