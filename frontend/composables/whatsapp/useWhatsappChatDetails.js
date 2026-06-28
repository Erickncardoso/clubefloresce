/**
 * Detalhes completos do contato via POST /api/whatsapp/chat/details (UAZAPI).
 */
import { getWhatsappApiBase, whatsappJsonHeaders } from './useWhatsappApi.js'
import { chatDetailsCache, chatDetailsInflight } from './useWhatsappState.js'
import { parseJsonBodySafe } from './useWhatsappUtils.js'

const str = (value) => String(value ?? '').trim()

export const parseCommonGroups = (value) => {
  const text = str(value)
  if (!text) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        name: str(item?.name),
        jid: str(item?.jid || item?.id)
      }))
      .filter((item) => item.name)
  }
  return text
    .split(',')
    .map((part) => {
      const trimmed = part.trim()
      if (!trimmed) return null
      const match = trimmed.match(/^(.+)\(([^)]+)\)$/)
      if (match) return { name: match[1].trim(), jid: match[2].trim() }
      return { name: trimmed, jid: '' }
    })
    .filter(Boolean)
}

export const normalizeChatDetailsView = (payload = {}) => {
  const raw = payload?.details && typeof payload.details === 'object' ? payload.details : payload
  const chatJid = str(raw.chatJid || raw.wa_chatid || raw.chatid)
  const waContactName = str(raw.waContactName || raw.wa_contactName)
  const waName = str(raw.waName || raw.wa_name)
  const displayName = str(raw.displayName || raw.name || waName || waContactName)
  const commonGroups = Array.isArray(raw.commonGroups)
    ? raw.commonGroups
    : parseCommonGroups(raw.commonGroupsRaw || raw.common_groups)

  return {
    id: str(raw.id),
    chatJid,
    waChatLid: str(raw.waChatLid || raw.wa_chatlid),
    phone: str(raw.phone),
    displayName,
    waName,
    waContactName,
    avatarUrl: str(raw.avatarUrl || raw.image || raw.imagePreview),
    avatarPreviewUrl: str(raw.avatarPreviewUrl || raw.imagePreview || raw.image),
    isGroup: Boolean(raw.isGroup || raw.wa_isGroup),
    isBlocked: Boolean(raw.isBlocked || raw.wa_isBlocked),
    isArchived: Boolean(raw.isArchived || raw.wa_archived),
    isPinned: Boolean(raw.isPinned || raw.wa_isPinned),
    muteEndTime: Number(raw.muteEndTime || raw.wa_muteEndTime || 0),
    unreadCount: Number(raw.unreadCount || raw.wa_unreadCount || 0),
    isSaved: Boolean(raw.isSaved || waContactName),
    isBusiness: Boolean(raw.isBusiness || raw.wa_isBusiness),
    commonGroups,
    waNotes: str(raw.waNotes || raw.wa_notes),
    about: str(
      raw.about || raw.status || raw.wa_about || raw.wa_status ||
      (raw.raw && typeof raw.raw === 'object' ? (raw.raw.about || raw.raw.status || raw.raw.wa_about || raw.raw.wa_status) : '')
    ),
    ephemeralExpiration: Number(
      raw.ephemeralExpiration || raw.wa_ephemeralExpiration ||
      (raw.raw && typeof raw.raw === 'object' ? raw.raw.wa_ephemeralExpiration : 0) || 0
    ),
    labels: Array.isArray(raw.labels) ? raw.labels.map((item) => str(item)).filter(Boolean) : (Array.isArray(raw.wa_label) ? raw.wa_label.map((item) => str(item)).filter(Boolean) : []),
    lead: {
      name: str(raw.lead?.name || raw.lead_name),
      fullName: str(raw.lead?.fullName || raw.lead_fullName),
      email: str(raw.lead?.email || raw.lead_email),
      personalId: str(raw.lead?.personalId || raw.lead_personalid),
      status: str(raw.lead?.status || raw.lead_status),
      notes: str(raw.lead?.notes || raw.lead_notes),
      tags: Array.isArray(raw.lead?.tags) ? raw.lead.tags.map((item) => str(item)).filter(Boolean) : (Array.isArray(raw.lead_tags) ? raw.lead_tags.map((item) => str(item)).filter(Boolean) : []),
      isTicketOpen: Boolean(raw.lead?.isTicketOpen || raw.lead_isTicketOpen),
      assignedAttendantId: str(raw.lead?.assignedAttendantId || raw.lead_assignedAttendant_id)
    },
    chatbot: {
      summary: str(raw.chatbot?.summary || raw.chatbot_summary),
      disableUntil: Number(raw.chatbot?.disableUntil || raw.chatbot_disableUntil || 0),
      lastTriggerId: str(raw.chatbot?.lastTriggerId || raw.chatbot_lastTrigger_id)
    },
    syncedAt: str(raw.syncedAt),
    cached: Boolean(payload?.cached)
  }
}

export const fetchContactChatDetails = async (number, options = {}) => {
  const key = str(number)
  if (!key) return null

  const {
    preview = false,
    force = false,
    timeoutMs = 12000,
    cacheTtlMs = 120000
  } = options

  if (!force) {
    const cached = chatDetailsCache.value[key]
    if (cached && (Date.now() - cached.at) < cacheTtlMs) {
      return normalizeChatDetailsView(cached.data)
    }
    if (chatDetailsInflight.value[key]) {
      const inflight = await chatDetailsInflight.value[key]
      return normalizeChatDetailsView(inflight)
    }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  const apiBase = getWhatsappApiBase()

  const request = (async () => {
    try {
      const res = await fetch(`${apiBase}/chat/details`, {
        method: 'POST',
        headers: whatsappJsonHeaders(),
        body: JSON.stringify({ number: key, preview, force }),
        signal: controller?.signal
      })
      const body = await parseJsonBodySafe(res)
      if (!res.ok) {
        throw new Error(str(body?.message || body?.error || 'Falha ao carregar detalhes do contato'))
      }
      const normalized = normalizeChatDetailsView(body)
      chatDetailsCache.value = {
        ...chatDetailsCache.value,
        [key]: { at: Date.now(), data: normalized }
      }
      return normalized
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      const next = { ...chatDetailsInflight.value }
      delete next[key]
      chatDetailsInflight.value = next
    }
  })()

  chatDetailsInflight.value = { ...chatDetailsInflight.value, [key]: request }
  return request
}

export const formatMuteEndLabel = (muteEndTime = 0) => {
  const value = Number(muteEndTime || 0)
  if (value === -1) return 'Silenciada sempre'
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value > 1e12 ? value : value * 1000)
  if (Number.isNaN(date.getTime())) return 'Silenciado'
  if (date.getTime() <= Date.now()) return ''
  const now = new Date()
  const isToday = date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()
  if (isToday) {
    return `Até hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return `Até ${date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
}

export const formatEphemeralLabel = (seconds = 0) => {
  const value = Number(seconds || 0)
  if (!Number.isFinite(value) || value <= 0) return 'Desativadas'
  if (value === 86400) return '24 horas'
  if (value === 604800) return '7 dias'
  if (value === 7776000) return '90 dias'
  if (value < 3600) return `${Math.round(value / 60)} min`
  if (value < 86400) return `${Math.round(value / 3600)} h`
  return `${Math.round(value / 86400)} dias`
}

export function useWhatsappChatDetails() {
  return {
    parseCommonGroups,
    normalizeChatDetailsView,
    fetchContactChatDetails,
    formatMuteEndLabel,
    formatEphemeralLabel
  }
}
