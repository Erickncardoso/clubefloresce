export type GoalFrequency = 'daily' | 'weekly'

export interface PatientGoal {
  id: string
  label: string
  type: 'water' | 'habit' | 'food' | 'exercise' | 'sleep'
  target: number
  unit: string
  frequency: GoalFrequency
  color: string
  step?: number
}

const STORAGE_KEY = 'cf-patient-goals-v1'

const DEFAULT_GOALS: PatientGoal[] = [
  { id: 'water', label: 'Água', type: 'water', target: 2, unit: 'litros', frequency: 'daily', color: '#5ba4d9', step: 0.25 },
  { id: 'food', label: 'Alimentação', type: 'food', target: 5, unit: 'dias', frequency: 'weekly', color: '#e8a598' },
  { id: 'exercise', label: 'Exercício', type: 'exercise', target: 3, unit: 'vezes', frequency: 'weekly', color: '#6d9a66' },
  { id: 'sleep', label: 'Sono', type: 'sleep', target: 8, unit: 'horas', frequency: 'daily', color: '#6aab6a', step: 0.5 },
]

function readStore(): { goals: PatientGoal[]; progress: Record<string, number> } {
  if (!import.meta.client) {
    return { goals: DEFAULT_GOALS, progress: {} }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { goals: DEFAULT_GOALS, progress: {} }
    const parsed = JSON.parse(raw)
    const goals = normalizeStoredGoals(Array.isArray(parsed.goals) && parsed.goals.length ? parsed.goals : DEFAULT_GOALS)
    const progress = parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {}
    migrateWaterProgress({ goals, progress })
    return { goals, progress }
  } catch {
    return { goals: DEFAULT_GOALS, progress: {} }
  }
}

function writeStore(data: { goals: PatientGoal[]; progress: Record<string, number> }) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekStartKey(date = new Date()) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return dateKey(copy)
}

function periodKeyForGoal(goal: PatientGoal, date = new Date()) {
  return goal.frequency === 'weekly' ? weekStartKey(date) : dateKey(date)
}

function roundToStep(value: number, step: number, max: number) {
  const clamped = Math.max(0, Math.min(max, value))
  if (step >= 1) return Math.round(clamped)
  const factor = 1 / step
  return Math.round(clamped * factor) / factor
}

function progressStorageKey(goalId: string, periodKey: string) {
  return `${goalId}:${periodKey}`
}

function migrateWaterProgress(store: { goals: PatientGoal[]; progress: Record<string, number> }) {
  const water = store.goals.find((item) => item.id === 'water')
  if (!water || water.unit !== 'litros') return false

  let changed = false
  for (const [key, value] of Object.entries(store.progress)) {
    if (!key.startsWith('water:') || value <= water.target) continue
    store.progress[key] = roundToStep(value * 0.25, 0.25, water.target)
    changed = true
  }
  return changed
}

function calcSleepDurationHours(bedMinutes: number, wakeMinutes: number) {
  let diff = wakeMinutes - bedMinutes
  if (diff <= 0) diff += 1440
  return Math.round((diff / 60) * 2) / 2
}

function normalizeSleepTimes(bedMinutes: number, wakeMinutes: number) {
  let bed = ((bedMinutes % 1440) + 1440) % 1440
  let wake = ((wakeMinutes % 1440) + 1440) % 1440
  const bedH = Math.floor(bed / 60)
  const wakeH = Math.floor(wake / 60)

  if (bedH >= 6 && bedH < 18) {
    bed = (bed + 12 * 60) % 1440
  }

  if (wakeH >= 12) {
    const morning = wake - 12 * 60
    if (calcSleepDurationHours(bed, morning) >= 4) {
      wake = ((morning % 1440) + 1440) % 1440
    }
  }

  const duration = calcSleepDurationHours(bed, wake)
  if (duration > 12 && wakeH < 12) {
    const eveningWake = wake + 12 * 60
    if (calcSleepDurationHours(bed, eveningWake) <= 12) {
      wake = eveningWake % 1440
    }
  }

  return { bed, wake }
}

function sleepMetaKey(kind: 'bed' | 'wake', dayKey: string) {
  return `sleep-${kind}:${dayKey}`
}

const DEFAULT_SLEEP_BED = 23 * 60
const DEFAULT_SLEEP_WAKE = 7 * 60 + 20

function normalizeStoredGoals(goals: PatientGoal[]) {
  const defaultsById = Object.fromEntries(DEFAULT_GOALS.map((goal) => [goal.id, goal]))

  return goals.map((goal) => {
    const fallback = defaultsById[goal.id]
    if (!fallback) return goal
    if (goal.id === 'sleep' && (goal.unit === 'noites' || goal.frequency === 'weekly')) {
      return { ...fallback }
    }
    if (goal.id === 'water' && goal.unit === 'copos') {
      return {
        ...goal,
        type: 'water',
        target: Math.round(goal.target * 0.25 * 4) / 4 || 2,
        unit: 'litros',
        step: 0.25,
        color: fallback.color,
      }
    }
    if (goal.id === 'water') {
      return {
        ...goal,
        type: 'water',
        step: goal.step ?? 0.25,
        color: fallback.color,
      }
    }
    if (goal.id === 'food' && goal.type === 'habit') {
      return { ...goal, type: 'food', color: fallback.color }
    }
    if (goal.id === 'exercise' && goal.type === 'habit') {
      return { ...goal, type: 'exercise', color: fallback.color }
    }
    return goal
  })
}

export function usePatientGoals() {
  const store = useState('patient-goals-store', () => readStore())

  function persist() {
    writeStore(store.value)
  }

  function hydrate() {
    store.value = readStore()
    repairSleepSchedule()
  }

  function repairSleepSchedule(date = new Date()) {
    if (!import.meta.client) return

    const dk = dateKey(date)
    const bedKey = sleepMetaKey('bed', dk)
    const wakeKey = sleepMetaKey('wake', dk)
    const bedStored = store.value.progress[bedKey]
    const wakeStored = store.value.progress[wakeKey]

    let bed = bedStored ?? DEFAULT_SLEEP_BED
    let wake = wakeStored ?? DEFAULT_SLEEP_WAKE

    if (bedStored == null || wakeStored == null) {
      const sleepGoal = store.value.goals.find((item) => item.id === 'sleep')
      const savedHours = sleepGoal ? getProgress(sleepGoal, date) : 0
      if (savedHours > 0) {
        wake = (DEFAULT_SLEEP_BED + Math.round(savedHours * 60)) % 1440
      }
    }

    const normalized = normalizeSleepTimes(bed, wake)
    const hours = calcSleepDurationHours(normalized.bed, normalized.wake)
    const sleepKey = progressStorageKey('sleep', periodKeyForGoal(
      store.value.goals.find((item) => item.id === 'sleep') || DEFAULT_GOALS[3],
      date,
    ))
    const currentHours = store.value.progress[sleepKey] || 0

    const scheduleChanged = bedStored !== normalized.bed || wakeStored !== normalized.wake
    const hoursChanged = currentHours !== hours

    if (!scheduleChanged && !hoursChanged) return

    store.value.progress[bedKey] = normalized.bed
    store.value.progress[wakeKey] = normalized.wake
    store.value.progress[sleepKey] = hours
    persist()
  }

  function listGoals() {
    return store.value.goals
  }

  function getProgress(goal: PatientGoal, date = new Date()) {
    const key = progressStorageKey(goal.id, periodKeyForGoal(goal, date))
    return store.value.progress[key] || 0
  }

  function getProgressPercent(goal: PatientGoal, date = new Date()) {
    if (!goal.target) return 0
    return Math.min(100, Math.round((getProgress(goal, date) / goal.target) * 100))
  }

  function setProgress(goalId: string, value: number, date = new Date()) {
    const goal = store.value.goals.find((item) => item.id === goalId)
    if (!goal) return
    const key = progressStorageKey(goalId, periodKeyForGoal(goal, date))
    const step = goal.step || 1
    const max = goal.target
    store.value.progress[key] = roundToStep(value, step, max)
    persist()
  }

  function incrementGoal(goalId: string, step?: number, date = new Date()) {
    const goal = store.value.goals.find((item) => item.id === goalId)
    if (!goal) return
    const delta = step ?? goal.step ?? 1
    setProgress(goalId, getProgress(goal, date) + delta, date)
  }

  function decrementGoal(goalId: string, step?: number, date = new Date()) {
    const goal = store.value.goals.find((item) => item.id === goalId)
    if (!goal) return
    const delta = step ?? goal.step ?? 1
    setProgress(goalId, getProgress(goal, date) - delta, date)
  }

  function getDailyProgressSeries(goalId: string, days = 7, date = new Date()) {
    const goal = store.value.goals.find((item) => item.id === goalId)
    if (!goal) return []

    const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    const result = []

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date(date)
      day.setDate(day.getDate() - offset)
      const key = progressStorageKey(goalId, dateKey(day))
      const value = store.value.progress[key] || 0
      result.push({
        key: dateKey(day),
        label: labels[day.getDay()],
        value,
        isToday: offset === 0,
      })
    }

    return result
  }

  function getSleepSchedule(date = new Date()) {
    const dk = dateKey(date)
    const bedStored = store.value.progress[sleepMetaKey('bed', dk)]
    const wakeStored = store.value.progress[sleepMetaKey('wake', dk)]

    let bedMinutes = bedStored ?? DEFAULT_SLEEP_BED
    let wakeMinutes = wakeStored ?? DEFAULT_SLEEP_WAKE

    if (bedStored == null || wakeStored == null) {
      const sleepGoal = store.value.goals.find((item) => item.id === 'sleep')
      const savedHours = sleepGoal ? getProgress(sleepGoal, date) : 0
      if (savedHours > 0) {
        wakeMinutes = (DEFAULT_SLEEP_BED + Math.round(savedHours * 60)) % 1440
      }
    }

    const normalized = normalizeSleepTimes(bedMinutes, wakeMinutes)
    const durationHours = calcSleepDurationHours(normalized.bed, normalized.wake)

    return {
      dateKey: dk,
      bedMinutes: normalized.bed,
      wakeMinutes: normalized.wake,
      durationHours,
      durationMinutes: Math.round(durationHours * 60),
    }
  }

  function setSleepSchedule(bedMinutes: number, wakeMinutes: number, date = new Date()) {
    const dk = dateKey(date)
    const normalized = normalizeSleepTimes(
      Math.round(bedMinutes / 15) * 15,
      Math.round(wakeMinutes / 15) * 15,
    )
    const bed = normalized.bed
    const wake = normalized.wake
    store.value.progress[sleepMetaKey('bed', dk)] = bed
    store.value.progress[sleepMetaKey('wake', dk)] = wake
    const hours = calcSleepDurationHours(bed, wake)
    setProgress('sleep', hours, date)
  }

  function shiftSleepTime(kind: 'bed' | 'wake', deltaMinutes: number, date = new Date()) {
    const current = getSleepSchedule(date)
    if (kind === 'bed') {
      setSleepSchedule(current.bedMinutes + deltaMinutes, current.wakeMinutes, date)
    } else {
      setSleepSchedule(current.bedMinutes, current.wakeMinutes + deltaMinutes, date)
    }
  }

  function updateGoal(goalId: string, patch: Partial<Pick<PatientGoal, 'label' | 'target' | 'unit' | 'frequency'>>) {
    const index = store.value.goals.findIndex((item) => item.id === goalId)
    if (index < 0) return
    store.value.goals[index] = { ...store.value.goals[index], ...patch }
    persist()
  }

  function addGoal(goal: Omit<PatientGoal, 'id'>) {
    const id = `custom-${Date.now()}`
    store.value.goals.push({ ...goal, id })
    persist()
    return id
  }

  function removeGoal(goalId: string) {
    if (['water', 'food', 'exercise', 'sleep'].includes(goalId)) return
    store.value.goals = store.value.goals.filter((item) => item.id !== goalId)
    persist()
  }

  const todaySummary = computed(() =>
    store.value.goals.map((goal) => ({
      goal,
      progress: getProgress(goal),
      percent: getProgressPercent(goal),
    })),
  )

  return {
    goals: computed(() => store.value.goals),
    todaySummary,
    hydrate,
    listGoals,
    getProgress,
    getProgressPercent,
    setProgress,
    incrementGoal,
    decrementGoal,
    updateGoal,
    addGoal,
    removeGoal,
    periodKeyForGoal,
    getDailyProgressSeries,
    getSleepSchedule,
    setSleepSchedule,
    shiftSleepTime,
  }
}
