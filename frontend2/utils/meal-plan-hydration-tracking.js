import { computeHydrationGoal } from './meal-plan-hydration.js'

export const HYDRATION_CUP_ML = 240

export const HYDRATION_WEEKDAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function parseTimeToMinutes(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

export function consumptionWindowMinutes(wakeTime, bedTime) {
  const wake = parseTimeToMinutes(wakeTime)
  const bed = parseTimeToMinutes(bedTime)
  if (wake == null || bed == null) return 24 * 60
  let diff = bed - wake
  if (diff <= 0) diff += 24 * 60
  return Math.max(60, diff)
}

export function countRemindersInWindow(wakeTime, bedTime, intervalHours) {
  const windowMin = consumptionWindowMinutes(wakeTime, bedTime)
  const intervalMin = Math.max(1, Number(intervalHours) || 2) * 60
  return Math.max(1, Math.floor(windowMin / intervalMin) + 1)
}

export function hydrationPerReminder(dailyMl, wakeTime, bedTime, intervalHours) {
  const reminders = countRemindersInWindow(wakeTime, bedTime, intervalHours)
  return Math.round((Number(dailyMl) || 0) / reminders)
}

export function mlToCups(ml, cupMl = HYDRATION_CUP_ML) {
  const value = Number(ml) || 0
  if (!value) return 0
  return Math.round((value / cupMl) * 10) / 10
}

export function formatHydrationCups(ml, cupMl = HYDRATION_CUP_ML) {
  const cups = mlToCups(ml, cupMl)
  if (!cups) return '0 copos'
  const label = cups === 1 ? 'copo' : 'copos'
  return `${cups.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${label}`
}

export function resolveDailyGoalMl(prescription, dayId = 'all') {
  if (!prescription) return 0
  return computeHydrationGoal(prescription, dayId)
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function weekdayIdFromDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[d.getDay()] || 'mon'
}

export function buildHydrationWeekDays(weekStart, prescription, logs = []) {
  const logByDate = new Map(
    (Array.isArray(logs) ? logs : []).map((item) => [String(item.date || '').slice(0, 10), item]),
  )
  const days = []
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i)
    const dateKey = toDateKey(date)
    const weekdayId = weekdayIdFromDate(date)
    const log = logByDate.get(dateKey)
    const goalFromPrescription = resolveDailyGoalMl(prescription, weekdayId)
    const goalMl = log?.goalMl != null ? Number(log.goalMl) : goalFromPrescription
    const consumedMl = log?.consumedMl != null ? Number(log.consumedMl) : 0
    const deficitMl = Math.max(0, goalMl - consumedMl)
    const surplusMl = Math.max(0, consumedMl - goalMl)
    days.push({
      date: dateKey,
      weekdayId,
      label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
      goalMl,
      consumedMl,
      deficitMl,
      surplusMl,
      hasLog: Boolean(log),
      prescriptionChanged: log?.goalMl != null && goalFromPrescription > 0 && log.goalMl !== goalFromPrescription,
      currentGoalMl: goalFromPrescription,
    })
  }
  return days
}

export function formatWeekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6)
  const startLabel = weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endLabel = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function sortHydrationFeedback(items = []) {
  return [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function unreadHydrationFeedbackCount(items = []) {
  return (Array.isArray(items) ? items : []).filter((item) => !item?.readAt).length
}

export function markHydrationFeedbackRead(items = [], ids = null) {
  const now = new Date().toISOString()
  const idSet = ids ? new Set(ids) : null
  return (Array.isArray(items) ? items : []).map((item) => {
    if (idSet && !idSet.has(item.id)) return item
    if (!idSet && item.readAt) return item
    return { ...item, readAt: item.readAt || now }
  })
}

export function normalizeHydrationLog(raw) {
  if (!raw || typeof raw !== 'object') return null
  const date = String(raw.date || '').slice(0, 10)
  const consumedMl = Number(raw.consumedMl)
  if (!date || !Number.isFinite(consumedMl)) return null
  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    date,
    consumedMl: Math.round(consumedMl),
    goalMl: raw.goalMl != null ? Math.round(Number(raw.goalMl)) : null,
    source: raw.source === 'app' ? 'app' : 'manual',
    createdAt: raw.createdAt || new Date().toISOString(),
  }
}

export function normalizeHydrationFeedback(raw) {
  if (!raw || typeof raw !== 'object') return null
  const message = String(raw.message || '').trim()
  if (!message) return null
  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    message,
    createdAt: raw.createdAt || new Date().toISOString(),
    readAt: raw.readAt || null,
  }
}
