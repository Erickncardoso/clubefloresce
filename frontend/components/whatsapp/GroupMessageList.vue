<template>
  <div class="messages-container">
    <div
      v-for="entry in groupedEntries"
      :key="entry.key"
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
          'message-bubble--document': entry.primary.mediaType === 'document'
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

        <!-- Mídia -->
        <div v-if="entry.kind === 'album'" class="msg-image-album" :class="`msg-image-album--${Math.min(entry.items.length, 4)}`">
          <button
            v-for="(albumItem, albumIndex) in albumVisibleItems(entry.items)"
            :key="`album-${entry.primary.id}-${albumItem.id}`"
            type="button"
            class="msg-image-album-item"
            @click.stop="openImageViewer(entry.items, albumIndex, entry)"
          >
            <img :src="albumItem.mediaUrl" class="msg-image-album-photo" alt="Imagem enviada" />
            <span
              v-if="albumOverflowCount(entry.items.length, albumIndex)"
              class="msg-image-album-overflow"
            >+{{ albumOverflowCount(entry.items.length, albumIndex) }}</span>
          </button>
        </div>
        <button
          v-else-if="entry.primary.mediaType === 'image' && entry.primary.mediaUrl"
          type="button"
          class="msg-image-trigger"
          @click.stop="openImageViewer([entry.primary], 0, entry)"
        >
          <img
            :src="entry.primary.mediaUrl"
            class="msg-image"
            alt="Imagem enviada"
          />
        </button>
        <img v-if="entry.primary.mediaType === 'sticker' && entry.primary.mediaUrl" :src="entry.primary.mediaUrl" class="msg-sticker" alt="Figurinha enviada" />
        <video v-if="entry.primary.mediaType === 'video' && entry.primary.mediaUrl" :src="entry.primary.mediaUrl" controls class="msg-video"></video>
        <audio v-if="entry.primary.mediaType === 'audio' && entry.primary.mediaUrl" :src="entry.primary.mediaUrl" controls class="msg-audio"></audio>
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
            <span class="msg-time msg-time--poll">
              {{ formatTime(entry.primary.timestamp) }}
              <span v-if="entry.primary.isEdited" class="msg-edited-label">Editada</span>
              <span v-if="entry.primary.fromMe && entry.primary.deliveryIndicator" class="msg-status-indicator">{{ entry.primary.deliveryIndicator }}</span>
            </span>
          </div>
          <button type="button" class="msg-poll-show-votes" @click.stop="togglePollVotes(entry.primary.id)">
            {{ pollVotesExpandedByMessageId[entry.primary.id] ? 'Ocultar votos' : 'Mostrar votos' }}
          </button>
        </div>

        <div v-else-if="entry.primary.interactive?.kind === 'menu'" class="msg-menu-card">
          <div class="msg-menu-header">
            <p class="msg-menu-title">{{ entry.primary.interactive.title }}</p>
            <span class="msg-time msg-time--menu">
              {{ formatTime(entry.primary.timestamp) }}
              <span v-if="entry.primary.isEdited" class="msg-edited-label">Editada</span>
              <span v-if="entry.primary.fromMe && entry.primary.deliveryIndicator" class="msg-status-indicator">{{ entry.primary.deliveryIndicator }}</span>
            </span>
          </div>
          <button
            v-if="entry.primary.interactive?.menuType === 'list'"
            type="button"
            class="msg-menu-list-btn"
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
              <div class="msg-menu-carousel-media" />
              <p class="msg-menu-carousel-title">{{ card.title }}</p>
              <button
                v-for="(action, actionIdx) in card.actions"
                :key="`carousel-action-${entry.primary.id}-${cardIdx}-${actionIdx}`"
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
              v-for="(opt, idx) in entry.primary.interactive.options"
              :key="`menu-opt-${entry.primary.id}-${idx}`"
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
          <span class="msg-time msg-time--contact">
            {{ formatTime(entry.primary.timestamp) }}
            <span v-if="entry.primary.isEdited" class="msg-edited-label">Editada</span>
            <span v-if="entry.primary.fromMe && entry.primary.deliveryIndicator" class="msg-status-indicator">{{ entry.primary.deliveryIndicator }}</span>
          </span>
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
          v-html="formatText(displayText(entry))"
          @click="onTextClick"
        />

        <!-- Metadados -->
        <span v-if="entry.primary.interactive?.kind !== 'poll' && entry.primary.interactive?.kind !== 'menu' && !entry.primary.isContactShare" class="msg-time" :class="{ 'msg-time--document': entry.primary.mediaType === 'document' }">
          {{ formatTime(entry.primary.timestamp) }}
          <span v-if="entry.primary.isEdited" class="msg-edited-label">Editada</span>
          <span v-if="entry.primary.fromMe && entry.primary.deliveryIndicator" class="msg-status-indicator">{{ entry.primary.deliveryIndicator }}</span>
        </span>

        <!-- Pílula de reações -->
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
    </div>
  </div>

  <div
    v-if="imageViewer.open"
    class="msg-image-viewer"
    role="dialog"
    aria-modal="true"
    @click.self="closeImageViewer"
  >
    <button type="button" class="msg-image-viewer-close" @click="closeImageViewer">✕</button>

    <div class="msg-image-viewer-header">
      <div class="msg-image-viewer-sender">{{ imageViewer.senderName }}</div>
      <div class="msg-image-viewer-meta">{{ imageViewer.current?.timestamp ? `Hoje às ${formatTime(imageViewer.current.timestamp)}` : '' }}</div>
    </div>

    <div class="msg-image-viewer-stage">
      <button type="button" class="msg-image-viewer-nav msg-image-viewer-nav--prev" @click="prevImageViewerImage">‹</button>
      <img
        v-if="imageViewer.current?.mediaUrl"
        :src="imageViewer.current.mediaUrl"
        class="msg-image-viewer-photo"
        alt="Imagem ampliada"
      />
      <button type="button" class="msg-image-viewer-nav msg-image-viewer-nav--next" @click="nextImageViewerImage">›</button>
    </div>

    <p v-if="imageViewer.caption" class="msg-image-viewer-caption">{{ imageViewer.caption }}</p>

    <div v-if="imageViewer.items.length > 1" class="msg-image-viewer-strip">
      <button
        v-for="(item, idx) in imageViewer.items"
        :key="`viewer-thumb-${item.id || idx}`"
        type="button"
        class="msg-image-viewer-thumb"
        :class="{ 'is-active': idx === imageViewer.index }"
        @click="setImageViewerIndex(idx)"
      >
        <img :src="item.mediaUrl" alt="Miniatura da imagem" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { Image, Video, Mic, Smile, FileText, User, ChevronDown, Loader } from 'lucide-vue-next'
import { formatJidAsPhoneLine, extractDigitsFromJid, normalizeJid, bytesToJpegDataUrl } from '~/composables/whatsapp/useWhatsappUtils.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  actionMenuMessageId: { type: String, default: null },
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
  onDownloadMedia: { type: Function, required: true },
  onOpenReactionsDetail: { type: Function, required: true },
  onOpenConversation: { type: Function, required: true },
  onOpenBusinessProfile: { type: Function, required: true },
  onAddToGroup: { type: Function, required: true },
  onSaveContact: { type: Function, required: true },
  onTextClick: { type: Function, required: true },
  onJumpToRepliedMessage: { type: Function, required: true },
  onPollVote: { type: Function, required: true },
  onOpenDocument: { type: Function, required: true },
})

const strTrim = (v) => (v == null ? '' : String(v).trim())

const imageViewer = reactive({
  open: false,
  items: [],
  index: 0,
  senderName: '',
  caption: '',
  current: null
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

const buildSenderKey = (msg) => {
  const keys = [
    msg?.senderJid,
    msg?.sender,
    msg?.participant,
    msg?.sender_pn,
    msg?.participant_pn,
    msg?.sender_lid,
    msg?.participant_lid,
    msg?.senderDisplayName
  ].map((v) => strTrim(v)).filter(Boolean)
  return keys[0] || 'unknown-sender'
}

const canJoinImageAlbum = (msg) =>
  Boolean(msg) &&
  !msg.fromMe &&
  msg.mediaType === 'image' &&
  Boolean(msg.mediaUrl) &&
  !msg.quoted &&
  !msg.isContactShare

const groupedEntries = computed(() => {
  const result = []
  const items = Array.isArray(props.messages) ? props.messages : []
  const maxGapMs = 90 * 1000

  for (let i = 0; i < items.length; i++) {
    const current = items[i]
    if (!canJoinImageAlbum(current)) {
      result.push({
        kind: 'single',
        key: `single-${current?.id || i}`,
        startIndex: i,
        primary: current,
        items: [current]
      })
      continue
    }

    const senderKey = buildSenderKey(current)
    const albumItems = [current]
    let j = i + 1
    while (j < items.length) {
      const next = items[j]
      if (!canJoinImageAlbum(next)) break
      if (buildSenderKey(next) !== senderKey) break
      const gap = Math.abs(Number(next?.timestamp || 0) - Number(albumItems[albumItems.length - 1]?.timestamp || 0))
      if (gap > maxGapMs) break
      albumItems.push(next)
      j += 1
    }

    if (albumItems.length > 1) {
      result.push({
        kind: 'album',
        key: `album-${albumItems[0]?.id || i}`,
        startIndex: i,
        primary: albumItems[0],
        items: albumItems
      })
      i = j - 1
      continue
    }

    result.push({
      kind: 'single',
      key: `single-${current?.id || i}`,
      startIndex: i,
      primary: current,
      items: [current]
    })
  }

  return result
})

const albumVisibleItems = (items) => (Array.isArray(items) ? items.slice(0, 4) : [])

const albumOverflowCount = (length, index) => (length > 4 && index === 3 ? length - 4 : 0)

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
  const withText = entry.items.find((item) => {
    const text = strTrim(item?.text)
    return text && !item?.isContactShare && !props.shouldHideLabel(item)
  })
  return withText ? strTrim(withText.text) : ''
}

const syncImageViewerCurrent = () => {
  imageViewer.current = imageViewer.items[imageViewer.index] || null
}

const openImageViewer = (items, startIndex, entry) => {
  const safeItems = (Array.isArray(items) ? items : []).filter((item) => item?.mediaUrl)
  if (!safeItems.length) return
  imageViewer.items = safeItems
  imageViewer.index = Math.max(0, Math.min(Number(startIndex) || 0, safeItems.length - 1))
  imageViewer.senderName = groupSenderLabel(entry?.primary || safeItems[0]) || 'Contato'
  imageViewer.caption = displayText(entry || { primary: safeItems[0], items: safeItems })
  imageViewer.open = true
  syncImageViewerCurrent()
}

const closeImageViewer = () => {
  imageViewer.open = false
  imageViewer.items = []
  imageViewer.index = 0
  imageViewer.senderName = ''
  imageViewer.caption = ''
  imageViewer.current = null
}

const setImageViewerIndex = (nextIndex) => {
  if (!imageViewer.items.length) return
  imageViewer.index = Math.max(0, Math.min(Number(nextIndex) || 0, imageViewer.items.length - 1))
  syncImageViewerCurrent()
}

const prevImageViewerImage = () => {
  if (!imageViewer.items.length) return
  const next = imageViewer.index <= 0 ? imageViewer.items.length - 1 : imageViewer.index - 1
  setImageViewerIndex(next)
}

const nextImageViewerImage = () => {
  if (!imageViewer.items.length) return
  const next = imageViewer.index >= imageViewer.items.length - 1 ? 0 : imageViewer.index + 1
  setImageViewerIndex(next)
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
