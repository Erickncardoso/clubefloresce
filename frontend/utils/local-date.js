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
