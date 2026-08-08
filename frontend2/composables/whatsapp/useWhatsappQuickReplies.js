/**
 * Respostas rápidas (templates UAZAPI) — listagem e envio no chat.
 */
import { ref } from 'vue'
import { getProxyBase, whatsappJsonHeaders, whatsappAuthHeaders, whatsappHasAuth } from './useWhatsappApi.js'
import { selectedChat, sending, replyingTo } from './useWhatsappState.js'
import { refreshSelectedChatMessages, refreshChatPreview, scrollToBottom } from './useWhatsappChats.js'

export const quickRepliesSidebarOpen = ref(false)
export const quickRepliesPickerOpen = ref(false)
export const quickRepliesLoading = ref(false)
export const quickRepliesList = ref([])
export const quickRepliesFilter = ref('')
export const quickRepliesSaving = ref(false)

const mapMediaType = (type) => {
  const raw = String(type || 'text').toLowerCase()
  if (raw === 'ptt' || raw === 'myaudio') return 'audio'
  if (['image', 'video', 'audio', 'document'].includes(raw)) return raw
  return 'document'
}

const normalizeQuickReply = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const shortCut = String(raw.shortCut || raw.shortcut || raw.ShortCut || '').trim()
  if (!shortCut) return null
  return {
    id: String(raw.id || raw.ID || shortCut),
    shortCut,
    text: String(raw.text || raw.Text || '').trim(),
    type: String(raw.type || raw.Type || 'text').toLowerCase(),
    file: String(raw.file || raw.File || '').trim(),
    docName: String(raw.docName || raw.DocName || '').trim(),
    onWhatsApp: Boolean(raw.onWhatsApp ?? raw.OnWhatsApp),
  }
}

const parseQuickRepliesPayload = (data) => {
  if (!data) return []
  if (Array.isArray(data)) {
    return data.map(normalizeQuickReply).filter(Boolean)
  }
  if (typeof data === 'object') {
    const nested = data.quickReplies || data.QuickReplies || data.templates || data.data || data.result
    if (Array.isArray(nested)) {
      return nested.map(normalizeQuickReply).filter(Boolean)
    }
    if (data.shortCut || data.shortcut || data.ShortCut) {
      const one = normalizeQuickReply(data)
      return one ? [one] : []
    }
  }
  return []
}

export const quickReplyPreviewText = (reply) => {
  const text = String(reply?.text || '').trim()
  if (text) return text
  const type = String(reply?.type || 'text').toLowerCase()
  if (type === 'image') return 'Imagem'
  if (type === 'video') return 'Vídeo'
  if (type === 'document') return String(reply?.docName || 'Documento').trim() || 'Documento'
  if (['audio', 'ptt', 'myaudio'].includes(type)) return 'Áudio'
  return 'Mensagem'
}

export const loadQuickReplies = async () => {
  if (!whatsappHasAuth()) return
  quickRepliesLoading.value = true
  try {
    const proxyBase = getProxyBase()
    const endpoints = ['/quickreply/showall', '/quickreply/list']
    let parsed = []

    for (const endpoint of endpoints) {
      const res = await fetch(`${proxyBase}${endpoint}`, {
        method: 'GET',
        headers: whatsappAuthHeaders(),
      })
      if (!res.ok) continue
      const data = await res.json().catch(() => [])
      parsed = parseQuickRepliesPayload(data)
      if (parsed.length) break
    }

    quickRepliesList.value = parsed.sort((a, b) =>
      a.shortCut.localeCompare(b.shortCut, 'pt-BR', { sensitivity: 'base' })
    )
  } catch (error) {
    console.error('Erro ao carregar respostas rápidas', error)
    quickRepliesList.value = []
  } finally {
    quickRepliesLoading.value = false
  }
}

export const openQuickRepliesPicker = async (filter = '') => {
  quickRepliesFilter.value = String(filter || '').trim()
  quickRepliesPickerOpen.value = true
  if (!quickRepliesList.value.length) {
    await loadQuickReplies()
  }
}

export const closeQuickRepliesPicker = () => {
  quickRepliesPickerOpen.value = false
  quickRepliesFilter.value = ''
}

export const openQuickRepliesManagePanel = async ({ reload = false } = {}) => {
  closeQuickRepliesPicker()
  quickRepliesSidebarOpen.value = true
  quickRepliesFilter.value = ''
  if (reload || !quickRepliesList.value.length) {
    await loadQuickReplies()
  }
}

/** @deprecated use openQuickRepliesManagePanel */
export const openQuickRepliesSidebar = openQuickRepliesManagePanel

export const closeQuickRepliesSidebar = () => {
  quickRepliesSidebarOpen.value = false
}

export const resetQuickRepliesState = () => {
  quickRepliesSidebarOpen.value = false
  quickRepliesPickerOpen.value = false
  quickRepliesFilter.value = ''
  quickRepliesList.value = []
  quickRepliesLoading.value = false
  quickRepliesSaving.value = false
}

export const saveQuickReply = async (payload) => {
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')
  quickRepliesSaving.value = true
  try {
    const body = {
      id: payload?.id || undefined,
      shortCut: String(payload?.shortCut || '').trim(),
      type: String(payload?.type || 'text').toLowerCase(),
      text: String(payload?.text || '').trim(),
      file: String(payload?.file || '').trim(),
      docName: String(payload?.docName || '').trim(),
    }
    if (!body.shortCut) throw new Error('Informe o atalho')
    if (body.type === 'text' && !body.text) throw new Error('Informe a mensagem')
    if (body.type !== 'text' && !body.file) throw new Error('Informe o arquivo')

    const res = await fetch(`${getProxyBase()}/quickreply/edit`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao salvar resposta rápida')
    await loadQuickReplies()
    return true
  } finally {
    quickRepliesSaving.value = false
  }
}

export const deleteQuickReply = async (id) => {
  const replyId = String(id || '').trim()
  if (!replyId) throw new Error('Resposta inválida')
  if (!whatsappHasAuth()) throw new Error('Sessão expirada')
  quickRepliesSaving.value = true
  try {
    const res = await fetch(`${getProxyBase()}/quickreply/edit`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ id: replyId, delete: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao apagar resposta rápida')
    await loadQuickReplies()
    return true
  } finally {
    quickRepliesSaving.value = false
  }
}

export const quickReplyComposerText = (reply) => {
  if (!reply) return ''
  const type = String(reply?.type || 'text').toLowerCase()
  if (type !== 'text') return ''
  return String(reply?.text || '').trim()
}

export const isTextQuickReply = (reply) =>
  String(reply?.type || 'text').toLowerCase() === 'text'

export const filterQuickReplies = (items, query) => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter((reply) => {
    const shortcut = String(reply?.shortCut || '').toLowerCase()
    const text = String(reply?.text || '').toLowerCase()
    return shortcut.includes(q) || text.includes(q)
  })
}

export const sendQuickReply = async (reply) => {
  if (!reply || !selectedChat.value?.chatJid || sending.value) return false
  const chatJid = selectedChat.value.chatJid
  const proxyBase = getProxyBase()
    const type = String(reply?.type || 'text').toLowerCase()
  const savedReplyingTo = replyingTo.value

  try {
    sending.value = true
    if (type === 'text') {
      const textToSend = String(reply?.text || '').trim()
      if (!textToSend) return false
      const body = { number: chatJid, text: textToSend }
      if (savedReplyingTo?.messageid) body.replyid = savedReplyingTo.messageid
      const res = await fetch(`${proxyBase}/send/text`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao enviar resposta rápida')
      replyingTo.value = null
      refreshChatPreview(chatJid, {
        lastMessage: textToSend,
        lastMessageFromMe: true,
        lastMessagePrefix: '',
        lastMessageTime: Date.now(),
        wa_lastMessageTextVote: textToSend,
      })
    } else {
      const file = String(reply?.file || '').trim()
      if (!file) throw new Error('Arquivo da resposta rápida indisponível')
      const mediaType = mapMediaType(type)
      const payload = {
        number: chatJid,
        type: mediaType,
        file,
        text: String(reply?.text || '').trim(),
      }
      if (mediaType === 'document' && reply?.docName) payload.fileName = String(reply.docName).trim()
      const res = await fetch(`${proxyBase}/send/media`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'Falha ao enviar mídia da resposta rápida')
      replyingTo.value = null
      const previewLabel = mediaType === 'image'
        ? 'Imagem'
        : mediaType === 'video'
          ? 'Vídeo'
          : mediaType === 'audio'
            ? 'Áudio'
            : 'Documento'
      refreshChatPreview(chatJid, {
        lastMessage: previewLabel,
        lastMessageFromMe: true,
        lastMessagePrefix: '',
        lastMessageTime: Date.now(),
      })
    }
    closeQuickRepliesPicker()
    refreshSelectedChatMessages().catch(() => {})
    scrollToBottom()
    return true
  } catch (error) {
    console.error('Erro ao enviar resposta rápida', error)
    return false
  } finally {
    sending.value = false
  }
}

export function useWhatsappQuickReplies() {
  return {
    quickRepliesSidebarOpen,
    quickRepliesPickerOpen,
    quickRepliesLoading,
    quickRepliesSaving,
    quickRepliesList,
    quickRepliesFilter,
    quickReplyPreviewText,
    loadQuickReplies,
    openQuickRepliesPicker,
    closeQuickRepliesPicker,
    openQuickRepliesManagePanel,
    openQuickRepliesSidebar,
    closeQuickRepliesSidebar,
    filterQuickReplies,
    quickReplyComposerText,
    isTextQuickReply,
    saveQuickReply,
    deleteQuickReply,
    sendQuickReply,
  }
}
