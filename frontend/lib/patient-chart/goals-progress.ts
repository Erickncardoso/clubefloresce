import type { GoalItem, GoalsProgress } from '@/lib/patient-chart/evolucao'

export const FOOD_WEEKDAYS = [
  { index: 0, short: 'Seg', label: 'Segunda' },
  { index: 1, short: 'Ter', label: 'Terça' },
  { index: 2, short: 'Qua', label: 'Quarta' },
  { index: 3, short: 'Qui', label: 'Quinta' },
  { index: 4, short: 'Sex', label: 'Sexta' },
  { index: 5, short: 'Sáb', label: 'Sábado' },
  { index: 6, short: 'Dom', label: 'Domingo' },
]

const DEFAULT_SLEEP_BED = 23 * 60
const DEFAULT_SLEEP_WAKE = 7 * 60 + 20

export function dateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekStartKey(date = new Date()): string {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return dateKey(copy)
}

export function weekdayIndex(date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export function periodKeyForGoal(goal: GoalItem, date = new Date()): string {
  return goal.frequency === 'weekly' ? weekStartKey(date) : dateKey(date)
}

export function progressStorageKey(goalId: string, periodKey: string): string {
  return `${goalId}:${periodKey}`
}

function foodDaysStorageKey(weekKey: string): string {
  return `food-days:${weekKey}`
}

function sleepMetaKey(kind: string, dayKey: string): string {
  return `sleep-${kind}:${dayKey}`
}

export function parseFoodDays(raw: unknown): number[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
}

function calcSleepDurationMinutes(bedMinutes: number, wakeMinutes: number): number {
  let diff = wakeMinutes - bedMinutes
  if (diff <= 0) diff += 1440
  return diff
}

function calcSleepDurationHours(bedMinutes: number, wakeMinutes: number): number {
  const minutes = calcSleepDurationMinutes(bedMinutes, wakeMinutes)
  return Math.round((minutes / 60) * 2) / 2
}

function normalizeSleepTimes(
  bedMinutes: number,
  wakeMinutes: number,
): { bed: number; wake: number } {
  let bed = ((bedMinutes % 1440) + 1440) % 1440
  let wake = ((wakeMinutes % 1440) + 1440) % 1440
  const bedH = Math.floor(bed / 60)

  if (bedH >= 6 && bedH < 18) {
    bed = (bed + 12 * 60) % 1440
  }

  const diff = calcSleepDurationMinutes(bed, wake)
  if (diff < 3 * 60) {
    wake = (bed + 7 * 60) % 1440
  } else if (diff > 14 * 60) {
    wake = (bed + 8 * 60) % 1440
  }

  return { bed, wake }
}

export function getProgress(
  goal: GoalItem,
  progress: GoalsProgress = {},
  date = new Date(),
): number {
  if (goal.id === 'food') {
    const weekKey = periodKeyForGoal(goal, date)
    const daysKey = foodDaysStorageKey(weekKey)
    if (daysKey in progress) {
      return parseFoodDays(progress[daysKey]).length
    }
    return 0
  }
  const key = progressStorageKey(goal.id, periodKeyForGoal(goal, date))
  return Number(progress[key] || 0)
}

export function getProgressPercent(
  goal: GoalItem,
  progress: GoalsProgress = {},
  date = new Date(),
): number {
  if (goal.id === 'food' || goal.type === 'food') return 0
  if (!goal.target) return 0
  return Math.min(100, Math.round((getProgress(goal, progress, date) / goal.target) * 100))
}

export function getFoodSelectedDays(
  goal: GoalItem | null | undefined,
  progress: GoalsProgress = {},
  date = new Date(),
): number[] {
  if (!goal) return []
  const weekKey = periodKeyForGoal(goal, date)
  return parseFoodDays(progress[foodDaysStorageKey(weekKey)])
}

export type SleepSchedule = {
  dateKey: string
  bedMinutes: number
  wakeMinutes: number
  durationHours: number
  durationMinutes: number
}

export function getSleepSchedule(progress: GoalsProgress = {}, date = new Date()): SleepSchedule {
  const dk = dateKey(date)
  const bedStored = progress[sleepMetaKey('bed', dk)]
  const wakeStored = progress[sleepMetaKey('wake', dk)]

  const bedMinutes = bedStored != null ? Number(bedStored) : DEFAULT_SLEEP_BED
  let wakeMinutes = wakeStored != null ? Number(wakeStored) : DEFAULT_SLEEP_WAKE

  if (bedStored == null || wakeStored == null) {
    const sleepKey = progressStorageKey('sleep', dk)
    const savedHours = Number(progress[sleepKey] || 0)
    if (savedHours > 0) {
      wakeMinutes = (DEFAULT_SLEEP_BED + Math.round(savedHours * 60)) % 1440
    }
  }

  const normalized = normalizeSleepTimes(bedMinutes, wakeMinutes)
  const durationMinutes = calcSleepDurationMinutes(normalized.bed, normalized.wake)
  const durationHours = calcSleepDurationHours(normalized.bed, normalized.wake)

  return {
    dateKey: dk,
    bedMinutes: normalized.bed,
    wakeMinutes: normalized.wake,
    durationHours,
    durationMinutes,
  }
}

export type GoalRow = {
  goal: GoalItem
  progress: number
  percent: number
}

export function buildGoalsSummary(
  goals: GoalItem[] = [],
  progress: GoalsProgress = {},
  date = new Date(),
): GoalRow[] {
  return goals.map((goal) => ({
    goal,
    progress: getProgress(goal, progress, date),
    percent: getProgressPercent(goal, progress, date),
  }))
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
