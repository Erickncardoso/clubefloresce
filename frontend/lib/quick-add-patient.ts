import { normalizePhoneInternational } from '@/lib/phone-countries'
import {
  mapAdditionalContactsFromProfile,
  mapAttachmentsFromProfile,
  mapIdentityDocumentsFromProfile,
  mapLinkedContactsFromProfile,
  type AdditionalContactRow,
  type IdentityDocumentRow,
  type LinkedContactRow,
  type ProfileAttachmentRow,
} from '@/lib/patient-profile-extra'

export type PatientTagItem = {
  id?: string
  name: string
  color: string
}

export type QuickAddForm = {
  name: string
  nickname: string
  email: string
  password: string
  phone: string
  gender: string
  birthDate: string
  cpf: string
  rg: string
  referralSource: string
  tags: string[]
  tagItems: PatientTagItem[]
  city: string
  state: string
  occupation: string
  maritalStatus: string
  modality: string
  athlete: boolean
  pregnant: boolean
  lactating: boolean
  objective: string
  notes: string
  zipCode: string
  neighborhood: string
  street: string
  streetNumber: string
  country: string
  addressComplement: string
  additionalContacts: AdditionalContactRow[]
  emergencyContacts: LinkedContactRow[]
  guardianEnabled: boolean
  guardians: LinkedContactRow[]
  identityDocuments: IdentityDocumentRow[]
  notifyEmail: boolean
  notifySms: boolean
  notifyWhatsapp: boolean
  profileAttachments: ProfileAttachmentRow[]
  plan: string
  status: string
  accessExpiresAt: string
  billingPaymentMethod: string
  avatarUrl: string
  sendWelcomeWhatsapp: boolean
  welcomeMessageOverride: string
}

export type QuickAddSeed = Partial<QuickAddForm> & {
  name?: string
  email?: string
  phone?: string
  plan?: string
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function emptyQuickAddForm(): QuickAddForm {
  return {
    name: '',
    nickname: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    birthDate: '',
    cpf: '',
    rg: '',
    referralSource: '',
    tags: [],
    tagItems: [],
    city: '',
    state: '',
    occupation: '',
    maritalStatus: '',
    modality: '',
    athlete: false,
    pregnant: false,
    lactating: false,
    objective: '',
    notes: '',
    zipCode: '',
    neighborhood: '',
    street: '',
    streetNumber: '',
    country: 'BR',
    addressComplement: '',
    additionalContacts: [],
    emergencyContacts: [],
    guardianEnabled: false,
    guardians: [],
    identityDocuments: [],
    notifyEmail: true,
    notifySms: true,
    notifyWhatsapp: true,
    profileAttachments: [],
    plan: 'PREMIUM',
    status: 'ATIVO',
    accessExpiresAt: '',
    billingPaymentMethod: '',
    avatarUrl: '',
    sendWelcomeWhatsapp: true,
    welcomeMessageOverride: '',
  }
}

export function formatCepMask(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatCpfMask(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatRgMask(value?: string | null) {
  const raw = String(value || '')
    .replace(/[^\dA-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 12)
  if (raw.length <= 2) return raw
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDaysToDateInput(days: number) {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + days)
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function userToQuickAddSeed(user: any): QuickAddSeed | null {
  if (!user) return null
  const profile =
    user.patientProfileData &&
    typeof user.patientProfileData === 'object' &&
    !Array.isArray(user.patientProfileData)
      ? user.patientProfileData
      : user.patientProfile && typeof user.patientProfile === 'object'
        ? user.patientProfile
        : {}

  const tagItems = Array.isArray(profile.tagItems)
    ? profile.tagItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        color: item.color || '#8B967C',
      }))
    : Array.isArray(profile.tags)
      ? profile.tags.map((name: string) => ({ name, color: '#8B967C' }))
      : []

  const phoneRaw = String(user.phone || '').trim()

  return {
    name: user.name || '',
    nickname: profile.nickname || '',
    email: user.email || '',
    phone: phoneRaw ? normalizePhoneInternational(phoneRaw) : '',
    gender: profile.gender || '',
    birthDate: profile.birthDate || '',
    cpf: formatCpfMask(profile.cpf || ''),
    rg: formatRgMask(profile.rg || ''),
    referralSource: profile.referralSource || '',
    tagItems,
    city: profile.city || '',
    state: profile.state || '',
    occupation: profile.occupation || '',
    maritalStatus: profile.maritalStatus || '',
    modality: profile.modality || '',
    athlete: Boolean(profile.athlete),
    pregnant: Boolean(profile.pregnant),
    lactating: Boolean(profile.lactating),
    objective: profile.objective || '',
    notes: profile.notes || '',
    zipCode: formatCepMask(profile.zipCode || ''),
    neighborhood: profile.neighborhood || '',
    street: profile.street || '',
    streetNumber: profile.streetNumber || '',
    country: profile.country || 'BR',
    addressComplement: profile.addressComplement || '',
    additionalContacts: mapAdditionalContactsFromProfile(profile.additionalContacts),
    emergencyContacts: mapLinkedContactsFromProfile(profile.emergencyContacts),
    guardianEnabled: Boolean(profile.guardianEnabled),
    guardians: mapLinkedContactsFromProfile(profile.guardians),
    identityDocuments: mapIdentityDocumentsFromProfile(profile.identityDocuments),
    notifyEmail: profile.notifyEmail !== false,
    notifySms: profile.notifySms !== false,
    notifyWhatsapp: profile.notifyWhatsapp !== false,
    profileAttachments: mapAttachmentsFromProfile(profile.profileAttachments),
    plan: user.plan || 'PREMIUM',
    status: user.status || 'ATIVO',
    accessExpiresAt: toDateInputValue(user.accessExpiresAt),
    billingPaymentMethod: user.billingPaymentMethod || '',
    avatarUrl: user.avatar || '',
  }
}

export function applySeedToForm(seed: QuickAddSeed | null | undefined): QuickAddForm {
  const form = emptyQuickAddForm()
  if (!seed) return form

  form.name = seed.name || ''
  form.nickname = seed.nickname || ''
  form.email = seed.email || ''
  form.gender = seed.gender || ''
  form.birthDate = seed.birthDate || ''
  form.cpf = seed.cpf ? formatCpfMask(seed.cpf) : ''
  form.rg = seed.rg ? formatRgMask(seed.rg) : ''
  form.referralSource = seed.referralSource || ''
  form.city = seed.city || ''
  form.state = seed.state || ''
  form.occupation = seed.occupation || ''
  form.maritalStatus = seed.maritalStatus || ''
  form.modality = seed.modality || ''
  form.athlete = Boolean(seed.athlete)
  form.pregnant = Boolean(seed.pregnant)
  form.lactating = Boolean(seed.lactating)
  form.objective = seed.objective || ''
  form.notes = seed.notes || ''
  form.zipCode = seed.zipCode ? formatCepMask(seed.zipCode) : ''
  form.neighborhood = seed.neighborhood || ''
  form.street = seed.street || ''
  form.streetNumber = seed.streetNumber || ''
  form.country = seed.country || 'BR'
  form.addressComplement = seed.addressComplement || ''
  form.additionalContacts = Array.isArray(seed.additionalContacts)
    ? seed.additionalContacts.map((item) => ({ ...item }))
    : []
  form.emergencyContacts = Array.isArray(seed.emergencyContacts)
    ? seed.emergencyContacts.map((item) => ({ ...item }))
    : []
  form.guardianEnabled = Boolean(seed.guardianEnabled)
  form.guardians = Array.isArray(seed.guardians)
    ? seed.guardians.map((item) => ({ ...item }))
    : []
  form.identityDocuments = Array.isArray(seed.identityDocuments)
    ? seed.identityDocuments.map((item) => ({ ...item }))
    : []
  form.notifyEmail = seed.notifyEmail !== false
  form.notifySms = seed.notifySms !== false
  form.notifyWhatsapp = seed.notifyWhatsapp !== false
  form.profileAttachments = Array.isArray(seed.profileAttachments)
    ? seed.profileAttachments.map((item) => ({ ...item }))
    : []
  form.plan = seed.plan || 'PREMIUM'
  form.status = seed.status || 'ATIVO'
  form.accessExpiresAt = seed.accessExpiresAt || ''
  form.billingPaymentMethod = seed.billingPaymentMethod || ''
  form.avatarUrl = seed.avatarUrl || ''
  form.tagItems = Array.isArray(seed.tagItems) ? seed.tagItems.map((item) => ({ ...item })) : []
  if (seed.phone) form.phone = normalizePhoneInternational(seed.phone)
  return form
}

export const QUICK_ADD_OPTIONS = {
  planOptions: [
    { value: 'FREE', label: 'Sem plano (só início e conta)' },
    { value: 'PREMIUM', label: 'Essencial' },
    { value: 'PLATINUM', label: 'Completo' },
  ],
  accessDurationPresets: [
    { days: 30 as number | null, label: '30 dias' },
    { days: 60 as number | null, label: '60 dias' },
    { days: 90 as number | null, label: '90 dias' },
    { days: null as number | null, label: 'Sem limite' },
  ],
  paymentMethodOptions: [
    { value: '', label: 'Não informado' },
    { value: 'pix', label: 'Pix' },
    { value: 'card', label: 'Cartão' },
  ],
  maritalOptions: [
    { value: '', label: 'Não informado' },
    { value: 'single', label: 'Solteira(o)' },
    { value: 'married', label: 'Casada(o)' },
    { value: 'stable_union', label: 'União estável' },
    { value: 'divorced', label: 'Divorciada(o)' },
    { value: 'widowed', label: 'Viúva(o)' },
    { value: 'other', label: 'Outro' },
  ],
  modalityOptions: [
    { value: '', label: 'Não informado' },
    { value: 'online', label: 'Online' },
    { value: 'presencial', label: 'Presencial' },
  ],
  stateOptions: [
    { value: '', label: 'UF' },
    ...BR_STATES.map((uf) => ({ value: uf, label: uf })),
  ],
  referralSourceOptions: [
    { value: '', label: 'Selecione a origem' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'google', label: 'Google' },
    { value: 'clinica', label: 'Clínica / parceiro' },
    { value: 'outro', label: 'Outro' },
  ],
  brStates: BR_STATES,
}
