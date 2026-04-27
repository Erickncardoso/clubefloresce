/**
 * useWhatsappSharedContacts
 * Modais de salvar contato e adicionar a grupo, enrichment de avatares/business, openConversation.
 */
import { computed } from 'vue'
import {
  messages, chats,
  sharedContactAvatars, loadingSharedContactAvatars,
  sharedContactBusinessProfiles, sharedContactBusinessFlags,
  loadingSharedContactBusiness, sharedContactBusinessChecked,
  persistedContactStates, persistedContactStatesLoaded,
  saveContactModalOpen, savingContact, saveContactFeedback, saveContactForm,
  addToGroupModalOpen, addToGroupLoading, addToGroupSearch, addToGroupFeedback,
  addToGroupSelectedGroupJid, addToGroupParticipant, selectedChat,
  contactsDirectory, savedContactsIndex, senderAvatarDirectory
} from './useWhatsappState.js'
import {
  normalizeJid, buildLookupKeys, pickNameFromDirectory,
  normalizeContactPhone, buildPhoneVariants, normalizeNumberForContactAdd,
  toLocalBrPhoneMask, buildFullPhone, allNormalizedPrivateJidVariants,
  parseJsonBodySafe, extractAvatarFromDetailsPayload
} from './useWhatsappUtils.js'
import { getProxyBase, getAuthToken, getContactStatesBase, fetchChatDetailsSafe } from './useWhatsappApi.js'
import { updateGroupParticipants } from './useWhatsappGroupsApi.js'
import { loadContactsDirectory } from './useWhatsappContacts.js'
import {
  fetchBusinessProfileByJid, fetchBusinessChatDetailsByJid, fetchBusinessCatalogByJid,
  fetchBusinessCatalogInfoByJid, fetchBusinessCategories, mergeBusinessProfiles,
  normalizeCatalogIdCandidates
} from './useWhatsappBusinessProfile.js'
import { normalizeChat } from './useWhatsappChats.js'

// ─── Persisted contact states ─────────────────────────────────────────────────

const normalizeContactStateKey = (value) => normalizeJid(value)
const stickySavedByNumber = {}

const collectSharedContactJids = (items = []) => {
  const jids = new Set()
  for (const item of items) {
    const phone = item?.sharedContact?.phone
    const canonical = normalizeNumberForContactAdd(phone)
    if (!canonical) continue
    jids.add(`${canonical}@s.whatsapp.net`)
  }
  return Array.from(jids)
}

export const fetchPersistedContactStates = async (jids = []) => {
  if (jids.length === 0) return
  const contactStatesBase = getContactStatesBase()
  const res = await fetch(`${contactStatesBase}/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ jids })
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) return
  const rows = Array.isArray(data?.states) ? data.states : []
  const nextStates = { ...persistedContactStates.value }
  const nextLoaded = { ...persistedContactStatesLoaded.value }
  for (const jid of jids) nextLoaded[normalizeContactStateKey(jid)] = true
  for (const row of rows) {
    const key = normalizeContactStateKey(row?.contactJid)
    if (!key) continue
    nextStates[key] = { isSaved: Boolean(row?.isSaved), isBusiness: Boolean(row?.isBusiness) }
  }
  persistedContactStates.value = nextStates
  persistedContactStatesLoaded.value = nextLoaded
}

export const upsertPersistedContactStates = async (states = []) => {
  const payload = states
    .map((item) => ({ contactJid: normalizeContactStateKey(item?.contactJid), isSaved: Boolean(item?.isSaved), isBusiness: Boolean(item?.isBusiness) }))
    .filter((item) => item.contactJid)
  if (payload.length === 0) return
  const contactStatesBase = getContactStatesBase()
  await fetch(`${contactStatesBase}/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ states: payload })
  })
  const nextStates = { ...persistedContactStates.value }
  for (const item of payload) {
    const previous = nextStates[item.contactJid] || {}
    nextStates[item.contactJid] = { isSaved: Boolean(previous.isSaved || item.isSaved), isBusiness: Boolean(previous.isBusiness || item.isBusiness) }
  }
  persistedContactStates.value = nextStates
}

export const hydratePersistedContactStatesFromMessages = async (items = []) => {
  const jids = collectSharedContactJids(items)
  const missing = jids.filter((jid) => !persistedContactStatesLoaded.value[normalizeContactStateKey(jid)])
  if (missing.length === 0) return
  await fetchPersistedContactStates(missing)
}

// ─── Shared contact helpers ───────────────────────────────────────────────────

export const isSharedContactSaved = (sharedContact) => {
  const canonical = normalizeNumberForContactAdd(sharedContact?.phone)
  if (canonical && stickySavedByNumber[canonical] === true) return true
  const phoneVariants = buildPhoneVariants(sharedContact?.phone)
  if (phoneVariants.length === 0) return false
  const number = canonical
  const rawPhone = normalizeContactPhone(sharedContact?.phone)
  const variantJids = phoneVariants.flatMap((v) => [`${v}@s.whatsapp.net`, `${v}@lid`])
  const keys = buildLookupKeys(rawPhone, number, ...phoneVariants, `${rawPhone}@s.whatsapp.net`, `${number}@s.whatsapp.net`, `${rawPhone}@lid`, `${number}@lid`, ...variantJids)
  const hasSavedName = Boolean(pickNameFromDirectory(contactsDirectory.value, keys))
  const hasSavedIndex = keys.some((key) => Boolean(savedContactsIndex.value?.[key]))
  const hasPersistedSaved = keys.some((key) => Boolean(persistedContactStates.value?.[normalizeContactStateKey(key)]?.isSaved))
  const isSaved = hasSavedName || hasSavedIndex || hasPersistedSaved
  if (isSaved && canonical) stickySavedByNumber[canonical] = true
  return isSaved
}

export const getSharedContactAvatar = (sharedContact) => {
  const phoneVariants = buildPhoneVariants(sharedContact?.phone)
  if (phoneVariants.length === 0) return ''
  for (const number of phoneVariants) {
    const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`, `${number}@lid`)
    for (const key of keys) {
      const avatar = String(sharedContactAvatars.value?.[key] || '').trim()
      if (avatar) return avatar
      const senderAvatar = String(senderAvatarDirectory.value?.[key] || '').trim()
      if (senderAvatar) return senderAvatar
    }
    const chatMatch = chats.value.find((chat) => {
      const chatKeys = buildLookupKeys(chat?.chatJid, chat?.wa_chatid, chat?.wa_chatlid, chat?.id, chat?.phone)
      return chatKeys.some((key) => keys.includes(key))
    })
    const chatAvatar = String(chatMatch?.avatarUrl || chatMatch?.image || chatMatch?.imagePreview || '').trim()
    if (chatAvatar) return chatAvatar
    const canonicalAvatar = String(sharedContactAvatars.value?.[number] || '').trim()
    if (canonicalAvatar) return canonicalAvatar
  }
  const fallback = String(sharedContact?.avatar || sharedContact?.avatarUrl || sharedContact?.image || '').trim()
  if (fallback) {
    const canonical = normalizeNumberForContactAdd(sharedContact?.phone)
    if (canonical) sharedContactAvatars.value = { ...sharedContactAvatars.value, [canonical]: fallback }
    return fallback
  }
  return ''
}

const resolveAvatarFromDetailsCandidates = async (number) => {
  const candidates = [`${number}@s.whatsapp.net`, `${number}@lid`, number]
  for (const candidate of candidates) {
    const data = await fetchChatDetailsSafe(candidate, { preview: true, timeoutMs: 4500, cacheTtlMs: 120000 })
    if (!data) continue
    const avatarUrl = extractAvatarFromDetailsPayload(data)
    if (avatarUrl) return avatarUrl
  }
  return ''
}

// ─── Enrich avatares ──────────────────────────────────────────────────────────

export const enrichSharedContactAvatars = async (items = []) => {
  const sharedContacts = items.map((item) => item?.sharedContact).filter((contact) => Boolean(contact?.phone))
  if (sharedContacts.length === 0) return
  const nextAvatars = { ...sharedContactAvatars.value }
  const nextLoading = { ...loadingSharedContactAvatars.value }
  const numbersToFetch = new Set()
  for (const contact of sharedContacts) {
    const variants = buildPhoneVariants(contact.phone)
    for (const number of variants) {
      const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`, `${number}@lid`)
      const alreadyKnown = keys.some((key) => Boolean(nextAvatars[key]))
      const isLoading = keys.some((key) => Boolean(nextLoading[key]))
      if (!alreadyKnown && !isLoading) {
        numbersToFetch.add(number)
        for (const key of keys) nextLoading[key] = true
      }
    }
  }
  loadingSharedContactAvatars.value = nextLoading
  if (numbersToFetch.size === 0) return
  await Promise.allSettled(
    Array.from(numbersToFetch).slice(0, 16).map(async (number) => {
      const avatarUrl = await resolveAvatarFromDetailsCandidates(number)
      const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`, `${number}@lid`)
      for (const key of keys) {
        if (avatarUrl) nextAvatars[key] = avatarUrl
        nextLoading[key] = false
      }
      if (avatarUrl) nextAvatars[number] = avatarUrl
    })
  )
  sharedContactAvatars.value = nextAvatars
  loadingSharedContactAvatars.value = nextLoading
  messages.value = [...messages.value]
}

export const getSharedContactBusinessProfile = (sharedContact) => {
  const phoneVariants = buildPhoneVariants(sharedContact?.phone)
  if (phoneVariants.length === 0) return null
  for (const number of phoneVariants) {
    const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`)
    for (const key of keys) {
      const profile = sharedContactBusinessProfiles.value?.[key]
      if (profile) return profile
    }
  }
  return null
}

export const hasSharedContactBusinessProfile = (sharedContact) => {
  const phoneVariants = buildPhoneVariants(sharedContact?.phone)
  if (phoneVariants.length === 0) return false
  for (const number of phoneVariants) {
    const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`)
    for (const key of keys) {
      const persistedState = persistedContactStates.value?.[normalizeContactStateKey(key)]
      if (sharedContactBusinessFlags.value?.[key] === true || persistedState?.isBusiness === true) return true
    }
  }
  return false
}

export const isSharedContactBusiness = (sharedContact) => hasSharedContactBusinessProfile(sharedContact)

// ─── Enrich business profiles ─────────────────────────────────────────────────

export const enrichSharedContactBusinessProfiles = async (items = []) => {
  const sharedContacts = items.map((item) => item?.sharedContact).filter((contact) => Boolean(contact?.phone))
  if (sharedContacts.length === 0) return
  const nextProfiles = { ...sharedContactBusinessProfiles.value }
  const nextFlags = { ...sharedContactBusinessFlags.value }
  const nextLoading = { ...loadingSharedContactBusiness.value }
  const nextChecked = { ...sharedContactBusinessChecked.value }
  const statesToPersist = []
  const numbersToFetch = new Set()
  for (const contact of sharedContacts) {
    const canonicalNumber = normalizeNumberForContactAdd(contact.phone)
    if (!canonicalNumber) continue
    const keys = buildLookupKeys(canonicalNumber, `${canonicalNumber}@s.whatsapp.net`)
    const alreadyChecked = keys.some((key) => nextChecked[key] === true)
    const isLoading = keys.some((key) => Boolean(nextLoading[key]))
    if (!alreadyChecked && !isLoading) {
      numbersToFetch.add(canonicalNumber)
      for (const key of keys) nextLoading[key] = true
    }
  }
  loadingSharedContactBusiness.value = nextLoading
  if (numbersToFetch.size === 0) return
  const numbersBatch = Array.from(numbersToFetch).slice(0, 30)
  const proxyBase = getProxyBase()
  try {
    const checkRes = await fetch(`${proxyBase}/chat/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ numbers: numbersBatch })
    })
    const checkData = await parseJsonBodySafe(checkRes)
    const rows = Array.isArray(checkData) ? checkData : []
    for (const number of numbersBatch) {
      const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`)
      const hit = rows.find((row) => { const rowKeys = buildLookupKeys(row?.query, row?.jid, row?.lid); return rowKeys.some((key) => keys.includes(key)) })
      const isBusinessByCheck = Boolean(String(hit?.verifiedName || '').trim() || hit?.isBusiness === true || String(hit?.businessName || '').trim())
      for (const key of keys) { nextFlags[key] = isBusinessByCheck || nextFlags[key] === true; nextLoading[key] = false; nextChecked[key] = true }
      if (isBusinessByCheck) statesToPersist.push({ contactJid: `${number}@s.whatsapp.net`, isBusiness: true })
    }
  } catch (error) {
    for (const number of numbersBatch) {
      const keys = buildLookupKeys(number, `${number}@s.whatsapp.net`)
      for (const key of keys) { nextLoading[key] = false; nextChecked[key] = true }
    }
    console.warn('Falha ao consultar endpoints Business da UAZAPI', error)
  }
  sharedContactBusinessProfiles.value = nextProfiles
  sharedContactBusinessFlags.value = nextFlags
  loadingSharedContactBusiness.value = nextLoading
  sharedContactBusinessChecked.value = nextChecked
  if (statesToPersist.length > 0) await upsertPersistedContactStates(statesToPersist)
  messages.value = [...messages.value]
}

// ─── Persist saved states ─────────────────────────────────────────────────────

export const persistSavedStatesFromMessages = async (items = []) => {
  const states = []
  for (const item of items) {
    const contact = item?.sharedContact
    if (!contact?.phone) continue
    if (!isSharedContactSaved(contact)) continue
    const canonical = normalizeNumberForContactAdd(contact.phone)
    if (!canonical) continue
    states.push({ contactJid: `${canonical}@s.whatsapp.net`, isSaved: true })
  }
  if (states.length > 0) await upsertPersistedContactStates(states)
}

// ─── Save contact modal ───────────────────────────────────────────────────────

const persistSharedContact = async (sharedContact) => {
  try {
    const name = String(sharedContact?.name || '').trim()
    const number = normalizeNumberForContactAdd(sharedContact?.phone)
    if (!name || !number) return
    const proxyBase = getProxyBase()
    const res = await fetch(`${proxyBase}/contact/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ number, name })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message || data?.error || 'Falha ao salvar contato')
    }
    const savedProbe = { name, phone: number }
    for (let attempt = 0; attempt < 3; attempt++) {
      await loadContactsDirectory()
      if (isSharedContactSaved(savedProbe)) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    await upsertPersistedContactStates([{ contactJid: `${number}@s.whatsapp.net`, isSaved: true }])
    messages.value = [...messages.value]
    return { ok: true }
  } catch (error) {
    console.error('Erro ao salvar contato compartilhado', error)
    return { ok: false, error: (error?.message || 'Falha ao salvar contato') }
  }
}

export const openSaveContactModal = (sharedContact) => {
  const normalized = normalizeContactPhone(sharedContact?.phone)
  const countryCode = '55'
  const localPhone = toLocalBrPhoneMask(normalized)
  const fullPhone = buildFullPhone(countryCode, localPhone)
  saveContactForm.value = { name: String(sharedContact?.name || '').trim(), lastName: '', countryCode, localPhone, phone: fullPhone }
  saveContactFeedback.value = ''
  saveContactModalOpen.value = true
}

export const closeSaveContactModal = () => {
  if (savingContact.value) return
  saveContactModalOpen.value = false
}

export const confirmSaveContact = async () => {
  if (savingContact.value) return
  const fullPhone = buildFullPhone(saveContactForm.value.countryCode, saveContactForm.value.localPhone)
  saveContactForm.value.phone = fullPhone
  const fullName = [saveContactForm.value.name, saveContactForm.value.lastName].map((v) => String(v || '').trim()).filter(Boolean).join(' ')
  const payload = { name: fullName, phone: String(fullPhone || '').trim() }
  if (!payload.name || !payload.phone) { saveContactFeedback.value = 'Preencha nome e telefone.'; return }
  try {
    savingContact.value = true
    const result = await persistSharedContact(payload)
    if (result?.ok) {
      saveContactFeedback.value = 'Contato salvo com sucesso.'
      setTimeout(() => { saveContactModalOpen.value = false }, 600)
      return
    }
    saveContactFeedback.value = result?.error || 'Falha ao salvar contato.'
  } finally { savingContact.value = false }
}

// ─── Add to group modal ───────────────────────────────────────────────────────

export const filteredGroupChats = computed(() => {
  const groups = chats.value.filter((chat) => chat.isGroup)
  const query = String(addToGroupSearch.value || '').trim().toLowerCase()
  if (!query) return groups
  return groups.filter((group) => {
    const groupName = String(group.pushName || group.name || '').toLowerCase()
    const groupJid = String(group.chatJid || '').toLowerCase()
    return groupName.includes(query) || groupJid.includes(query)
  })
})

export const addSharedContactToGroup = (sharedContact) => {
  const participant = normalizeNumberForContactAdd(sharedContact?.phone)
  if (!participant) return
  addToGroupParticipant.value = participant
  addToGroupSelectedGroupJid.value = ''
  addToGroupSearch.value = ''
  addToGroupFeedback.value = ''
  addToGroupModalOpen.value = true
}

export const closeAddToGroupModal = () => {
  if (addToGroupLoading.value) return
  addToGroupModalOpen.value = false
}

export const confirmAddSharedContactToGroup = async () => {
  if (!addToGroupParticipant.value || !addToGroupSelectedGroupJid.value || addToGroupLoading.value) return
  try {
    addToGroupLoading.value = true
    addToGroupFeedback.value = ''
    await updateGroupParticipants({
      groupjid: addToGroupSelectedGroupJid.value,
      action: 'add',
      participants: [addToGroupParticipant.value]
    })
    addToGroupFeedback.value = 'Contato adicionado ao grupo com sucesso.'
    setTimeout(() => { addToGroupModalOpen.value = false }, 600)
  } catch (error) {
    addToGroupFeedback.value = error?.message || 'Erro ao adicionar contato ao grupo.'
    console.error('Erro ao adicionar contato ao grupo', error)
  } finally { addToGroupLoading.value = false }
}

// ─── Open conversation ────────────────────────────────────────────────────────

export const openConversationFromSharedContact = async (sharedContact, selectChatFn, loadChatsFn, getChatActivityTimestampFn) => {
  const queryNumber = normalizeNumberForContactAdd(sharedContact?.phone)
  if (!queryNumber) return
  const toPersonalJid = (n) => { const digits = normalizeNumberForContactAdd(n); return digits ? `${digits}@s.whatsapp.net` : '' }
  let targetJid = toPersonalJid(queryNumber)
  const proxyBase = getProxyBase()
  try {
    const checkRes = await fetch(`${proxyBase}/chat/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ numbers: [queryNumber] })
    })
    const checkData = await checkRes.json().catch(() => ([]))
    if (checkRes.ok && Array.isArray(checkData) && checkData[0]?.jid) targetJid = String(checkData[0].jid)
  } catch (error) { console.warn('Falha ao validar contato com /chat/check', error) }
  if (!targetJid) return
  const targetKeys = new Set(buildLookupKeys(queryNumber, targetJid, ...allNormalizedPrivateJidVariants(targetJid)))
  const chatMatchesTarget = (chat) => {
    const candidates = [chat?.chatJid, chat?.wa_chatid, chat?.wa_chatlid, chat?.id]
    const chatKeys = buildLookupKeys(...candidates)
    return chatKeys.some((key) => targetKeys.has(key))
  }
  const existingChat = chats.value.find((chat) => chatMatchesTarget(chat))
  if (existingChat) { await selectChatFn(existingChat); return }
  try {
    if (loadChatsFn) await loadChatsFn(false, { silent: true, lightSync: true })
    const existingAfterSync = chats.value.find((chat) => chatMatchesTarget(chat))
    if (existingAfterSync) { await selectChatFn(existingAfterSync); return }
  } catch {}
  const virtualChat = normalizeChat({ chatJid: targetJid, wa_chatid: targetJid, name: sharedContact?.name || '', wa_name: sharedContact?.name || '', wa_contactName: sharedContact?.name || '', wa_isGroup: false, wa_lastMsgTimestamp: Date.now() })
  chats.value = [virtualChat, ...chats.value].sort((a, b) => {
    const pinA = a?.isPinned ? 1 : 0, pinB = b?.isPinned ? 1 : 0
    if (pinA !== pinB) return pinB - pinA
    return getChatActivityTimestampFn(b) - getChatActivityTimestampFn(a)
  })
  await selectChatFn(virtualChat)
}

export const openBusinessProfileFromSharedContact = async (sharedContact, options = {}) => {
  const { openBusinessProfileFn, businessProfileStateSetter, selectChatFn, loadChatsFn, getChatActivityTimestampFn } = options
  const queryNumber = normalizeNumberForContactAdd(sharedContact?.phone)
  if (!queryNumber) return
  await openConversationFromSharedContact(sharedContact, selectChatFn, loadChatsFn, getChatActivityTimestampFn)
  const jid = `${queryNumber}@s.whatsapp.net`
  if (openBusinessProfileFn) openBusinessProfileFn(jid, sharedContact?.name || '')
  const catalog = await fetchBusinessCatalogByJid(jid).catch(() => [])
  const categoriesMap = await fetchBusinessCategories().catch(() => ({}))
  const [profile, profileFromDetails] = await Promise.allSettled([
    fetchBusinessProfileByJid(jid, sharedContact?.name || ''),
    fetchBusinessChatDetailsByJid(jid, sharedContact?.name || '')
  ])
  const mergedProfile = mergeBusinessProfiles(
    profileFromDetails.status === 'fulfilled' ? profileFromDetails.value : null,
    profile.status === 'fulfilled' ? profile.value : null
  )
  const categoryNames = Array.isArray(mergedProfile?.categories)
    ? mergedProfile.categories.map((v) => categoriesMap[v] || v).filter(Boolean)
    : []
  const normalizedCatalog = await Promise.all(
    catalog.map(async (item) => {
      const info = await fetchBusinessCatalogInfoByJid(jid, item).catch(() => null)
      if (!info) return item
      return { ...item, ...info, imageUrl: info.imageUrl || item.imageUrl || '' }
    })
  )
  const keys = buildLookupKeys(queryNumber, jid)
  const nextProfiles = { ...sharedContactBusinessProfiles.value }
  const nextFlags = { ...sharedContactBusinessFlags.value }
  for (const key of keys) { nextProfiles[key] = mergedProfile; nextFlags[key] = true }
  sharedContactBusinessProfiles.value = nextProfiles
  sharedContactBusinessFlags.value = nextFlags
  if (businessProfileStateSetter) {
    businessProfileStateSetter({
      profile: { ...mergedProfile, categories: categoryNames.length ? categoryNames : mergedProfile?.categories || [] },
      catalog: normalizedCatalog,
      categoriesMap
    })
  }
}

export function useWhatsappSharedContacts() {
  return {
    fetchPersistedContactStates, upsertPersistedContactStates, hydratePersistedContactStatesFromMessages,
    isSharedContactSaved, getSharedContactAvatar, getSharedContactBusinessProfile,
    hasSharedContactBusinessProfile, isSharedContactBusiness,
    enrichSharedContactAvatars, enrichSharedContactBusinessProfiles, persistSavedStatesFromMessages,
    openSaveContactModal, closeSaveContactModal, confirmSaveContact,
    filteredGroupChats, addSharedContactToGroup, closeAddToGroupModal, confirmAddSharedContactToGroup,
    openConversationFromSharedContact, openBusinessProfileFromSharedContact
  }
}
