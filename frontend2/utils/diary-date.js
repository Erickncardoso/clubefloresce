import { getLocalDateKey } from '~/utils/local-date'

export function shiftDateKey(dateKey, daysDelta) {
  const [y, m, d] = String(dateKey || getLocalDateKey()).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + daysDelta)
  return date.toISOString().slice(0, 10)
}

export function formatDiaryDateLabel(dateKey) {
  const today = getLocalDateKey()
  if (dateKey === today) return 'Hoje'
  if (dateKey === shiftDateKey(today, -1)) return 'Ontem'
  if (dateKey === shiftDateKey(today, -2)) return 'Anteontem'
  return formatDiaryDatePillLabel(dateKey)
}

/** Ex.: "19 de ago" — sempre data civil, sem "Hoje"/"Ontem". */
export function formatDiaryDatePillLabel(dateKey) {
  try {
    const [y, m, d] = String(dateKey || '').slice(0, 10).split('-').map(Number)
    if (!y || !m || !d) return String(dateKey || '')
    return new Date(y, m - 1, d)
      .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      .replace(/\./g, '')
  } catch {
    return String(dateKey || '')
  }
}

export const DIARY_DATE_OPTIONS = [
  { id: 'today', label: 'Hoje', offset: 0 },
  { id: 'yesterday', label: 'Ontem', offset: -1 },
  { id: 'day_before', label: 'Anteontem', offset: -2 },
]

export function dateKeyForOffset(offset) {
  return shiftDateKey(getLocalDateKey(), offset)
}

export function compareDateKeys(a, b) {
  return String(a || '').localeCompare(String(b || ''))
}

export function diaryDateChipOffset(dateKey) {
  const today = getLocalDateKey()
  const key = String(dateKey || '').slice(0, 10)
  if (key === today) return 0
  if (key === dateKeyForOffset(-1)) return -1
  if (key === dateKeyForOffset(-2)) return -2
  return null
}

export function parseDateKeyParts(dateKey) {
  const match = String(dateKey || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

export function dateKeyFromLocalParts(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function buildCalendarMonthCells(year, month, options = {}) {
  const today = options.todayDateKey || getLocalDateKey()
  const max = options.maxDateKey || today
  const selected = options.selectedDateKey || ''
  const min = options.minDateKey
  const monthIndex = month - 1
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1
    const date = new Date(year, monthIndex, dayIndex)
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
    const dateKeyStr = dateKeyFromLocalParts(date.getFullYear(), date.getMonth() + 1, date.getDate())
    let disabled = !inMonth
    if (!disabled && compareDateKeys(dateKeyStr, max) > 0) disabled = true
    if (!disabled && min && compareDateKeys(dateKeyStr, min) < 0) disabled = true

    cells.push({
      key: `${year}-${monthIndex}-${i}`,
      day: date.getDate(),
      dateKey: dateKeyStr,
      inMonth,
      isToday: dateKeyStr === today,
      isSelected: dateKeyStr === selected,
      disabled,
      label: date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    })
  }

  return cells
}

export function withDiaryDateQuery(path, dateKey) {
  const value = String(dateKey || getLocalDateKey()).trim()
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}date=${encodeURIComponent(value)}`
}
