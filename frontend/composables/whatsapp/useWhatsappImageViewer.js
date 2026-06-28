import { reactive } from 'vue'
import { resolveMediaGalleryPreviewUrl, extractUazapiJpegThumbDataUrl } from './useWhatsappMessages.js'
import { messageHasVisibleImageCaption } from '../useWhatsappImageAlbumEntries.js'

const strTrim = (value) => String(value || '').trim()

const VIEWER_MEDIA_TYPES = new Set(['image', 'video', 'document'])

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

export const getDocumentViewerThumb = (msg) => {
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
    msg?.previewUrl,
    extractUazapiJpegThumbDataUrl(c),
    extractUazapiJpegThumbDataUrl(msg?.content),
  ]
  for (const candidate of candidates) {
    const asString = String(candidate || '').trim()
    if (asString.startsWith('http://') || asString.startsWith('https://') || asString.startsWith('data:image/')) {
      return asString
    }
    if (asString && !asString.startsWith('http')) {
      const dataUrl = asString.includes('base64,') ? asString : `data:image/jpeg;base64,${asString}`
      if (dataUrl.startsWith('data:image/')) return dataUrl
    }
  }
  return ''
}

export const imageViewerDisplayUrl = (item) => {
  const mediaType = String(item?.mediaType || '').toLowerCase()
  if (mediaType === 'document') {
    return String(item?.mediaUrl || '').trim() || getDocumentViewerThumb(item)
  }
  const { previewUrl, mediaUrl } = resolveMediaGalleryPreviewUrl(item)
  return String(mediaUrl || previewUrl || item?.mediaUrl || item?.mediaThumbUrl || '').trim()
}

export const imageViewerThumbUrl = (item) => {
  const mediaType = String(item?.mediaType || '').toLowerCase()
  if (mediaType === 'document') {
    return getDocumentViewerThumb(item)
  }
  const { previewUrl, thumbUrl, mediaUrl } = resolveMediaGalleryPreviewUrl(item)
  // Faixa do viewer: preview/full primeiro — thumb do WhatsApp é minúsculo e fica borrado ao ampliar.
  return String(
    previewUrl ||
    mediaUrl ||
    item?.mediaUrl ||
    thumbUrl ||
    item?.mediaThumbUrl ||
    ''
  ).trim()
}

export const messageCaptionForViewer = (msg, shouldHideLabel) => {
  if (!messageHasVisibleImageCaption(msg, shouldHideLabel)) return ''
  return strTrim(msg?.text)
}

export const isViewerMediaMessage = (msg) => {
  if (!msg) return false
  const mediaType = String(msg.mediaType || '').toLowerCase()
  if (mediaType === 'document') return true
  if (!VIEWER_MEDIA_TYPES.has(mediaType)) return false
  return Boolean(strTrim(msg?.mediaUrl || msg?.mediaThumbUrl))
}

export const buildConversationViewerItems = (messages, shouldHideLabel) => {
  const source = Array.isArray(messages) ? messages : []
  return source
    .filter((msg) => isViewerMediaMessage(msg))
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0))
}

export const imageViewerCaptionFromEntry = (entry, shouldHideLabel) => {
  const fromPrimary = strTrim(entry?.primary?.text)
  if (fromPrimary && !entry?.primary?.isContactShare && !shouldHideLabel?.(entry.primary)) return fromPrimary
  if (!Array.isArray(entry?.items) || entry.items.length <= 1) return ''
  for (let k = entry.items.length - 1; k >= 0; k -= 1) {
    const item = entry.items[k]
    const text = strTrim(item?.text)
    if (text && !item?.isContactShare && !shouldHideLabel?.(item)) return text
  }
  return ''
}

export function useWhatsappImageViewer({
  messagesSource,
  onDownloadMedia,
  resolveSenderName,
  resolveSenderAvatar,
  shouldHideLabel,
}) {
  const imageViewer = reactive({
    open: false,
    items: [],
    index: 0,
    senderName: '',
    senderAvatar: '',
    caption: '',
    current: null,
  })

  const resolveFreshMessage = (msg) => {
    const items = Array.isArray(messagesSource?.value) ? messagesSource.value : messagesSource
    return (Array.isArray(items) ? items : []).find((item) => item?.id === msg?.id) || msg
  }

  const refreshViewerItems = () => {
    const allMessages = Array.isArray(messagesSource?.value) ? messagesSource.value : messagesSource
    return buildConversationViewerItems(allMessages, shouldHideLabel).map((item) => resolveFreshMessage(item))
  }

  const syncImageViewerCurrent = () => {
    imageViewer.current = imageViewer.items[imageViewer.index] || null
    const current = imageViewer.current
    if (!current) return
    imageViewer.caption = messageCaptionForViewer(current, shouldHideLabel)
    imageViewer.senderName = resolveSenderName?.(current, imageViewer) || imageViewer.senderName
    imageViewer.senderAvatar = resolveSenderAvatar?.(current, imageViewer) || imageViewer.senderAvatar
  }

  const ensureCurrentMediaLoaded = async () => {
    const current = imageViewer.current
    if (!current) return
    const mediaType = String(current.mediaType || '').toLowerCase()
    const hasUrl = Boolean(imageViewerDisplayUrl(current))
    const hasThumb = Boolean(imageViewerThumbUrl(current))
    if (hasUrl || (mediaType === 'document' && hasThumb)) return
    await onDownloadMedia?.(current)
    const freshItems = refreshViewerItems()
    if (!freshItems.length) return
    imageViewer.items = freshItems
    const nextIndex = freshItems.findIndex((item) => item?.id === current?.id)
    if (nextIndex >= 0) imageViewer.index = nextIndex
    syncImageViewerCurrent()
  }

  const openImageViewer = async (startMsg) => {
    const freshItems = refreshViewerItems()
    if (!freshItems.length) return
    let startIndex = freshItems.findIndex((item) => item?.id === startMsg?.id)
    if (startIndex < 0) startIndex = 0
    imageViewer.items = freshItems
    imageViewer.index = startIndex
    imageViewer.open = true
    syncImageViewerCurrent()
    await ensureCurrentMediaLoaded()
  }

  const closeImageViewer = () => {
    imageViewer.open = false
    imageViewer.items = []
    imageViewer.index = 0
    imageViewer.senderName = ''
    imageViewer.senderAvatar = ''
    imageViewer.caption = ''
    imageViewer.current = null
  }

  const setImageViewerIndex = async (nextIndex) => {
    if (!imageViewer.items.length) return
    imageViewer.index = Math.max(0, Math.min(Number(nextIndex) || 0, imageViewer.items.length - 1))
    syncImageViewerCurrent()
    await ensureCurrentMediaLoaded()
  }

  const prevImageViewerImage = async () => {
    if (!imageViewer.items.length) return
    const next = imageViewer.index <= 0 ? imageViewer.items.length - 1 : imageViewer.index - 1
    await setImageViewerIndex(next)
  }

  const nextImageViewerImage = async () => {
    if (!imageViewer.items.length) return
    const next = imageViewer.index >= imageViewer.items.length - 1 ? 0 : imageViewer.index + 1
    await setImageViewerIndex(next)
  }

  const handleImageOpen = async (msg) => {
    let current = resolveFreshMessage(msg)
    const mediaType = String(current?.mediaType || '').toLowerCase()
    if ((mediaType === 'image' || mediaType === 'video') && !imageViewerDisplayUrl(current)) {
      await onDownloadMedia?.(current)
      current = resolveFreshMessage(msg)
    }
    await openImageViewer(current)
  }

  return {
    imageViewer,
    handleImageOpen,
    closeImageViewer,
    setImageViewerIndex,
    prevImageViewerImage,
    nextImageViewerImage,
    imageViewerDisplayUrl,
    imageViewerThumbUrl,
  }
}
