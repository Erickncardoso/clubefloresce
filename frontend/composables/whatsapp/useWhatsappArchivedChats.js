/**
 * Painel lateral de conversas arquivadas (WhatsApp Web).
 */
import { ref } from 'vue'
import {
  normalizeChat,
  canonicalChatListKey,
  mergeDuplicateChatRows,
  sortChatsByPriority,
  enrichMissingChatAvatars,
} from './useWhatsappChats.js'
import { getAuthToken, getProxyBase } from './useWhatsappApi.js'
import { normalizeJid, parseJsonBodySafe, isChatMutedByEndTime } from './useWhatsappUtils.js'

export const archivedSidebarOpen = ref(false)
export const archivedChats = ref([])
export const archivedChatsLoading = ref(false)

const parseChatsRows = (data) => {
  if (Array.isArray(data?.chats)) return data.chats
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data)) return data
  return []
}

const fetchArchivedChatsPage = async (limit = 200, offset = 0) => {
  const proxyBase = getProxyBase()
  const tryBodies = [
    { operator: 'AND', sort: '-wa_lastMsgTimestamp', limit, offset, wa_archived: true },
    { sort: '-wa_lastMsgTimestamp', limit, offset, wa_archived: true },
    { limit, offset, wa_archived: true },
  ]

  let lastError = null
  for (const bodyPayload of tryBodies) {
    let res
    try {
      res = await fetch(`${proxyBase}/chat/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(bodyPayload),
      })
    } catch {
      lastError = new Error('BACKEND_OFFLINE')
      continue
    }

    const data = await parseJsonBodySafe(res)
    if (res.status === 401) {
      if (typeof navigateTo !== 'undefined') navigateTo('/')
      throw new Error('AUTH_EXPIRED')
    }
    if (!res.ok) {
      lastError = new Error(data?.message || data?.error || 'Erro ao buscar arquivadas')
      continue
    }

    const rows = parseChatsRows(data)
    const totalRecords = Number.isFinite(Number(data?.pagination?.totalRecords))
      ? Number(data.pagination.totalRecords)
      : Number.isFinite(Number(data?.totalRecords))
        ? Number(data.totalRecords)
        : null
    return { chats: rows, totalRecords }
  }

  throw lastError || new Error('Erro ao buscar arquivadas')
}

export const loadArchivedChats = async ({ showLoading = true } = {}) => {
  if (showLoading) archivedChatsLoading.value = true
  try {
    const pageSize = 300
    let offset = 0
    let totalRecords = null
    const byKey = new Map()

    for (let page = 0; page < 20; page++) {
      const pageResult = await fetchArchivedChatsPage(pageSize, offset)
      if (totalRecords === null && pageResult.totalRecords !== null) {
        totalRecords = pageResult.totalRecords
      }
      if (!pageResult.chats.length) break

      for (const raw of pageResult.chats) {
        const normalized = normalizeChat({
          ...raw,
          wa_archived: true,
          isArchived: true,
        })
        normalized.isArchived = true
        normalized.wa_archived = true
        normalized.muteEndTime = Number(normalized.wa_muteEndTime ?? normalized.muteEndTime ?? 0)
        normalized.isMuted = isChatMutedByEndTime(normalized.muteEndTime)
        const key = canonicalChatListKey(normalized)
        if (!key) continue
        byKey.set(key, mergeDuplicateChatRows(byKey.get(key) || null, normalized))
      }

      offset += pageResult.chats.length
      if (totalRecords !== null && offset >= totalRecords) break
      if (pageResult.chats.length < pageSize) break
    }

    archivedChats.value = sortChatsByPriority(Array.from(byKey.values()))
    void enrichMissingChatAvatars({ chatList: archivedChats.value, limit: 30 })
    return archivedChats.value
  } finally {
    if (showLoading) archivedChatsLoading.value = false
  }
}

export const openArchivedSidebar = async ({ reload = true } = {}) => {
  archivedSidebarOpen.value = true
  if (reload || !archivedChats.value.length) {
    await loadArchivedChats({ showLoading: true })
  }
}

export const closeArchivedSidebar = () => {
  archivedSidebarOpen.value = false
}

export const removeArchivedChatFromList = (chat = {}) => {
  const key = canonicalChatListKey(chat)
  if (!key) return
  archivedChats.value = (archivedChats.value || []).filter(
    (item) => canonicalChatListKey(item) !== key,
  )
}

export const patchArchivedChatIfPresent = (chatJid, payload = {}) => {
  const norm = normalizeJid(chatJid)
  const key = canonicalChatListKey({ chatJid: norm })
  if (!key) return
  archivedChats.value = (archivedChats.value || []).map((item) =>
    canonicalChatListKey(item) === key ? { ...item, ...payload } : item,
  )
}

export const clearArchivedChatsCache = () => {
  archivedSidebarOpen.value = false
  archivedChats.value = []
  archivedChatsLoading.value = false
}

export function useWhatsappArchivedChats() {
  return {
    archivedSidebarOpen,
    archivedChats,
    archivedChatsLoading,
    loadArchivedChats,
    openArchivedSidebar,
    closeArchivedSidebar,
    removeArchivedChatFromList,
    patchArchivedChatIfPresent,
    clearArchivedChatsCache,
  }
}
