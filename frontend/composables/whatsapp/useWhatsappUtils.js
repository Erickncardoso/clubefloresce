/**
 * useWhatsappUtils
 * Funções utilitárias puras (sem estado Vue) para o módulo WhatsApp.
 * Não importa nenhum outro composable — ponto de partida da árvore de dependências.
 */

// ─── JID ─────────────────────────────────────────────────────────────────────

export const normalizeJid = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('@')) {
    const at = raw.indexOf('@')
    let local = raw.slice(0, at)
    const domain = raw.slice(at + 1)
    // Multi-device: "5511999999999:2@s.whatsapp.net" — usar o primeiro segmento (o .pop() quebrava a agenda).
    // @lid: manter o local completo (com ':' se vier) para bater com group/info.
    if (local.includes(':') && domain !== 'lid') local = local.split(':')[0]
    return `${local}@${domain}`
  }
  return raw.includes(':') ? raw.split(':').pop() : raw
}

export const extractDigitsFromJid = (value) => {
  const jid = normalizeJid(value)
  if (!jid) return ''
  const localPart = (jid.split('@')[0] || '').split(':')[0] || ''
  return localPart.replace(/\D/g, '')
}

export const isGroupJid = (jid) => normalizeJid(jid).endsWith('@g.us')

export const extractWhatsappNumber = (value) => {
  const jid = normalizeJid(value)
  if (!jid) return ''
  const localPart = (jid.split('@')[0] || '').split(':')[0] || ''
  return extractDigitsFromJid(jid) || localPart
}

export const toUazapiChatNumber = (value) => {
  const jid = normalizeJid(value)
  if (!jid) return ''
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')) return jid
  if (jid.endsWith('@lid')) return ''
  const digits = jid.replace(/\D/g, '')
  if (!digits) return ''
  return `${digits}@s.whatsapp.net`
}

export const allNormalizedPrivateJidVariants = (jid) => {
  const j = normalizeJid(jid)
  if (!j) return []
  if (j.endsWith('@g.us')) return [j]
  const digits = extractDigitsFromJid(j).replace(/\D/g, '')
  const set = new Set([j])
  if (digits.length >= 10) {
    set.add(normalizeJid(`${digits}@s.whatsapp.net`))
    set.add(normalizeJid(`${digits}@lid`))
  }
  return [...set].filter(Boolean)
}

/** Parseia msg.content / msg.Content quando vem string JSON (comum na UAZAPI) — sem depender de outros composables. */
export const parseLooseMessageContent = (msg) => {
  const raw = msg?.content ?? msg?.Content
  if (raw && typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    const t = String(raw).trim()
    if (!t) return {}
    try {
      const o = JSON.parse(t)
      return o && typeof o === 'object' ? o : {}
    } catch {
      return {}
    }
  }
  return {}
}

export const formatJidAsPhoneLine = (jid) => {
  const d = extractWhatsappNumber(jid).replace(/\D/g, '')
  if (!d) return ''
  if (d.length >= 12 && d.startsWith('55')) {
    const rest = d.slice(2)
    if (rest.length === 11) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 7)}-${rest.slice(7)}`
    if (rest.length === 10) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 6)}-${rest.slice(6)}`
  }
  if (d.length === 11) return `+55 ${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `+55 ${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  return `+${d}`
}

// ─── Lookup Keys ──────────────────────────────────────────────────────────────

export const buildLookupKeys = (...values) => {
  const keys = new Set()
  for (const value of values) {
    const jid = normalizeJid(value)
    if (!jid) continue
    keys.add(jid)
    if (jid.endsWith('@lid')) {
      const loc = jid.split('@')[0] || ''
      if (loc.includes(':')) {
        keys.add(`${loc.split(':')[0]}@lid`)
        keys.add(`${loc.split(':').pop()}@lid`)
      }
    }
    const digits = extractDigitsFromJid(jid)
    if (!digits) continue
    keys.add(digits)
    if (digits.startsWith('55') && digits.length > 11) keys.add(digits.slice(2))
    else if (!digits.startsWith('55') && digits.length >= 10) keys.add(`55${digits}`)
  }
  return Array.from(keys)
}

/**
 * Filtra candidatos de lookup para identidade de remetente.
 * Remove JIDs de grupo e evita incluir o próprio chat de grupo como se fosse sender.
 */
export const filterSenderLookupCandidates = (rawCandidates = [], messageChatJid = '') => {
  const normalizedChatJid = normalizeJid(messageChatJid)
  return (Array.isArray(rawCandidates) ? rawCandidates : []).filter((candidate) => {
    const normalized = normalizeJid(candidate)
    if (!normalized) return false
    if (normalized.endsWith('@g.us')) return false
    if (normalizedChatJid && normalizedChatJid.endsWith('@g.us') && normalized === normalizedChatJid) return false
    return true
  })
}

export const pickNameFromDirectory = (directory, keys) => {
  for (const key of keys) {
    const value = String(directory?.[key] || '').trim()
    if (value) return value
  }
  return ''
}

// ─── String utils ─────────────────────────────────────────────────────────────

export const strTrim = (v) => (v == null ? '' : String(v).trim())

export const waEscapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const looksLikePhoneNumber = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '')
  return digits.length >= 8
}

export const extractPhoneDigits = (value) => String(value || '').replace(/[^\d]/g, '')

export const normalizeTimestampToMs = (value) => {
  if (!value) return 0
  const numericValue = Number(value)
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue < 1e12 ? numericValue * 1000 : numericValue
  }
  const dateMs = new Date(value).getTime()
  return Number.isFinite(dateMs) ? dateMs : 0
}

export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const ms = normalizeTimestampToMs(timestamp)
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── WhatsApp Text Formatting ─────────────────────────────────────────────────

const WA_LIST_LINE = /^\s*([-*+•])\s+(.+)$/

const waApplyInlineToEscaped = (escapedLine, { allowBr = false } = {}) => {
  let t = String(escapedLine || '')
  if (allowBr) t = t.replace(/\r\n|\r|\n/g, '<br>')
  t = t.replace(/`([^`]+?)`/g, '<code class="wa-inline-code">$1</code>')
  t = t.replace(/~([^~`]+?)~/g, '<s class="wa-strike">$1</s>')
  t = t.replace(/\*([^*`\n]+?)\*/g, '<strong class="wa-bold">$1</strong>')
  t = t.replace(/_([^_`\n]+?)_/g, '<em class="wa-italic">$1</em>')
  t = t.replace(/\[\[MENTION:(\d{8,}):([^\]]+)\]\]/g, (_, digits, name) => {
    const safeName = waEscapeHtml(name)
    return `<span class="wa-mention" data-mention-number="${digits}">@${safeName}</span>`
  })
  return t
}

const waFormatPlainSegmentWithBulletLists = (chunk) => {
  const escaped = waEscapeHtml(chunk)
  const lines = escaped.split('\n')
  const blocks = []
  let listBuf = []
  const flushList = () => {
    if (listBuf.length) {
      blocks.push({
        type: 'ul',
        html: `<ul class="wa-msg-list">${
          listBuf.map((item) => `<li class="wa-msg-li">${waApplyInlineToEscaped(item, { allowBr: false })}</li>`).join('')
        }</ul>`
      })
      listBuf = []
    }
  }
  for (const line of lines) {
    const m = line.match(WA_LIST_LINE)
    if (m) { listBuf.push(m[2]) }
    else { flushList(); if (strTrim(line)) blocks.push({ type: 'p', text: line }) }
  }
  flushList()
  return blocks.map((b) => b.type === 'ul' ? b.html : waApplyInlineToEscaped(b.text, { allowBr: true })).join('<br>')
}

export const formatWhatsappTextForDisplay = (raw) => {
  const s = String(raw || '')
  if (!s) return ''
  const segments = s.split('```')
  const parts = []
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 1) {
      parts.push(`<pre class="wa-pre"><code>${waEscapeHtml(segments[i].replace(/^\n|\n$/g, ''))}</code></pre>`)
    } else {
      parts.push(waFormatPlainSegmentWithBulletLists(segments[i]))
    }
  }
  return parts.join('')
}

// ─── Phone normalization ──────────────────────────────────────────────────────

export const normalizeContactPhone = (rawPhone) => {
  const firstPhone = String(rawPhone || '').split(',')[0] || ''
  return firstPhone.replace(/\D/g, '')
}

export const buildPhoneVariants = (rawPhone) => {
  const base = normalizeContactPhone(rawPhone)
  const variants = new Set()
  if (!base) return []
  variants.add(base)
  if (!base.startsWith('55') && base.length >= 10) variants.add(`55${base}`)
  if (base.startsWith('55') && base.length > 11) variants.add(base.slice(2))
  for (const value of Array.from(variants)) {
    const local = value.startsWith('55') ? value.slice(2) : value
    if (local.length === 11 && local[2] === '9') {
      const withoutNine = `${local.slice(0, 2)}${local.slice(3)}`
      variants.add(withoutNine)
      variants.add(`55${withoutNine}`)
    } else if (local.length === 10) {
      const withNine = `${local.slice(0, 2)}9${local.slice(2)}`
      variants.add(withNine)
      variants.add(`55${withNine}`)
    }
  }
  return Array.from(variants)
}

export const toLocalBrPhoneMask = (digits) => {
  const pure = String(digits || '').replace(/\D/g, '')
  if (!pure) return ''
  const withoutDdi = pure.startsWith('55') && pure.length > 11 ? pure.slice(2) : pure
  if (withoutDdi.length <= 2) return withoutDdi
  if (withoutDdi.length <= 6) return `${withoutDdi.slice(0, 2)} ${withoutDdi.slice(2)}`
  if (withoutDdi.length <= 10) return `${withoutDdi.slice(0, 2)} ${withoutDdi.slice(2, 6)}-${withoutDdi.slice(6)}`
  return `${withoutDdi.slice(0, 2)} ${withoutDdi.slice(2, 7)}-${withoutDdi.slice(7, 11)}`
}

export const buildFullPhone = (countryCode, localPhone) => {
  const c = String(countryCode || '').replace(/\D/g, '')
  const l = String(localPhone || '').replace(/\D/g, '')
  if (!c && !l) return ''
  return `${c}${l}`
}

export const normalizeNumberForContactAdd = (rawPhone) => {
  const digits = normalizeContactPhone(rawPhone)
  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  if (digits.length >= 10) return `55${digits}`
  return digits
}

export const toPersonalJid = (rawPhone) => {
  const digits = normalizeContactPhone(rawPhone)
  if (!digits) return ''
  return `${digits}@s.whatsapp.net`
}

// ─── Avatar normalization ─────────────────────────────────────────────────────

export const normalizeAvatarCandidate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\/\//.test(raw)) return `https:${raw}`
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^data:image\//i.test(raw)) return raw
  if (/^blob:/i.test(raw)) return raw
  return ''
}

const maybeBase64ImageDataUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('data:image/')) return raw
  // Alguns provedores retornam apenas o base64 cru (sem prefixo mime).
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.replace(/\s/g, '').length >= 120) {
    return `data:image/jpeg;base64,${raw.replace(/\s/g, '')}`
  }
  return ''
}

const bytesArrayToJpegDataUrl = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return ''
  if (typeof window === 'undefined' || typeof window.btoa !== 'function') return ''
  try {
    const bytes = new Uint8Array(raw)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:image/jpeg;base64,${window.btoa(binary)}`
  } catch {
    return ''
  }
}

const normalizeAvatarFromUnknownShape = (value) => {
  const direct = normalizeAvatarCandidate(value)
  if (direct) return direct
  const asBase64 = maybeBase64ImageDataUrl(value)
  if (asBase64) return asBase64
  if (Array.isArray(value)) return bytesArrayToJpegDataUrl(value)
  if (!value || typeof value !== 'object') return ''

  const obj = value
  const preferredFields = [
    'url', 'uri', 'src', 'href', 'value',
    'photo', 'photoUrl', 'photoURL',
    'avatar', 'avatarUrl', 'avatarURL',
    'profilePicUrl', 'profilePictureUrl'
  ]
  for (const field of preferredFields) {
    const normalized = normalizeAvatarFromUnknownShape(obj[field])
    if (normalized) return normalized
  }

  const thumbFields = [
    'jpegThumbnail', 'thumb', 'thumbnail', 'thumbData',
    'profilePicThumb', 'profilePicThumbObj', 'picture'
  ]
  for (const field of thumbFields) {
    const normalized = normalizeAvatarFromUnknownShape(obj[field])
    if (normalized) return normalized
  }

  return ''
}

export const deepFindAvatarCandidate = (input) => {
  if (!input || typeof input !== 'object') return ''
  const visited = new Set()
  const stack = [input]
  const hints = ['avatar', 'photo', 'picture', 'profilepic', 'profile_pic', 'profilephoto']
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue
    if (visited.has(current)) continue
    visited.add(current)
    if (Array.isArray(current)) { for (const item of current) stack.push(item); continue }
    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = String(key || '').toLowerCase()
      const keyLooksAvatar = hints.some((h) => normalizedKey.includes(h))
      if (keyLooksAvatar) {
        const normalized = normalizeAvatarFromUnknownShape(value)
        if (normalized) return normalized
      }
      if (value && typeof value === 'object') stack.push(value)
    }
  }
  return ''
}

export const extractAvatarFromDetailsPayload = (payload) => {
  const root = payload?.response?.chat || payload?.response || payload?.data || payload || {}
  const candidates = [
    root?.image, root?.imagePreview, root?.avatarUrl, root?.avatar, root?.photo, root?.photoUrl,
    root?.profilePicUrl, root?.profilePictureUrl, root?.profilePicture,
    root?.profile?.photo, root?.profile?.photoUrl, root?.profile?.avatarUrl,
    root?.chat?.image, root?.chat?.avatarUrl,
    payload?.response?.profilePicUrl, payload?.response?.profilePictureUrl
  ]
  for (const candidate of candidates) {
    const normalized = normalizeAvatarFromUnknownShape(candidate)
    if (normalized) return normalized
  }
  return deepFindAvatarCandidate(root)
}

export const extractAvatarFromContactRow = (contact = {}) => {
  const candidates = [
    contact?.image, contact?.imagePreview, contact?.avatar, contact?.avatarUrl,
    contact?.photo, contact?.photoUrl, contact?.profilePic, contact?.profilePicUrl,
    contact?.profilePicture, contact?.profilePictureUrl, contact?.wa_avatar, contact?.wa_avatarUrl
  ]
  for (const candidate of candidates) {
    const normalized = normalizeAvatarFromUnknownShape(candidate)
    if (normalized) return normalized
  }
  return deepFindAvatarCandidate(contact)
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

export const parseJsonBodySafe = async (response) => {
  try {
    const raw = await response.text()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export const looksLikeEmojiSummaryField = (s) => {
  const t = strTrim(s)
  if (!t || t.length > 32) return false
  if (/^[\w:.@/-]{10,}$/i.test(t)) return false
  try { if (/\p{Extended_Pictographic}/u.test(t)) return true } catch { }
  return /[\u203C-\u3299\u2600-\u27BF\u2660-\u2668\u200d\ufe0f]/.test(t) || (t.length <= 6 && /[^\s\x00-\x7F]/.test(t))
}

export const normalizeProviderMessageId = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withoutPrefix = raw.includes(':') ? raw.split(':').pop() : raw
  return String(withoutPrefix || '').trim()
}

export const bytesToJpegDataUrl = (raw) => {
  if (raw == null) return ''
  if (typeof raw === 'string' && raw.startsWith('data:')) return raw
  if (typeof raw === 'string' && raw.length > 0) return `data:image/jpeg;base64,${raw}`
  // Suporte a Buffer serializado em JSON: { type: 'Buffer', data: number[] }
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    String(raw.type || '').toLowerCase() === 'buffer' &&
    Array.isArray(raw.data)
  ) {
    return bytesToJpegDataUrl(raw.data)
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      const bytes = new Uint8Array(raw)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return `data:image/jpeg;base64,${window.btoa(binary)}`
    } catch { return '' }
  }
  return ''
}

export function useWhatsappUtils() {
  return {
    normalizeJid, extractDigitsFromJid, isGroupJid, extractWhatsappNumber,
    toUazapiChatNumber, allNormalizedPrivateJidVariants, formatJidAsPhoneLine,
    buildLookupKeys, filterSenderLookupCandidates, pickNameFromDirectory, strTrim, waEscapeHtml,
    looksLikePhoneNumber, extractPhoneDigits, normalizeTimestampToMs, formatTime,
    formatWhatsappTextForDisplay, normalizeContactPhone, buildPhoneVariants,
    toLocalBrPhoneMask, buildFullPhone, normalizeNumberForContactAdd, toPersonalJid,
    normalizeAvatarCandidate, deepFindAvatarCandidate, extractAvatarFromDetailsPayload,
    extractAvatarFromContactRow, parseJsonBodySafe, looksLikeEmojiSummaryField,
    normalizeProviderMessageId, bytesToJpegDataUrl
  }
}
