// @ts-nocheck
/**
 * groups.ts — API calls para gerenciamento de grupos WhatsApp (C4 port).
 */
import { whatsappFetch, whatsappProxyFetch } from './api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaGroupParticipant {
  JID?: string
  jid?: string
  IsAdmin?: boolean
  isAdmin?: boolean
  isSuperAdmin?: boolean
}

export interface WaGroupInfo {
  JID?: string
  jid?: string
  groupjid?: string
  Name?: string
  name?: string
  Topic?: string
  topic?: string
  Participants?: WaGroupParticipant[]
  participants?: WaGroupParticipant[]
  GroupCreated?: string
  groupCreated?: string
  image?: string
  imagePreview?: string
}

/** Item de grupo normalizado para UI (lista / detalhe). */
export interface WaGroupListItem {
  id: string
  subject: string
  participants: WaGroupListParticipant[]
  creation?: number
  announce?: boolean
  restrict?: boolean
  isCommunity?: boolean
}

export interface WaGroupListParticipant {
  id: string
  admin?: string | boolean | null
}

export interface WaContactForPicker {
  id: string
  name: string
  number: string
  avatarUrl?: string
}

// ─── Normalize helpers ────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function readString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim()
    if (value) return value
  }
  return ''
}

function readOptionalBool(...candidates: unknown[]): boolean | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate
    if (candidate === 1 || candidate === '1' || candidate === 'true') return true
    if (candidate === 0 || candidate === '0' || candidate === 'false') return false
  }
  return undefined
}

function readCreation(raw: Record<string, unknown>): number | undefined {
  const candidates = [
    raw.creation,
    raw.Creation,
    raw.GroupCreated,
    raw.groupCreated,
    raw.CreatedAt,
    raw.createdAt,
    raw.created,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate > 1e12 ? Math.floor(candidate / 1000) : candidate
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const asNum = Number(candidate)
      if (Number.isFinite(asNum) && asNum > 0) {
        return asNum > 1e12 ? Math.floor(asNum / 1000) : asNum
      }
      const asDate = Date.parse(candidate)
      if (Number.isFinite(asDate) && asDate > 0) return Math.floor(asDate / 1000)
    }
  }
  return undefined
}

function normalizeListParticipant(raw: unknown): WaGroupListParticipant | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = readString(
    row.id,
    row.JID,
    row.jid,
    row.Jid,
    row.PhoneNumber,
    row.phone,
    row.Phone,
    row.PN,
  )
  if (!id) return null
  const adminRaw =
    row.admin ?? row.Admin ?? row.IsAdmin ?? row.isAdmin ?? row.isSuperAdmin ?? row.IsSuperAdmin
  let admin: string | boolean | null = null
  if (typeof adminRaw === 'boolean') {
    admin = adminRaw
  } else if (adminRaw != null && String(adminRaw).trim()) {
    admin = String(adminRaw).trim()
  }
  return { id, admin }
}

export function normalizeWhatsappGroup(raw: unknown): WaGroupListItem | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = readString(row.id, row.JID, row.jid, row.GroupJID, row.groupjid, row.groupJid)
  if (!id) return null
  const subject =
    readString(row.subject, row.Subject, row.Name, row.name, row.topic, row.Topic) ||
    'Grupo sem nome'
  const participantsRaw = row.Participants ?? row.participants ?? row.Members ?? row.members
  const participants = Array.isArray(participantsRaw)
    ? participantsRaw.map(normalizeListParticipant).filter(Boolean) as WaGroupListParticipant[]
    : []
  return {
    id,
    subject,
    participants,
    creation: readCreation(row),
    announce: readOptionalBool(row.announce, row.Announce, row.IsAnnounce, row.isAnnounce),
    restrict: readOptionalBool(
      row.restrict,
      row.Restrict,
      row.locked,
      row.Locked,
      row.IsLocked,
      row.isLocked,
    ),
    isCommunity: readOptionalBool(
      row.isCommunity,
      row.IsCommunity,
      row.IsParent,
      row.isParent,
      row.IsCommunityAnnounce,
    ),
  }
}

function extractGroupsArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const root = asRecord(data)
  if (!root) return []
  const nested =
    root.Groups ??
    root.groups ??
    root.data ??
    root.result ??
    (asRecord(root.data)?.Groups) ??
    (asRecord(root.data)?.groups)
  return Array.isArray(nested) ? nested : []
}

function extractInviteFromResponse(data: unknown): string {
  if (typeof data === 'string') {
    const trimmed = data.trim()
    return trimmed
  }
  const root = asRecord(data)
  if (!root) return ''
  const nested = asRecord(root.data) || asRecord(root.result) || asRecord(root.group) || {}
  const candidates = [
    root.inviteLink,
    root.invite_link,
    root.InviteLink,
    root.link,
    root.Link,
    root.code,
    root.Code,
    root.inviteCode,
    root.InviteCode,
    root.invitelink,
    nested.inviteLink,
    nested.invite_link,
    nested.InviteLink,
    nested.link,
    nested.Code,
    nested.code,
  ]
  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim()
    if (!value) continue
    if (value.startsWith('http') || value.includes('chat.whatsapp.com') || value.length >= 6) {
      return value.startsWith('http') || value.includes('chat.whatsapp.com')
        ? value
        : `https://chat.whatsapp.com/${value}`
    }
  }
  return ''
}

// ─── List / leave / settings / invite ─────────────────────────────────────────

export async function listWhatsappGroups(opts?: {
  force?: boolean
  noparticipants?: boolean
}): Promise<WaGroupListItem[]> {
  const params = new URLSearchParams()
  if (opts?.force !== undefined) params.set('force', String(Boolean(opts.force)))
  if (opts?.noparticipants !== undefined) {
    params.set('noparticipants', String(Boolean(opts.noparticipants)))
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await whatsappFetch(`/group/list${suffix}`)
  return extractGroupsArray(data)
    .map(normalizeWhatsappGroup)
    .filter(Boolean) as WaGroupListItem[]
}

export async function leaveWhatsappGroup(
  groupjid: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappFetch('/group/leave', {
      method: 'POST',
      body: JSON.stringify({ groupjid }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao sair do grupo' }
  }
}

export async function updateGroupAnnounce(
  groupjid: string,
  announce: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappFetch('/group/updateAnnounce', {
      method: 'POST',
      body: JSON.stringify({ groupjid, announce }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao atualizar anúncio do grupo' }
  }
}

export async function updateGroupLocked(
  groupjid: string,
  locked: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappFetch('/group/updateLocked', {
      method: 'POST',
      body: JSON.stringify({ groupjid, locked }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao atualizar bloqueio do grupo' }
  }
}

export async function resetGroupInviteCode(
  groupjid: string,
): Promise<{ ok: boolean; invite?: string; error?: string }> {
  try {
    const data = await whatsappFetch('/group/resetInviteCode', {
      method: 'POST',
      body: JSON.stringify({ groupjid }),
    })
    const invite = extractInviteFromResponse(data)
    return { ok: true, invite: invite || undefined }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao obter convite do grupo' }
  }
}

// ─── Group info ───────────────────────────────────────────────────────────────

export async function fetchGroupInfo(groupJid: string): Promise<WaGroupInfo | null> {
  try {
    const data = await whatsappProxyFetch(`/group/info?groupjid=${encodeURIComponent(groupJid)}`)
    const payload = (data as Record<string, unknown>)
    return (payload?.group || payload?.data || payload) as WaGroupInfo
  } catch (err) {
    console.warn('[WA groups] fetchGroupInfo error', err)
    return null
  }
}

// ─── Create group ─────────────────────────────────────────────────────────────

export async function createWhatsappGroup(
  name: string,
  participantJids: string[],
): Promise<{ ok: boolean; groupJid?: string; error?: string }> {
  try {
    const data = await whatsappProxyFetch('/group/create', {
      method: 'POST',
      body: JSON.stringify({ name, participants: participantJids }),
    }) as Record<string, unknown>
    const groupJid = String(data?.groupJid || data?.jid || data?.group?.JID || data?.group?.jid || '')
    return { ok: true, groupJid }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao criar grupo' }
  }
}

// ─── Fetch contacts for group picker ─────────────────────────────────────────

export async function fetchContactsForPicker(): Promise<WaContactForPicker[]> {
  try {
    const data = await whatsappFetch('/contact-directory') as unknown[]
    if (!Array.isArray(data)) return []
    return data.map((c: Record<string, unknown>) => ({
      id: String(c.wa_chatid || c.chatJid || c.phone || c.id || ''),
      name: String(c.name || c.wa_name || c.pushName || '').trim() || String(c.wa_chatid || c.phone || ''),
      number: String(c.phone || (String(c.wa_chatid || '').split('@')[0]) || ''),
      avatarUrl: String(c.avatarUrl || c.image || '').trim(),
    })).filter((c) => c.id)
  } catch {
    return []
  }
}

// ─── Block / Unblock ─────────────────────────────────────────────────────────

export async function blockWhatsappContact(
  chatJid: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappProxyFetch('/contact/block', {
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao bloquear contato' }
  }
}

export async function unblockWhatsappContact(
  chatJid: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappProxyFetch('/contact/unblock', {
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao desbloquear contato' }
  }
}

// ─── Contact details ──────────────────────────────────────────────────────────

export async function fetchContactDetails(chatJid: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await whatsappProxyFetch(`/contact/details?chatid=${encodeURIComponent(chatJid)}`)
    return (data as Record<string, unknown>)?.data as Record<string, unknown> || data as Record<string, unknown>
  } catch {
    return null
  }
}

// ─── Business profile ─────────────────────────────────────────────────────────

export async function fetchBusinessProfile(chatJid: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await whatsappProxyFetch(`/contact/business-profile?chatid=${encodeURIComponent(chatJid)}`)
    const payload = data as Record<string, unknown>
    return payload?.profile || payload?.data || payload
  } catch {
    return null
  }
}

// ─── Send contacts ────────────────────────────────────────────────────────────

export async function sendWhatsappContacts(
  chatJid: string,
  contactJids: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappProxyFetch('/message/send-contacts', {
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid, contacts: contactJids }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao enviar contatos' }
  }
}

// ─── Interactive / Poll message ───────────────────────────────────────────────

export interface PollForm {
  type: 'poll' | 'button' | 'list' | 'carousel' | 'request-payment' | 'pix-button'
  text: string
  choicesText: string
  footerText: string
  listButton: string
  imageButton: string
  allowMultiple: boolean
  carouselCardsText: string
  amount: string
  pixKey: string
  pixType: string
  pixName: string
  paymentLink: string
  fileUrl: string
  fileName: string
  boletoCode: string
  invoiceNumber: string
  itemName: string
}

export const defaultPollForm = (): PollForm => ({
  type: 'poll',
  text: '',
  choicesText: '',
  footerText: '',
  listButton: 'Ver opções',
  imageButton: '',
  allowMultiple: false,
  carouselCardsText: '',
  amount: '',
  pixKey: '',
  pixType: 'EVP',
  pixName: '',
  paymentLink: '',
  fileUrl: '',
  fileName: '',
  boletoCode: '',
  invoiceNumber: '',
  itemName: '',
})

export async function sendInteractiveMessage(
  chatJid: string,
  form: PollForm,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await whatsappProxyFetch('/message/send-interactive', {
      method: 'POST',
      body: JSON.stringify({ chatid: chatJid, form }),
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Erro ao enviar mensagem interativa' }
  }
}
