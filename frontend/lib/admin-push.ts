import { apiFetch, apiUpload } from './api'

export type AdminPushPayload = {
  userId?: string
  userIds?: string[]
  title?: string
  body: string
  type?: string
  actionPath?: string
  imageUrl?: string | null
  buttonKey?: string
  audience?: string
  scheduledAt?: string
}

export type AdminPushResult = {
  ok: boolean
  campaignId?: string
  notificationId?: string
  scheduled?: boolean
  queued?: boolean
  scheduledAt?: string
  recipients?: number
  patientName?: string | null
  devices?: number
  sent?: number
  failed?: number
  message?: string
}

export type AdminPushCampaign = {
  id: string
  title: string
  body: string
  type: string
  actionPath?: string | null
  imageUrl?: string | null
  buttonKey?: string | null
  audience: string
  userIds: string[]
  scheduledAt: string
  sentAt?: string | null
  status: string
  result?: { recipients?: number; sent?: number; failed?: number; devices?: number } | null
  createdAt: string
}

export const ADMIN_PUSH_DESTINATIONS = [
  { value: '/inicio', label: 'Início' },
  { value: '/diario', label: 'Diário alimentar' },
  { value: '/dieta', label: 'Plano alimentar' },
  { value: '/check-in', label: 'Check-in' },
  { value: '/bella', label: 'Bella' },
  { value: '/perfil/notificacoes', label: 'Notificações do app' },
] as const

export const ADMIN_PUSH_TYPES = [
  { value: 'bella', label: 'Bella' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'community', label: 'Comunidade / diário' },
  { value: 'content', label: 'Conteúdo / biblioteca' },
  { value: 'meal', label: 'Refeição' },
  { value: 'general', label: 'Geral' },
] as const

export const ADMIN_PUSH_AUDIENCES = [
  { value: 'one', label: 'Uma paciente' },
  { value: 'selected', label: 'Pacientes selecionadas' },
  { value: 'all', label: 'Todas as pacientes ativas' },
  { value: 'female', label: 'Só mulheres' },
  { value: 'male', label: 'Só homens' },
] as const

export const ADMIN_PUSH_BUTTONS = [
  { value: '', label: 'Só o toque na notificação' },
  { value: 'open', label: 'Abrir' },
  { value: 'see', label: 'Ver agora' },
  { value: 'checkin', label: 'Fazer check-in' },
  { value: 'bella', label: 'Falar com Bella' },
  { value: 'diary', label: 'Ver diário' },
] as const

export const ADMIN_PUSH_AUDIENCE_LABEL: Record<string, string> = {
  one: 'Uma paciente',
  selected: 'Selecionadas',
  all: 'Todas',
  female: 'Mulheres',
  male: 'Homens',
}

export const ADMIN_PUSH_STATUS_LABEL: Record<string, string> = {
  pending: 'Programada',
  sending: 'Enviando',
  sent: 'Enviada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
}

export async function sendAdminPush(payload: AdminPushPayload) {
  return apiFetch<AdminPushResult>('/notifications/admin/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listAdminPushCampaigns() {
  const data = await apiFetch<{ items?: AdminPushCampaign[] }>('/notifications/admin/campaigns')
  return Array.isArray(data?.items) ? data.items : []
}

export async function cancelAdminPushCampaign(id: string) {
  return apiFetch<{ ok: boolean; message?: string }>(
    `/notifications/admin/campaigns/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  )
}

export async function uploadAdminPushImage(file: File) {
  const res = await apiUpload<{ url?: string; secure_url?: string }>('/upload', file)
  return res.url || res.secure_url || ''
}
