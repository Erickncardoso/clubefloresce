import { apiFetch } from './api'
import type { AuthUser } from './types'

export type AgendaAppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export type AgendaAppointment = {
  id: string
  nutriId: string
  patientId: string
  patientName: string
  patientAvatar?: string | null
  startsAt: string
  durationMin: number
  title: string
  notes?: string | null
  status: AgendaAppointmentStatus
  createdAt: string
  updatedAt: string
}

export type AgendaAppointmentInput = {
  patientId: string
  patientName: string
  startsAt: string
  durationMin?: number
  title?: string
  notes?: string | null
  status?: AgendaAppointmentStatus
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const AGENDA_TITLE_OPTIONS = [
  { value: 'Consulta', label: 'Consulta' },
  { value: 'Retorno', label: 'Retorno' },
  { value: 'Avaliação', label: 'Avaliação' },
  { value: 'Check-in', label: 'Check-in' },
  { value: 'Acompanhamento', label: 'Acompanhamento' },
]

export const AGENDA_DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
]

export const AGENDA_QUICK_HOURS = [8, 9, 10, 11, 14, 15, 16, 17]

export function defaultAppointmentDateTime(date = new Date()) {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const minutes = next.getMinutes()
  if (minutes > 0 && minutes <= 30) next.setMinutes(30)
  else if (minutes > 30) {
    next.setHours(next.getHours() + 1)
    next.setMinutes(0)
  }
  if (next.getHours() < AGENDA_DAY_START_HOUR) {
    next.setHours(9, 0, 0, 0)
  }
  return next.toISOString()
}

export const AGENDA_DAY_START_HOUR = 6
export const AGENDA_DAY_END_HOUR = 22
export const AGENDA_HOUR_HEIGHT_PX = 52

const EVENT_COLOR_KEYS = ['blue', 'green', 'orange', 'purple', 'pink', 'deep-orange', 'red'] as const

export const AGENDA_EVENT_COLORS: Record<
  (typeof EVENT_COLOR_KEYS)[number],
  { bg: string; accent: string; text: string }
> = {
  blue: { bg: 'rgba(59, 130, 246, 0.14)', accent: '#3b82f6', text: '#1e3a8a' },
  green: { bg: 'rgba(34, 197, 94, 0.14)', accent: '#16a34a', text: '#14532d' },
  orange: { bg: 'rgba(249, 115, 22, 0.14)', accent: '#ea580c', text: '#7c2d12' },
  purple: { bg: 'rgba(168, 85, 247, 0.14)', accent: '#9333ea', text: '#581c87' },
  pink: { bg: 'rgba(236, 72, 153, 0.14)', accent: '#db2777', text: '#831843' },
  'deep-orange': { bg: 'rgba(234, 88, 12, 0.14)', accent: '#c2410c', text: '#7c2d12' },
  red: { bg: 'rgba(239, 68, 68, 0.14)', accent: '#dc2626', text: '#7f1d1d' },
}

export function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function startOfWeek(date = new Date(), weekStartsOn = 0) {
  const current = startOfDay(date)
  const day = current.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  return addDays(current, -diff)
}

export function endOfWeek(date = new Date(), weekStartsOn = 0) {
  const start = startOfWeek(date, weekStartsOn)
  const end = addDays(start, 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string) {
  if (!key) return null
  const date = new Date(`${key}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date) {
  return isSameDay(date, new Date())
}

export type AgendaDayColumn = {
  key: string
  date: Date
  weekdayLabel: string
  dayNumber: number
  isToday: boolean
}

export function buildWeekDays(anchorDate: Date, weekStartsOn = 0): AgendaDayColumn[] {
  const start = startOfWeek(anchorDate, weekStartsOn)
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return {
      key: toDateKey(date),
      date,
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
      dayNumber: date.getDate(),
      isToday: isToday(date),
    }
  })
}

export function formatWeekRangeLabel(startDate: Date, endDate: Date) {
  const start = startOfDay(startDate)
  const end = startOfDay(endDate)
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endLabel = end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: sameMonth ? undefined : 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

export function formatAgendaTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function buildHourLabels(
  startHour = AGENDA_DAY_START_HOUR,
  endHour = AGENDA_DAY_END_HOUR,
) {
  const labels: { hour: number; label: string }[] = []
  for (let hour = startHour; hour <= endHour; hour += 1) {
    labels.push({ hour, label: `${String(hour).padStart(2, '0')}:00` })
  }
  return labels
}

export function layoutAgendaEvent(
  item: Pick<AgendaAppointment, 'startsAt' | 'durationMin'>,
  options: { dayStartHour?: number; hourHeightPx?: number } = {},
) {
  const dayStartHour = options.dayStartHour ?? AGENDA_DAY_START_HOUR
  const hourHeightPx = options.hourHeightPx ?? AGENDA_HOUR_HEIGHT_PX
  const start = new Date(item.startsAt)
  if (Number.isNaN(start.getTime())) return { top: 0, height: hourHeightPx }

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const dayStartMinutes = dayStartHour * 60
  const top = ((startMinutes - dayStartMinutes) / 60) * hourHeightPx
  const height = Math.max((((Number(item.durationMin) || 60) / 60) * hourHeightPx) - 3, 24)
  return { top, height }
}

export function getEventColorStyle(seed = '') {
  const text = String(seed || 'default')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  const key = EVENT_COLOR_KEYS[hash % EVENT_COLOR_KEYS.length]
  return AGENDA_EVENT_COLORS[key]
}

export function groupAppointmentsByDay(appointments: AgendaAppointment[] = []) {
  const map = new Map<string, AgendaAppointment[]>()
  for (const item of appointments) {
    const key = toDateKey(new Date(item.startsAt))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }
  return map
}

export function buildSlotDateTime(dayKey: string, hour = 9, minute = 0) {
  const date = parseDateKey(dayKey)
  if (!date) {
    const next = new Date()
    next.setMinutes(0, 0, 0)
    next.setHours(next.getHours() + 1)
    return next.toISOString()
  }
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export function toLocalDateTimeInputValue(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

export function fromLocalDateTimeInputValue(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export async function fetchAgendaAppointments(params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams()
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  const suffix = query.toString() ? `?${query}` : ''
  return apiFetch<{ appointments: AgendaAppointment[] }>(`/agenda/appointments${suffix}`)
}

export async function createAgendaAppointment(payload: AgendaAppointmentInput) {
  return apiFetch<{ appointment: AgendaAppointment }>('/agenda/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAgendaAppointment(id: string, payload: Partial<AgendaAppointmentInput>) {
  return apiFetch<{ appointment: AgendaAppointment }>(`/agenda/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAgendaAppointment(id: string) {
  return apiFetch<{ ok: boolean }>(`/agenda/appointments/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchPatientsForAgenda() {
  const data = await apiFetch<AuthUser[]>('/users')
  return (Array.isArray(data) ? data : []).filter((u) => u.role === 'PACIENTE')
}
