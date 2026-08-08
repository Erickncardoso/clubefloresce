import { getProxyBase, whatsappFetchInit } from './api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DispatchContact {
  id: string
  jid: string
  number: string
  name: string
  hasSavedName: boolean
  avatarUrl: string
  displayNumber: string
  subtitle: string
  labelIds: string[]
}

export interface SegmentFilter {
  id: string
  type: 'label'
  labelId: string
  labelName: string
}

export interface DelayPreset {
  id: string
  label: string
  min: number
  max: number
}

export interface BroadcastFormPayload {
  info: string
  text: string
  flowId: string
  delayMin: number
  delayMax: number
  scheduleLater: boolean
  scheduledAt: string
  segmentFilters: SegmentFilter[]
  applyFiltersTogether: boolean
  recipientJids: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BROADCAST_DELAY_PRESETS: DelayPreset[] = [
  { id: 'very_short', label: 'Muito curto 1-5s', min: 1, max: 5 },
  { id: 'short', label: 'Curto 5-20s', min: 5, max: 20 },
  { id: 'medium', label: 'Médio 20-50s', min: 20, max: 50 },
  { id: 'long', label: 'Longo 50-120s', min: 50, max: 120 },
  { id: 'very_long', label: 'Muito longo 120-300s', min: 120, max: 300 },
]

export const BROADCAST_FLOW_OPTIONS: { id: string; label: string }[] = [
  { id: 'text', label: 'Mensagem de texto' },
]

// ─── JID utils (inline — evita dependência de utils.ts @ts-nocheck) ──────────

function normalizeJidLocal(value: string): string {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('@')) {
    const at = raw.indexOf('@')
    let local = raw.slice(0, at)
    const domain = raw.slice(at + 1)
    if (local.includes(':') && domain !== 'lid') local = local.split(':')[0]
    return `${local}@${domain}`
  }
  return raw.includes(':') ? raw.split(':').pop() ?? raw : raw
}

function extractDigitsLocal(jid: string): string {
  const normalized = normalizeJidLocal(jid)
  const localPart = (normalized.split('@')[0] || '').split(':')[0] || ''
  return localPart.replace(/\D/g, '')
}

function isGroupJidLocal(jid: string): boolean {
  return normalizeJidLocal(jid).endsWith('@g.us')
}

function formatJidAsPhoneLineLocal(jid: string): string {
  const d = extractDigitsLocal(jid)
  if (!d || d.length < 10) return ''
  if (d.length >= 12 && d.startsWith('55')) {
    const rest = d.slice(2)
    if (rest.length === 11) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 7)}-${rest.slice(7)}`
    if (rest.length === 10) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 6)}-${rest.slice(6)}`
  }
  if (d.length === 11) return `+55 ${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `+55 ${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  return `+${d}`
}

// ─── Contact mapping ──────────────────────────────────────────────────────────

interface RawContactRow {
  jid?: string
  phone?: string
  number?: string
  contact_name?: string
  contactName?: string
  contact_FirstName?: string
  pushName?: string
  pushname?: string
  name?: string
  image?: string
  avatarUrl?: string
  avatar?: string
  wa_label?: string
  labelIds?: string[]
}

function mapRawToContact(row: RawContactRow): DispatchContact | null {
  const rawJid = String(row?.jid || row?.phone || row?.number || '').trim()
  const phoneJid = rawJid.includes('@')
    ? normalizeJidLocal(rawJid)
    : `${extractDigitsLocal(rawJid + '@s.whatsapp.net')}@s.whatsapp.net`

  if (!phoneJid.endsWith('@s.whatsapp.net')) return null
  if (isGroupJidLocal(phoneJid)) return null

  const digits = extractDigitsLocal(phoneJid)
  if (digits.length < 8) return null

  const name =
    String(row?.contact_name || row?.contactName || row?.contact_FirstName || row?.pushName || row?.pushname || row?.name || '').trim() ||
    formatJidAsPhoneLineLocal(phoneJid) ||
    `+${digits}`

  const hasSavedName = Boolean(row?.contact_name || row?.contactName || row?.contact_FirstName || row?.name)

  const rawAvatar = row?.avatarUrl || row?.avatar || row?.image || ''
  const avatarUrl = typeof rawAvatar === 'string' ? rawAvatar : ''

  const labelIds: string[] = Array.isArray(row?.labelIds)
    ? (row.labelIds as string[]).map(String)
    : String(row?.wa_label || '').split(',').map((s) => s.trim()).filter(Boolean)

  return {
    id: phoneJid,
    jid: phoneJid,
    number: digits,
    name,
    hasSavedName,
    avatarUrl,
    displayNumber: formatJidAsPhoneLineLocal(phoneJid) || `+${digits}`,
    subtitle: '',
    labelIds,
  }
}

function sortContacts(a: DispatchContact, b: DispatchContact): number {
  if (a.hasSavedName !== b.hasSavedName) return a.hasSavedName ? -1 : 1
  return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function loadDispatchContacts(signal?: AbortSignal): Promise<DispatchContact[]> {
  const proxyBase = getProxyBase()
  try {
    const res = await fetch(
      `${proxyBase}/contacts?contactScope=address_book`,
      whatsappFetchInit({ method: 'GET', signal }),
    )
    if (!res.ok) return []
    const data: unknown = await res.json().catch(() => [])
    const rows: RawContactRow[] = Array.isArray(data) ? (data as RawContactRow[]) : []

    const byJid = new Map<string, DispatchContact>()
    for (const row of rows) {
      const contact = mapRawToContact(row)
      if (contact && !byJid.has(contact.jid)) byJid.set(contact.jid, contact)
    }
    return Array.from(byJid.values()).sort(sortContacts)
  } catch {
    return []
  }
}

export function resolveDispatchRecipient(
  chatid: string,
  contacts: DispatchContact[],
): DispatchContact {
  const jid = normalizeJidLocal(chatid)
  const digits = extractDigitsLocal(jid)
  const fromList = contacts.find((c) => c.jid === jid || c.number === digits)
  if (fromList) return fromList

  const displayNumber = formatJidAsPhoneLineLocal(jid) || chatid
  return {
    id: jid || chatid,
    jid: jid || chatid,
    number: digits,
    name: displayNumber || chatid,
    hasSavedName: false,
    avatarUrl: '',
    displayNumber,
    subtitle: '',
    labelIds: [],
  }
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

export function filterDispatchContactsBySearch(
  contactList: DispatchContact[],
  query: string,
): DispatchContact[] {
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

export function filterDispatchContactsBySegment(
  contactList: DispatchContact[],
  filters: SegmentFilter[],
  applyTogether: boolean,
): DispatchContact[] {
  const labelFilters = filters.filter((f) => f.type === 'label' && f.labelId)
  if (!labelFilters.length) return contactList

  const hasLabel = (contact: DispatchContact, labelId: string): boolean =>
    (contact.labelIds || []).map(String).includes(String(labelId))

  if (applyTogether) {
    return contactList.filter((contact) => labelFilters.every((f) => hasLabel(contact, f.labelId)))
  }
  return contactList.filter((contact) => labelFilters.some((f) => hasLabel(contact, f.labelId)))
}
