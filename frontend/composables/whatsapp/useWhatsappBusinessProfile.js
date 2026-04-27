/**
 * useWhatsappBusinessProfile
 * Estado, fetch e extração do perfil comercial e catálogo.
 */
import { computed } from 'vue'
import {
  businessProfileModalOpen, businessProfileLoading, businessHoursExpanded,
  businessProfileModalData, businessProfileCatalog, businessCategoriesDirectory,
  businessCatalogJid, businessProfilePayloadLogged, selectedChat
} from './useWhatsappState.js'
import {
  extractDigitsFromJid, toUazapiChatNumber, buildPhoneVariants, buildLookupKeys,
  extractAvatarFromDetailsPayload, parseJsonBodySafe
} from './useWhatsappUtils.js'
import { getProxyBase, getAuthToken, fetchChatDetailsSafe } from './useWhatsappApi.js'

// ─── Helpers de horários ──────────────────────────────────────────────────────

const weekdayAliases = Object.freeze({ sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat' })

export const normalizeWeekdayKey = (value) => {
  const raw = String(value || '').trim().slice(0, 3).toLowerCase()
  return weekdayAliases[raw] || ''
}

export const formatMinutesToHour = (value) => {
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return ''
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const getNowForTimeZone = (timeZone) => {
  const now = new Date()
  const defaultDay = () => ({ day: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()], minutes: now.getHours() * 60 + now.getMinutes() })
  if (!String(timeZone || '').trim()) return defaultDay()
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
    const weekday = normalizeWeekdayKey(parts.find((p) => p.type === 'weekday')?.value)
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
    return { day: weekday || defaultDay().day, minutes: hour * 60 + minute }
  } catch { return defaultDay() }
}

export const buildHoursStateFromEntries = (entries = [], timeZone = '') => {
  const byDay = {}
  for (const item of entries) {
    const day = normalizeWeekdayKey(item?.DayOfWeek || item?.dayOfWeek || item?.day || item?.weekday)
    if (!day) continue
    const openRaw = item?.OpenTime ?? item?.openTime ?? item?.open ?? item?.start
    const closeRaw = item?.CloseTime ?? item?.closeTime ?? item?.close ?? item?.end
    const mode = String(item?.Mode || item?.mode || '').trim().toLowerCase()
    byDay[day] = {
      open: formatMinutesToHour(openRaw), close: formatMinutesToHour(closeRaw), mode,
      openMinutes: Number.isFinite(Number(openRaw)) ? Number(openRaw) : null,
      closeMinutes: Number.isFinite(Number(closeRaw)) ? Number(closeRaw) : null
    }
  }
  const nowRef = getNowForTimeZone(timeZone)
  const selected = byDay[nowRef.day]
  const hasValidRange = selected && Number.isFinite(selected.openMinutes) && Number.isFinite(selected.closeMinutes)
  const openNow = hasValidRange ? (nowRef.minutes >= selected.openMinutes && nowRef.minutes < selected.closeMinutes) : null
  const todayLabel = selected?.open && selected?.close ? `${selected.open} - ${selected.close}` : ''
  return { byDay, openNow, todayLabel }
}

// ─── Extração de perfil ───────────────────────────────────────────────────────

export const extractBusinessProfileFromResponse = (payload = {}, fallbackName = '') => {
  const response = payload?.response || payload || {}
  const source = response?.business_profile || response?.businessProfile || response?.profile || response
  const categories = Array.isArray(response?.categories)
    ? response.categories.map((item) => String(item?.localized_display_name || item?.Name || item?.name || item?.ID || item?.id || '').trim()).filter(Boolean)
    : []
  const normalizedCategories = categories.length > 0 ? categories
    : (Array.isArray(source?.categories) ? source.categories.map((item) => String(item?.localized_display_name || item?.display_name || item?.Name || item?.name || item?.ID || item?.id || item || '').trim()).filter(Boolean) : [])
  const websites = Array.isArray(response?.websites) ? response.websites.map((s) => String(s || '').trim()).filter(Boolean) : []
  const normalizedWebsites = websites.length > 0 ? websites
    : (Array.isArray(source?.websites) ? source.websites.map((s) => String(s || '').trim()).filter(Boolean)
      : (Array.isArray(source?.Websites) ? source.Websites.map((s) => String(s || '').trim()).filter(Boolean) : []))
  const openNowRaw = source?.open_now ?? source?.openNow ?? source?.is_open ?? source?.isOpen
  const normalizedOpenNow = typeof openNowRaw === 'boolean' ? openNowRaw
    : (String(openNowRaw || '').trim().toLowerCase() === 'true' ? true : (String(openNowRaw || '').trim().toLowerCase() === 'false' ? false : null))
  const businessHoursRaw = source?.business_hours ?? source?.businessHours ?? source?.BusinessHours ?? source?.hours ?? source?.opening_hours
  const businessHoursTimeZone = String(source?.BusinessHoursTimeZone || source?.businessHoursTimeZone || '').trim()
  let businessHours = '', businessHoursByDay = null, openNow = normalizedOpenNow
  if (typeof businessHoursRaw === 'string') businessHours = businessHoursRaw.trim()
  else if (Array.isArray(businessHoursRaw)) {
    const state = buildHoursStateFromEntries(businessHoursRaw, businessHoursTimeZone)
    businessHoursByDay = state.byDay; businessHours = state.todayLabel
    if (openNow === null && typeof state.openNow === 'boolean') openNow = state.openNow
  } else if (businessHoursRaw && typeof businessHoursRaw === 'object') businessHoursByDay = businessHoursRaw
  return {
    name: String(source?.tag || source?.Tag || source?.name || response?.tag || fallbackName || '').trim(),
    description: String(source?.description || source?.Description || '').trim(),
    address: String(source?.address || source?.Address || '').trim(),
    email: String(source?.email || source?.Email || '').trim(),
    websites: normalizedWebsites, categories: normalizedCategories,
    openNow, businessHours, businessHoursByDay, businessHoursTimeZone
  }
}

const deepFindByKeys = (input, candidateKeys = []) => {
  const wanted = new Set(candidateKeys.map((k) => String(k || '').toLowerCase()))
  const visited = new Set()
  const stack = [input]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue
    if (visited.has(current)) continue
    visited.add(current)
    if (Array.isArray(current)) { for (const item of current) stack.push(item); continue }
    for (const [key, value] of Object.entries(current)) {
      if (wanted.has(String(key || '').toLowerCase()) && value !== undefined && value !== null && value !== '') return value
      if (value && typeof value === 'object') stack.push(value)
    }
  }
  return null
}

export const extractBusinessProfileFromChatDetails = (payload = {}, fallbackName = '') => {
  const response = payload?.response || payload || {}
  const source = response?.business_profile || response?.businessProfile || response?.BusinessProfile || response?.profile || response
  const categoriesRaw = source?.categories || source?.Categories || source?.category || []
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw.map((item) => String(item?.localized_display_name || item?.display_name || item?.Name || item?.name || item?.ID || item?.id || item || '').trim()).filter(Boolean)
    : (String(categoriesRaw || '').trim() ? [String(categoriesRaw).trim()] : [])
  const websitesRaw = source?.websites || source?.Websites || source?.website || source?.site || []
  const websites = Array.isArray(websitesRaw) ? websitesRaw.map((s) => String(s || '').trim()).filter(Boolean)
    : (String(websitesRaw || '').trim() ? [String(websitesRaw).trim()] : (() => {
      const fb = deepFindByKeys(source, ['website', 'websites', 'site', 'url', 'link'])
      return String(fb || '').trim() ? [String(fb).trim()] : []
    })())
  const openNowRaw = source?.open_now ?? source?.openNow ?? source?.is_open ?? source?.isOpen ?? source?.business_hours?.is_open ?? source?.BusinessHours?.IsOpen ?? deepFindByKeys(source, ['open_now', 'openNow', 'is_open', 'isOpen', 'opened', 'isopened'])
  let openNow = typeof openNowRaw === 'boolean' ? openNowRaw : (String(openNowRaw || '').trim().toLowerCase() === 'true' ? true : (String(openNowRaw || '').trim().toLowerCase() === 'false' ? false : null))
  const businessHoursTimeZone = String(source?.BusinessHoursTimeZone || source?.businessHoursTimeZone || deepFindByKeys(source, ['businesshourstimezone', 'time_zone', 'timezone']) || '').trim()
  const businessHoursSource = source?.BusinessHours ?? source?.businessHours ?? source?.business_hours ?? deepFindByKeys(source, ['businesshours', 'business_hours'])
  let businessHours = '', businessHoursByDay = null
  if (Array.isArray(businessHoursSource)) {
    const state = buildHoursStateFromEntries(businessHoursSource, businessHoursTimeZone)
    businessHoursByDay = state.byDay; businessHours = state.todayLabel
    if (openNow === null && typeof state.openNow === 'boolean') openNow = state.openNow
  } else {
    businessHours = String(source?.business_hours_text || source?.businessHoursText || source?.hours_text || source?.hours || source?.business_hours?.text || source?.BusinessHours?.Text || deepFindByKeys(source, ['business_hours_text', 'businessHoursText', 'hours_text', 'hours', 'opening_hours', 'schedule']) || '').trim()
    businessHoursByDay = source?.business_hours || source?.businessHours || source?.BusinessHours || null
  }
  return {
    name: String(source?.tag || source?.Tag || source?.name || source?.Name || fallbackName || '').trim(),
    description: String(deepFindByKeys(source, ['description', 'about', 'bio']) || '').trim(),
    address: String(deepFindByKeys(source, ['address', 'fulladdress', 'formatted_address']) || '').trim(),
    email: String(deepFindByKeys(source, ['email', 'mail']) || '').trim(),
    websites, categories, openNow, businessHours, businessHoursByDay, businessHoursTimeZone
  }
}

export const mergeBusinessProfiles = (...profiles) => {
  const merged = { name: '', description: '', address: '', email: '', websites: [], categories: [], openNow: null, businessHours: '', businessHoursByDay: null, __isBusiness: true }
  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object') continue
    if (!merged.name && profile.name) merged.name = String(profile.name).trim()
    if (!merged.description && profile.description) merged.description = String(profile.description).trim()
    if (!merged.address && profile.address) merged.address = String(profile.address).trim()
    if (!merged.email && profile.email) merged.email = String(profile.email).trim()
    if (merged.websites.length === 0 && Array.isArray(profile.websites)) merged.websites = profile.websites.filter(Boolean)
    if (merged.categories.length === 0 && Array.isArray(profile.categories)) merged.categories = profile.categories.filter(Boolean)
    if (merged.openNow === null && typeof profile.openNow === 'boolean') merged.openNow = profile.openNow
    if (!merged.businessHours && profile.businessHours) merged.businessHours = String(profile.businessHours).trim()
    if (!merged.businessHoursByDay && profile.businessHoursByDay) merged.businessHoursByDay = profile.businessHoursByDay
  }
  return merged
}

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export const normalizeCatalogIdCandidates = (raw = {}) =>
  [raw?.id, raw?.ID, raw?.productId, raw?.ProductID, raw?.retailer_id, raw?.RetailerID, raw?.retailerId, raw?.product?.id, raw?.product?.productId, raw?.response?.id, raw?.response?.productId]
    .map((v) => String(v || '').trim()).filter(Boolean)

export const extractBusinessProductImageUrl = (raw = {}) => {
  const root = raw?.response?.product || raw?.response || raw?.product || raw
  const fi = (arr) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null
  const img1 = fi(root?.Images), img2 = fi(root?.images), med1 = fi(root?.Medias), med2 = fi(root?.medias)
  const candidates = [root?.image, root?.imageUrl, root?.image_url, root?.thumbnail, root?.thumbnailUrl, root?.preview, root?.cover, root?.coverUrl, root?.photo, root?.photoUrl, root?.media?.url, root?.media?.link, root?.media?.image, root?.media?.imageUrl, root?.Media?.url, root?.Media?.link, root?.Media?.image, root?.Media?.imageUrl, img1?.OriginalImageUrl, img1?.RequestImageUrl, img1?.URL, img1?.Url, img1?.url, img1?.image, img1?.imageUrl, img2?.OriginalImageUrl, img2?.RequestImageUrl, img2?.URL, img2?.Url, img2?.url, img2?.image, img2?.imageUrl, med1?.OriginalImageUrl, med1?.RequestImageUrl, med1?.URL, med1?.Url, med1?.url, med1?.image, med1?.imageUrl, med2?.OriginalImageUrl, med2?.RequestImageUrl, med2?.URL, med2?.Url, med2?.url, med2?.image, med2?.imageUrl, root?.media_data?.[0]?.url, root?.media_data?.[0]?.link, root?.media_data?.[0]?.image, root?.media_data?.[0]?.imageUrl, root?.product?.image, root?.product?.imageUrl, root?.product?.thumbnail]
  for (const c of candidates) { const v = String(c || '').trim(); if (v) return v }
  return ''
}

export const normalizeBusinessProduct = (raw = {}) => {
  const ids = normalizeCatalogIdCandidates(raw)
  return {
    ...raw,
    id: String(ids[0] || '').trim(),
    retailerId: String(raw?.retailer_id || raw?.RetailerID || raw?.retailerId || '').trim(),
    name: String(raw?.name || raw?.Name || raw?.title || raw?.Title || raw?.product_name || raw?.ProductName || raw?.retailer_id || raw?.RetailerID || '').trim(),
    imageUrl: extractBusinessProductImageUrl(raw)
  }
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

export const fetchBusinessProfileByJid = async (jid, fallbackName = '') => {
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/business/get/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ jid })
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) return null
  if (!businessProfilePayloadLogged.value) {
    const source = data?.response || data || {}
    const keys = source && typeof source === 'object' ? Object.keys(source) : []
    console.info('[BusinessProfile] chaves retornadas por /business/get/profile:', keys)
    businessProfilePayloadLogged.value = true
  }
  return { ...extractBusinessProfileFromResponse(data, fallbackName), __isBusiness: true }
}

export const fetchBusinessChatDetailsByJid = async (jid, fallbackName = '') => {
  const number = toUazapiChatNumber(jid)
  if (!number) return null
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/chat/details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ number, preview: true })
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) return null
  return extractBusinessProfileFromChatDetails(data, fallbackName)
}

export const fetchBusinessCatalogByJid = async (jid) => {
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/business/catalog/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ jid, limit: 5 })
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) return []
  const response = data?.response || {}
  const products = Array.isArray(response?.Products) ? response.Products : (Array.isArray(response?.products) ? response.products : [])
  return products.slice(0, 5).map((item) => normalizeBusinessProduct(item))
}

export const fetchBusinessCategories = async () => {
  const proxyBase = getProxyBase()
  const res = await fetch(`${proxyBase}/business/get/categories`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getAuthToken()}` }
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) return {}
  const rows = Array.isArray(data?.response) ? data.response : []
  const mapped = {}
  for (const row of rows) {
    const id = String(row?.id || '').trim()
    const label = String(row?.localized_display_name || '').trim()
    if (id && label) mapped[id] = label
  }
  return mapped
}

export const fetchBusinessCatalogInfoByJid = async (jid, product) => {
  if (!jid) return null
  const idCandidates = normalizeCatalogIdCandidates(product)
  if (idCandidates.length === 0) return null
  const proxyBase = getProxyBase()
  for (const id of idCandidates) {
    const res = await fetch(`${proxyBase}/business/catalog/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ jid, id })
    })
    const data = await parseJsonBodySafe(res)
    if (!res.ok) continue
    const response = data?.response || data || {}
    const normalized = normalizeBusinessProduct(response)
    if (normalized.id || normalized.imageUrl || normalized.name) return normalized
  }
  return null
}

export const showCatalogProduct = async (product) => {
  const candidates = normalizeCatalogIdCandidates(product)
  if (candidates.length === 0) return
  const proxyBase = getProxyBase()
  try {
    for (const id of candidates) {
      const res = await fetch(`${proxyBase}/business/catalog/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ id })
      })
      if (res.ok) return
    }
    console.warn('Falha ao mostrar produto no catálogo: nenhum id aceito pela API.')
  } catch (error) { console.warn('Falha ao mostrar produto no catálogo', error) }
}

// ─── openBusinessProfile ──────────────────────────────────────────────────────

export const openBusinessProfile = async (chat) => {
  if (!chat) return
  const jid = String(chat.chatJid || chat.jid || '').trim()
  businessCatalogJid.value = jid
  businessProfileModalOpen.value = true
  businessProfileLoading.value = true
  businessHoursExpanded.value = false
  businessProfileModalData.value = null
  businessProfileCatalog.value = []
  const fallbackName = String(chat.name || chat.pushName || '').trim()
  try {
    const [profileFromApi, profileFromDetails] = await Promise.allSettled([
      fetchBusinessProfileByJid(jid, fallbackName),
      fetchBusinessChatDetailsByJid(jid, fallbackName)
    ])
    const apiProfile = profileFromApi.status === 'fulfilled' ? profileFromApi.value : null
    const detailsProfile = profileFromDetails.status === 'fulfilled' ? profileFromDetails.value : null
    businessProfileModalData.value = mergeBusinessProfiles(apiProfile, detailsProfile) || { name: fallbackName }
  } catch (err) {
    console.error('Erro ao buscar perfil comercial', err)
    businessProfileModalData.value = { name: fallbackName }
  } finally { businessProfileLoading.value = false }
  try {
    businessProfileCatalog.value = await fetchBusinessCatalogByJid(jid)
  } catch { businessProfileCatalog.value = [] }
  if (Object.keys(businessCategoriesDirectory.value).length === 0) {
    try { businessCategoriesDirectory.value = await fetchBusinessCategories() } catch {}
  }
}

export const closeBusinessProfile = () => {
  businessProfileModalOpen.value = false
  businessProfileModalData.value = null
  businessProfileCatalog.value = []
  businessCatalogJid.value = ''
}

// ─── Computed de exibição ─────────────────────────────────────────────────────

export const businessProfileDisplayName = computed(() =>
  String(businessProfileModalData.value?.name || selectedChat.value?.pushName || 'Empresa').trim()
)

export const businessProfilePhoneLabel = computed(() => {
  const digits = extractDigitsFromJid(businessCatalogJid.value)
  return digits ? `+${digits}` : ''
})

export const businessProfilePrimaryCategory = computed(() => {
  const categories = Array.isArray(businessProfileModalData.value?.categories) ? businessProfileModalData.value.categories : []
  return String(categories[0] || '').trim()
})

export const businessProfilePrimaryWebsite = computed(() => {
  const websites = Array.isArray(businessProfileModalData.value?.websites) ? businessProfileModalData.value.websites : []
  return String(websites[0] || '').trim()
})

export const businessProfileOpeningLabel = computed(() => {
  const openNow = businessProfileModalData.value?.openNow
  if (openNow === true) return 'Aberta agora'
  if (openNow === false) return 'Fechada agora'
  return ''
})

export const businessProfileHoursLabel = computed(() => {
  const profile = businessProfileModalData.value || {}
  const direct = String(profile.businessHours || profile.hours || '').trim()
  if (direct) return direct
  const daily = profile.businessHoursByDay
  if (!daily) return ''
  if (Array.isArray(daily)) return buildHoursStateFromEntries(daily, profile.businessHoursTimeZone || '').todayLabel
  if (typeof daily !== 'object') return ''
  const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  const selected = daily[weekday]
  if (!selected) return ''
  const open = String(selected.open || selected.start || '').trim()
  const close = String(selected.close || selected.end || '').trim()
  if (open && close) return `${open} - ${close}`
  return String(selected.label || '').trim()
})

const DAY_ORDER = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
const DAY_LABEL_MAP = { sat: 'Sábado', sun: 'Domingo', mon: 'Segunda-feira', tue: 'Terça-feira', wed: 'Quarta-feira', thu: 'Quinta-feira', fri: 'Sexta-feira' }

export const businessProfileWeeklyScheduleRows = computed(() => {
  const daily = businessProfileModalData.value?.businessHoursByDay
  if (!daily || typeof daily !== 'object' || Array.isArray(daily)) return []
  return DAY_ORDER.map((dayKey) => {
    const item = daily[dayKey]
    if (!item) return null
    const open = String(item.open || item.start || '').trim()
    const close = String(item.close || item.end || '').trim()
    const mode = String(item.mode || '').trim().toLowerCase()
    const value = mode === 'closed' ? 'Fechada' : (open && close ? `${open} - ${close}` : '')
    if (!value) return null
    return { dayKey, dayLabel: DAY_LABEL_MAP[dayKey] || dayKey, value }
  }).filter(Boolean)
})

export const businessProfileAddressLine = computed(() => String(businessProfileModalData.value?.address || '').trim())
export const businessProfileEmailLabel = computed(() => String(businessProfileModalData.value?.email || '').trim())
export const businessProfileCategoriesLabel = computed(() => {
  const categories = Array.isArray(businessProfileModalData.value?.categories) ? businessProfileModalData.value.categories : []
  return categories.filter(Boolean).join(' · ')
})
export const businessProfileCommercialSummary = computed(() => {
  const profile = businessProfileModalData.value || {}
  const parts = []
  const categories = Array.isArray(profile.categories) ? profile.categories.filter(Boolean) : []
  if (categories.length) parts.push(`Categoria: ${categories.join(' · ')}`)
  if (profile.address) parts.push(`Endereço: ${profile.address}`)
  if (profile.email) parts.push(`Email: ${profile.email}`)
  if (businessProfilePrimaryWebsite.value) parts.push(`Site: ${businessProfilePrimaryWebsite.value}`)
  return parts
})
export const businessProfileAvatarUrl = computed(() => String(selectedChat.value?.avatarUrl || selectedChat.value?.image || '').trim())

export function useWhatsappBusinessProfile() {
  return {
    openBusinessProfile, closeBusinessProfile,
    fetchBusinessProfileByJid, fetchBusinessChatDetailsByJid, fetchBusinessCatalogByJid,
    fetchBusinessCategories, fetchBusinessCatalogInfoByJid, showCatalogProduct,
    extractBusinessProfileFromResponse, extractBusinessProfileFromChatDetails,
    mergeBusinessProfiles, normalizeBusinessProduct, normalizeCatalogIdCandidates,
    extractBusinessProductImageUrl, buildHoursStateFromEntries, normalizeWeekdayKey,
    formatMinutesToHour,
    businessProfileDisplayName, businessProfilePhoneLabel, businessProfilePrimaryCategory,
    businessProfilePrimaryWebsite, businessProfileOpeningLabel, businessProfileHoursLabel,
    businessProfileWeeklyScheduleRows, businessProfileAddressLine, businessProfileEmailLabel,
    businessProfileCategoriesLabel, businessProfileCommercialSummary, businessProfileAvatarUrl
  }
}
