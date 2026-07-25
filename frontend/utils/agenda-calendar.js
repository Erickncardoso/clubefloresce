const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function startOfWeek(date = new Date(), weekStartsOn = 1) {
  const current = startOfDay(date)
  const day = current.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  return addDays(current, -diff)
}

export function endOfWeek(date = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(date, weekStartsOn)
  const end = addDays(start, 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isSameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key) {
  if (!key) return null
  const date = new Date(`${key}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildWeekDays(anchorDate, weekStartsOn = 1) {
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

export function formatWeekRangeLabel(startDate, endDate) {
  const start = startOfDay(startDate)
  const end = startOfDay(endDate)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endLabel = end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: sameMonth ? undefined : 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

export function formatAgendaDayTitle(date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatAgendaTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatAgendaDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function groupAppointmentsByDay(appointments = []) {
  const map = new Map()
  for (const item of appointments) {
    const key = toDateKey(new Date(item.startsAt))
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }
  return map
}

export function filterAppointmentsByQuery(appointments = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return appointments
  return appointments.filter((item) => {
    const name = String(item.patientName || '').toLowerCase()
    const title = String(item.title || '').toLowerCase()
    return name.includes(q) || title.includes(q)
  })
}

export function defaultAppointmentDateTime(date = new Date()) {
  const next = new Date(date)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return next.toISOString()
}
