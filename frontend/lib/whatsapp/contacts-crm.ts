/**
 * CRM de contatos WhatsApp — listagem, lead, etiquetas e bloqueio.
 * Endpoints podem ser unsupported no WuzAPI; erros são propagados para a UI.
 */
import { whatsappProxyFetch } from './api'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrmContact {
  id: string
  number?: string
  pushName?: string
  name?: string
  notes?: string
  customFields?: Record<string, string>
  labelids?: string[]
  labels?: string[]
  [key: string]: unknown
}

export interface ListCrmContactsParams {
  page: number
  limit: number
  search?: string
}

export interface ListCrmContactsResult {
  contacts: CrmContact[]
  unsupported?: boolean
  error?: string
}

export interface SaveCrmLeadPayload {
  number: string
  name: string
  notes: string
  customFields: Record<string, string>
}

export interface SetCrmLabelsPayload {
  number: string
  labelids: string[]
}

export interface CrmActionResult {
  ok: boolean
  error?: string
  unsupported?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeContact(raw: unknown): CrmContact | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = String(row.id || row.jid || row.chatid || row.number || '').trim()
  if (!id) return null

  const customRaw = row.customFields ?? row.custom_fields
  let customFields: Record<string, string> | undefined
  if (customRaw && typeof customRaw === 'object' && !Array.isArray(customRaw)) {
    customFields = {}
    for (const [k, v] of Object.entries(customRaw as Record<string, unknown>)) {
      if (!k) continue
      customFields[k] = String(v ?? '')
    }
  }

  return {
    ...row,
    id,
    number: row.number != null ? String(row.number) : undefined,
    pushName: row.pushName != null ? String(row.pushName) : row.pushname != null ? String(row.pushname) : undefined,
    name: row.name != null ? String(row.name) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    customFields,
  }
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}

function isLikelyUnsupported(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('404') ||
    m.includes('not found') ||
    m.includes('não encontrado') ||
    m.includes('unsupported') ||
    m.includes('not supported') ||
    m.includes('não suport') ||
    m.includes('method not allowed') ||
    m.includes('501')
  )
}

export function contactDisplayName(contact: CrmContact): string {
  return contact.pushName || contact.name || contact.number || contact.id || 'Desconhecido'
}

export function contactPhoneDigits(contact: CrmContact): string {
  const fromId = String(contact.id || '')
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/@c\.us$/i, '')
  const digits = String(contact.number || fromId).replace(/\D/g, '')
  return digits || fromId
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function listCrmContacts({
  page,
  limit,
  search,
}: ListCrmContactsParams): Promise<ListCrmContactsResult> {
  const q = String(search || '').trim()
  try {
    const data = await whatsappProxyFetch<{ contacts?: unknown[] } | unknown>('/contacts/list', {
      method: 'POST',
      body: JSON.stringify({
        page,
        limit,
        where: q ? { pushName: { contains: q } } : undefined,
      }),
    })

    const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const rawList = Array.isArray(payload.contacts)
      ? payload.contacts
      : Array.isArray(data)
        ? data
        : []

    const contacts = rawList
      .map(normalizeContact)
      .filter((c): c is CrmContact => Boolean(c))

    return { contacts }
  } catch (err) {
    const message = errorMessage(err, 'Erro ao carregar contatos')
    return {
      contacts: [],
      unsupported: isLikelyUnsupported(message),
      error: message,
    }
  }
}

export async function saveCrmLead(payload: SaveCrmLeadPayload): Promise<CrmActionResult> {
  try {
    await whatsappProxyFetch('/chat/editChatLead', {
      method: 'POST',
      body: JSON.stringify({
        number: payload.number,
        name: payload.name,
        notes: payload.notes,
        customFields: payload.customFields,
      }),
    })
    return { ok: true }
  } catch (err) {
    const message = errorMessage(err, 'Erro ao salvar dados do CRM')
    return {
      ok: false,
      error: message,
      unsupported: isLikelyUnsupported(message),
    }
  }
}

export async function setCrmLabels(payload: SetCrmLabelsPayload): Promise<CrmActionResult> {
  try {
    await whatsappProxyFetch('/chat/labels', {
      method: 'POST',
      body: JSON.stringify({
        number: payload.number,
        labelids: payload.labelids,
      }),
    })
    return { ok: true }
  } catch (err) {
    const message = errorMessage(err, 'Erro ao atualizar etiquetas')
    return {
      ok: false,
      error: message,
      unsupported: isLikelyUnsupported(message),
    }
  }
}

export async function blockCrmContact(number: string): Promise<CrmActionResult> {
  const digits = String(number || '').replace(/\D/g, '') || String(number || '').trim()
  if (!digits) {
    return { ok: false, error: 'Número inválido para bloqueio' }
  }

  try {
    await whatsappProxyFetch('/chat/block', {
      method: 'POST',
      body: JSON.stringify({ number: digits, block: true }),
    })
    return { ok: true }
  } catch (primaryErr) {
    // Fallback legado (WuzAPI / rotas antigas)
    const legacyPaths = [
      { path: '/contact/block', body: { chatid: `${digits}@s.whatsapp.net` } },
      { path: '/contact/block', body: { number: digits, block: true } },
      { path: '/chat/block', body: { phone: digits, block: true } },
    ] as const

    let lastError = errorMessage(primaryErr, 'Erro ao bloquear contato')
    for (const attempt of legacyPaths) {
      try {
        await whatsappProxyFetch(attempt.path, {
          method: 'POST',
          body: JSON.stringify(attempt.body),
        })
        return { ok: true }
      } catch (legacyErr) {
        lastError = errorMessage(legacyErr, lastError)
      }
    }

    return {
      ok: false,
      error: lastError,
      unsupported: isLikelyUnsupported(lastError),
    }
  }
}
