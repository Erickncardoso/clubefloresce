<template>
  <div class="messages-container">
    <div
      v-for="(msg, msgIndex) in messages"
      :key="`${msgIndex}-${getMergeKey(msg)}`"
      :data-message-index="msgIndex"
      :data-message-id="String(msg.id)"
      :data-message-provider-id="String(msg.normalizedMessageId || msg.messageid || '')"
      :data-message-internal-id="String(msg.normalizedInternalId || '')"
      :data-message-actions-anchor="String(msg.id)"
      class="message-bubble-wrapper"
      :class="[
        msg.fromMe ? 'message-out' : 'message-in',
        { 'is-actions-open': actionMenuMessageId === msg.id },
        { 'has-reaction-pill': hasReactionPill(msg) },
      ]"
      @touchstart.passive="onTouchStart($event, msg)"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @contextmenu.prevent="onContextMenu($event, msg)"
    >
      <!-- Sem avatar nem nome de remetente em chat privado -->
      <div
        class="message-bubble"
        :class="{
          'message-bubble--has-reactions': hasReactionPill(msg),
          'message-bubble--poll-out': msg.fromMe && msg.interactive?.kind === 'poll',
          'message-bubble--menu': msg.interactive?.kind === 'menu',
          'message-bubble--contact-out': msg.fromMe && msg.isContactShare,
          'message-bubble--document': msg.mediaType === 'document'
        }"
      >
        <!-- Citação (reply) -->
        <div
          v-if="msg.quoted"
          class="msg-quote"
          :class="{ 'msg-quote--with-thumb': Boolean(msg.quoted.thumbDataUrl), 'is-clickable': Boolean(msg.replyParentMessageId) }"
          @click.stop="onJumpToRepliedMessage(msg)"
        >
          <div class="msg-quote-accent" aria-hidden="true" />
          <div class="msg-quote-inner">
            <div class="msg-quote-main">
              <div class="msg-quote-author">{{ msg.quoted.authorName }}</div>
              <div v-if="msg.quoted.kind === 'text'" class="msg-quote-line msg-quote-line--text">
                {{ msg.quoted.textPreview }}
              </div>
              <div v-else class="msg-quote-line msg-quote-line--media">
                <Image v-if="msg.quoted.kind === 'image'" class="msg-quote-ico" aria-hidden="true" />
                <Video v-else-if="msg.quoted.kind === 'video'" class="msg-quote-ico" aria-hidden="true" />
                <Mic v-else-if="msg.quoted.kind === 'audio'" class="msg-quote-ico" aria-hidden="true" />
                <Smile v-else-if="msg.quoted.kind === 'sticker'" class="msg-quote-ico" aria-hidden="true" />
                <FileText v-else class="msg-quote-ico" aria-hidden="true" />
                <span>{{ msg.quoted.mediaLabel }}</span>
              </div>
            </div>
            <img
              v-if="msg.quoted.thumbDataUrl"
              :src="msg.quoted.thumbDataUrl"
              class="msg-quote-thumb"
              alt=""
            />
          </div>
        </div>

        <!-- Mídia -->
        <img v-if="msg.mediaType === 'image' && msg.mediaUrl" :src="msg.mediaUrl" class="msg-image" alt="Imagem enviada" />
        <img v-if="msg.mediaType === 'sticker' && msg.mediaUrl" :src="msg.mediaUrl" class="msg-sticker" alt="Figurinha enviada" />
        <video v-if="msg.mediaType === 'video' && msg.mediaUrl" :src="msg.mediaUrl" controls class="msg-video"></video>
        <audio v-if="msg.mediaType === 'audio' && msg.mediaUrl" :src="msg.mediaUrl" controls class="msg-audio"></audio>
        <button
          v-if="msg.mediaType === 'document'"
          class="msg-document-card"
          type="button"
          @click.stop="onOpenDocument(msg)"
        >
          <img
            v-if="getDocumentThumb(msg)"
            :src="getDocumentThumb(msg)"
            class="msg-document-thumb"
            alt="Prévia do documento"
          />
          <div v-else class="msg-document-thumb msg-document-thumb--fallback">PDF</div>
          <div class="msg-document-meta">
            <span class="msg-document-icon">PDF</span>
            <div class="msg-document-texts">
              <strong>{{ getDocumentName(msg) }}</strong>
              <small>{{ getDocumentSubtitle(msg) }}</small>
              <small v-if="msg.isPendingUpload" class="msg-document-uploading">
                <Loader class="msg-document-uploading-spinner" /> Enviando...
              </small>
            </div>
          </div>
        </button>
        <div v-if="msg.interactive?.kind === 'poll'" class="msg-poll-card">
          <div class="msg-poll-main">
            <p class="msg-poll-title">{{ msg.interactive.title }}</p>
            <p class="msg-poll-subtitle">Selecione uma opção</p>
            <div v-if="msg.interactive.options.length" class="msg-poll-options">
              <div v-for="(opt, idx) in msg.interactive.options" :key="`poll-opt-${msg.id}-${idx}`" class="msg-poll-option">
                <button
                  type="button"
                  class="msg-poll-option-top msg-poll-option-top-btn"
                  :class="{ 'is-selected': isPollOptionSelected(msg, idx) }"
                  @click.stop="onPollVote(msg, opt, idx)"
                >
                  <div class="msg-poll-option-label-wrap">
                    <span class="msg-poll-option-radio" aria-hidden="true" />
                    <span class="msg-poll-option-label">{{ opt.label }}</span>
                  </div>
                  <div class="msg-poll-option-right">
                    <span v-for="voter in pollOptionVoterEntries(opt)" :key="`voter-${msg.id}-${idx}-${voter.key}`" class="msg-poll-voter-avatar" :title="voter.name">
                      <span>{{ pollVoterInitial(voter) }}</span>
                    </span>
                    <span class="msg-poll-option-votes">{{ Number(opt.votes || 0) }}</span>
                  </div>
                </button>
                <div class="msg-poll-bar-track">
                  <div
                    class="msg-poll-bar-fill"
                    :style="{ width: `${msg.interactive.totalVotes > 0 ? Math.max(8, Math.round((Number(opt.votes || 0) / msg.interactive.totalVotes) * 100)) : 8}%` }"
                  />
                </div>
                <p v-if="pollVotesExpandedByMessageId[msg.id] && opt.voterNames?.length" class="msg-poll-voters">
                  {{ opt.voterNames.join(', ') }}
                </p>
              </div>
            </div>
            <span class="msg-time msg-time--poll">
              {{ formatTime(msg.timestamp) }}
              <span v-if="msg.isEdited" class="msg-edited-label">Editada</span>
              <span v-if="msg.fromMe && msg.deliveryIndicator" class="msg-status-indicator">{{ msg.deliveryIndicator }}</span>
            </span>
          </div>
          <button type="button" class="msg-poll-show-votes" @click.stop="togglePollVotes(msg.id)">
            {{ pollVotesExpandedByMessageId[msg.id] ? 'Ocultar votos' : 'Mostrar votos' }}
          </button>
        </div>

        <div v-else-if="msg.interactive?.kind === 'menu'" class="msg-menu-card">
          <div class="msg-menu-header">
            <p class="msg-menu-title">{{ msg.interactive.title }}</p>
            <span class="msg-time msg-time--menu">
              {{ formatTime(msg.timestamp) }}
              <span v-if="msg.isEdited" class="msg-edited-label">Editada</span>
              <span v-if="msg.fromMe && msg.deliveryIndicator" class="msg-status-indicator">{{ msg.deliveryIndicator }}</span>
            </span>
          </div>
          <button
            v-if="msg.interactive?.menuType === 'list'"
            type="button"
            class="msg-menu-list-btn"
          >
            <span class="msg-menu-list-btn-ico" aria-hidden="true">≣</span>
            <span>{{ menuListButtonLabel(msg) }}</span>
          </button>
          <div v-else-if="msg.interactive?.menuType === 'carousel'" class="msg-menu-carousel">
            <article
              v-for="(card, cardIdx) in menuCarouselCards(msg)"
              :key="`carousel-card-${msg.id}-${cardIdx}`"
              class="msg-menu-carousel-card"
            >
              <div class="msg-menu-carousel-media" />
              <p class="msg-menu-carousel-title">{{ card.title }}</p>
              <button
                v-for="(action, actionIdx) in card.actions"
                :key="`carousel-action-${msg.id}-${cardIdx}-${actionIdx}`"
                type="button"
                class="msg-menu-carousel-action"
                :class="{ 'is-copy-action': action.type === 'COPY' }"
              >
                <span v-if="action.type === 'COPY'" class="msg-menu-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="msg-menu-action-ico" />
                <span class="msg-menu-action-label" :class="{ 'is-copy-label': action.type === 'COPY' }">{{ action.label }}</span>
              </button>
            </article>
          </div>
          <div v-else class="msg-menu-actions">
            <div
              v-for="(opt, idx) in msg.interactive.options"
              :key="`menu-opt-${msg.id}-${idx}`"
              class="msg-menu-action-row"
              :class="{ 'is-section': opt.isSection }"
            >
              <template v-if="opt.isSection">
                <span class="msg-menu-section-label">{{ opt.label }}</span>
              </template>
              <template v-else>
                <span v-if="opt.buttonType === 'COPY'" class="msg-menu-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="msg-menu-action-ico" />
                <span class="msg-menu-action-label" :class="{ 'is-copy-label': opt.buttonType === 'COPY' }">{{ opt.label }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Contato compartilhado -->
        <div v-if="msg.isContactShare && msg.sharedContact" class="shared-contact-card">
          <div class="shared-contact-main">
            <div class="shared-contact-avatar">
              <img
                v-if="getSharedContactAvatar(msg.sharedContact)"
                :src="getSharedContactAvatar(msg.sharedContact)"
                :alt="msg.sharedContact.name || 'Contato'"
              />
              <User v-else class="icon-small" />
            </div>
            <div class="shared-contact-content">
              <div class="shared-contact-name">{{ msg.sharedContact.name || 'Contato' }}</div>
            </div>
          </div>
          <span class="msg-time msg-time--contact">
            {{ formatTime(msg.timestamp) }}
            <span v-if="msg.isEdited" class="msg-edited-label">Editada</span>
            <span v-if="msg.fromMe && msg.deliveryIndicator" class="msg-status-indicator">{{ msg.deliveryIndicator }}</span>
          </span>
          <div class="shared-contact-actions">
            <button class="shared-contact-action" type="button" @click.stop="onOpenConversation(msg.sharedContact)">Conversar</button>
            <button
              v-if="isContactSaved(msg.sharedContact) && hasBusinessProfile(msg.sharedContact)"
              class="shared-contact-action"
              type="button"
              @click.stop="onOpenBusinessProfile(msg.sharedContact)"
            >Mostrar empresa</button>
            <button
              v-else-if="isContactSaved(msg.sharedContact)"
              class="shared-contact-action"
              type="button"
              @click.stop="onAddToGroup(msg.sharedContact)"
            >Adicionar a um grupo</button>
            <button
              v-else
              class="shared-contact-action"
              type="button"
              @click.stop="onSaveContact(msg.sharedContact)"
            >Salvar contato</button>
          </div>
        </div>

        <!-- Texto formatado -->
        <p
          v-if="msg.text && !msg.isContactShare && !shouldHideLabel(msg) && !msg.interactive"
          class="msg-text wa-formatted"
          v-html="formatText(msg.text)"
          @click="onTextClick"
        />

        <!-- Metadados -->
        <span v-if="msg.interactive?.kind !== 'poll' && msg.interactive?.kind !== 'menu' && !msg.isContactShare" class="msg-time" :class="{ 'msg-time--document': msg.mediaType === 'document' }">
          {{ formatTime(msg.timestamp) }}
          <span v-if="msg.isEdited" class="msg-edited-label">Editada</span>
          <span v-if="msg.fromMe && msg.deliveryIndicator" class="msg-status-indicator">{{ msg.deliveryIndicator }}</span>
        </span>

        <!-- Pílula de reações -->
        <button
          v-if="hasReactionPill(msg)"
          type="button"
          class="msg-reaction-pill"
          :aria-label="`Reações: ${msg.reactions.length}`"
          @click.stop="onOpenReactionsDetail(msg)"
        >
          <span
            v-for="(em, emIdx) in getReactionPillEmojis(msg)"
            :key="`${msg.id}-pill-${emIdx}`"
            class="msg-reaction-pill-emoji"
          >{{ em }}</span>
          <span v-if="showReactionPillCount(msg)" class="msg-reaction-pill-count">{{ msg.reactions.length }}</span>
        </button>

        <!-- Botão de ações -->
        <button
          v-if="!msg.isContactShare"
          type="button"
          class="msg-chevron-hint"
          :class="{ 'is-visible': actionMenuMessageId === msg.id }"
          :aria-label="'Acoes da mensagem'"
          @click.stop="onToggleActionMenu($event, msg)"
        >
          <ChevronDown class="icon-tiny" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { Image, Video, Mic, Smile, FileText, User, ChevronDown, Loader } from 'lucide-vue-next'
import { bytesToJpegDataUrl } from '~/composables/whatsapp/useWhatsappUtils.js'

defineProps({
  messages: { type: Array, default: () => [] },
  actionMenuMessageId: { type: String, default: null },
  downloadingMediaById: { type: Object, default: () => ({}) },
  // Resolvers compartilhados (sem getSenderName/Avatar pois é chat privado)
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

const pollVotesExpandedByMessageId = reactive({})

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

const menuCarouselCards = (message) => {
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

const pollVoterInitial = (voter) => {
  const name = String(voter?.name || '').trim()
  return (name.charAt(0) || '?').toUpperCase()
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
