/** Horário local do aparelho — muda automaticamente ao viajar. */

export function getPatientTimeZone() {
  if (import.meta.server) return 'UTC'
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function getLocalDateKey(date = new Date(), timeZone = getPatientTimeZone()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

/** Interpreta YYYY-MM-DD como data civil, sem shift de fuso. */
export function parseDateKey(dateKey) {
  const match = String(dateKey || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return {
    year,
    month,
    day,
    date: new Date(year, month - 1, day),
  }
}

export function addDaysToDateKey(dateKey, days) {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  const next = new Date(parsed.year, parsed.month - 1, parsed.day + days)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateKeyPtBr(dateKey, options = {}) {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return '—'
  return parsed.date.toLocaleDateString('pt-BR', options)
}

export function getLocalTimeParts(date = new Date(), timeZone = getPatientTimeZone()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
    return { hour, minute, minutes: hour * 60 + minute }
  } catch {
    return {
      hour: date.getHours(),
      minute: date.getMinutes(),
      minutes: date.getHours() * 60 + date.getMinutes(),
    }
  }
}

/** Data legível no fuso do paciente (ex.: histórico de peso). */
export function formatPatientDateLabel(value, timeZone = getPatientTimeZone()) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  try {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone,
    })
  } catch {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
}
