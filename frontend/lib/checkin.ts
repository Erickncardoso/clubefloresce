import { apiFetch } from './api'
import type { CheckinSchedule } from './types'
import type { StepApiPayload } from './checkin-step-schema'

export type CheckinFrequency = 'weekly' | 'daily' | 'monthly' | string

export type CheckinTemplate = {
  id: string
  title: string
  description?: string | null
  frequency?: CheckinFrequency
  active?: boolean
  isDefault?: boolean
  steps?: StepApiPayload[]
  _count?: { responses?: number }
  updatedAt?: string
  createdAt?: string
}

export type CheckinResponseUser = {
  id: string
  name?: string | null
  avatar?: string | null
}

export type CheckinResponseItem = {
  id: string
  periodKey?: string | null
  answers?: Record<string, unknown> | null
  updatedAt?: string
  createdAt?: string
  user?: CheckinResponseUser | null
  template?: {
    id?: string
    title?: string
    frequency?: CheckinFrequency
    steps?: StepApiPayload[]
  } | null
}

export type DispatchStatus = {
  dispatched?: boolean
  periodKey?: string
}

export type TemplatePayload = {
  title: string
  description?: string | null
  frequency: string
  active: boolean
  steps: StepApiPayload[]
}

export type CustomDispatchPayload = {
  templateId: string
  allPatients: boolean
  userIds: string[]
  periodDate?: string | null
  title?: string | null
  body?: string | null
  scheduledAt?: string
}

export function frequencyLabel(freq?: string | null) {
  if (freq === 'daily') return 'Diário'
  if (freq === 'monthly') return 'Mensal'
  return 'Semanal'
}

export async function listCheckinResponses() {
  return apiFetch<{ responses?: CheckinResponseItem[] }>('/checkin/responses')
}

export async function fetchCheckinNewResponsesCount(since?: string | null) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  return apiFetch<{ count?: number }>(`/checkin/responses/new-count${qs}`)
}

export async function listCheckinTemplates() {
  return apiFetch<{ templates?: CheckinTemplate[] }>('/checkin/templates')
}

export async function createCheckinTemplate(body: TemplatePayload) {
  return apiFetch('/checkin/templates', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCheckinTemplate(id: string, body: Partial<TemplatePayload> & { active?: boolean }) {
  return apiFetch(`/checkin/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteCheckinTemplate(id: string) {
  return apiFetch(`/checkin/templates/${id}`, { method: 'DELETE' })
}

export async function getDispatchStatus() {
  return apiFetch<DispatchStatus>('/checkin/dispatch/status')
}

export async function listDispatchSchedules() {
  return apiFetch<{ schedules?: CheckinSchedule[] }>('/checkin/dispatch/schedules')
}

export async function dispatchWeeklyCheckIn(force = true) {
  return apiFetch<{ message?: string }>('/checkin/dispatch', {
    method: 'POST',
    body: JSON.stringify({ force }),
  })
}

export async function dispatchCustom(body: CustomDispatchPayload) {
  return apiFetch<{ message?: string; scheduled?: boolean }>('/checkin/dispatch/custom', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelDispatchSchedule(id: string) {
  return apiFetch<{ message?: string }>(`/checkin/dispatch/schedules/${id}/cancel`, {
    method: 'POST',
  })
}

export type DispatchPatient = {
  id: string
  name: string
  email?: string | null
  avatar?: string | null
}

export async function listPatientsForDispatch(): Promise<DispatchPatient[]> {
  const users = await apiFetch<
    Array<{ id: string; name?: string; email?: string | null; avatar?: string | null; role?: string }>
  >('/users')
  return Array.isArray(users)
    ? users
        .filter((u) => u.role === 'PACIENTE')
        .map((u) => ({
          id: u.id,
          name: u.name || 'Paciente',
          email: u.email || null,
          avatar: u.avatar || null,
        }))
    : []
}

export function formatScheduleWhen(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatResponseUpdatedAt(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
