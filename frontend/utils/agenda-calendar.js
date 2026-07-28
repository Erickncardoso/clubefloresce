export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

export function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function buildWeekDaysFiltered(anchorDate, options = {}) {
  const { weekStartsOn = 1, hideWeekends = false } = options
  const days = buildWeekDays(anchorDate, weekStartsOn)
  return hideWeekends ? days.filter((day) => !isWeekend(day.date)) : days
}

export function getPatientStatusGroup(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'ATIVO') return 'Pacientes ativas'
  if (value === 'PENDENTE' || value === 'PENDENTE_APROVACAO') return 'Pendentes'
  if (value === 'INATIVO') return 'Inativas'
  return 'Outras'
}

const EVENT_COLOR_KEYS = ['blue', 'green', 'orange', 'purple', 'pink', 'deep-orange', 'red']

export const AGENDA_EVENT_COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.14)', accent: '#3b82f6', text: '#1e3a8a' },
  green: { bg: 'rgba(34, 197, 94, 0.14)', accent: '#16a34a', text: '#14532d' },
  orange: { bg: 'rgba(249, 115, 22, 0.14)', accent: '#ea580c', text: '#7c2d12' },
  purple: { bg: 'rgba(168, 85, 247, 0.14)', accent: '#9333ea', text: '#581c87' },
  pink: { bg: 'rgba(236, 72, 153, 0.14)', accent: '#db2777', text: '#831843' },
  'deep-orange': { bg: 'rgba(234, 88, 12, 0.14)', accent: '#c2410c', text: '#7c2d12' },
  red: { bg: 'rgba(239, 68, 68, 0.14)', accent: '#dc2626', text: '#7f1d1d' },
}

export function getEventColorKey(seed = '') {
  const text = String(seed || 'default')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return EVENT_COLOR_KEYS[hash % EVENT_COLOR_KEYS.length]
}

export function getEventColorStyle(seed = '') {
  const key = getEventColorKey(seed)
  return AGENDA_EVENT_COLORS[key] || AGENDA_EVENT_COLORS.blue
}

export function groupAppointmentsByPatientDay(appointments = []) {
  const map = new Map()
  for (const item of appointments) {
    const patientKey = String(item.patientId || item.patientName || item.id)
    const dayKey = toDateKey(new Date(item.startsAt))
    if (!map.has(patientKey)) map.set(patientKey, new Map())
    const dayMap = map.get(patientKey)
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
    dayMap.get(dayKey).push(item)
  }
  for (const dayMap of map.values()) {
    for (const list of dayMap.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    }
  }
  return map
}

export function formatAgendaMonthTitle(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function formatAgendaShortDayHeader(date) {
  return {
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    dayNumber: date.getDate(),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  }
}

export function buildSlotDateTime(dayKey, hour = 9, minute = 0) {
  const date = parseDateKey(dayKey)
  if (!date) return defaultAppointmentDateTime()

  date.setHours(hour, minute, 0, 0)
  const now = new Date()

  if (isSameDay(date, now) && date.getTime() < now.getTime()) {
    return defaultAppointmentDateTime(now)
  }

  return date.toISOString()
}

export function countAppointmentsForWeek(appointments = [], dayKeys = []) {
  const keys = new Set(dayKeys)
  return appointments.filter((item) => keys.has(toDateKey(new Date(item.startsAt)))).length
}

export function countAppointmentsForPatient(appointments = [], patientId = '', dayKeys = []) {
  const keys = new Set(dayKeys)
  return appointments.filter((item) => (
    item.patientId === patientId
    && keys.has(toDateKey(new Date(item.startsAt)))
  )).length
}

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

export const AGENDA_DAY_START_HOUR = 6
export const AGENDA_DAY_END_HOUR = 22
export const AGENDA_HOUR_HEIGHT_PX = 52

export function buildHourLabels(startHour = AGENDA_DAY_START_HOUR, endHour = AGENDA_DAY_END_HOUR) {
  const labels = []
  for (let hour = startHour; hour <= endHour; hour += 1) {
    labels.push({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
    })
  }
  return labels
}

export function layoutAgendaEvent(item, options = {}) {
  const {
    dayStartHour = AGENDA_DAY_START_HOUR,
    hourHeightPx = AGENDA_HOUR_HEIGHT_PX,
  } = options
  const start = new Date(item.startsAt)
  if (Number.isNaN(start.getTime())) return { top: 0, height: hourHeightPx }

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const dayStartMinutes = dayStartHour * 60
  const top = ((startMinutes - dayStartMinutes) / 60) * hourHeightPx
  const height = Math.max((((Number(item.durationMin) || 60) / 60) * hourHeightPx) - 3, 24)
  return { top, height }
}

export function getCurrentTimeLineOffset(options = {}) {
  const {
    dayStartHour = AGENDA_DAY_START_HOUR,
    dayEndHour = AGENDA_DAY_END_HOUR,
    hourHeightPx = AGENDA_HOUR_HEIGHT_PX,
  } = options
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const start = dayStartHour * 60
  const end = (dayEndHour + 1) * 60
  if (minutes < start || minutes > end) return null
  return ((minutes - start) / 60) * hourHeightPx
}

export function snapHourFromPointer(yPx, options = {}) {
  const {
    dayStartHour = AGENDA_DAY_START_HOUR,
    hourHeightPx = AGENDA_HOUR_HEIGHT_PX,
  } = options
  const totalHours = yPx / hourHeightPx
  const hour = Math.min(
    AGENDA_DAY_END_HOUR,
    Math.max(AGENDA_DAY_START_HOUR, dayStartHour + Math.floor(totalHours)),
  )
  const minute = Math.round((totalHours % 1) * 60 / 15) * 15
  return { hour, minute: minute === 60 ? 0 : minute }
}

/** Converte posição Y na grade (px) em minutos desde meia-noite. */
export function yPxToMinutes(yPx, options = {}) {
  const { hour, minute } = snapHourFromPointer(yPx, options)
  return hour * 60 + minute
}

/** Converte minutos desde meia-noite em offset Y na grade (px). */
export function minutesToPx(totalMinutes, options = {}) {
  const {
    dayStartHour = AGENDA_DAY_START_HOUR,
    hourHeightPx = AGENDA_HOUR_HEIGHT_PX,
  } = options
  const start = dayStartHour * 60
  return ((totalMinutes - start) / 60) * hourHeightPx
}

export function formatMinutesLabel(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatTimeRangeLabel(startMinutes, endMinutes) {
  return `${formatMinutesLabel(startMinutes)} – ${formatMinutesLabel(endMinutes)}`
}

/** Normaliza intervalo arrastado na grade (snap 15 min, duração mínima). */
export function normalizeDraggedRange(startMinutes, endMinutes, options = {}) {
  const {
    step = 15,
    minDuration = 15,
    dayStartHour = AGENDA_DAY_START_HOUR,
    dayEndHour = AGENDA_DAY_END_HOUR,
  } = options
  const minStart = dayStartHour * 60
  const maxEnd = dayEndHour * 60 + 45
  const rawStart = Math.min(startMinutes, endMinutes)
  const rawEnd = Math.max(startMinutes, endMinutes)
  let start = Math.max(minStart, Math.floor(rawStart / step) * step)
  let end = Math.min(maxEnd, Math.ceil(rawEnd / step) * step)
  if (end - start < minDuration) end = Math.min(maxEnd, start + minDuration)
  return {
    startMinutes: start,
    endMinutes: end,
    durationMin: end - start,
  }
}

export function buildSlotDateTimeFromMinutes(dayKey, totalMinutes) {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return buildSlotDateTime(dayKey, hour, minute)
}

export function buildMonthGrid(anchorDate = new Date()) {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  const startOffset = first.getDay()
  const daysInMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    cells.push({
      key: toDateKey(date),
      date,
      inMonth,
      isToday: isToday(date),
      dayNumber: date.getDate(),
    })
  }

  return cells
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date = new Date()) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return end
}
