import { isPatientAccessExpired } from '~/utils/patient-access'
import {
  paymentAccessLabel,
  resolveBillingPaymentMethod,
} from '~/utils/patient-billing-display'

const PAYMENT_LABEL_BY_KEY = {
  paid: 'Pago',
  granted: 'Liberado',
  expired: 'Expirado',
  unpaid: 'Não pago',
  na: 'N/A',
}

export function createEmptyPatientListFilters() {
  return {
    status: [],
    plan: [],
    payment: [],
    paymentMethod: [],
    approvalEmail: [],
    approvalWhatsapp: [],
    engagementZone: [],
    tags: [],
    modality: [],
    accessExpired: [],
  }
}

export function getPatientProfile(user) {
  if (!user?.patientProfileData || typeof user.patientProfileData !== 'object') return {}
  return user.patientProfileData
}

export function getPatientTagKeys(user) {
  const profile = getPatientProfile(user)
  const items = Array.isArray(profile.tagItems) ? profile.tagItems : []
  if (items.length) {
    return items
      .map((tag) => String(tag.id || tag.name || '').trim())
      .filter(Boolean)
  }
  const names = Array.isArray(profile.tags) ? profile.tags : []
  return names.map((name) => String(name).trim()).filter(Boolean)
}

export function isActivePatientAccount(user) {
  return (user?.status || 'ATIVO').toUpperCase() === 'ATIVO'
}

export function patientPaymentMethodKey(user) {
  const method = resolveBillingPaymentMethod(user)
  const payLabel = paymentAccessLabel(user)
  if (payLabel === 'Liberado') return 'manual'
  const subStatus = String(user?.billingSubscriptionStatus || '').toLowerCase()
  if (!method) {
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'pending'
    return 'none'
  }
  if (method === 'pix') {
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'pending'
    return 'pix'
  }
  if (method === 'card') {
    if (payLabel === 'Não pago' && subStatus === 'pending') return 'pending'
    return 'card'
  }
  return 'none'
}

export function patientApprovalEmailKey(user) {
  if (!isActivePatientAccount(user)) return 'na'
  return user.approvalEmailSentAt ? 'sent' : 'pending'
}

export function patientApprovalWhatsappKey(user) {
  if (!isActivePatientAccount(user)) return 'na'
  if (!String(user.phone || '').trim()) return 'no-phone'
  return user.approvalWhatsappSentAt ? 'sent' : 'pending'
}

export function patientEngagementZone(userId, engagementZoneMap) {
  if (!userId || !engagementZoneMap) return null
  if (engagementZoneMap.danger?.has(userId)) return 'danger'
  if (engagementZoneMap.attention?.has(userId)) return 'attention'
  if (engagementZoneMap.success?.has(userId)) return 'success'
  return null
}

export function patientAccessExpiredKey(user) {
  if (!isActivePatientAccount(user)) return 'na'
  return isPatientAccessExpired(user.accessExpiresAt) ? 'expired' : 'active'
}

function matchesMulti(values, key) {
  if (!Array.isArray(values) || !values.length) return true
  return values.includes(key)
}

export function patientMatchesFilters(user, filters, context = {}) {
  const engagementZoneMap = context.engagementZoneMap || {}

  if (filters.status?.length && !matchesMulti(filters.status, (user.status || 'ATIVO').toUpperCase())) {
    return false
  }

  if (filters.plan?.length && !matchesMulti(filters.plan, (user.plan || 'FREE').toUpperCase())) {
    return false
  }

  if (filters.payment?.length) {
    const label = paymentAccessLabel(user)
    const allowed = filters.payment.map((key) => PAYMENT_LABEL_BY_KEY[key]).filter(Boolean)
    if (!allowed.includes(label)) return false
  }

  if (filters.paymentMethod?.length && !matchesMulti(filters.paymentMethod, patientPaymentMethodKey(user))) {
    return false
  }

  if (filters.approvalEmail?.length && !matchesMulti(filters.approvalEmail, patientApprovalEmailKey(user))) {
    return false
  }

  if (filters.approvalWhatsapp?.length && !matchesMulti(filters.approvalWhatsapp, patientApprovalWhatsappKey(user))) {
    return false
  }

  if (filters.engagementZone?.length) {
    const zone = patientEngagementZone(user.id, engagementZoneMap)
    if (!zone || !filters.engagementZone.includes(zone)) return false
  }

  if (filters.tags?.length) {
    const patientTags = getPatientTagKeys(user)
    if (!filters.tags.some((tagKey) => patientTags.includes(tagKey))) return false
  }

  if (filters.modality?.length) {
    const modality = getPatientProfile(user).modality || ''
    if (!filters.modality.includes(modality)) return false
  }

  if (filters.accessExpired?.length && !matchesMulti(filters.accessExpired, patientAccessExpiredKey(user))) {
    return false
  }

  return true
}

export function matchesPatientSearch(user, searchQuery = '') {
  const q = String(searchQuery || '').trim().toLowerCase()
  if (!q) return true
  const name = String(user?.name || '').toLowerCase()
  const email = String(user?.email || '').toLowerCase()
  const phone = String(user?.phone || '').toLowerCase()
  return name.includes(q) || email.includes(q) || phone.includes(q)
}

export function filterPatientList(users, filters, context = {}) {
  const list = Array.isArray(users) ? users : []
  const searchQuery = context.searchQuery || ''
  return list.filter((user) =>
    matchesPatientSearch(user, searchQuery)
    && patientMatchesFilters(user, filters, context),
  )
}

export function omitFilterDimension(filters, dimension) {
  const next = { ...filters, [dimension]: [] }
  return next
}

export function countPatientsForFilterOption(users, filters, dimension, optionValue, context = {}) {
  const partial = omitFilterDimension(filters, dimension)
  partial[dimension] = [optionValue]
  return filterPatientList(users, partial, context).length
}

export function collectPatientTagOptions(users, tagCatalog = []) {
  const map = new Map()

  for (const tag of tagCatalog || []) {
    const key = String(tag.id || tag.name || '').trim()
    if (!key) continue
    map.set(key, {
      value: key,
      label: tag.name || key,
      color: tag.color || '#64748B',
    })
  }

  for (const user of users || []) {
    const profile = getPatientProfile(user)
    const items = Array.isArray(profile.tagItems) ? profile.tagItems : []
    for (const tag of items) {
      const key = String(tag.id || tag.name || '').trim()
      if (!key || map.has(key)) continue
      map.set(key, {
        value: key,
        label: tag.name || key,
        color: tag.color || '#64748B',
      })
    }
    const names = Array.isArray(profile.tags) ? profile.tags : []
    for (const name of names) {
      const key = String(name).trim()
      if (!key || map.has(key)) continue
      map.set(key, { value: key, label: key, color: '#64748B' })
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

export function buildEngagementZoneMap(zonesPayload) {
  const zones = zonesPayload?.zones || zonesPayload || {}
  return {
    danger: new Set((zones.danger || []).map((entry) => entry.id)),
    attention: new Set((zones.attention || []).map((entry) => entry.id)),
    success: new Set((zones.success || []).map((entry) => entry.id)),
  }
}

export function countActivePatientListFilters(filters) {
  if (!filters) return 0
  return Object.values(filters).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
}

export const PATIENT_LIST_FILTER_GROUPS = [
  {
    key: 'status',
    label: 'Conta',
    options: [
      { value: 'ATIVO', label: 'Ativa' },
      { value: 'INATIVO', label: 'Inativa' },
      { value: 'PENDENTE', label: 'Pendente' },
    ],
  },
  {
    key: 'plan',
    label: 'Plano',
    options: [
      { value: 'FREE', label: 'Gratuito' },
      { value: 'PREMIUM', label: 'Essencial' },
      { value: 'PLATINUM', label: 'Completo' },
    ],
  },
  {
    key: 'payment',
    label: 'Pagamento',
    options: [
      { value: 'paid', label: 'Pago' },
      { value: 'granted', label: 'Liberado' },
      { value: 'expired', label: 'Expirado' },
      { value: 'unpaid', label: 'Não pago' },
      { value: 'na', label: 'N/A' },
    ],
  },
  {
    key: 'paymentMethod',
    label: 'Forma',
    options: [
      { value: 'pix', label: 'Pix' },
      { value: 'card', label: 'Cartão' },
      { value: 'manual', label: 'Manual' },
      { value: 'pending', label: 'Aguardando' },
      { value: 'none', label: 'Sem forma' },
    ],
  },
  {
    key: 'engagementZone',
    label: 'Engajamento',
    options: [
      { value: 'danger', label: 'Zona de perigo' },
      { value: 'attention', label: 'Zona de atenção' },
      { value: 'success', label: 'Zona de sucesso' },
    ],
  },
  {
    key: 'approvalEmail',
    label: 'E-mail aprovação',
    options: [
      { value: 'sent', label: 'Enviado' },
      { value: 'pending', label: 'Não enviado' },
      { value: 'na', label: 'N/A' },
    ],
  },
  {
    key: 'approvalWhatsapp',
    label: 'WhatsApp aprovação',
    options: [
      { value: 'sent', label: 'Enviado' },
      { value: 'pending', label: 'Não enviado' },
      { value: 'no-phone', label: 'Sem telefone' },
      { value: 'na', label: 'N/A' },
    ],
  },
  {
    key: 'modality',
    label: 'Modalidade',
    options: [
      { value: 'online', label: 'Online' },
      { value: 'presencial', label: 'Presencial' },
    ],
  },
  {
    key: 'accessExpired',
    label: 'Assinatura',
    options: [
      { value: 'active', label: 'Vigente' },
      { value: 'expired', label: 'Expirada' },
      { value: 'na', label: 'N/A' },
    ],
  },
]
