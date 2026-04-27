/**
 * useWhatsappContacts
 * Diretório de contatos, resolução de nomes, carregamento de avatares e participantes de grupo.
 */
import {
  contactsDirectory, groupParticipantsDirectory, groupParticipantsByJid, groupParticipantsByLid,
  unknownProfilesDirectory, observedSenderDirectory, savedContactsIndex, lidToJidMap,
  lastContactsSyncAt, senderAvatarDirectory, chats, messages, selectedChat
} from './useWhatsappState.js'
import {
  normalizeJid, extractDigitsFromJid, buildLookupKeys, pickNameFromDirectory,
  strTrim, looksLikePhoneNumber, normalizeAvatarCandidate,
  extractAvatarFromDetailsPayload, extractAvatarFromContactRow, buildPhoneVariants,
  normalizeNumberForContactAdd, parseJsonBodySafe, parseLooseMessageContent, isGroupJid,
  filterSenderLookupCandidates,
  formatJidAsPhoneLine
} from './useWhatsappUtils.js'
import {
  fetchChatDetailsSafe, getAuthToken, getProxyBase, getContactDirectoryApi, getWhatsappApiBase,
  CONTACTS_SYNC_MIN_INTERVAL_MS
} from './useWhatsappApi.js'
import { getGroupInfo } from './useWhatsappGroupsApi.js'

// ─── Helpers internos ─────────────────────────────────────────────────────────

const syncJidKeys = (target, name, ...values) => {
  const keys = buildLookupKeys(...values)
  for (const key of keys) target[key] = name
}

const isAvatarDebugEnabled = () =>
  typeof window !== 'undefined' && window.localStorage?.getItem('wa_avatar_debug') === '1'

const normalizeDigitsVariants = (rawDigits) => {
  const onlyDigits = String(rawDigits || '').replace(/\D/g, '')
  if (!onlyDigits) return []
  return Array.from(new Set([
    onlyDigits,
    ...buildPhoneVariants(onlyDigits)
  ].map((v) => String(v || '').replace(/\D/g, '')).filter((v) => v.length >= 8)))
}

const evaluatePayloadDigitsMatch = (detailsPayload, requestedDigits) => {
  const root = detailsPayload?.response?.chat || detailsPayload?.response || detailsPayload?.data || detailsPayload || {}
  const requestedVariants = normalizeDigitsVariants(requestedDigits)
  if (!requestedVariants.length) return 'unknown'

  const candidates = [
    root?.wa_chatid,
    root?.wa_chatlid,
    root?.chatJid,
    root?.jid,
    root?.phone,
    root?.number,
    root?.id,
    detailsPayload?.wa_chatid,
    detailsPayload?.wa_chatlid,
    detailsPayload?.phone
  ]
  const payloadVariants = Array.from(new Set(
    candidates
      .map((value) => extractDigitsFromJid(value))
      .filter((v) => v.length >= 8)
      .flatMap((v) => normalizeDigitsVariants(v))
  ))

  if (!payloadVariants.length) return 'unknown'
  return requestedVariants.some((rv) => payloadVariants.includes(rv)) ? 'match' : 'mismatch'
}

const pushAvatarDebugEvent = (type, payload = {}) => {
  if (typeof window === 'undefined') return
  if (!isAvatarDebugEnabled()) return
  const event = {
    at: new Date().toISOString(),
    type,
    payload
  }
  try {
    const raw = window.localStorage.getItem('wa_avatar_debug_events')
    const prev = raw ? JSON.parse(raw) : []
    const next = Array.isArray(prev) ? [...prev, event].slice(-200) : [event]
    window.localStorage.setItem('wa_avatar_debug_events', JSON.stringify(next))
  } catch {
    // noop
  }
}

const assignIfHigherPriority = (target, key, nextValue) => {
  if (!key) return
  const current = String(target[key] || '').trim()
  const next = String(nextValue || '').trim()
  if (!next) return
  if (!current) { target[key] = next; return }
  const currentIsNumber = looksLikePhoneNumber(current)
  const nextIsNumber = looksLikePhoneNumber(next)
  if (!currentIsNumber && nextIsNumber) return
  if (currentIsNumber && !nextIsNumber) { target[key] = next }
}

// ─── Extrair nomes de mensagens observadas ────────────────────────────────────

const addKeyParticipant = (keyObj, acc) => {
  if (!keyObj || typeof keyObj !== 'object') return
  const p = keyObj.participant || keyObj.Participant
  const pl = keyObj.participantLid || keyObj.ParticipantLid || keyObj.participant_lid
  if (p) acc.push(p)
  if (pl) acc.push(pl)
}

/** participant / participantLid em content.key (frame Baileys) — essencial em grupos LID quando o root sender é o @g.us */
const collectBaileysKeyParticipants = (msg) => {
  const c = parseLooseMessageContent(msg)
  const acc = []
  addKeyParticipant(c.key || c.Key, acc)
  const inner = c.message || c.Message
  if (inner && typeof inner === 'object') addKeyParticipant(inner.key || inner.Key, acc)
  return acc
}

const isPlausiblePersonName = (value) => {
  const name = strTrim(value)
  if (!name || name.length < 2 || name.length > 80) return false
  if (name.includes('@')) return false
  const compact = name.replace(/[\s+().-]/g, '')
  const digitsOnly = name.replace(/\D/g, '')
  if (digitsOnly.length >= 8 && digitsOnly === compact.replace(/\D/g, '')) return false
  if (looksLikePhoneNumber(name.replace(/[+\s()-]/g, ''))) return false
  return true
}

const SKIP_CONTENT_NAME_SCAN = new Set([
  'quotedmessage', 'quoted', 'reactionmessage', 'reaction', 'protocolmessage',
  'pollupdatesmessage', 'pollcreationmessage', 'keepinchatmessage'
])

const NAME_KEY_RE = /pushname|sendername|participantname|notifyname|verifiedname|displayname|contactname|wa_name|profilename|businessname|verifiedbizname/i

const scanContentTreeForDisplayName = (obj, depth, maxDepth) => {
  if (!obj || typeof obj !== 'object' || depth > maxDepth) return ''
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = scanContentTreeForDisplayName(item, depth + 1, maxDepth)
      if (r) return r
    }
    return ''
  }
  let n = 0
  for (const [k, v] of Object.entries(obj)) {
    if (++n > 220) break
    const kl = k.toLowerCase().replace(/_/g, '')
    if (SKIP_CONTENT_NAME_SCAN.has(kl)) continue
    if (typeof v === 'string' && NAME_KEY_RE.test(k) && isPlausiblePersonName(v)) return strTrim(v)
    if (v && typeof v === 'object') {
      const r = scanContentTreeForDisplayName(v, depth + 1, maxDepth)
      if (r) return r
    }
  }
  return ''
}

const extractDirectMessageName = (msg) => {
  const rootFields = [
    msg.senderName, msg.SenderName, msg.pushName, msg.PushName,
    msg.participantName, msg.ParticipantName, msg.notifyName, msg.NotifyName,
    msg.verifiedName, msg.VerifiedName, msg.businessName, msg.BusinessName,
    msg.contactName, msg.ContactName, msg.wa_name, msg.profileName, msg.displayName
  ]
  for (const f of rootFields) {
    if (isPlausiblePersonName(f)) return strTrim(f)
  }
  const c = parseLooseMessageContent(msg)
  const fromContentRoot = [
    c.pushName, c.PushName, c.senderName, c.SenderName,
    c.participantName, c.ParticipantName, c.notifyName, c.NotifyName
  ]
  for (const f of fromContentRoot) {
    if (isPlausiblePersonName(f)) return strTrim(f)
  }
  const scanned = scanContentTreeForDisplayName(c, 0, 7)
  if (scanned) return scanned
  return ''
}

/** Exportado para fallback na lista de grupo (evita duplicar lógica). */
export const extractLikelySenderNameFromMessage = (msg) => extractDirectMessageName(msg)

export const learnObservedSenderNames = (rawMessages = []) => {
  const mapped = { ...observedSenderDirectory.value }
  for (const msg of rawMessages) {
    if (msg?.fromMe) continue
    const directName = extractDirectMessageName(msg)
    if (!directName) continue
    const candidates = getMessageSenderCandidates(msg)
    const keys = buildLookupKeys(...candidates)
    for (const key of keys) assignIfHigherPriority(mapped, key, directName)
  }
  observedSenderDirectory.value = mapped
}

// ─── Senders ──────────────────────────────────────────────────────────────────

export const getMessageSenderCandidates = (msg) => {
  const c = parseLooseMessageContent(msg)
  return [
    // PN explícito da API (camelCase e PascalCase)
    msg.sender_pn, msg.SenderPn, msg.Sender_PN, msg.senderPn,
    msg.participant_pn, msg.ParticipantPn, msg.Participant_PN,
    c.sender_pn, c.SenderPn, c.participant_pn, c.ParticipantPn,
    // Frame Baileys: participante real no grupo (antes de sender root que pode ser @g.us)
    ...collectBaileysKeyParticipants(msg),
    msg.sender_lid, msg.SenderLid, msg.senderLid, msg.Sender_LID,
    msg.participant_lid, msg.ParticipantLid, msg.participantLid,
    c.sender_lid, c.SenderLid, c.participant_lid, c.ParticipantLid,
    msg.sender, msg.Sender, msg.participant, msg.Participant, msg.author, msg.user, msg.from, msg.fromJid,
    msg.senderJid, msg.sender_phone, msg.participant_phone,
    msg.wa_sender, msg.wa_senderjid, msg.wa_sender_lid,
    msg.participantPn, msg.senderPn, msg.participantLid, msg.senderLid,
    c.participant, c.Participant, c.participantPn, c.senderPn, c.participantLid, c.senderLid,
    c.sender, c.author, c.from, c.senderPn, c.senderLid,
    c.wa_sender, c.wa_senderjid, c.wa_sender_lid,
    msg.key?.participant, msg.key?.Participant, msg.Key?.participant, msg.Key?.Participant,
    // remoteJid do key: só útil em PV; em grupo é @g.us — filtrado em getMessageSenderJid
    msg.key?.remoteJid, msg.key?.RemoteJid
  ]
}

export const getMessageSenderJid = (msg) => {
  const chatJid = normalizeJid(msg?.chatid || msg?.chatJid || msg?.ChatId || msg?.wa_chatid || '')
  // Inclui JID resolvido a partir de @lid (agenda/grupo) — necessário para fallback de telefone formatado.
  for (const k of getMessageSenderLookupKeys(msg)) {
    const normalized = normalizeJid(k)
    if (!normalized) continue
    if (normalized.endsWith('@g.us')) continue
    if (chatJid && isGroupJid(chatJid) && normalized === chatJid) continue
    if (normalized.endsWith('@s.whatsapp.net')) return normalized
  }
  for (const candidate of getMessageSenderCandidates(msg)) {
    const normalized = normalizeJid(candidate)
    if (!normalized) continue
    if (normalized.endsWith('@g.us')) continue
    if (chatJid && isGroupJid(chatJid) && normalized === chatJid) continue
    return normalized
  }
  return ''
}

const getMessageSenderPhoneCandidates = (msg) => {
  const c = parseLooseMessageContent(msg)
  return [msg?.senderName, msg?.pushName, msg?.participantName, c.senderName, c.pushName, c.participantName]
    .map((v) => extractDigitsFromJid(v))
    .filter((d) => d.length >= 8)
    .flatMap((d) => [d, `${d}@s.whatsapp.net`])
}

const resolveLidCandidates = (rawCandidates) => {
  const extra = []
  for (const candidate of rawCandidates) {
    const normalized = normalizeJid(candidate)
    if (!normalized || !normalized.endsWith('@lid')) continue
    const lidKeys = buildLookupKeys(normalized)
    for (const k of lidKeys) {
      const resolved = lidToJidMap.value[k]
      if (resolved) extra.push(resolved)
    }
  }
  return extra
}

export const getMessageSenderLookupKeys = (msg) => {
  const rawCandidates = getMessageSenderCandidates(msg)
  const filteredCandidates = filterSenderLookupCandidates(
    rawCandidates,
    msg?.chatJid ||
    msg?.chatid ||
    msg?.ChatId ||
    msg?.wa_chatid ||
    msg?.key?.remoteJid ||
    msg?.key?.RemoteJid ||
    msg?.Key?.remoteJid ||
    msg?.Key?.RemoteJid ||
    ''
  )
  const phoneCandidates = getMessageSenderPhoneCandidates(msg)
  const lidResolved = resolveLidCandidates(filteredCandidates)
  return buildLookupKeys(...filteredCandidates, ...lidResolved, ...phoneCandidates)
}

/**
 * Aprende LID → @s.whatsapp.net a partir do próprio histórico (cada grupo manda o payload diferente).
 * Quando uma mensagem traz PN+LID juntos, as próximas que só têm LID passam a achar agenda/foto.
 */
export const ingestLidPnHintsFromMessages = (msgList = []) => {
  if (!Array.isArray(msgList) || msgList.length === 0) return
  const next = { ...lidToJidMap.value }
  let changed = false

  const mergeLidToPn = (lidRaw, pnRaw) => {
    const lid = normalizeJid(lidRaw)
    const pn = normalizeJid(pnRaw)
    if (!lid || !lid.endsWith('@lid')) return
    if (!pn || !pn.endsWith('@s.whatsapp.net')) return
    for (const k of buildLookupKeys(lid)) {
      if (next[k] !== pn) { next[k] = pn; changed = true }
    }
  }

  for (const msg of msgList) {
    if (!msg || msg.fromMe) continue
    const c = parseLooseMessageContent(msg)
    mergeLidToPn(
      msg.sender_lid || msg.SenderLid || msg.senderLid || c.sender_lid || c.SenderLid,
      msg.sender_pn || msg.SenderPn || msg.senderPn || c.sender_pn || c.SenderPn
    )
    mergeLidToPn(
      msg.participant_lid || msg.ParticipantLid || c.participant_lid,
      msg.participant_pn || msg.ParticipantPn || c.participant_pn
    )

    const lids = new Set()
    const pns = new Set()
    for (const cand of getMessageSenderCandidates(msg)) {
      const n = normalizeJid(cand)
      if (!n || n.endsWith('@g.us')) continue
      if (n.endsWith('@lid')) lids.add(n)
      else if (n.endsWith('@s.whatsapp.net')) pns.add(n)
    }
    if (lids.size === 1 && pns.size === 1) mergeLidToPn([...lids][0], [...pns][0])
  }

  if (changed) {
    lidToJidMap.value = next
    if (messages.value.length) messages.value = [...messages.value]
  }
}

/** Dígitos do PN para /chat/details — cruza LID→JID via mapa do grupo sem invalidar chaves @lid. */
export const resolveDigitsForChatDetails = (msg, lidMap = null) => {
  const map = lidMap && typeof lidMap === 'object' ? lidMap : lidToJidMap.value
  const senderKeys = getMessageSenderLookupKeys(msg)
  for (const key of senderKeys) {
    if (key.endsWith('@lid')) continue
    const d = extractDigitsFromJid(key)
    if (d.length >= 8) return d
  }
  for (const key of senderKeys) {
    if (!key.endsWith('@lid')) continue
    for (const lk of buildLookupKeys(key)) {
      const rj = map[lk]
      if (rj) {
        const d = extractDigitsFromJid(rj)
        if (d.length >= 8) return d
      }
    }
  }
  return ''
}

// ─── Resolução de nomes ───────────────────────────────────────────────────────

const sanitizeSenderLabelCandidate = (value) => {
  const v = String(value || '').trim()
  if (!v || v.includes('@') || looksLikePhoneNumber(v.replace(/[+\s()-]/g, ''))) return ''
  return v
}

export const isGroupJidCheck = (jid) => normalizeJid(jid).endsWith('@g.us')
export const isGroupMessageContext = (msg) => Boolean(msg?.isGroup) || isGroupJidCheck(
  normalizeJid(msg?.chatJid || msg?.chatid || msg?.ChatId || msg?.wa_chatid || msg?.key?.remoteJid || msg?.Key?.remoteJid || '')
)

export const resolveSenderName = (msg, selectedChatRef = null) => {
  const senderKeys = getMessageSenderLookupKeys(msg)
  const selectedChatIsGroup = selectedChatRef
    ? Boolean(selectedChatRef.value?.isGroup) || isGroupJidCheck(selectedChatRef.value?.chatJid)
    : false

  const savedContactName = pickNameFromDirectory(contactsDirectory.value, senderKeys)
  if (savedContactName) return savedContactName

  if (!selectedChatIsGroup && !msg?.fromMe && selectedChatRef) {
    const chatKeys = buildLookupKeys(selectedChatRef.value?.chatJid)
    const saved = pickNameFromDirectory(contactsDirectory.value, chatKeys)
    const displayName = String(saved || selectedChatRef.value?.pushName || selectedChatRef.value?.name || '').trim()
    if (displayName) return displayName
  }

  if (isGroupMessageContext(msg) || selectedChatIsGroup) {
    const groupJidName = pickNameFromDirectory(groupParticipantsByJid.value, senderKeys)
    const groupLidName = pickNameFromDirectory(groupParticipantsByLid.value, senderKeys)
    const groupParticipantName = groupJidName || groupLidName || pickNameFromDirectory(groupParticipantsDirectory.value, senderKeys)
    if (groupParticipantName) return groupParticipantName
  }

  const observedName = pickNameFromDirectory(observedSenderDirectory.value, senderKeys)
  if (observedName) return observedName

  const unknownProfileName = pickNameFromDirectory(unknownProfilesDirectory.value, senderKeys)
  if (unknownProfileName) return unknownProfileName

  const fromPayload = extractDirectMessageName(msg)
  if (fromPayload) return fromPayload

  const jid = getMessageSenderJid(msg)
  const senderDigits = extractDigitsFromJid(jid)
  if (senderDigits.length >= 8) {
    const phoneVariants = buildPhoneVariants(senderDigits)
    const expandedPhoneKeys = buildLookupKeys(
      senderDigits,
      ...phoneVariants,
      ...phoneVariants.map((d) => `${d}@s.whatsapp.net`),
      ...phoneVariants.map((d) => `${d}@lid`)
    )
    const fromExpandedContacts = pickNameFromDirectory(contactsDirectory.value, expandedPhoneKeys)
    if (fromExpandedContacts) return fromExpandedContacts

    if (isGroupMessageContext(msg) || selectedChatIsGroup) {
      const fromExpandedGroup = pickNameFromDirectory(groupParticipantsByJid.value, expandedPhoneKeys) ||
        pickNameFromDirectory(groupParticipantsByLid.value, expandedPhoneKeys) ||
        pickNameFromDirectory(groupParticipantsDirectory.value, expandedPhoneKeys)
      if (fromExpandedGroup) return fromExpandedGroup
    }
  }

  if (jid?.endsWith('@s.whatsapp.net')) {
    const phone = formatJidAsPhoneLine(jid)
    if (phone) return phone
  }
  return ''
}

export const resolveChatListSenderLabel = (chat = {}) => {
  const jid = normalizeJid(chat.lastMessageSender || chat.wa_lastMessageSender || '')
  if (jid) {
    const keys = buildLookupKeys(jid)
    const fromDirectory = pickNameFromDirectory(contactsDirectory.value, keys) ||
      pickNameFromDirectory(observedSenderDirectory.value, keys) ||
      pickNameFromDirectory(unknownProfilesDirectory.value, keys)
    if (fromDirectory) return fromDirectory
  }
  return sanitizeSenderLabelCandidate(chat.wa_lastSenderName) ||
    sanitizeSenderLabelCandidate(chat.wa_lastMsgSenderName) ||
    sanitizeSenderLabelCandidate(chat.lastSenderName) || ''
}

export const resolveMentionDisplayName = (rawMentionNumber) => {
  const digits = String(rawMentionNumber || '').replace(/\D/g, '')
  if (!digits) return ''
  const mentionVariants = [digits]
  if (digits.startsWith('55') && digits.length > 11) mentionVariants.push(digits.slice(2))
  else if (!digits.startsWith('55') && digits.length >= 10) mentionVariants.push(`55${digits}`)
  const keys = buildLookupKeys(
    ...mentionVariants,
    ...mentionVariants.map((v) => `${v}@s.whatsapp.net`),
    ...mentionVariants.map((v) => `${v}@lid`)
  )
  return pickNameFromDirectory(contactsDirectory.value, keys) ||
    pickNameFromDirectory(groupParticipantsByJid.value, keys) ||
    pickNameFromDirectory(groupParticipantsByLid.value, keys) ||
    pickNameFromDirectory(groupParticipantsDirectory.value, keys) ||
    pickNameFromDirectory(observedSenderDirectory.value, keys) ||
    pickNameFromDirectory(unknownProfilesDirectory.value, keys) || ''
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

export const getAvatarFromChatsList = (keys) => {
  for (const chat of chats.value) {
    const chatKeys = buildLookupKeys(chat.chatJid)
    if (!chatKeys.some((k) => keys.includes(k))) continue
    const avatar = normalizeAvatarCandidate(chat.avatarUrl || chat.image || chat.imagePreview || '')
    if (avatar) return avatar
  }
  return ''
}

export const getMessageSenderAvatarUrl = (msg) => {
  const keys = getMessageSenderLookupKeys(msg)
  for (const key of keys) {
    const avatar = strTrim(senderAvatarDirectory.value?.[key] || '')
    if (avatar) return avatar
  }
  return getAvatarFromChatsList(keys)
}

export const getMessageSenderInitial = (msg, resolveDisplayName) => {
  let name = strTrim(resolveDisplayName ? resolveDisplayName(msg) : '')
  if (!name) name = strTrim(resolveSenderName(msg, selectedChat))
  if (!name) {
    name = strTrim(
      msg.senderName || msg.pushName || msg.participantName ||
      msg.content?.pushName || msg.content?.participantName || ''
    )
  }
  if (!name) return '?'
  const first = name.replace(/^[@+]/, '').trim().charAt(0)
  return first ? first.toUpperCase() : '?'
}

// ─── Participantes de grupo (normalização LID/JID / cache UAZAPI) ─────────────

/** Une chaves de lookup após resolver LID→JID (contatos salvos costumam estar no @s.whatsapp.net). */
const expandParticipantLookupKeys = (jid, lid, phone, lidMap) => {
  const set = new Set(buildLookupKeys(jid, lid, phone))
  if (lid && lid.endsWith('@lid') && lidMap && typeof lidMap === 'object') {
    for (const lk of buildLookupKeys(lid)) {
      const rj = lidMap[lk]
      if (rj) for (const k of buildLookupKeys(rj)) set.add(k)
    }
  }
  return Array.from(set)
}

/**
 * A UAZAPI usa PascalCase no OpenAPI; respostas reais podem variar.
 * Em grupos com AddressingMode "lid", JID às vezes vem vazio e só LID + PhoneNumber preenchem.
 */
const normalizeGroupParticipantRow = (p) => {
  if (!p || typeof p !== 'object') return { jid: '', lid: '', phone: '', displayName: '' }
  let jid = normalizeJid(p.JID || p.jid || p.Jid || p.WaJid || p.waJid || '')
  let lid = normalizeJid(p.LID || p.lid || p.Lid || '')
  const phoneRaw = p.PhoneNumber || p.phone || p.Phone || p.phoneNumber || p.PN || p.pn || ''
  let phone = normalizeJid(phoneRaw)
  if (jid.endsWith('@lid') && !lid) {
    lid = jid
    jid = ''
  }
  const dPhone = extractDigitsFromJid(phone)
  if (phone && !String(phone).includes('@') && dPhone.length >= 8) {
    phone = normalizeJid(`${dPhone}@s.whatsapp.net`)
  }
  const displayName = strTrim(
    p.DisplayName || p.displayName || p.Name || p.name || p.PushName || p.pushName ||
    p.VerifiedName || p.verifiedName || p.BusinessName || p.businessName ||
    p.Notify || p.notify || p.ShortName || p.shortName || ''
  )
  return { jid, lid, phone, displayName }
}

const resolveParticipantPnJid = (jid, phone) => {
  const j = jid && !jid.endsWith('@lid') ? jid : ''
  if (j) return j
  const ph = phone && !phone.endsWith('@lid') ? phone : ''
  if (ph && ph.includes('@')) return ph
  const d = extractDigitsFromJid(ph || phone || jid)
  return d.length >= 8 ? normalizeJid(`${d}@s.whatsapp.net`) : ''
}

// ─── Carregamento de avatares de participantes ────────────────────────────────

export const loadGroupParticipantAvatars = async (participants = [], lidMapOverride = null) => {
  if (!participants.length) return

  const lidMap = lidMapOverride && typeof lidMapOverride === 'object'
    ? lidMapOverride
    : lidToJidMap.value

  const nextAvatars = { ...senderAvatarDirectory.value }
  for (const chat of chats.value) {
    const avatar = normalizeAvatarCandidate(chat.avatarUrl || chat.image || chat.imagePreview || '')
    if (!avatar) continue
    const chatKeys = buildLookupKeys(chat.chatJid)
    for (const k of chatKeys) nextAvatars[k] = avatar
  }
  senderAvatarDirectory.value = nextAvatars

  const toFetch = []
  const apiNumberToKeys = {}

  for (const participant of participants) {
    const { jid, lid, phone } = normalizeGroupParticipantRow(participant)
    let resolvedJid = resolveParticipantPnJid(jid, phone)
    if (!resolvedJid && lid && lid.endsWith('@lid')) {
      for (const lk of buildLookupKeys(lid)) {
        const r = lidMap[lk]
        if (r) { resolvedJid = normalizeJid(r); break }
      }
    }
    const digits = extractDigitsFromJid(resolvedJid)
    if (!digits) continue
    const allKeys = expandParticipantLookupKeys(jid, lid, phone, lidMap)
    const alreadyHas = allKeys.some((k) => Boolean(nextAvatars[k]))
    if (alreadyHas) continue
    if (apiNumberToKeys[digits]) { apiNumberToKeys[digits] = Array.from(new Set([...apiNumberToKeys[digits], ...allKeys])); continue }
    apiNumberToKeys[digits] = allKeys
    toFetch.push(digits)
  }

  if (!toFetch.length) return

  await Promise.allSettled(toFetch.slice(0, 25).map(async (digits) => {
    const data = await fetchChatDetailsSafe(digits, { preview: true, timeoutMs: 5000, cacheTtlMs: 180000 })
    if (!data) return
    const avatar = extractAvatarFromDetailsPayload(data)
    if (!avatar) return
    const keys = buildLookupKeys(...(apiNumberToKeys[digits] || []), data?.wa_chatid, data?.wa_chatlid, data?.phone)
    for (const k of keys) nextAvatars[k] = avatar
  }))

  senderAvatarDirectory.value = { ...nextAvatars }
  if (messages.value.length) messages.value = [...messages.value]
}

export const ensureGroupSenderAvatars = async (items = [], options = {}) => {
  const forceRefresh = Boolean(options?.forceRefresh)
  if (!isGroupJidCheck(normalizeJid(items[0]?.chatJid || ''))) {
    const hasGroupMsg = items.some((m) => isGroupMessageContext(m))
    if (!hasGroupMsg) return
  }

  const nextAvatars = { ...senderAvatarDirectory.value }
  const toFetch = []
  const apiNumberToKeys = {}

  const lidMap = lidToJidMap.value
  for (const msg of (Array.isArray(items) ? items : [])) {
    if (msg?.fromMe) continue
    const senderKeys = getMessageSenderLookupKeys(msg)
    if (!forceRefresh) {
      const alreadyHas = senderKeys.some((k) => Boolean(nextAvatars[k]))
      if (alreadyHas) continue
    }
    const digits = resolveDigitsForChatDetails(msg, lidMap)
    if (!digits) continue
    if (apiNumberToKeys[digits]) { apiNumberToKeys[digits] = Array.from(new Set([...apiNumberToKeys[digits], ...senderKeys])); continue }
    apiNumberToKeys[digits] = senderKeys
    toFetch.push(digits)
  }

  if (!toFetch.length) return

  if (isAvatarDebugEnabled()) {
    console.info('[WA_AVATAR] iniciando fetch de avatares', {
      candidates: toFetch.length,
      forceRefresh
    })
  }
  pushAvatarDebugEvent('start', { candidates: toFetch.length, forceRefresh })

  await Promise.allSettled(toFetch.slice(0, 15).map(async (digits) => {
    const knownKeys = apiNumberToKeys[digits] || []
    const preferredJid = knownKeys.find((k) => String(k || '').endsWith('@s.whatsapp.net')) || ''
    const lookupCandidates = Array.from(new Set([
      preferredJid,
      `${digits}@s.whatsapp.net`,
      digits
    ].filter(Boolean)))

    let data = null
    let avatar = ''
    let usedLookup = ''
    for (const lookup of lookupCandidates) {
      const details = await fetchChatDetailsSafe(lookup, { preview: true, timeoutMs: 5000, cacheTtlMs: 180000 })
      if (!details) continue
      data = details
      const foundAvatar = extractAvatarFromDetailsPayload(details)
      if (!foundAvatar) continue
      const matchState = evaluatePayloadDigitsMatch(details, digits)
      if (matchState === 'mismatch') {
        if (isAvatarDebugEnabled()) {
          console.info('[WA_AVATAR] payload nao confere com sender', { digits, lookup, details })
        }
        pushAvatarDebugEvent('mismatch', { digits, lookup })
        continue
      }
      avatar = foundAvatar
      usedLookup = lookup
      break
    }

    if (!avatar) {
      if (isAvatarDebugEnabled()) {
        console.info('[WA_AVATAR] sem avatar no details', { digits, keys: knownKeys, lookupCandidates, data })
      }
      pushAvatarDebugEvent('missing', { digits, keys: knownKeys, lookupCandidates, hasData: Boolean(data) })
      return
    }

    const keys = buildLookupKeys(...knownKeys, data?.wa_chatid, data?.wa_chatlid, data?.phone)
    if (isAvatarDebugEnabled()) {
      console.info('[WA_AVATAR] avatar resolvido', { digits, usedLookup, keyCount: keys.length, avatarPreview: String(avatar).slice(0, 80) })
    }
    pushAvatarDebugEvent('resolved', { digits, usedLookup, keyCount: keys.length, avatarPreview: String(avatar).slice(0, 80) })
    for (const k of keys) nextAvatars[k] = avatar
  }))

  senderAvatarDirectory.value = { ...nextAvatars }
  if (messages.value.length) messages.value = [...messages.value]
}

// ─── Carregamento de participantes do grupo ───────────────────────────────────

export const loadGroupParticipantsDirectory = async (groupJid) => {
  try {
    // force: true evita cache da UAZAPI com lista incompleta (comum em grupos grandes / modo LID)
    const data = await getGroupInfo({ groupjid: groupJid, getInviteLink: false, getRequestsParticipants: false, force: true })

    const participants = Array.isArray(data?.Participants)
      ? data.Participants
      : (Array.isArray(data?.participants) ? data.participants : [])
    const mapped = {}
    const mappedByJid = {}
    const mappedByLid = {}
    const nextLidMap = {}

    // 1ª passagem: LID → JID (@s.whatsapp.net) para contatos salvos e avatares
    for (const participant of participants) {
      const { jid, lid, phone } = normalizeGroupParticipantRow(participant)
      if (!lid || !lid.endsWith('@lid')) continue
      const resolvedJid = resolveParticipantPnJid(jid, phone)
      if (!resolvedJid) continue
      for (const k of buildLookupKeys(lid)) nextLidMap[k] = resolvedJid
    }

    const mergedLidMap = { ...lidToJidMap.value, ...nextLidMap }

    // 2ª passagem: nomes (agenda + DisplayName do grupo) em todas as chaves LID/JID/PN cruzadas
    for (const participant of participants) {
      const { jid, lid, phone, displayName } = normalizeGroupParticipantRow(participant)
      const expandedKeys = expandParticipantLookupKeys(jid, lid, phone, mergedLidMap)
      const savedContactName = pickNameFromDirectory(contactsDirectory.value, expandedKeys)
      const resolvedName = strTrim(savedContactName || displayName)
      if (!resolvedName) continue

      const jidKeys = expandedKeys.filter((k) => !k.endsWith('@lid'))
      const lidKeys2 = expandedKeys.filter((k) => k.endsWith('@lid'))

      for (const key of jidKeys) assignIfHigherPriority(mappedByJid, key, resolvedName)
      for (const key of lidKeys2) assignIfHigherPriority(mappedByLid, key, resolvedName)
      for (const key of expandedKeys) assignIfHigherPriority(mapped, key, resolvedName)
    }

    lidToJidMap.value = mergedLidMap
    groupParticipantsDirectory.value = mapped
    groupParticipantsByJid.value = mappedByJid
    groupParticipantsByLid.value = mappedByLid
    messages.value = [...messages.value]

    loadGroupParticipantAvatars(participants, mergedLidMap).catch(() => {})
  } catch (error) {
    console.warn('Falha ao carregar participantes do grupo', error)
  }
}

// ─── Diretório de contatos ────────────────────────────────────────────────────

export const loadContactsDirectory = async () => {
  const proxyBase = getProxyBase()
  const contactDirectoryApi = getContactDirectoryApi()
  try {
    const contacts = []
    const limit = 1000
    let offset = 0
    let totalRecords = null
    const maxPages = 30

    for (let page = 0; page < maxPages; page++) {
      const res = await fetch(`${proxyBase}/contacts/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ limit, offset, contactScope: 'all' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) break
      const pageContacts = Array.isArray(data?.contacts) ? data.contacts : []
      if (pageContacts.length === 0) break
      contacts.push(...pageContacts)
      if (totalRecords === null && Number.isFinite(Number(data?.pagination?.totalRecords))) totalRecords = Number(data.pagination.totalRecords)
      offset += pageContacts.length
      if (totalRecords !== null && offset >= totalRecords) break
      if (pageContacts.length < limit) break
    }

    const mapped = {}
    const mappedAvatars = {}
    const indexed = {}

    for (const contact of contacts) {
      const jid = normalizeJid(contact?.jid)
      const phone = normalizeJid(contact?.phone)
      const number = normalizeJid(contact?.number)
      const lid = normalizeJid(contact?.lid)
      const indexKeys = buildLookupKeys(jid, phone, number, lid)
      if (indexKeys.length === 0) continue
      for (const key of indexKeys) indexed[key] = true
      const name = String(contact?.contact_name || contact?.contact_FirstName || contact?.name || contact?.pushName || contact?.verifiedName || contact?.wa_name || '').trim()
      if (name) for (const key of indexKeys) assignIfHigherPriority(mapped, key, name)
      const avatarUrl = extractAvatarFromContactRow(contact)
      if (avatarUrl) for (const key of indexKeys) mappedAvatars[key] = avatarUrl
    }

    contactsDirectory.value = mapped
    persistContactsCache(mapped).catch(() => {})
    if (Object.keys(mappedAvatars).length > 0) {
      senderAvatarDirectory.value = { ...senderAvatarDirectory.value, ...mappedAvatars }
    }
    savedContactsIndex.value = indexed
    lastContactsSyncAt.value = Date.now()
  } catch (error) {
    console.warn('Falha ao carregar diretório de contatos', error)
  }
}

const persistContactsCache = async (data) => {
  const contactDirectoryApi = getContactDirectoryApi()
  try {
    await fetch(contactDirectoryApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ data })
    })
  } catch { }
}

export const restoreContactsFromCache = async () => {
  const contactDirectoryApi = getContactDirectoryApi()
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null
  try {
    const res = await fetch(contactDirectoryApi, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      signal: controller?.signal
    })
    if (!res.ok) return
    const body = await res.json()
    const data = body?.data
    if (!data || typeof data !== 'object' || Array.isArray(data)) return
    if (Object.keys(contactsDirectory.value).length === 0) contactsDirectory.value = data
  } catch { }
  finally { if (timeoutId) clearTimeout(timeoutId) }
}

export const syncContactsDirectoryIfNeeded = async (force = false) => {
  const now = Date.now()
  if (!force && (now - lastContactsSyncAt.value) < CONTACTS_SYNC_MIN_INTERVAL_MS) return
  await loadContactsDirectory()
}

// ─── Persistência: nomes observados por grupo (histórico reabre com rótulos) ─

const GROUP_OBSERVED_PERSIST_DEBOUNCE_MS = 2800
let groupObservedPersistTimer = null
let pendingGroupObservedFlush = null

export const cancelScheduledGroupObservedPersist = () => {
  if (groupObservedPersistTimer) {
    clearTimeout(groupObservedPersistTimer)
    groupObservedPersistTimer = null
  }
  pendingGroupObservedFlush = null
}

/** Monta patch { chaveLookup: nome } para chaves presentes nas mensagens (observado + unknown). */
export const buildGroupObservedPersistPatch = (rawMessages = []) => {
  const obs = observedSenderDirectory.value
  const unk = unknownProfilesDirectory.value
  const patch = {}
  for (const msg of rawMessages) {
    if (msg?.fromMe) continue
    for (const key of getMessageSenderLookupKeys(msg)) {
      const v = strTrim(obs[key] || unk[key] || '')
      if (v) patch[key] = v
    }
  }
  return patch
}

export const loadPersistedGroupObservedSenders = async (groupJid) => {
  const jid = normalizeJid(groupJid || '')
  if (!jid.endsWith('@g.us')) return
  const base = getWhatsappApiBase()
  if (!base || !getAuthToken()) return
  try {
    const res = await fetch(`${base}/group-observed-senders?groupJid=${encodeURIComponent(jid)}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    })
    const body = await parseJsonBodySafe(res)
    if (!res.ok) return
    const map = body?.data
    if (!map || typeof map !== 'object' || Array.isArray(map)) return
    const mapped = { ...observedSenderDirectory.value }
    for (const [k, v] of Object.entries(map)) {
      assignIfHigherPriority(mapped, k, String(v || '').trim())
    }
    observedSenderDirectory.value = mapped
    if (messages.value.length) messages.value = [...messages.value]
  } catch { /* offline */ }
}

const flushPersistGroupObservedSenders = async (groupJid, rawMessages) => {
  const jid = normalizeJid(groupJid || '')
  if (!jid.endsWith('@g.us') || !getAuthToken()) return
  const patch = buildGroupObservedPersistPatch(rawMessages)
  if (Object.keys(patch).length === 0) return
  const base = getWhatsappApiBase()
  if (!base) return
  try {
    const res = await fetch(`${base}/group-observed-senders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ groupJid: jid, patch })
    })
    await parseJsonBodySafe(res)
  } catch { /* offline */ }
}

/** Debounce: após aprender nomes no grupo, persiste no backend para a próxima abertura do chat. */
export const schedulePersistGroupObservedSenders = (groupJid, rawMessages) => {
  const jid = normalizeJid(groupJid || '')
  if (!jid.endsWith('@g.us')) return
  pendingGroupObservedFlush = { jid, raw: rawMessages }
  if (groupObservedPersistTimer) clearTimeout(groupObservedPersistTimer)
  groupObservedPersistTimer = setTimeout(() => {
    groupObservedPersistTimer = null
    const p = pendingGroupObservedFlush
    pendingGroupObservedFlush = null
    if (!p) return
    flushPersistGroupObservedSenders(p.jid, p.raw)
  }, GROUP_OBSERVED_PERSIST_DEBOUNCE_MS)
}

// ─── Enriquecer senders desconhecidos ─────────────────────────────────────────

const messageHasResolvableDisplayName = (msg) => {
  if (msg?.fromMe) return true
  if (extractDirectMessageName(msg)) return true
  const keys = getMessageSenderLookupKeys(msg)
  return Boolean(
    pickNameFromDirectory(contactsDirectory.value, keys) ||
    pickNameFromDirectory(groupParticipantsByJid.value, keys) ||
    pickNameFromDirectory(groupParticipantsByLid.value, keys) ||
    pickNameFromDirectory(groupParticipantsDirectory.value, keys) ||
    pickNameFromDirectory(observedSenderDirectory.value, keys) ||
    pickNameFromDirectory(unknownProfilesDirectory.value, keys)
  )
}

export const enrichUnknownSenderNames = async (rawMessages = []) => {
  const lidMap = lidToJidMap.value
  const toEnrich = rawMessages.filter((msg) => !messageHasResolvableDisplayName(msg)).slice(0, 45)
  if (toEnrich.length === 0) return

  const discovered = { ...unknownProfilesDirectory.value }
  await Promise.allSettled(toEnrich.slice(0, 22).map(async (msg) => {
    const digits = resolveDigitsForChatDetails(msg, lidMap)
    if (!digits) return
    const data = await fetchChatDetailsSafe(digits, { preview: true, timeoutMs: 4500, cacheTtlMs: 120000 })
    if (!data) return
    const candidate = data?.name || data?.pushName || data?.contact_name || data?.contact_FirstName || data?.verifiedName || data?.wa_name || ''
    const name = String(candidate || '').trim()
    if (!name || name.includes('@')) return
    const number = data?.wa_chatid || `${digits}@s.whatsapp.net`
    syncJidKeys(discovered, name, ...getMessageSenderLookupKeys(msg), number, data?.wa_chatid, data?.wa_chatlid, data?.phone)
  }))

  unknownProfilesDirectory.value = discovered
  messages.value = [...messages.value]
}

export function useWhatsappContacts() {
  return {
    learnObservedSenderNames, ingestLidPnHintsFromMessages, extractLikelySenderNameFromMessage,
    getMessageSenderCandidates, getMessageSenderJid,
    getMessageSenderLookupKeys, resolveDigitsForChatDetails, resolveSenderName, resolveChatListSenderLabel,
    resolveMentionDisplayName, getAvatarFromChatsList, getMessageSenderAvatarUrl,
    getMessageSenderInitial, loadGroupParticipantAvatars, ensureGroupSenderAvatars,
    loadGroupParticipantsDirectory, loadContactsDirectory, restoreContactsFromCache,
    syncContactsDirectoryIfNeeded, enrichUnknownSenderNames, isGroupJidCheck,
    isGroupMessageContext, sanitizeSenderLabelCandidate: undefined,
    loadPersistedGroupObservedSenders, schedulePersistGroupObservedSenders, cancelScheduledGroupObservedPersist,
    buildGroupObservedPersistPatch
  }
}
