import { computed, unref } from 'vue'

const strTrim = (value) => String(value || '').trim()

const AUTO_MEDIA_LABELS = new Set([
  'gif',
  'figurinha',
  '📷 imagem',
  '🎥 vídeo',
  '🎵 áudio',
  '📄 documento',
  'mensagem sem texto'
])

/** Legenda real do usuário — ignora rótulos automáticos tipo "📷 Imagem". */
export function messageHasVisibleImageCaption(msg, shouldHideLabel) {
  const text = strTrim(msg?.text)
  if (!text) return false
  if (msg?.isContactShare) return false
  if (AUTO_MEDIA_LABELS.has(text.toLowerCase())) return false
  if (typeof shouldHideLabel === 'function' && shouldHideLabel(msg)) return false
  return true
}

export function buildWhatsappImageAlbumSenderKey(msg, mode = 'group') {
  if (msg?.fromMe) return 'me'
  if (mode === 'private') return 'peer'
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

export function isWhatsappImageAlbumCandidate(msg) {
  return Boolean(msg) &&
    msg.mediaType === 'image' &&
    Boolean(String(msg.mediaUrl || msg.mediaThumbUrl || '').trim()) &&
    !msg.quoted &&
    !msg.isContactShare &&
    !msg.linkPreview
}

/** Álbum válido: sem legenda em nenhuma, ou legenda só na última imagem. */
export function canFormWhatsappImageAlbum(items, shouldHideLabel) {
  if (!Array.isArray(items) || items.length < 2) return false
  const captionedIndexes = items
    .map((item, index) => (messageHasVisibleImageCaption(item, shouldHideLabel) ? index : -1))
    .filter((index) => index >= 0)
  if (captionedIndexes.length === 0) return true
  if (captionedIndexes.length === 1 && captionedIndexes[0] === items.length - 1) return true
  return false
}

export function useWhatsappImageAlbumEntries(messagesSource, { mode = 'group', shouldHideLabel = null } = {}) {
  const groupedEntries = computed(() => {
    const result = []
    const items = Array.isArray(unref(messagesSource)) ? unref(messagesSource) : []
    const maxGapMs = 3000

    for (let i = 0; i < items.length; i++) {
      const current = items[i]

      if (!isWhatsappImageAlbumCandidate(current)) {
        result.push({
          kind: 'single',
          key: `single-${current?.id || i}`,
          startIndex: i,
          primary: current,
          items: [current]
        })
        continue
      }

      // Imagem com legenda própria → sempre bolha separada (nunca inicia álbum).
      if (messageHasVisibleImageCaption(current, shouldHideLabel)) {
        result.push({
          kind: 'single',
          key: `single-${current?.id || i}`,
          startIndex: i,
          primary: current,
          items: [current]
        })
        continue
      }

      const senderKey = buildWhatsappImageAlbumSenderKey(current, mode)
      const albumItems = [current]
      let j = i + 1

      while (j < items.length) {
        const next = items[j]
        if (!isWhatsappImageAlbumCandidate(next)) break
        if (buildWhatsappImageAlbumSenderKey(next, mode) !== senderKey) break

        const gap = Math.abs(
          Number(next?.timestamp || 0) - Number(albumItems[albumItems.length - 1]?.timestamp || 0)
        )
        if (gap > maxGapMs) break

        if (messageHasVisibleImageCaption(next, shouldHideLabel)) {
          albumItems.push(next)
          j += 1
          break
        }

        albumItems.push(next)
        j += 1
      }

      if (albumItems.length > 1 && canFormWhatsappImageAlbum(albumItems, shouldHideLabel)) {
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

  return { groupedEntries, albumVisibleItems, albumOverflowCount }
}
