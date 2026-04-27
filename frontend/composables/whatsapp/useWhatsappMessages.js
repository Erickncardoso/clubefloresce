/**
 * useWhatsappMessages
 * Normalização de mensagens, anexação de reações, computed renderedMessages,
 * download de mídia e funções de suporte a exibição.
 */
import { computed } from 'vue'
import {
  messages, optimisticReactionsByNormalizedId,
  contactsDirectory, groupParticipantsDirectory, groupParticipantsByJid, groupParticipantsByLid,
  observedSenderDirectory,
  downloadingMediaById, autoMediaLoadAttemptedById, chatBodyRef, selectedChat
} from './useWhatsappState.js'
import {
  strTrim, normalizeTimestampToMs, normalizeJid, looksLikeEmojiSummaryField,
  normalizeProviderMessageId, buildLookupKeys, pickNameFromDirectory,
  formatJidAsPhoneLine, bytesToJpegDataUrl
} from './useWhatsappUtils.js'
import { getAuthToken, getProxyBase } from './useWhatsappApi.js'
import {
  resolveSenderName, getMessageSenderJid, getMessageSenderLookupKeys, isGroupMessageContext
} from './useWhatsappContacts.js'

// ─── Extração de conteúdo ─────────────────────────────────────────────────────

const pickNestedCaption = (node) => {
  if (!node || typeof node !== 'object') return ''
  return strTrim(node.imageMessage?.caption) || strTrim(node.videoMessage?.caption) ||
    strTrim(node.documentMessage?.caption) || strTrim(node.audioMessage?.caption) || ''
}

export const buildMessageContentText = (msg) => {
  const c = msg?.content ?? msg?.Content
  const fromEphemeral = c?.ephemeralMessage?.message
  const fromViewOnce = c?.viewOnceMessage?.message || c?.viewOnceMessageV2?.message
  const mediaCaption = pickNestedCaption(c) || pickNestedCaption(fromEphemeral) || pickNestedCaption(fromViewOnce)
  return strTrim(msg.text) || strTrim(msg.body) || strTrim(msg.caption) ||
    strTrim(c?.conversation) || strTrim(c?.extendedTextMessage?.text) ||
    strTrim(fromEphemeral?.conversation) || strTrim(fromEphemeral?.extendedTextMessage?.text) ||
    strTrim(fromViewOnce?.extendedTextMessage?.text) || strTrim(fromViewOnce?.conversation) ||
    mediaCaption || ''
}

const pickMediaUrlFromNode = (node) => {
  if (!node || typeof node !== 'object') return ''
  return strTrim(node.imageMessage?.url || node.imageMessage?.fileUrl ||
    node.videoMessage?.url || node.videoMessage?.fileUrl ||
    node.documentMessage?.url || node.documentMessage?.fileUrl ||
    node.stickerMessage?.url || node.stickerMessage?.fileUrl || '')
}

export const extractUazapiMediaUrl = (content) => {
  if (!content || typeof content !== 'object') return ''
  return pickMediaUrlFromNode(content) ||
    pickMediaUrlFromNode(content.ephemeralMessage?.message) ||
    pickMediaUrlFromNode(content.viewOnceMessage?.message) ||
    pickMediaUrlFromNode(content.viewOnceMessageV2?.message) || ''
}

export const extractUazapiJpegThumbDataUrl = (content) => {
  if (!content || typeof content !== 'object') return ''
  const documentWithCaption =
    content.documentWithCaptionMessage?.message?.documentMessage ||
    content.ephemeralMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    content.viewOnceMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    content.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    null
  const nested = [
    content.imageMessage?.jpegThumbnail,
    content.videoMessage?.jpegThumbnail,
    content.videoMessage?.thumbnail,
    content.documentMessage?.jpegThumbnail,
    content.documentMessage?.thumbnail,
    content.documentMessage?.thumb,
    content.documentMessage?.previewThumbnail,
    content.documentMessage?.thumbnailUrl,
    content.documentMessage?.thumbnailDirectPath,
    documentWithCaption?.jpegThumbnail,
    documentWithCaption?.thumbnail,
    documentWithCaption?.thumb,
    documentWithCaption?.previewThumbnail,
    documentWithCaption?.thumbnailUrl,
    documentWithCaption?.thumbnailDirectPath,
    content.ephemeralMessage?.message?.imageMessage?.jpegThumbnail,
    content.ephemeralMessage?.message?.videoMessage?.jpegThumbnail,
    content.ephemeralMessage?.message?.videoMessage?.thumbnail,
    content.ephemeralMessage?.message?.documentMessage?.jpegThumbnail,
    content.ephemeralMessage?.message?.documentMessage?.thumbnail,
    content.ephemeralMessage?.message?.documentMessage?.thumb,
    content.ephemeralMessage?.message?.documentMessage?.previewThumbnail,
    content.ephemeralMessage?.message?.documentMessage?.thumbnailUrl,
    content.ephemeralMessage?.message?.documentMessage?.thumbnailDirectPath,
    content.viewOnceMessage?.message?.imageMessage?.jpegThumbnail,
    content.viewOnceMessage?.message?.videoMessage?.jpegThumbnail,
    content.viewOnceMessage?.message?.documentMessage?.jpegThumbnail,
    content.viewOnceMessage?.message?.documentMessage?.thumbnail,
    content.viewOnceMessage?.message?.documentMessage?.thumb,
    content.viewOnceMessage?.message?.documentMessage?.previewThumbnail,
    content.viewOnceMessage?.message?.documentMessage?.thumbnailUrl,
    content.viewOnceMessage?.message?.documentMessage?.thumbnailDirectPath,
    content.viewOnceMessageV2?.message?.imageMessage?.jpegThumbnail,
    content.viewOnceMessageV2?.message?.videoMessage?.jpegThumbnail,
    content.viewOnceMessageV2?.message?.documentMessage?.jpegThumbnail,
    content.viewOnceMessageV2?.message?.documentMessage?.thumbnail,
    content.viewOnceMessageV2?.message?.documentMessage?.thumb,
    content.viewOnceMessageV2?.message?.documentMessage?.previewThumbnail,
    content.viewOnceMessageV2?.message?.documentMessage?.thumbnailUrl,
    content.viewOnceMessageV2?.message?.documentMessage?.thumbnailDirectPath
  ]
  for (const raw of nested) {
    const asString = String(raw || '').trim()
    if (asString.startsWith('http://') || asString.startsWith('https://') || asString.startsWith('data:image/')) {
      return asString
    }
    const url = bytesToJpegDataUrl(raw)
    if (url) return url
  }
  return ''
}

export const tryParseQuotedPayload = (raw) => {
  if (raw == null || raw === '') return null
  if (typeof raw === 'object') return raw
  const s = String(raw).trim()
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
}

// ─── Reações ──────────────────────────────────────────────────────────────────

const extractReactionMessageNode = (content) => {
  if (!content || typeof content !== 'object') return null
  if (content.reactionMessage && typeof content.reactionMessage === 'object') return content.reactionMessage
  if (content.ReactionMessage && typeof content.ReactionMessage === 'object') return content.ReactionMessage
  const wrapped = content.message
  if (wrapped && typeof wrapped === 'object') { const nested = extractReactionMessageNode(wrapped); if (nested) return nested }
  const pr = content.protocolMessage
  if (pr?.reactionMessage && typeof pr.reactionMessage === 'object') return pr.reactionMessage
  const em = content.ephemeralMessage?.message
  if (em && typeof em === 'object') return extractReactionMessageNode(em)
  return null
}

const pickReactionTargetIdFromMessage = (msg, content) => {
  const rm = extractReactionMessageNode(content)
  const fromRmKey = strTrim(rm?.key?.id || rm?.key?.ID)
  const reactionStr = typeof msg.reaction === 'string' ? strTrim(msg.reaction) : ''
  const reactionAsTargetId = reactionStr && !looksLikeEmojiSummaryField(reactionStr) ? reactionStr : ''
  const flat = [
    fromRmKey, reactionAsTargetId, msg.reactionMessageId, msg.reactionmessageid,
    msg.targetMessageID, msg.targetMessageId, msg.targetID, msg.reactionTargetId,
    msg.reactionTargetMessageId,
    typeof msg.reaction === 'object' && msg.reaction
      ? strTrim(msg.reaction.id || msg.reaction.messageId || msg.reaction.key?.id || msg.reaction.targetId) : '',
    strTrim(content?.reactionMessage?.key?.id || content?.ReactionMessage?.key?.id),
    strTrim(content?.message?.reactionMessage?.key?.id)
  ]
  for (const v of flat) { const s = strTrim(typeof v === 'number' ? String(v) : v); if (s && !s.startsWith('[')) return s }
  return ''
}

const pickReactionEmojiFromMessage = (msg, content) => {
  const rm = extractReactionMessageNode(content)
  const ro = msg.reaction
  const fromReactionObject = () => {
    if (!ro || typeof ro !== 'object') return ''
    const maybeRx = typeof ro.reaction === 'string' ? strTrim(ro.reaction) : ''
    if (maybeRx && !looksLikeEmojiSummaryField(maybeRx)) return strTrim(ro.text || ro.emoji || ro.unicode || ro.Emoji || '')
    return strTrim(ro.text || ro.emoji || ro.unicode || ro.Emoji || (maybeRx && looksLikeEmojiSummaryField(maybeRx) ? maybeRx : ''))
  }
  const reactionMaybeEmoji = typeof ro === 'string' && looksLikeEmojiSummaryField(strTrim(ro)) ? strTrim(ro) : ''
  const rmExtra = typeof rm?.reaction === 'string' && !looksLikeEmojiSummaryField(strTrim(rm.reaction))
    ? '' : strTrim(typeof rm?.reaction === 'string' ? rm.reaction : typeof rm?.reaction === 'number' ? String(rm.reaction) : '')
  return strTrim(
    msg.text || msg.body || msg.emoji || fromReactionObject() || reactionMaybeEmoji ||
    msg.reaction?.text || msg.reaction?.emoji || rm?.text || rm?.emoji || rm?.unicode ||
    (rmExtra && looksLikeEmojiSummaryField(rmExtra) ? rmExtra : '') || strTrim(rm?.conversation || '') ||
    msg.reaction?.unicode || content?.reactionMessage?.text || content?.ReactionMessage?.text ||
    content?.message?.reactionMessage?.text || content?.reactionMessage?.reaction ||
    content?.reactionMessage?.emoji || content?.reaction?.text || ''
  )
}

// ─── Contatos compartilhados ──────────────────────────────────────────────────

export const extractSharedContactData = (msg) => {
  const vcardText = msg.vcard || msg.content?.vcard || msg.content?.contactMessage?.vcard || msg.content?.contactsArrayMessage?.contacts?.[0]?.vcard || ''
  const displayName = msg.content?.contactMessage?.displayName || msg.content?.contactsArrayMessage?.contacts?.[0]?.displayName || ''
  const plainText = msg.text || msg.body || msg.content?.conversation || msg.content?.extendedTextMessage?.text || ''
  const plainNamePhoneMatch = String(plainText).match(/^(.+?)\s+Phone:\s*(.+)$/i)
  const vcardNameMatch = String(vcardText).match(/FN:([^\n\r]+)/)
  const vcardPhoneMatch = String(vcardText).match(/TEL[^:]*:([+\d][\d\s-]+)/)
  const name = String(displayName || vcardNameMatch?.[1] || plainNamePhoneMatch?.[1] || '').trim()
  const phone = String(vcardPhoneMatch?.[1] || plainNamePhoneMatch?.[2] || '').replace(/[^\d+]/g, '').trim()
  if (!name && !phone) return null
  return { name, phone }
}

export const extractSharedContactText = (msg) => {
  const contact = extractSharedContactData(msg)
  if (!contact) return ''
  const { name, phone } = contact
  if (name && phone) return `👤 ${name}\n📞 ${phone}`
  if (name) return `👤 ${name}`
  return `📞 ${phone}`
}

// ─── replaceMentionNumbersByNames (importada do contexto) ─────────────────────

export const replaceMentionNumbersByNames = (text, resolveFn) => {
  if (!text) return ''
  return String(text).replace(/@(\+?\d{8,})/g, (match, mentionDigits) => {
    const mentionName = resolveFn ? resolveFn(mentionDigits) : ''
    if (!mentionName) return match
    const digits = mentionDigits.replace(/\D/g, '')
    if (!digits) return `@${mentionName}`
    return `[[MENTION:${digits}:${mentionName}]]`
  })
}

// ─── normalizeMessage ─────────────────────────────────────────────────────────

export const normalizeMessage = (msg, resolveMentionFn = null) => {
  const type = String(msg.type || msg.messageType || msg.MessageType || '').toLowerCase()
  const rawContent = msg?.content ?? msg?.Content
  const content = rawContent && typeof rawContent === 'object' ? rawContent
    : typeof rawContent === 'string' ? tryParseQuotedPayload(rawContent) || {} : {}

  const reactionMessageNode = extractReactionMessageNode(content)
  const reactionTargetIdRaw = pickReactionTargetIdFromMessage(msg, content)
  const normalizedReactionTargetId = normalizeProviderMessageId(reactionTargetIdRaw)
  const reactionEmoji = pickReactionEmojiFromMessage(msg, content)
  const reactionStr = typeof msg.reaction === 'string' ? strTrim(msg.reaction) : ''
  const reactionLooksLikeTargetId = Boolean(reactionStr && !looksLikeEmojiSummaryField(reactionStr))
  const isReaction = type.includes('reaction') || type === 'react' || Boolean(reactionMessageNode) ||
    Boolean(normalizedReactionTargetId && reactionEmoji) ||
    Boolean(reactionLooksLikeTargetId && looksLikeEmojiSummaryField(reactionEmoji))

  const contentText = isReaction ? '' : buildMessageContentText(msg)
  const mediaFromContent = extractUazapiMediaUrl(content)
  const thumbDataUrl = extractUazapiJpegThumbDataUrl(content)
  const mediaUrl = strTrim(msg.fileURL || msg.fileUrl || msg.url || msg.mediaUrl ||
    content?.fileURL || content?.fileUrl || content?.url || mediaFromContent || '') || thumbDataUrl

  const mimeType = strTrim(msg?.mimetype || msg?.mimeType || content?.mimetype || content?.mimeType ||
    content?.imageMessage?.mimetype || content?.videoMessage?.mimetype ||
    content?.audioMessage?.mimetype || content?.documentMessage?.mimetype || '').toLowerCase()
  const mediaUrlForDetect = strTrim(msg?.fileURL || msg?.fileUrl || msg?.url || msg?.mediaUrl ||
    content?.fileURL || content?.fileUrl || content?.url || mediaFromContent || '').toLowerCase()

  const isSticker = type.includes('sticker') || Boolean(content?.stickerMessage)
  const isGif = type.includes('gif') || mimeType.includes('gif') || /\.gif($|\?)/i.test(mediaUrlForDetect)
  const isImage = (type.includes('image') || Boolean(content?.imageMessage) || mimeType.startsWith('image/')) && !isSticker
  const isAudio = type.includes('audio') || type.includes('ptt') || type.includes('myaudio') || mimeType.startsWith('audio/')
  const isVideo = type.includes('video') || Boolean(content?.videoMessage) || mimeType.startsWith('video/')
  const isDocument = type.includes('document') || Boolean(content?.documentMessage) || mimeType.includes('application/')
  const looksLikeContactSharedText = /\bphone:\s*\+?\d[\d\s-]{7,}/i.test(String(contentText || ''))
  const sharedContact = extractSharedContactData(msg)
  const hasSharedContactData = Boolean(sharedContact?.name || sharedContact?.phone)

  const hasEditedInPayload = () => {
    if (strTrim(msg.edited)) return true
    const c = content
    if (!c || typeof c !== 'object') return false
    return Boolean(c.editedMessage || c.message?.editedMessage || c.protocolMessage?.editedMessage || c.ephemeralMessage?.message?.editedMessage)
  }

  const isContactShare = type.includes('contact') || type.includes('vcard') ||
    Boolean(msg.vcard || content?.contactMessage || content?.contactsArrayMessage || looksLikeContactSharedText || hasSharedContactData)
  const isMedia = isImage || isAudio || isVideo || isDocument || isSticker

  const documentNode = (
    content?.documentMessage ||
    content?.DocumentMessage ||
    content?.message?.documentMessage ||
    content?.message?.DocumentMessage ||
    content?.ephemeralMessage?.message?.documentMessage ||
    content?.ephemeralMessage?.message?.DocumentMessage ||
    content?.viewOnceMessage?.message?.documentMessage ||
    content?.viewOnceMessage?.message?.DocumentMessage ||
    content?.viewOnceMessageV2?.message?.documentMessage ||
    content?.viewOnceMessageV2?.message?.DocumentMessage ||
    content?.documentWithCaptionMessage?.message?.documentMessage ||
    content?.ephemeralMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    content?.viewOnceMessage?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    content?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message?.documentMessage ||
    {}
  )
  const documentFileName = strTrim(
    documentNode?.fileName || documentNode?.FileName || documentNode?.filename || documentNode?.Filename ||
    msg?.fileName || msg?.documentName || msg?.docName || msg?.sendPayload?.docName || ''
  )
  const documentSizeBytes = Number(
    documentNode?.fileLength || documentNode?.FileLength || documentNode?.fileSize || documentNode?.FileSize ||
    msg?.mediaSize || msg?.size || 0
  )

  const hasPollSignals = () => {
    const pollishType = type.includes('poll') || type.includes('vote')
    const c = content || {}
    const hasPollFields = Boolean(
      msg?.pollId || msg?.pollID || msg?.pollMessageId || msg?.pollMessageID ||
      msg?.vote || c?.vote ||
      c?.pollCreationMessage || c?.pollResultSnapshotMessage ||
      c?.pollUpdateMessage || c?.pollVoteMessage ||
      c?.message?.pollCreationMessage || c?.message?.pollResultSnapshotMessage ||
      c?.message?.pollUpdateMessage || c?.message?.pollVoteMessage
    )
    return pollishType || hasPollFields
  }

  const parseInteractivePayload = () => {
    const parseDynamicNode = (raw) => {
      if (raw == null) return null
      if (typeof raw === 'object') return raw
      const text = strTrim(raw)
      if (!text) return null
      try { return JSON.parse(text) } catch { return null }
    }

    const decodeBytesToText = (raw) => {
      if (!raw) return ''
      if (typeof raw === 'string') return strTrim(raw)
      if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
      if (Array.isArray(raw) && raw.every((item) => Number.isFinite(Number(item)))) {
        try {
          const bytes = new Uint8Array(raw.map((item) => Number(item)))
          if (typeof TextDecoder !== 'undefined') return strTrim(new TextDecoder('utf-8').decode(bytes))
          return strTrim(String.fromCharCode(...bytes))
        } catch {
          return ''
        }
      }
      if (raw && typeof raw === 'object') {
        if (raw.type === 'Buffer' && Array.isArray(raw.data)) return decodeBytesToText(raw.data)
        if (Array.isArray(raw.data)) return decodeBytesToText(raw.data)
        if (Array.isArray(raw.bytes)) return decodeBytesToText(raw.bytes)
        if (Array.isArray(raw.buffer)) return decodeBytesToText(raw.buffer)
      }
      return ''
    }

    const extractPollOptionLabel = (opt) => {
      if (typeof opt === 'string') return strTrim(opt)
      if (!opt || typeof opt !== 'object') return ''
      const directCandidates = [
        opt.label, opt.text, opt.name, opt.option, opt.optionName, opt.optionText,
        opt.pollOptionName, opt.title, opt.value
      ]
      for (const candidate of directCandidates) {
        const decoded = decodeBytesToText(candidate)
        if (decoded) return decoded
      }
      // Alguns payloads da UAZAPI encapsulam o label em nested objects.
      if (opt.optionName && typeof opt.optionName === 'object') {
        const nestedCandidates = [opt.optionName.value, opt.optionName.text, opt.optionName.name, opt.optionName.option]
        for (const nested of nestedCandidates) {
          const decoded = decodeBytesToText(nested)
          if (decoded) return decoded
        }
      }
      return ''
    }

    const extractPollId = () => {
      const pollCreation = content?.pollCreationMessage || null
      const pollSnapshot = content?.pollResultSnapshotMessage || null
      const candidates = [
        msg?.pollId,
        msg?.pollID,
        msg?.pollMessageId,
        msg?.pollMessageID,
        vote?.pollId,
        vote?.pollID,
        vote?.pollMessageId,
        vote?.pollMessageID,
        convertOptions?.pollId,
        convertOptions?.pollID,
        pollCreation?.pollId,
        pollCreation?.pollID,
        pollCreation?.messageId,
        pollCreation?.messageID,
        pollCreation?.stanzaId,
        pollCreation?.stanzaID,
        pollSnapshot?.pollId,
        pollSnapshot?.pollID,
        pollSnapshot?.pollCreationMessageKey?.id,
        pollSnapshot?.pollCreationMessageKey?.ID,
        pollSnapshot?.stanzaId,
        pollSnapshot?.stanzaID,
        content?.contextInfo?.stanzaId,
        content?.contextInfo?.stanzaID
      ]
      for (const candidate of candidates) {
        const normalized = normalizeProviderMessageId(candidate)
        if (normalized) return normalized
      }
      return ''
    }

    const pollLike = hasPollSignals()
    const vote = parseDynamicNode(msg?.vote) || parseDynamicNode(content?.vote) ||
      parseDynamicNode(content?.pollVoteMessage) || parseDynamicNode(content?.message?.pollVoteMessage) || null
    const convertOptions = parseDynamicNode(msg?.convertOptions) || parseDynamicNode(content?.convertOptions) || null
    const pollCreation = content?.pollCreationMessage || content?.message?.pollCreationMessage || null
    const pollSnapshot = content?.pollResultSnapshotMessage || content?.message?.pollResultSnapshotMessage || null
    const choicesRaw = Array.isArray(convertOptions?.options) ? convertOptions.options
      : Array.isArray(convertOptions) ? convertOptions
      : Array.isArray(vote?.options) ? vote.options
      : Array.isArray(vote?.selectedOptions) ? vote.selectedOptions
      : Array.isArray(msg?.choices) ? msg.choices
      : Array.isArray(msg?.options) ? msg.options
      : Array.isArray(content?.choices) ? content.choices
      : Array.isArray(content?.options) ? content.options
      : Array.isArray(pollCreation?.options) ? pollCreation.options
      : Array.isArray(pollSnapshot?.options) ? pollSnapshot.options
      : Array.isArray(pollSnapshot?.selectedOptions) ? pollSnapshot.selectedOptions
      : Array.isArray(pollSnapshot?.votes) ? pollSnapshot.votes
      : []

    const options = choicesRaw
      .map((opt) => {
        const label = extractPollOptionLabel(opt)
        if (!label) return null
        const optionId = strTrim(
          opt?.id ||
          opt?.optionId ||
          opt?.optionID ||
          opt?.value ||
          opt?.hash ||
          opt?.optionHash ||
          opt?.pollOptionId ||
          ''
        )
        const votes = Number(opt?.votes ?? opt?.count ?? opt?.total ?? opt?.voters ?? opt?.voterCount ?? opt?.selectedCount ?? 0)
        const voterEntries = (Array.isArray(opt?.voters) ? opt.voters : [])
          .map((voter, voterIndex) => {
            if (typeof voter === 'string') {
              const name = strTrim(voter)
              return name ? { key: `name:${name}:${voterIndex}`, name, jid: '' } : null
            }
            if (!voter || typeof voter !== 'object') return null
            const jid = normalizeJid(voter.jid || voter.sender || voter.participant || voter.phone || '')
            const name = strTrim(voter.name || voter.displayName || voter.pushName || voter.senderName || voter.phone || voter.jid || '')
            const key = jid ? `jid:${jid}` : (name ? `name:${name}:${voterIndex}` : '')
            if (!key) return null
            return { key, name: name || formatJidAsPhoneLine(jid) || 'Contato', jid }
          })
          .filter(Boolean)
        const voterNames = voterEntries.map((entry) => entry.name).filter(Boolean)
        return label
          ? { label, optionId, votes: Number.isFinite(votes) ? votes : 0, voterNames, voterEntries }
          : null
      })
      .filter(Boolean)

    if (!pollLike && options.length === 0) {
      const interactiveTypeRaw = strTrim(
        msg?.typeInteractive ||
        msg?.interactiveType ||
        msg?.sendPayload?.type ||
        content?.interactiveMessage?.type ||
        content?.buttonsMessage?.type ||
        content?.listMessage?.type ||
        ''
      ).toLowerCase()
      const interactiveText = strTrim(
        msg?.sendPayload?.text ||
        msg?.sendPayload?.title ||
        content?.buttonsMessage?.contentText ||
        content?.listMessage?.description ||
        contentText ||
        msg?.text ||
        msg?.body ||
        ''
      )
      const interactiveListButton = strTrim(
        msg?.sendPayload?.listButton ||
        content?.listMessage?.buttonText ||
        content?.listMessage?.title ||
        ''
      )
      const parseMenuChoice = (choice, index) => {
        const raw = strTrim(choice)
        if (!raw) return null
        if (raw.startsWith('[') && raw.endsWith(']')) return { isSection: true, label: raw.slice(1, -1).trim(), id: `section-${index}` }
        const parts = raw.split('|').map((v) => strTrim(v))
        const label = parts[0] || ''
        const id = parts[1] || label || `choice-${index}`
        const possibleType = String(parts[2] || '').toUpperCase()
        const hasType = ['REPLY', 'URL', 'COPY', 'CALL'].includes(possibleType)
        const description = hasType ? (parts[3] || '') : (parts[2] || '')
        if (!label) return null
        return { isSection: false, label, id, description, buttonType: hasType ? possibleType : 'REPLY' }
      }
      const menuChoicesRaw = [
        ...(Array.isArray(msg?.choices) ? msg.choices : []),
        ...(Array.isArray(msg?.options) ? msg.options : []),
        ...(Array.isArray(msg?.sendPayload?.choices) ? msg.sendPayload.choices : []),
        ...(Array.isArray(content?.choices) ? content.choices : []),
        ...(Array.isArray(content?.options) ? content.options : []),
      ].map((v) => (typeof v === 'string' ? v : strTrim(v?.label || v?.text || v?.name || '')))
      const menuOptions = menuChoicesRaw
        .map((choice, index) => parseMenuChoice(choice, index))
        .filter(Boolean)

      const isMenuType = ['button', 'list', 'carousel'].includes(interactiveTypeRaw)
      if (isMenuType && menuOptions.length > 0) {
        return {
          kind: 'menu',
          menuType: interactiveTypeRaw,
          title: interactiveText || 'Mensagem interativa',
          listButton: interactiveListButton,
          options: menuOptions
        }
      }
      return null
    }
    // Eventos de voto sem opções não devem virar "mensagem nova" na timeline.
    if (pollLike && options.length === 0) return null
    const totalVotes = options.reduce((sum, item) => sum + Number(item.votes || 0), 0)
    const selectableCountRaw = Number(
      msg?.selectableCount ??
      content?.selectableCount ??
      pollCreation?.selectableCount ??
      pollSnapshot?.selectableCount ??
      1
    )
    const title = strTrim(
      content?.pollCreationMessage?.name ||
      content?.pollCreationMessage?.title ||
      content?.message?.pollCreationMessage?.name ||
      content?.message?.pollCreationMessage?.title ||
      contentText ||
      msg.text ||
      msg.body ||
      'Enquete'
    )
    return {
      kind: 'poll',
      title,
      options,
      totalVotes,
      pollId: extractPollId(),
      selectableCount: Number.isFinite(selectableCountRaw) && selectableCountRaw > 0 ? Math.floor(selectableCountRaw) : 1
    }
  }
  const interactive = parseInteractivePayload()

  const extractPollVoteEvent = () => {
    const parseDynamicNode = (raw) => {
      if (raw == null) return null
      if (typeof raw === 'object') return raw
      const text = strTrim(raw)
      if (!text) return null
      try { return JSON.parse(text) } catch { return null }
    }

    const voteNodes = [
      parseDynamicNode(msg?.vote),
      parseDynamicNode(content?.vote),
      parseDynamicNode(content?.pollVoteMessage),
      parseDynamicNode(content?.message?.pollVoteMessage),
      parseDynamicNode(content?.pollUpdateMessage),
      parseDynamicNode(content?.message?.pollUpdateMessage)
    ].flatMap((node) => Array.isArray(node) ? node : [node])
      .filter((node) => node && typeof node === 'object')
    if (!voteNodes.length) return null

    const pickPollId = () => {
      const candidates = [
        ...voteNodes.flatMap((vote) => [vote?.pollId, vote?.pollID, vote?.pollMessageId, vote?.pollMessageID, vote?.stanzaId, vote?.stanzaID]),
        content?.pollResultSnapshotMessage?.pollId,
        content?.pollResultSnapshotMessage?.pollID,
        content?.pollResultSnapshotMessage?.pollCreationMessageKey?.id,
        content?.pollResultSnapshotMessage?.stanzaId,
        content?.contextInfo?.stanzaId,
        content?.contextInfo?.stanzaID
      ]
      for (const c of candidates) {
        const n = normalizeProviderMessageId(c)
        if (n) return n
      }
      return ''
    }

    const selectedIndexesRaw = voteNodes.flatMap((vote) => [
      ...(Array.isArray(vote?.selectedIndexes) ? vote.selectedIndexes : [vote?.selectedIndexes]),
      ...(Array.isArray(vote?.selectedIndex) ? vote.selectedIndex : [vote?.selectedIndex]),
      ...(Array.isArray(vote?.selectedOptionIndexes) ? vote.selectedOptionIndexes : [vote?.selectedOptionIndexes]),
      ...(Array.isArray(vote?.optionIndexes) ? vote.optionIndexes : [vote?.optionIndexes])
    ])
    const selectedIndexes = (Array.isArray(selectedIndexesRaw) ? selectedIndexesRaw : [selectedIndexesRaw])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 0)

    const selectedLabelsRaw = voteNodes.flatMap((vote) => [
      ...(Array.isArray(vote?.selectedOptions) ? vote.selectedOptions : [vote?.selectedOptions]),
      ...(Array.isArray(vote?.selectedOption) ? vote.selectedOption : [vote?.selectedOption]),
      ...(Array.isArray(vote?.options) ? vote.options : [vote?.options]),
      ...(Array.isArray(vote?.optionNames) ? vote.optionNames : [vote?.optionNames])
    ])
    const selectedLabels = (Array.isArray(selectedLabelsRaw) ? selectedLabelsRaw : [selectedLabelsRaw])
      .map((item) => {
        if (typeof item === 'string') return strTrim(item)
        if (!item || typeof item !== 'object') return ''
        return strTrim(item.label || item.text || item.name || item.option || item.value || '')
      })
      .filter(Boolean)

    const selectedIdsRaw = voteNodes.flatMap((vote) => [
      ...(Array.isArray(vote?.selectedOptionIds) ? vote.selectedOptionIds : [vote?.selectedOptionIds]),
      ...(Array.isArray(vote?.selectedOptionID) ? vote.selectedOptionID : [vote?.selectedOptionID]),
      ...(Array.isArray(vote?.optionIds) ? vote.optionIds : [vote?.optionIds]),
      ...(Array.isArray(vote?.optionID) ? vote.optionID : [vote?.optionID]),
      ...(Array.isArray(vote?.votes) ? vote.votes : [vote?.votes]),
      vote?.selectedId,
      vote?.optionId,
      vote?.optionID
    ])
    const selectedIds = (Array.isArray(selectedIdsRaw) ? selectedIdsRaw : [selectedIdsRaw])
      .map((item) => {
        if (item == null) return ''
        if (typeof item === 'string' || typeof item === 'number') return strTrim(String(item))
        if (typeof item !== 'object') return ''
        return strTrim(item.id || item.optionId || item.optionID || item.value || item.hash || item.optionHash || '')
      })
      .filter(Boolean)

    const fallbackButtonOrListId = strTrim(msg?.buttonOrListid || msg?.buttonOrListId || '')
    if (fallbackButtonOrListId) selectedIds.push(fallbackButtonOrListId)

    const pollId = pickPollId()
    if (!pollId && selectedIndexes.length === 0 && selectedLabels.length === 0 && selectedIds.length === 0) return null
    return { pollId, selectedIndexes, selectedLabels, selectedIds: Array.from(new Set(selectedIds)) }
  }
  const pollVoteEvent = extractPollVoteEvent()
  const isPollVoteEvent = Boolean(pollVoteEvent)
  const isPollAuxEvent = hasPollSignals() && !interactive

  const sharedContactText = extractSharedContactText(msg)
  const rawContentText = contentText || sharedContactText
  const resolvedContentText = resolveMentionFn ? replaceMentionNumbersByNames(rawContentText, resolveMentionFn) : rawContentText

  let mediaLabel = ''
  if (!contentText) {
    if (isGif) mediaLabel = 'GIF'
    else if (isImage) mediaLabel = '📷 Imagem'
    else if (isVideo) mediaLabel = '🎥 Vídeo'
    else if (isAudio) mediaLabel = '🎵 Áudio'
    else if (isDocument) mediaLabel = ''
    else if (isSticker) mediaLabel = 'Figurinha'
    else if (isContactShare) mediaLabel = '👤 Contato compartilhado'
    else mediaLabel = 'Mensagem sem texto'
  }

  const senderDisplayName = resolveSenderName(msg, selectedChat)
  const status = String(msg.status || msg.messageStatus || '').trim().toLowerCase()
  const deliveryIndicator = status === 'read' ? '✓✓' : status === 'delivered' ? '✓✓' :
    (status === 'sent' || status === 'serverack') ? '✓' : (status === 'queued' || status === 'pending') ? '⏳' : ''

  const quoted = !isReaction && !isContactShare ? buildQuotedPreview(msg) : null
  const ctxForReply = !isReaction && !isContactShare ? extractContextInfoFromMessage(msg) : null
  const pqRoot = !isReaction && !isContactShare ? tryParseQuotedPayload(msg?.quoted) : null

  let replyParentMessageId = ''
  if (!isReaction && !isContactShare) {
    replyParentMessageId = normalizeProviderMessageId(
      msg.replyid || msg.replyId || msg.replyID || msg.quotedMessageId || msg.quotedmessageid ||
      msg.sendPayload?.replyid || msg.sendPayload?.replyId ||
      ctxForReply?.stanzaId || ctxForReply?.stanzaID || ctxForReply?.quotedMessageID ||
      ctxForReply?.quotedMessage?.key?.id || pqRoot?.stanzaId || pqRoot?.stanzaID ||
      pqRoot?.quotedMessageID || pqRoot?.quotedMessage?.key?.id || ''
    )
  }

  return {
    ...msg, content,
    id: msg.id || msg.messageid || `${msg.chatid || 'chat'}-${msg.messageTimestamp || Date.now()}`,
    messageid: msg.messageid || '',
    type: type || 'text',
    fromMe: Boolean(msg.fromMe),
    text: (isReaction || interactive?.kind === 'poll' || isPollVoteEvent || isPollAuxEvent) ? '' : (isContactShare ? '' : (resolvedContentText || mediaLabel)),
    timestamp: normalizeTimestampToMs(msg.timestamp || msg.messageTimestamp || msg.time),
    mediaUrl, isMedia,
    mediaType: isVideo ? 'video' : isSticker ? 'sticker' : (isGif || isImage) ? 'image' : isAudio ? 'audio' : isDocument ? 'document' : 'other',
    documentFileName,
    documentSizeBytes: Number.isFinite(documentSizeBytes) && documentSizeBytes > 0 ? documentSizeBytes : 0,
    isReaction, reactionEmoji, reactionTargetId: normalizedReactionTargetId,
    normalizedMessageId: normalizeProviderMessageId(msg.messageid || msg.id),
    normalizedInternalId: normalizeProviderMessageId(msg.id),
    senderDisplayName: String(senderDisplayName || '').trim(),
    status, deliveryIndicator, isContactShare, sharedContact, isEdited: hasEditedInPayload(),
    quoted, replyParentMessageId, interactive, pollVoteEvent, isPollVoteEvent, isPollAuxEvent
  }
}

// ─── Quoted preview ───────────────────────────────────────────────────────────

const extractContextInfoFromContent = (content) => {
  if (!content || typeof content !== 'object') return null
  const nested = [
    content.extendedTextMessage?.contextInfo,
    content.ephemeralMessage?.message?.extendedTextMessage?.contextInfo,
    content.viewOnceMessage?.message?.extendedTextMessage?.contextInfo,
    content.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo,
    content.editedMessage?.message?.extendedTextMessage?.contextInfo,
    content.protocolMessage?.editedMessage?.message?.extendedTextMessage?.contextInfo,
    content.imageMessage?.contextInfo, content.videoMessage?.contextInfo,
    content.audioMessage?.contextInfo, content.documentMessage?.contextInfo, content.contextInfo
  ]
  return nested.find(Boolean) || null
}

export const extractContextInfoFromMessage = (msg) => {
  if (!msg || typeof msg !== 'object') return null
  const rawC = msg.content ?? msg.Content
  const c = rawC && typeof rawC === 'object' ? rawC : typeof rawC === 'string' ? tryParseQuotedPayload(rawC) || null : null
  const fromContent = c ? extractContextInfoFromContent(c) : null
  if (fromContent) return fromContent
  if (msg.contextInfo && typeof msg.contextInfo === 'object') return msg.contextInfo
  if (msg.ContextInfo && typeof msg.ContextInfo === 'object') return msg.ContextInfo
  const pq = tryParseQuotedPayload(msg.quoted)
  if (!pq || typeof pq !== 'object') return null
  if (pq.contextInfo && typeof pq.contextInfo === 'object') return pq.contextInfo
  if (pq.quotedMessage || pq.stanzaId || pq.stanzaID || pq.quotedMessageID) return pq
  return null
}

const describeQuotedInner = (qmRaw) => {
  if (!qmRaw || typeof qmRaw !== 'object') return null
  let qm = qmRaw
  const inner = qm.message
  if (inner && typeof inner === 'object') {
    const hasLeaf = qm.conversation || qm.extendedTextMessage || qm.imageMessage || qm.videoMessage ||
      qm.audioMessage || qm.documentMessage || qm.stickerMessage || qm.contactMessage
    if (!hasLeaf) qm = inner
  }
  const em = qm.ephemeralMessage?.message
  if (em) return describeQuotedInner(em)
  const vo = qm.viewOnceMessage?.message || qm.viewOnceMessageV2?.message
  if (vo) return describeQuotedInner(vo)
  const conv = strTrim(qm.conversation)
  if (conv) return { kind: 'text', body: conv, thumb: '', mediaShortLabel: '' }
  const ext = strTrim(qm.extendedTextMessage?.text)
  if (ext) return { kind: 'text', body: ext, thumb: '', mediaShortLabel: '' }

  const quotedMediaUrl = strTrim(
    qm.imageMessage?.url || qm.imageMessage?.fileUrl ||
    qm.videoMessage?.url || qm.videoMessage?.fileUrl ||
    qm.stickerMessage?.url || qm.stickerMessage?.fileUrl || ''
  )

  if (qm.imageMessage) {
    const im = qm.imageMessage
    const thumb = bytesToJpegDataUrl(im.jpegThumbnail) || bytesToJpegDataUrl(im.thumbnail) || extractUazapiJpegThumbDataUrl({ imageMessage: im }) || quotedMediaUrl || ''
    return { kind: 'image', body: '', thumb, mediaShortLabel: 'Foto' }
  }
  if (qm.videoMessage) {
    const thumb = bytesToJpegDataUrl(qm.videoMessage.jpegThumbnail) || quotedMediaUrl || ''
    return { kind: 'video', body: '', thumb, mediaShortLabel: 'Vídeo' }
  }
  if (qm.audioMessage || qm.pttMessage) return { kind: 'audio', body: '', thumb: '', mediaShortLabel: 'Áudio' }
  if (qm.documentMessage) return { kind: 'document', body: '', thumb: '', mediaShortLabel: strTrim(qm.documentMessage.fileName) || 'Documento' }
  if (qm.stickerMessage) {
    const thumb = bytesToJpegDataUrl(qm.stickerMessage.jpegThumbnail || qm.stickerMessage.pngThumbnail) || quotedMediaUrl || ''
    return { kind: 'sticker', body: '', thumb, mediaShortLabel: 'Figurinha' }
  }
  if (qm.contactMessage || qm.contactsArrayMessage) return { kind: 'contact', body: '', thumb: '', mediaShortLabel: 'Contato' }
  if (qm.locationMessage) return { kind: 'other', body: '', thumb: '', mediaShortLabel: 'Localização' }
  return { kind: 'other', body: '', thumb: '', mediaShortLabel: 'Mensagem' }
}

const buildQuotedPreview = (msg) => {
  const ctx = extractContextInfoFromMessage(msg)
  const payloadQuoted = tryParseQuotedPayload(msg?.quoted)
  const ctxQuoted = ctx?.quotedMessage
  const fallbackQuoted =
    payloadQuoted?.quotedMessage ||
    payloadQuoted?.message ||
    payloadQuoted?.Message ||
    payloadQuoted ||
    null

  const quotedNode = ctxQuoted || fallbackQuoted
  if (!quotedNode) return null
  const described = describeQuotedInner(quotedNode)
  if (!described) return null

  const key = ctx?.quotedMessage?.key || payloadQuoted?.key || payloadQuoted?.quotedMessage?.key
  if (key?.fromMe) return { authorName: 'Você', kind: described.kind, textPreview: described.kind === 'text' ? described.body : '', mediaLabel: described.kind === 'text' ? '' : described.mediaShortLabel || 'Mensagem', thumbDataUrl: described.thumb || '' }

  const chatJid = normalizeJid(selectedChat.value?.chatJid || '')
  const isGroupChatOpen = Boolean(selectedChat.value?.isGroup) || chatJid.endsWith('@g.us')
  const selectedChatKeys = buildLookupKeys(chatJid)
  const selectedContactName = pickNameFromDirectory(contactsDirectory.value, selectedChatKeys)
  const selectedDisplayName = String(selectedContactName || selectedChat.value?.pushName || selectedChat.value?.name || '').trim()

  if (!isGroupChatOpen && selectedDisplayName) {
    return { authorName: selectedDisplayName, kind: described.kind, textPreview: described.kind === 'text' ? described.body : '', mediaLabel: described.kind === 'text' ? '' : described.mediaShortLabel || 'Mensagem', thumbDataUrl: described.thumb || '' }
  }

  const sanitize = (value) => {
    const v = String(value || '').trim()
    if (!v || v.includes('@') || v.replace(/[+\s()-]/g, '').match(/^\d{8,}$/)) return ''
    return v
  }

  const candidateJids = Array.from(new Set(
    [ctx?.participant, ctx?.participantPn, ctx?.participantLid, ctx?.quotedMessage?.participant,
      ctx?.quotedMessage?.participantPn, ctx?.quotedMessage?.participantLid,
      key?.participant, key?.participantPn, key?.participantLid, ctx?.remoteJid, key?.remoteJid]
      .map((v) => normalizeJid(v)).filter(Boolean)
  ))

  for (const participant of candidateJids) {
    const keys = buildLookupKeys(participant)
    const fromDir = pickNameFromDirectory(contactsDirectory.value, keys) ||
      (isGroupChatOpen ? (pickNameFromDirectory(groupParticipantsDirectory.value, keys) || pickNameFromDirectory(groupParticipantsByJid.value, keys) || pickNameFromDirectory(groupParticipantsByLid.value, keys)) : '') ||
      pickNameFromDirectory(observedSenderDirectory.value, keys)
    if (fromDir) return { authorName: fromDir, kind: described.kind, textPreview: described.kind === 'text' ? described.body : '', mediaLabel: described.kind === 'text' ? '' : described.mediaShortLabel || 'Mensagem', thumbDataUrl: described.thumb || '' }
  }

  const hintedName = !isGroupChatOpen
    ? (
      sanitize(ctx?.quotedMessage?.pushName) ||
      sanitize(ctx?.quotedMessage?.participantName) ||
      sanitize(payloadQuoted?.pushName) ||
      sanitize(payloadQuoted?.participantName) ||
      sanitize(ctx?.participantName) ||
      sanitize(ctx?.pushName)
    )
    : ''

  const authorName = hintedName || String(selectedChat.value?.name || selectedChat.value?.pushName || '').trim() || 'Contato'
  return { authorName, kind: described.kind, textPreview: described.kind === 'text' ? described.body : '', mediaLabel: described.kind === 'text' ? '' : described.mediaShortLabel || 'Mensagem', thumbDataUrl: described.thumb || '' }
}

export const hydrateQuotedFromThread = (list) => {
  if (!Array.isArray(list) || list.length === 0) return list
  const byNorm = new Map()
  const remember = (m) => {
    for (const k of [normalizeProviderMessageId(m.messageid), normalizeProviderMessageId(m.id), m.normalizedMessageId, m.normalizedInternalId].filter(Boolean)) {
      if (!byNorm.has(k)) byNorm.set(k, m)
    }
  }
  for (const m of list) remember(m)

  const findParent = (pid) => {
    const n = normalizeProviderMessageId(pid)
    if (!n) return null
    if (byNorm.has(n)) return byNorm.get(n)
    for (const m of list) {
      const cands = [normalizeProviderMessageId(m.messageid), normalizeProviderMessageId(m.id), m.normalizedMessageId, m.normalizedInternalId]
      if (cands.some((c) => c && (c === n || c.endsWith(n) || n.endsWith(c)))) return m
    }
    return null
  }

  return list.map((m) => {
    if (!m.replyParentMessageId) return m
    const parent = findParent(m.replyParentMessageId)
    if (!parent) return m
    const authorName = parent.fromMe ? 'Você'
      : resolveSenderName(parent, selectedChat) ||
        String(parent.senderDisplayName || '').trim() ||
        formatJidAsPhoneLine(getMessageSenderJid(parent)) || 'Contato'

    const t = String(parent.type || '').toLowerCase()
    const thumb = parent.mediaUrl || (parent.mediaType === 'video' ? extractUazapiJpegThumbDataUrl(parent.content) : '') || ''
    const fq = parent.mediaType === 'image' ? { authorName, kind: 'image', textPreview: '', mediaLabel: 'Foto', thumbDataUrl: thumb }
      : parent.mediaType === 'video' ? { authorName, kind: 'video', textPreview: '', mediaLabel: 'Vídeo', thumbDataUrl: thumb }
      : parent.mediaType === 'audio' || t.includes('audio') || t.includes('ptt') ? { authorName, kind: 'audio', textPreview: '', mediaLabel: 'Áudio', thumbDataUrl: '' }
      : (t.includes('sticker') || parent.mediaType === 'sticker') ? { authorName, kind: 'sticker', textPreview: '', mediaLabel: 'Figurinha', thumbDataUrl: thumb }
      : t.includes('document') || parent.mediaType === 'document' ? { authorName, kind: 'document', textPreview: '', mediaLabel: 'Documento', thumbDataUrl: '' }
      : strTrim(parent.text || '') ? { authorName, kind: 'text', textPreview: strTrim(parent.text || '').slice(0, 500), mediaLabel: '', thumbDataUrl: '' }
      : { authorName, kind: 'other', textPreview: '', mediaLabel: 'Mensagem', thumbDataUrl: '' }

    if (!m.quoted) return { ...m, quoted: fq }
    const hadThumb = Boolean(strTrim(m.quoted.thumbDataUrl || ''))
    return {
      ...m,
      quoted: { ...m.quoted, authorName: fq.authorName || m.quoted.authorName, thumbDataUrl: hadThumb ? m.quoted.thumbDataUrl : strTrim(fq.thumbDataUrl || '') || m.quoted.thumbDataUrl, kind: m.quoted.kind || fq.kind, textPreview: m.quoted.textPreview || fq.textPreview, mediaLabel: m.quoted.mediaLabel || fq.mediaLabel }
    }
  })
}

// ─── parseInlineReactionsFromMessage ─────────────────────────────────────────

export const parseInlineReactionsFromMessage = (msg) => {
  if (!msg || typeof msg !== 'object' || msg.isReaction) return []
  let raw = msg.reactions || msg.Reactions || msg.reactionList || msg.reactionSummary || msg.reaction_summaries || msg.wa_reactions
  const makeSimpleSummary = (emoji) => [{
    reactorKey: `uazapi-reaction:${msg.id}`, emoji, fromMe: false, senderLabel: 'Reação', senderJid: '', timestamp: msg.timestamp || 0
  }]

  if (raw == null || raw === '') {
    const ro = msg.reaction
    if (ro && typeof ro === 'object') {
      const em = strTrim(ro.emoji || ro.text || ro.unicode || ro.reaction || ro.Emoji || '')
      if (em && looksLikeEmojiSummaryField(em)) {
        const fromApiMe = Boolean(ro.fromMe ?? ro.isFromMe ?? ro.self)
        const jid = normalizeJid(ro.participant || ro.sender || ro.author || ro.jid)
        const keys = buildLookupKeys(jid)
        const senderLabel = fromApiMe ? 'Você'
          : String(ro.displayName || ro.name || ro.pushName || '').trim() ||
            pickNameFromDirectory(contactsDirectory.value, keys) ||
            pickNameFromDirectory(groupParticipantsDirectory.value, keys) ||
            formatJidAsPhoneLine(jid) || 'Contato'
        return [{ reactorKey: jid ? `jid:${jid}` : `uazapi-reaction-obj:${msg.id}`, emoji: em, fromMe: fromApiMe, senderLabel, senderJid: jid, timestamp: normalizeTimestampToMs(ro.timestamp || ro.time) || msg.timestamp || 0 }]
      }
    }
    const summ = typeof msg.reaction === 'string' ? strTrim(msg.reaction) : ''
    if (summ && looksLikeEmojiSummaryField(summ)) return makeSimpleSummary(summ)
    return []
  }

  if (typeof raw === 'string') {
    const s = strTrim(raw)
    if (!s) { const summ = typeof msg.reaction === 'string' ? strTrim(msg.reaction) : ''; if (summ && looksLikeEmojiSummaryField(summ)) return makeSimpleSummary(summ); return [] }
    try { raw = JSON.parse(s) } catch { if (looksLikeEmojiSummaryField(s)) return makeSimpleSummary(s); return [] }
  }
  if (!Array.isArray(raw)) { if (raw && typeof raw === 'object') raw = raw.items || raw.list || raw.rows || raw.data || [raw]; else return [] }
  if (!Array.isArray(raw)) return []

  const out = []
  let idx = 0
  for (const row of raw) {
    idx++
    if (row == null) continue
    if (typeof row === 'string') { const em = strTrim(row); if (em) out.push({ reactorKey: `srv:${msg.id}:s:${idx}`, emoji: em, fromMe: false, senderLabel: 'Contato', senderJid: '', timestamp: msg.timestamp || 0 }); continue }
    if (typeof row !== 'object') continue
    const em = strTrim(row.emoji || row.text || row.reaction || row.Emoji || row.unicode)
    if (!em) continue
    const fromApiMe = Boolean(row.fromMe ?? row.isFromMe ?? row.self)
    const jid = normalizeJid(row.participant || row.sender || row.author || row.jid)
    const keys = buildLookupKeys(jid)
    const senderLabel = fromApiMe ? 'Você'
      : String(row.displayName || row.name || row.pushName || '').trim() ||
        pickNameFromDirectory(contactsDirectory.value, keys) ||
        pickNameFromDirectory(groupParticipantsDirectory.value, keys) ||
        pickNameFromDirectory(groupParticipantsByJid.value, keys) ||
        pickNameFromDirectory(groupParticipantsByLid.value, keys) ||
        formatJidAsPhoneLine(jid) || 'Contato'
    out.push({ reactorKey: jid ? `jid:${jid}` : `srv:${msg.id}:o:${idx}`, emoji: em, fromMe: fromApiMe, senderLabel, senderJid: jid, timestamp: normalizeTimestampToMs(row.timestamp || row.time) || msg.timestamp || 0 })
  }
  if (!out.length) { const summ = typeof msg.reaction === 'string' ? strTrim(msg.reaction) : ''; if (summ && looksLikeEmojiSummaryField(summ)) out.push({ reactorKey: `uazapi-reaction:${msg.id}`, emoji: summ, fromMe: false, senderLabel: 'Reação', senderJid: '', timestamp: msg.timestamp || 0 }) }
  return out
}

// ─── attachReactionsToMessages ────────────────────────────────────────────────

const rawReactionPayloadScore = (m) => {
  if (!m || typeof m !== 'object') return 0
  let s = 0
  if (Array.isArray(m.reactions) && m.reactions.length) s += 800
  const list = m.reactions || m.Reactions || m.reactionList
  if (Array.isArray(list)) s += list.length * 60
  if (list && typeof list === 'object' && !Array.isArray(list)) s += 40
  const r = m.reaction
  if (typeof r === 'string' && strTrim(r)) s += 50
  if (r && typeof r === 'object') s += 55
  const c = m.content
  if (c?.reactionMessage || c?.ReactionMessage) s += 70
  return s
}

export const pickRicherDuplicateBaseMessage = (prev, next) => {
  const prevPoll = prev?.interactive?.kind === 'poll' ? prev.interactive : null
  const nextPoll = next?.interactive?.kind === 'poll' ? next.interactive : null
  if (prevPoll || nextPoll) {
    const prevOptLen = Array.isArray(prevPoll?.options) ? prevPoll.options.length : 0
    const nextOptLen = Array.isArray(nextPoll?.options) ? nextPoll.options.length : 0
    const prevVotes = Number(prevPoll?.totalVotes || 0)
    const nextVotes = Number(nextPoll?.totalVotes || 0)
    if (nextOptLen !== prevOptLen) return nextOptLen > prevOptLen ? next : prev
    if (nextVotes !== prevVotes) return nextVotes > prevVotes ? next : prev
  }
  const sp = rawReactionPayloadScore(prev), sn = rawReactionPayloadScore(next)
  if (sn !== sp) return sn > sp ? next : prev
  const tp = strTrim(prev.text || '').length, tn = strTrim(next.text || '').length
  if (tn !== tp) return tn > tp ? next : prev
  return (next.timestamp || 0) >= (prev.timestamp || 0) ? next : prev
}

export const getMessageMergeKey = (msg) => {
  if (!msg || typeof msg !== 'object') return `unknown:${String(msg?.id || '')}`
  if (msg?.interactive?.kind === 'poll') {
    const pollId = normalizeProviderMessageId(msg?.interactive?.pollId || '')
    if (pollId) return `poll:${pollId}`
  }
  if (msg.isReaction) {
    const tid = normalizeProviderMessageId(msg.reactionTargetId || '')
    const em = String(msg.reactionEmoji || '').slice(0, 16)
    const rid = normalizeProviderMessageId(msg.messageid || msg.id || '')
    const rJid = normalizeJid(getMessageSenderJid(msg))
    return `reaction:${tid}:${rid}:${msg.fromMe ? 1 : 0}:${rJid}:${msg.timestamp}:${em}`
  }
  const baseId = normalizeProviderMessageId(msg.messageid || msg.id || '')
  return baseId ? `base:${baseId}` : `base:id:${msg.id}`
}

const dedupeSameProviderMessageId = (items) => {
  const byKey = new Map()
  const idRedirect = new Map()
  for (const msg of items) {
    const mid = strTrim(msg.messageid)
    const key = mid ? strTrim(msg.normalizedMessageId || mid) : null
    const mapKey = key || `__local__${msg.id}`
    const existing = byKey.get(mapKey)
    if (!existing) { byKey.set(mapKey, msg); continue }
    const better = msg.timestamp !== existing.timestamp ? msg.timestamp > existing.timestamp
      : String(msg.text || '').length >= String(existing.text || '').length
    if (better) { idRedirect.set(existing.id, msg.id); byKey.set(mapKey, msg) }
    else idRedirect.set(msg.id, existing.id)
  }
  return { list: Array.from(byKey.values()), idRedirect }
}

const removeRedundantEditPrefixes = (sorted) => {
  const toDrop = new Set()
  const idRedirect = new Map()
  const maxGapMs = 40 * 60 * 1000
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j]
      if (a.fromMe !== b.fromMe || toDrop.has(a.id)) continue
      const at = strTrim(a.text || ''), bt = strTrim(b.text || '')
      if (!at || !bt || bt.length <= at.length || b.timestamp - a.timestamp > maxGapMs) continue
      if (bt.startsWith(at)) { toDrop.add(a.id); idRedirect.set(a.id, b.id) }
    }
  }
  return { list: sorted.filter((m) => !toDrop.has(m.id)), idRedirect }
}

const pickOptimisticReactionForMessage = (m, snap) => {
  if (!snap || typeof snap !== 'object') return null
  const keys = [m.normalizedMessageId, m.normalizedInternalId, normalizeProviderMessageId(m.messageid || m.id || ''), normalizeProviderMessageId(m.id || ''), String(m.messageid || '').trim(), String(m.id || '').trim()].filter(Boolean)
  for (const k of keys) {
    const hit = snap[k]
    if (hit && typeof hit === 'object' && strTrim(String(hit.emoji || ''))) return hit
    const nk = normalizeProviderMessageId(k)
    const hit2 = nk ? snap[nk] : null
    if (hit2 && typeof hit2 === 'object' && strTrim(String(hit2.emoji || ''))) return hit2
  }
  return null
}

export const attachReactionsToMessages = (items) => {
  const normalizedItems = items.map((item) => normalizeMessage(item))
  const baseMessages = normalizedItems.filter((item) => !item.isReaction && !item.isPollVoteEvent && !item.isPollAuxEvent)
  const reactions = normalizedItems.filter((item) => item.isReaction)
  const pollVoteEvents = normalizedItems.filter((item) => item.isPollVoteEvent && item.pollVoteEvent)
  const byId = new Map()

  const d1 = dedupeSameProviderMessageId(baseMessages)
  const byTime = d1.list.sort((a, b) => a.timestamp - b.timestamp)
  const d2 = removeRedundantEditPrefixes(byTime)
  const dedupedBase = d2.list
  const idRedirect = new Map([...d1.idRedirect, ...d2.idRedirect])

  for (const msg of dedupedBase) {
    const message = { ...msg, reactionEmoji: '', reactions: [...parseInlineReactionsFromMessage(msg)] }
    const providerId = msg.normalizedMessageId, internalId = msg.normalizedInternalId
    const pollId = normalizeProviderMessageId(msg?.interactive?.pollId || '')
    if (providerId) byId.set(providerId, message)
    if (internalId) byId.set(internalId, message)
    if (pollId) byId.set(pollId, message)
    if (!providerId && !internalId) byId.set(String(msg.id || ''), message)
  }

  for (const [dropped, kept] of idRedirect) {
    const keptMsg = dedupedBase.find((m) => m.id === kept)
    if (!keptMsg) continue
    const target = (keptMsg.normalizedMessageId && byId.get(keptMsg.normalizedMessageId)) || (keptMsg.normalizedInternalId && byId.get(keptMsg.normalizedInternalId)) || { ...keptMsg, reactionEmoji: '', reactions: [...parseInlineReactionsFromMessage(keptMsg)] }
    if (dropped) byId.set(dropped, target)
  }

  const resolvePollTarget = (event) => {
    const pollId = normalizeProviderMessageId(event?.pollVoteEvent?.pollId || '')
    if (pollId && byId.has(pollId)) return byId.get(pollId)
    if (pollId) {
      for (const [key, val] of byId.entries()) {
        if (!key) continue
        if (key === pollId || key.endsWith(pollId) || pollId.endsWith(key)) return val
      }
    }
    const replyId = normalizeProviderMessageId(event?.replyParentMessageId || '')
    if (replyId && byId.has(replyId)) return byId.get(replyId)
    return null
  }

  for (const voteEvent of pollVoteEvents) {
    const target = resolvePollTarget(voteEvent)
    if (!target || target?.interactive?.kind !== 'poll' || !Array.isArray(target?.interactive?.options)) continue
    const selectedIndexes = Array.isArray(voteEvent.pollVoteEvent?.selectedIndexes) ? voteEvent.pollVoteEvent.selectedIndexes : []
    const selectedLabels = Array.isArray(voteEvent.pollVoteEvent?.selectedLabels) ? voteEvent.pollVoteEvent.selectedLabels : []
    const selectedIds = Array.isArray(voteEvent.pollVoteEvent?.selectedIds) ? voteEvent.pollVoteEvent.selectedIds : []
    const senderJid = normalizeJid(getMessageSenderJid(voteEvent))
    const voterKey = voteEvent.fromMe ? '__me__' : (senderJid ? `jid:${senderJid}` : `id:${voteEvent.id}`)
    const voterName = voteEvent.fromMe
      ? 'Você'
      : String(resolveSenderName(voteEvent, selectedChat) || '').trim() || formatJidAsPhoneLine(senderJid) || 'Contato'

    if (!target.interactive.__voterSelections || typeof target.interactive.__voterSelections !== 'object') {
      target.interactive.__voterSelections = {}
    }
    if (!target.interactive.__voterDirectory || typeof target.interactive.__voterDirectory !== 'object') {
      target.interactive.__voterDirectory = {}
    }
    if (!target.interactive.__voterMeta || typeof target.interactive.__voterMeta !== 'object') {
      target.interactive.__voterMeta = {}
    }
    target.interactive.__voterDirectory[voterKey] = voterName
    target.interactive.__voterMeta[voterKey] = { name: voterName, jid: senderJid || '' }

    const currentSelections = Array.isArray(target.interactive.__voterSelections[voterKey])
      ? target.interactive.__voterSelections[voterKey]
      : []
    for (const oldIdx of currentSelections) {
      const oldOption = target.interactive.options[oldIdx]
      if (!oldOption) continue
      oldOption.voters = (Array.isArray(oldOption.voters) ? oldOption.voters : []).filter((key) => key !== voterKey)
    }

    const targetIndicesSet = new Set()
    for (const idx of selectedIndexes) {
      if (Number.isFinite(idx) && idx >= 0 && idx < target.interactive.options.length) targetIndicesSet.add(idx)
    }
    for (const label of selectedLabels) {
      const normalized = strTrim(label).toLowerCase()
      if (!normalized) continue
      const idx = target.interactive.options.findIndex((opt) => strTrim(opt?.label || '').toLowerCase() === normalized)
      if (idx >= 0) targetIndicesSet.add(idx)
    }
    for (const optionIdRaw of selectedIds) {
      const optionId = strTrim(optionIdRaw)
      if (!optionId) continue
      const idx = target.interactive.options.findIndex((opt) => strTrim(opt?.optionId || '') === optionId)
      if (idx >= 0) targetIndicesSet.add(idx)
    }
    const targetIndices = Array.from(targetIndicesSet)
    target.interactive.__voterSelections[voterKey] = targetIndices

    for (const idx of targetIndices) {
      const option = target.interactive.options[idx]
      if (!option) continue
      if (!Array.isArray(option.voters)) option.voters = []
      if (!option.voters.includes(voterKey)) option.voters.push(voterKey)
    }
  }

  for (const msg of byId.values()) {
    if (!msg?.interactive || msg.interactive.kind !== 'poll' || !Array.isArray(msg.interactive.options)) continue
    const voterDirectory = msg.interactive.__voterDirectory || {}
    const voterMeta = msg.interactive.__voterMeta || {}
    for (const option of msg.interactive.options) {
      const voterKeys = Array.isArray(option?.voters) ? option.voters : []
      const knownNames = Array.isArray(option?.voterNames) ? option.voterNames.map((n) => strTrim(n)).filter(Boolean) : []
      const directoryNames = voterKeys.map((key) => String(voterDirectory[key] || '').trim()).filter(Boolean)
      option.voterNames = Array.from(new Set([...knownNames, ...directoryNames]))
      const parsedEntries = Array.isArray(option?.voterEntries) ? option.voterEntries : []
      const mappedEntries = voterKeys.map((key) => {
        const meta = voterMeta[key] || null
        const jid = normalizeJid(meta?.jid || '')
        const name = strTrim(meta?.name || voterDirectory[key] || '')
        return { key, name: name || formatJidAsPhoneLine(jid) || 'Contato', jid }
      })
      const uniqueEntries = new Map()
      for (const entry of [...parsedEntries, ...mappedEntries]) {
        const key = strTrim(entry?.key || '')
        if (!key) continue
        if (!uniqueEntries.has(key)) uniqueEntries.set(key, entry)
      }
      option.voterEntries = Array.from(uniqueEntries.values())
      option.votes = Math.max(Number(option?.votes || 0), voterKeys.length)
    }
    msg.interactive.totalVotes = msg.interactive.options.reduce((sum, opt) => sum + Number(opt?.votes || 0), 0)
  }

  const reactionEvents = [...reactions].sort((a, b) => a.timestamp - b.timestamp)
  for (const reaction of reactionEvents) {
    let tid = normalizeProviderMessageId(reaction.reactionTargetId)
    if (!tid) continue
    const seen = new Set()
    while (idRedirect.has(tid) && !seen.has(tid)) { seen.add(tid); tid = idRedirect.get(tid) }
    let target = byId.get(tid)
    if (!target && tid) {
      for (const [key, val] of byId.entries()) {
        if (!key) continue
        if (key === tid || key.endsWith(tid) || tid.endsWith(key)) { target = val; break }
      }
    }
    if (!target) continue
    if (!Array.isArray(target.reactions)) target.reactions = []
    const emoji = strTrim(reaction.reactionEmoji)
    const rkey = reaction.fromMe ? '__me__' : (getMessageSenderJid(reaction) ? `jid:${getMessageSenderJid(reaction)}` : `id:${reaction.id}`)
    if (!emoji) { target.reactions = target.reactions.filter((row) => row.reactorKey !== rkey); continue }
    const senderLabel = reaction.fromMe ? 'Você' : String(resolveSenderName(reaction, selectedChat) || '').trim() || formatJidAsPhoneLine(getMessageSenderJid(reaction)) || 'Contato'
    const row = { reactorKey: rkey, emoji, fromMe: Boolean(reaction.fromMe), senderLabel, senderJid: getMessageSenderJid(reaction), timestamp: reaction.timestamp }
    const ix = target.reactions.findIndex((r) => r.reactorKey === rkey)
    if (ix >= 0) target.reactions[ix] = row; else target.reactions.push(row)
  }

  const mergeReactionRowsDistinct = (ra, rb) => {
    const a = Array.isArray(ra) ? [...ra] : [], b = Array.isArray(rb) ? [...rb] : []
    const out = [...a], seen = new Set(a.map((x) => `${x.reactorKey}::${strTrim(x.emoji)}`))
    for (const row of b) { const k = `${row.reactorKey}::${strTrim(row.emoji)}`; if (!seen.has(k)) { seen.add(k); out.push(row) } }
    return out.sort((x, y) => (x.timestamp || 0) - (y.timestamp || 0))
  }

  const unique = new Map()
  for (const m of byId.values()) {
    if (!m?.id) continue
    const cur = unique.get(m.id)
    if (!cur) { unique.set(m.id, m); continue }
    if (cur === m) continue
    const mLen = m.reactions?.length || 0, cLen = cur.reactions?.length || 0
    const chosen = mLen > cLen ? m : cLen > mLen ? cur : m.timestamp >= cur.timestamp ? m : cur
    const other = chosen === m ? cur : m
    const rx = mergeReactionRowsDistinct(chosen.reactions, other.reactions)
    unique.set(m.id, { ...chosen, text: strTrim(chosen.text || '') || strTrim(other.text || '') || chosen.text, reactions: rx, reactionEmoji: rx.length ? rx[rx.length - 1].emoji : '' })
  }

  const list = Array.from(unique.values()).sort((a, b) => a.timestamp - b.timestamp)
    .filter((msg) => {
      const isPlaceholderOnly = strTrim(msg?.text || '').toLowerCase() === 'mensagem sem texto'
      if (!isPlaceholderOnly) return true
      if (msg?.isMedia || msg?.isContactShare || msg?.interactive || msg?.isReaction) return true
      return false
    })
  const optSnap = optimisticReactionsByNormalizedId.value

  for (const m of list) {
    if (!Array.isArray(m.reactions)) m.reactions = []
    m.reactions = m.reactions.filter((r) => {
      if (r.reactorKey !== 'opt:local-me') return true
      return !m.reactions.some((x) => x !== r && x.fromMe && strTrim(x.emoji) === strTrim(r.emoji) && x.reactorKey !== 'opt:local-me')
    })
    const optEntry = pickOptimisticReactionForMessage(m, optSnap)
    if (optEntry && strTrim(String(optEntry.emoji || ''))) {
      const em = strTrim(String(optEntry.emoji))
      const hasServerDup = m.reactions.some((r) => r.fromMe && strTrim(r.emoji) === em && r.reactorKey !== 'opt:local-me')
      if (!hasServerDup) {
        const row = { reactorKey: 'opt:local-me', emoji: em, fromMe: true, senderLabel: 'Você', senderJid: '', timestamp: Number(optEntry.ts) || Date.now() }
        const ix = m.reactions.findIndex((r) => r.reactorKey === 'opt:local-me')
        if (ix >= 0) m.reactions[ix] = row; else m.reactions.push(row)
      }
    }
    if (Array.isArray(m.reactions)) { m.reactions.sort((a, b) => a.timestamp - b.timestamp); m.reactionEmoji = m.reactions.length ? m.reactions[m.reactions.length - 1].emoji : '' }
    else { m.reactions = []; m.reactionEmoji = '' }
  }

  return list
}

// ─── Computed renderedMessages ────────────────────────────────────────────────

import {
  contactsDirectory as _cd, groupParticipantsDirectory as _gpd, groupParticipantsByJid as _gpj,
  groupParticipantsByLid as _gpl, observedSenderDirectory as _osd, unknownProfilesDirectory as _upd,
  lidToJidMap as _ltm, senderAvatarDirectory as _sad
} from './useWhatsappState.js'

export const renderedMessages = computed(() => {
  // Lê versões das dependências para disparar reatividade quando diretórios mudam
  void Object.keys(_cd.value).length
  void Object.keys(_gpd.value).length
  void Object.keys(_gpj.value).length
  void Object.keys(_gpl.value).length
  void Object.keys(_osd.value).length
  void Object.keys(_upd.value).length
  void Object.keys(_ltm.value).length
  void Object.keys(_sad.value || {}).length
  void optimisticReactionsByNormalizedId.value
  return hydrateQuotedFromThread(attachReactionsToMessages(messages.value))
})

// ─── Display helpers ──────────────────────────────────────────────────────────

export const reactionEmojiDisplaysInPill = (emoji) => {
  const t = strTrim(String(emoji || ''))
  if (!t || t.length > 20) return false
  if (/^[\dA-Fa-f:.@/_-]{8,}$/.test(t)) return false
  try { if (/\p{Extended_Pictographic}/u.test(t)) return true } catch { }
  if (/[\u203C-\u3299\u2600-\u27BF\u2660-\u2668\u200d\ufe0f]/.test(t)) return true
  return t.length <= 6 && /[^\s\x00-\x7F]/.test(t)
}

export const getReactionPillEmojis = (msg) => {
  const rows = msg?.reactions || []
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const e = r.emoji
    if (!reactionEmojiDisplaysInPill(e) || seen.has(e)) continue
    seen.add(e)
    out.push(e)
    if (out.length >= 3) break
  }
  return out
}

export const hasRenderableReactionPill = (msg) => {
  const rows = msg?.reactions
  if (!Array.isArray(rows) || rows.length === 0) return false
  return rows.some((r) => reactionEmojiDisplaysInPill(r?.emoji))
}

export const showReactionPillCount = (msg) => (msg?.reactions?.length || 0) > 1

export const isAutoMediaLabelText = (text) => {
  const t = strTrim(String(text || '')).toLowerCase()
  return ['gif', 'figurinha', '📷 imagem', '🎥 vídeo', '🎵 áudio', '📄 documento', 'mensagem sem texto'].includes(t)
}

export const shouldHideAutoMediaLabelInBubble = (msg) => {
  if (!msg?.isMedia || !msg?.mediaUrl) return false
  return isAutoMediaLabelText(msg?.text)
}

// ─── Download de mídia ────────────────────────────────────────────────────────

export const downloadMessageMedia = async (msg) => {
  if (msg?.isPendingUpload) return
  const mediaId = msg.messageid || msg.id
  if (!mediaId || String(mediaId).startsWith('pending-doc-')) return
  const proxyBase = getProxyBase()
  try {
    downloadingMediaById.value = { ...downloadingMediaById.value, [msg.id]: true }
    const res = await fetch(`${proxyBase}/message/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ id: mediaId, return_link: true, return_base64: false })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao baixar mídia')
    const fileURL = data?.fileURL || data?.fileUrl || ''
    if (!fileURL) return
    let pdfPreviewUrl = ''
    if (String(msg?.mediaType || '').toLowerCase() === 'document') {
      const maybePdf = /\.(pdf)(\?|#|$)/i.test(String(fileURL || '')) ||
        /pdf/i.test(String(msg?.mimetype || msg?.mimeType || ''))
      if (maybePdf) {
        const { buildPdfFirstPageThumbnail } = await import('./usePdfThumbnail.js')
        pdfPreviewUrl = await buildPdfFirstPageThumbnail(fileURL)
      }
    }
    messages.value = messages.value.map((item) =>
      item.id === msg.id
        ? { ...item, mediaUrl: fileURL, previewUrl: String(pdfPreviewUrl || item.previewUrl || '').trim() }
        : item
    )
  } catch (e) {
    console.error('Erro ao baixar mídia', e)
  } finally {
    downloadingMediaById.value = { ...downloadingMediaById.value, [msg.id]: false }
  }
}

export const preloadMessageMediaIfNeeded = async (items = []) => {
  const candidates = (Array.isArray(items) ? items : [])
    .filter((m) =>
      m &&
      m.isMedia &&
      !m.mediaUrl &&
      (m.mediaType === 'image' || m.mediaType === 'video' || m.mediaType === 'sticker') &&
      !autoMediaLoadAttemptedById.value[m.id] &&
      !downloadingMediaById.value[m.id]
    )
    .slice(0, 10)
  if (candidates.length === 0) return
  const marks = { ...autoMediaLoadAttemptedById.value }
  for (const m of candidates) marks[m.id] = true
  autoMediaLoadAttemptedById.value = marks
  await Promise.allSettled(candidates.map((m) => downloadMessageMedia(m)))
}

export function useWhatsappMessages() {
  return {
    normalizeMessage, attachReactionsToMessages, hydrateQuotedFromThread,
    renderedMessages, parseInlineReactionsFromMessage, getMessageMergeKey,
    pickRicherDuplicateBaseMessage, extractSharedContactData, extractSharedContactText,
    replaceMentionNumbersByNames, extractUazapiMediaUrl, extractUazapiJpegThumbDataUrl,
    extractContextInfoFromMessage, buildMessageContentText, tryParseQuotedPayload,
    reactionEmojiDisplaysInPill, getReactionPillEmojis, hasRenderableReactionPill,
    showReactionPillCount, shouldHideAutoMediaLabelInBubble,
    downloadMessageMedia, preloadMessageMediaIfNeeded
  }
}
