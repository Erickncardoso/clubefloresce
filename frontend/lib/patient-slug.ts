import type { AuthUser } from './types'

export function buildPatientPath(
  patient: Pick<AuthUser, 'id'> | null | undefined,
  options: { suffix?: string } = {},
): string {
  if (!patient?.id) return '/dashboard'
  const suffix = options.suffix
    ? options.suffix.startsWith('/')
      ? options.suffix
      : `/${options.suffix}`
    : ''
  return `/pacientes/${encodeURIComponent(patient.id)}${suffix}`
}

export function formatRelative(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatScheduleWhen(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
