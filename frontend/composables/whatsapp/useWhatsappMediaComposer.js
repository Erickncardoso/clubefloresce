/**
 * useWhatsappMediaComposer
 * Estado e funções do compositor de mídia, visualizador de documentos e upload de documentos pendentes.
 * Extrai ~280 linhas do monolito chat.vue.
 */
import { ref, watch } from 'vue'
import { selectedChat, sending, messages, downloadingMediaById, chatActionFeedback, replyingTo } from './useWhatsappState.js'
import { renderedMessages, preloadMessageMediaIfNeeded } from './useWhatsappMessages.js'
import { refreshSelectedChatMessages, scrollToBottom, refreshChatPreview, selectChat } from './useWhatsappChats.js'
import { triggerFilePicker } from './useWhatsappMessageActions.js'
import { getProxyBase, whatsappJsonHeaders } from './useWhatsappApi.js'
import { normalizeJid } from './useWhatsappUtils.js'

// ─── Estado do compositor de mídia ────────────────────────────────────────────
export const mediaComposerOpen = ref(false)
export const mediaComposerSending = ref(false)
export const mediaComposerCaption = ref('')
export const mediaComposerFiles = ref([])
export const mediaComposerActiveIndex = ref(0)

// ─── Estado do visualizador de documentos ─────────────────────────────────────
export const documentViewerOpen = ref(false)
export const documentViewerUrl = ref('')
export const documentViewerName = ref('')
export const documentViewerMimeType = ref('')
export const documentViewerObjectUrl = ref('')

// ─── Uploads de documentos pendentes ──────────────────────────────────────────
export const pendingDocumentUploads = ref({})

// ─── Helpers de arquivo ───────────────────────────────────────────────────────

export const fileToBase64DataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export const toPureBase64 = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const marker = 'base64,'
  const markerIndex = raw.indexOf(marker)
  if (markerIndex >= 0) return raw.slice(markerIndex + marker.length).trim()
  return raw
}

export const blobToBase64DataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

export const sendMediaWithTimeout = async (proxyBase, payload, timeoutMs = 45000) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller
    ? setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
    : null
  try {
    const response = await fetch(`${proxyBase}/send/media`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(payload),
      signal: controller?.signal
    })
    const body = await response.json().catch(() => ({}))
    return { response, body }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ─── Compositor de mídia ──────────────────────────────────────────────────────

export const closeMediaComposer = (force = false) => {
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

export const appendMediaComposerEmoji = (emoji) => {
  mediaComposerCaption.value = String(emoji || '')
}

export const normalizeMediaComposerFiles = (fileList) => {
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

export const onFooterMediaChange = (event) => {
  if (!selectedChat.value?.chatJid) return
  const files = normalizeMediaComposerFiles(event?.target?.files)
  event.target.value = ''
  if (!files.length) return
  mediaComposerFiles.value = [...mediaComposerFiles.value, ...files]
  mediaComposerOpen.value = true
  mediaComposerActiveIndex.value = Math.max(0, mediaComposerFiles.value.length - files.length)
}

// ─── Documentos pendentes ─────────────────────────────────────────────────────

export const upsertPendingDocumentMessages = (chatJid, files, caption) => {
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

export const reconcilePendingDocumentMessages = () => {
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

// ─── Envio de mídia ───────────────────────────────────────────────────────────

export const confirmSendMediaComposer = async () => {
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
  }
}

// ─── Mensagem de voz ──────────────────────────────────────────────────────────

export const handleSendVoice = async (payload) => {
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

// ─── Visualizador de documentos ───────────────────────────────────────────────

export const openDocumentViewer = async (item) => {
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

export const closeDocumentViewer = () => {
  documentViewerOpen.value = false
  if (documentViewerObjectUrl.value && typeof URL !== 'undefined') {
    try { URL.revokeObjectURL(documentViewerObjectUrl.value) } catch {}
  }
  documentViewerObjectUrl.value = ''
  documentViewerUrl.value = ''
  documentViewerName.value = ''
  documentViewerMimeType.value = ''
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * @param {{ chatFooterRef: import('vue').Ref }} options
 */
export function useWhatsappMediaComposer({ chatFooterRef } = {}) {
  const triggerComposerAddMore = () => {
    triggerFilePicker(
      chatFooterRef?.value?.mediaInputEl,
      sending.value || mediaComposerSending.value,
      selectedChat.value,
      'image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv'
    )
  }

  watch(
    () => renderedMessages.value,
    (items) => {
      if (!selectedChat.value?.chatJid) return
      void preloadMessageMediaIfNeeded(items)
      reconcilePendingDocumentMessages()
    },
    { immediate: true }
  )

  return {
    mediaComposerOpen,
    mediaComposerSending,
    mediaComposerCaption,
    mediaComposerFiles,
    mediaComposerActiveIndex,
    documentViewerOpen,
    documentViewerUrl,
    documentViewerName,
    documentViewerMimeType,
    documentViewerObjectUrl,
    pendingDocumentUploads,
    closeMediaComposer,
    triggerComposerAddMore,
    normalizeMediaComposerFiles,
    onFooterMediaChange,
    appendMediaComposerEmoji,
    upsertPendingDocumentMessages,
    reconcilePendingDocumentMessages,
    preloadMissingMediaInBackground: preloadMessageMediaIfNeeded,
    fileToBase64DataUrl,
    toPureBase64,
    sendMediaWithTimeout,
    blobToBase64DataUrl,
    confirmSendMediaComposer,
    openDocumentViewer,
    closeDocumentViewer,
    handleSendVoice,
  }
}
