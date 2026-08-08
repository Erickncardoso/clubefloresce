import { computed, ref } from 'vue'
import { chats } from './useWhatsappState.js'
import {
  extractDigitsFromJid,
  formatJidAsPhoneLine,
  isGroupJid,
  normalizeJid,
} from './useWhatsappUtils.js'
import { getProxyBase, whatsappJsonHeaders } from './useWhatsappApi.js'
import {
  loadContactsDirectory,
  restoreContactsFromCache,
  syncContactsDirectoryIfNeeded,
  resolveChatHasSavedContactName,
  resolveChatListAvatarUrl,
  resolveChatListDisplayName,
  resolvePrivateChatPhoneJid,
} from './useWhatsappContacts.js'
import { enrichMissingChatAvatars, loadChats } from './useWhatsappChats.js'
import { normalizeChatLabelIds } from './useWhatsappLabels.js'

const mapChatToContact = (chat = {}) => {
  const chatJid = normalizeJid(chat?.chatJid || chat?.wa_chatid || chat?.id || '')
  if (isGroupJid(chatJid)) return null

  const phoneJid = resolvePrivateChatPhoneJid(chat)
  if (!phoneJid || !phoneJid.endsWith('@s.whatsapp.net')) return null

  const digits = extractDigitsFromJid(phoneJid)
  if (digits.length < 8) return null

  return {
    id: phoneJid,
    jid: phoneJid,
    number: digits,
    name: resolveChatListDisplayName(chat),
    hasSavedName: resolveChatHasSavedContactName(chat),
    avatarUrl: resolveChatListAvatarUrl(chat),
    displayNumber: formatJidAsPhoneLine(phoneJid) || `+${digits}`,
    subtitle: '',
    labelIds: normalizeChatLabelIds(chat?.labelIds || chat?.wa_label),
  }
}

const sortDispatchContacts = (a, b) => {
  if (a.hasSavedName !== b.hasSavedName) return a.hasSavedName ? -1 : 1
  return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
}

const buildPseudoChatFromRow = (row = {}) => {
  const rawJid = String(row?.jid || row?.phone || row?.number || '').trim()
  const digits = extractDigitsFromJid(rawJid.includes('@') ? rawJid : `${rawJid}@s.whatsapp.net`)
  if (digits.length < 8) return null

  return {
    chatJid: normalizeJid(row?.jid || `${digits}@s.whatsapp.net`),
    wa_chatid: row?.jid || row?.wa_chatid,
    wa_chatlid: row?.lid || row?.wa_chatlid,
    phone: row?.phone || row?.number,
    wa_contactName: row?.contact_name || row?.contactName || row?.contact_FirstName,
    pushName: row?.pushName || row?.pushname,
    name: row?.name,
    image: row?.image,
    imagePreview: row?.imagePreview || row?.imagePreview,
    avatarUrl: row?.avatarUrl || row?.avatar,
    wa_name: row?.wa_name,
  }
}

const collectContactsFromChats = (extraRows = []) => {
  const byJid = new Map()

  for (const chat of chats.value || []) {
    const contact = mapChatToContact(chat)
    if (contact) byJid.set(contact.jid, contact)
  }

  for (const row of extraRows) {
    const pseudoChat = buildPseudoChatFromRow(row)
    if (!pseudoChat) continue
    const contact = mapChatToContact(pseudoChat)
    if (contact && !byJid.has(contact.jid)) byJid.set(contact.jid, contact)
  }

  return Array.from(byJid.values()).sort(sortDispatchContacts)
}

export const filterDispatchContactsBySearch = (contactList = [], query = '') => {
  const normalized = String(query || '').trim().toLowerCase()
  const digitsQuery = normalized.replace(/\D/g, '')
  if (!normalized) return contactList

  return contactList.filter((contact) => {
    if (String(contact.name || '').toLowerCase().includes(normalized)) return true
    if (digitsQuery && String(contact.number || '').includes(digitsQuery)) return true
    if (String(contact.displayNumber || '').toLowerCase().includes(normalized)) return true
    return false
  })
}

export const filterDispatchContactsBySegment = (contactList = [], filters = [], applyTogether = true) => {
  const labelFilters = (filters || []).filter((item) => item.type === 'label' && item.labelId)
  if (!labelFilters.length) return contactList

  const hasLabel = (contact, labelId) =>
    (contact.labelIds || []).map(String).includes(String(labelId))

  if (applyTogether) {
    return contactList.filter((contact) => labelFilters.every((filter) => hasLabel(contact, filter.labelId)))
  }
  return contactList.filter((contact) => labelFilters.some((filter) => hasLabel(contact, filter.labelId)))
}

export const BROADCAST_DELAY_PRESETS = [
  { id: 'very_short', label: 'Muito curto 1-5s', min: 1, max: 5 },
  { id: 'short', label: 'Curto 5-20s', min: 5, max: 20 },
  { id: 'medium', label: 'Médio 20-50s', min: 20, max: 50 },
  { id: 'long', label: 'Longo 50-120s', min: 50, max: 120 },
  { id: 'very_long', label: 'Muito longo 120-300s', min: 120, max: 300 },
]

export const BROADCAST_FLOW_OPTIONS = [
  { id: 'text', label: 'Mensagem de texto' },
]

export function useWhatsappDispatchContacts() {
  const contacts = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedIds = ref([])

  const filteredContacts = computed(() =>
    filterDispatchContactsBySearch(contacts.value, searchQuery.value),
  )

  const selectedContacts = computed(() =>
    contacts.value.filter((contact) => selectedIds.value.includes(contact.id)),
  )

  const refreshContactsList = (extraRows = []) => {
    contacts.value = collectContactsFromChats(extraRows)
  }

  const loadContacts = async () => {
    loading.value = true
    let addressRows = []

    try {
      await restoreContactsFromCache()
      await syncContactsDirectoryIfNeeded(true)

      const proxyBase = getProxyBase()
      const addressRes = await fetch(`${proxyBase}/contacts?contactScope=address_book`, {
        method: 'GET',
        headers: whatsappJsonHeaders(),
      })
      const addressPayload = await addressRes.json().catch(() => ([]))
      addressRows = Array.isArray(addressPayload) ? addressPayload : []

      await loadChats(false, { silent: true, lightSync: true })
      refreshContactsList(addressRows)

      void enrichMissingChatAvatars({ limit: 60 })
        .then(() => refreshContactsList(addressRows))
        .catch(() => {})
    } catch (error) {
      console.error('Erro ao carregar contatos para disparo', error)
      try {
        await loadContactsDirectory()
        refreshContactsList(addressRows)
      } catch {
        contacts.value = []
      }
    } finally {
      loading.value = false
    }
  }

  const toggleContact = (id) => {
    const set = new Set(selectedIds.value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    selectedIds.value = Array.from(set)
  }

  const clearSelection = () => {
    selectedIds.value = []
  }

  const resolveRecipient = (chatid = '') => {
    const jid = normalizeJid(chatid)
    const digits = extractDigitsFromJid(jid)
    const fromList = contacts.value.find((row) => row.jid === jid || row.number === digits)
    if (fromList) return fromList

    const chat = (chats.value || []).find((row) => {
      const phoneJid = resolvePrivateChatPhoneJid(row)
      return phoneJid === jid || normalizeJid(row?.chatJid || row?.wa_chatid || '') === jid
    })
    if (chat) {
      const mapped = mapChatToContact(chat)
      if (mapped) return mapped
    }

    const pseudoChat = { chatJid: jid, phone: digits ? `${digits}@s.whatsapp.net` : jid }
    return {
      jid: jid || (digits ? `${digits}@s.whatsapp.net` : ''),
      name: resolveChatListDisplayName(pseudoChat),
      hasSavedName: resolveChatHasSavedContactName(pseudoChat),
      avatarUrl: resolveChatListAvatarUrl(pseudoChat),
      displayNumber: formatJidAsPhoneLine(jid) || chatid,
      number: digits,
      subtitle: '',
    }
  }

  const buildRecipientJids = (manualNumbers = []) => {
    const jids = new Set()

    for (const contact of selectedContacts.value) {
      if (contact.jid) jids.add(contact.jid)
    }

    for (const raw of manualNumbers) {
      const digits = String(raw || '').replace(/\D/g, '')
      if (digits.length >= 8) jids.add(`${digits}@s.whatsapp.net`)
    }

    return Array.from(jids)
  }

  return {
    contacts,
    loading,
    searchQuery,
    selectedIds,
    filteredContacts,
    selectedContacts,
    loadContacts,
    toggleContact,
    clearSelection,
    resolveRecipient,
    buildRecipientJids,
  }
}
