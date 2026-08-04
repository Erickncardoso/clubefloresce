export const CONTACT_TYPE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'mobile', label: 'Celular' },
  { value: 'home', label: 'Residencial' },
  { value: 'work', label: 'Comercial' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Outro' },
]

export const IDENTITY_DOC_TYPE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'rg', label: 'RG' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnh', label: 'CNH' },
  { value: 'passport', label: 'Passaporte' },
  { value: 'other', label: 'Outro' },
]

export const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'father', label: 'Pai' },
  { value: 'mother', label: 'Mãe' },
  { value: 'spouse', label: 'Cônjuge' },
  { value: 'child', label: 'Filho(a)' },
  { value: 'sibling', label: 'Irmão(ã)' },
  { value: 'friend', label: 'Amigo(a)' },
  { value: 'other', label: 'Outro' },
]

export const COUNTRY_OPTIONS = [
  { value: 'BR', label: 'Brasil' },
]

function rowKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createAdditionalContactRow() {
  return { _key: rowKey(), id: '', type: '', number: '' }
}

export function createEmergencyContactRow() {
  return { _key: rowKey(), id: '', relationship: '', contactUserId: '', contactName: '' }
}

export function createGuardianRow() {
  return { _key: rowKey(), id: '', relationship: '', contactUserId: '', contactName: '' }
}

export function createIdentityDocumentRow() {
  return { _key: rowKey(), id: '', type: '', number: '' }
}

export function createAttachmentRow(file = null) {
  return {
    _key: rowKey(),
    id: '',
    name: file?.name || '',
    url: '',
    size: file?.size ?? null,
    mimeType: file?.type || '',
    uploadedAt: '',
    file,
  }
}

export function mapAdditionalContactsFromProfile(items) {
  if (!Array.isArray(items) || !items.length) return []
  return items.map((item) => ({
    _key: rowKey(),
    id: item.id || '',
    type: item.type || '',
    number: item.number || '',
  }))
}

export function mapLinkedContactsFromProfile(items) {
  if (!Array.isArray(items) || !items.length) return []
  return items.map((item) => ({
    _key: rowKey(),
    id: item.id || '',
    relationship: item.relationship || '',
    contactUserId: item.contactUserId || '',
    contactName: item.contactName || '',
  }))
}

export function mapIdentityDocumentsFromProfile(items) {
  if (!Array.isArray(items) || !items.length) return []
  return items.map((item) => ({
    _key: rowKey(),
    id: item.id || '',
    type: item.type || '',
    number: item.number || '',
  }))
}

export function mapAttachmentsFromProfile(items) {
  if (!Array.isArray(items) || !items.length) return []
  return items.map((item) => ({
    _key: rowKey(),
    id: item.id || '',
    name: item.name || '',
    url: item.url || '',
    size: item.size ?? null,
    mimeType: item.mimeType || '',
    uploadedAt: item.uploadedAt || '',
    file: null,
  }))
}

export function serializeAdditionalContacts(rows) {
  return (rows || [])
    .filter((row) => row.type && row.number?.trim())
    .map((row) => ({
      id: row.id || undefined,
      type: row.type,
      number: row.number.trim(),
    }))
}

export function serializeLinkedContacts(rows) {
  return (rows || [])
    .filter((row) => row.relationship && (row.contactUserId || row.contactName?.trim()))
    .map((row) => ({
      id: row.id || undefined,
      relationship: row.relationship,
      contactUserId: row.contactUserId || null,
      contactName: row.contactName?.trim() || null,
    }))
}

export function serializeIdentityDocuments(rows) {
  return (rows || [])
    .filter((row) => row.type && row.number?.trim())
    .map((row) => ({
      id: row.id || undefined,
      type: row.type,
      number: row.number.trim(),
    }))
}

export function serializeProfileAttachments(rows) {
  return (rows || [])
    .filter((row) => row.url && row.name?.trim())
    .map((row) => ({
      id: row.id || undefined,
      name: row.name.trim(),
      url: row.url,
      size: row.size ?? null,
      mimeType: row.mimeType || null,
      uploadedAt: row.uploadedAt || new Date().toISOString(),
    }))
}

export function contactTypeLabel(value) {
  return CONTACT_TYPE_OPTIONS.find((item) => item.value === value)?.label || value || ''
}

export function relationshipLabel(value) {
  return RELATIONSHIP_OPTIONS.find((item) => item.value === value)?.label || value || ''
}

export function notificationSummary(form) {
  const channels = []
  if (form.notifyEmail) channels.push('E-mail')
  if (form.notifySms) channels.push('SMS')
  if (form.notifyWhatsapp) channels.push('WhatsApp')
  return channels.length
    ? `Notificações por ${channels.join(', ')}`
    : 'Notificações desativadas'
}
