import {
  buildMonthActivityMap,
  computeBestStreak,
  computeCurrentStreak,
  countActiveDaysInMonth,
  countActiveDaysInWeek,
  dateKey,
  getWeekDateKeys,
  goalsAveragePercent,
  isActivityDay,
} from '~/utils/patient-activity-days.js'

const DEFAULT_TARGETS = {
  caloriesKcal: 2000,
  proteinG: 120,
  carbsG: 220,
  fatG: 65,
}

export function usePatientDailyHeader() {
  const config = useRuntimeConfig()
  const { foodDiaryPath, diaryFetchInit, selectedDateKey: diaryDateKey } = useDiaryDate()
  const { hydrate: hydrateGoals } = usePatientGoals()
  const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)

  const dailySummary = useState<any>('patient-daily-summary', () => null)
  const streakDays = useState('patient-streak-days', () => 1)
  const calendarOpen = useState('patient-activity-calendar-open', () => false)
  const monthCacheKey = useState('patient-activity-month-key', () => '')
  const monthActivityMap = useState<Map<string, boolean>>('patient-activity-month-map', () => new Map())
  const monthDiaryDays = useState<any[]>('patient-activity-month-diary', () => [])
  const monthLoading = useState('patient-activity-month-loading', () => false)
  const viewYear = useState('patient-activity-view-year', () => new Date().getFullYear())
  const viewMonth = useState('patient-activity-view-month', () => new Date().getMonth() + 1)
  const selectedDateKey = useState('patient-activity-selected-date', () => dateKey())

  const targets = computed(() => dailySummary.value?.targets ?? DEFAULT_TARGETS)
  const consumed = computed(
    () =>
      dailySummary.value?.consumed ?? {
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
  )

  const caloriePercent = computed(() => {
    if (!targets.value.caloriesKcal) return 0
    return Math.min(
      100,
      Math.round((consumed.value.caloriesKcal / targets.value.caloriesKcal) * 100),
    )
  })

  const calorieRingDash = computed(() => (caloriePercent.value / 100) * 97.4)

  const goalsAverage = computed(() => {
    if (!import.meta.client) return 0
    const store = useState<{ goals: any[]; progress: Record<string, number> }>(
      'patient-goals-store',
      () => ({ goals: [], progress: {} }),
    )
    return goalsAveragePercent(store.value.goals, store.value.progress, new Date())
  })

  const streakLabel = computed(() => (activeStreak.value === 1 ? 'dia' : 'dias'))

  const activeStreak = computed(() => computeCurrentStreak(monthActivityMap.value))

  const bestStreak = computed(() =>
    Math.max(activeStreak.value, computeBestStreak(monthActivityMap.value)),
  )

  const weekActiveCount = computed(() =>
    countActiveDaysInWeek(monthActivityMap.value, new Date()),
  )

  const weekGoal = 7

  const weekGoalProgress = computed(() =>
    Math.min(1, weekActiveCount.value / weekGoal),
  )

  const weekBars = computed(() => {
    const keys = getWeekDateKeys(new Date())
    return keys.map((key) => {
      const date = new Date(`${key}T12:00:00`)
      return {
        key,
        active: monthActivityMap.value.get(key) ?? false,
        label: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        shortLabel: date.toLocaleDateString('pt-BR', { weekday: 'narrow' }).replace('.', ''),
        isToday: key === dateKey(),
      }
    })
  })

  const monthActiveCount = computed(() =>
    countActiveDaysInMonth(monthActivityMap.value, viewYear.value, viewMonth.value),
  )

  const selectedGoalsAverage = computed(() => {
    if (!import.meta.client) return 0
    const store = useState<{ goals: any[]; progress: Record<string, number> }>(
      'patient-goals-store',
      () => ({ goals: [], progress: {} }),
    )
    const date = new Date(`${selectedDateKey.value}T12:00:00`)
    return goalsAveragePercent(store.value.goals, store.value.progress, date)
  })

  const selectedIsActive = computed(() =>
    monthActivityMap.value.get(selectedDateKey.value) ?? false,
  )

  async function loadDailyNutrition() {
    try {
      dailySummary.value = await $fetch(
        `${config.public.apiBase}${foodDiaryPath('/food-diary/today')}`,
        diaryFetchInit(),
      )
    } catch {
      dailySummary.value = null
    }
  }

  async function loadCheckInStreak() {
    try {
      const data = await $fetch(`${config.public.apiBase}/checkin/me`, patientFetchInit())
      streakDays.value = Math.max(1, (data.history?.length || 0) + (data.current ? 1 : 0))
    } catch {
      streakDays.value = 1
    }
  }

  async function loadMonthActivity(year = viewYear.value, month = viewMonth.value) {
    const cacheKey = `${year}-${month}`
    if (monthCacheKey.value === cacheKey && monthActivityMap.value.size > 0) return

    monthLoading.value = true
    try {
      const store = useState<{ goals: any[]; progress: Record<string, number> }>(
        'patient-goals-store',
        () => ({ goals: [], progress: {} }),
      )
      const data = await $fetch(`${config.public.apiBase}/food-diary/month`, {
        ...patientFetchInit(),
        query: { year, month },
      })
      const diaryDays = Array.isArray(data?.days) ? data.days : []
      monthDiaryDays.value = diaryDays
      monthActivityMap.value = buildMonthActivityMap(
        store.value.goals,
        store.value.progress,
        diaryDays,
      )
      monthCacheKey.value = cacheKey
    } catch {
      const store = useState<{ goals: any[]; progress: Record<string, number> }>(
        'patient-goals-store',
        () => ({ goals: [], progress: {} }),
      )
      monthActivityMap.value = buildMonthActivityMap(store.value.goals, store.value.progress, [])
      monthCacheKey.value = cacheKey
      monthDiaryDays.value = []
    } finally {
      monthLoading.value = false
    }
  }

  function openCalendar() {
    calendarOpen.value = true
    selectedDateKey.value = dateKey()
    viewYear.value = new Date().getFullYear()
    viewMonth.value = new Date().getMonth() + 1
    void loadMonthActivity(viewYear.value, viewMonth.value)
  }

  function closeCalendar() {
    calendarOpen.value = false
  }

  function prevMonth() {
    if (viewMonth.value === 1) {
      viewMonth.value = 12
      viewYear.value -= 1
    } else {
      viewMonth.value -= 1
    }
    void loadMonthActivity(viewYear.value, viewMonth.value)
  }

  function nextMonth() {
    if (viewMonth.value === 12) {
      viewMonth.value = 1
      viewYear.value += 1
    } else {
      viewMonth.value += 1
    }
    void loadMonthActivity(viewYear.value, viewMonth.value)
  }

  function selectCalendarDay(dateKeyStr: string) {
    selectedDateKey.value = dateKeyStr
  }

  function isDayActive(dateKeyStr: string) {
    if (monthActivityMap.value.has(dateKeyStr)) {
      return monthActivityMap.value.get(dateKeyStr) ?? false
    }

    const store = useState<{ goals: any[]; progress: Record<string, number> }>(
      'patient-goals-store',
      () => ({ goals: [], progress: {} }),
    )
    const diaryDay = monthDiaryDays.value.find((day) => day.date === dateKeyStr)
    let diaryCount = diaryDay?.entryCount || 0
    if (!diaryCount && dateKeyStr === dateKey() && consumed.value.caloriesKcal > 0) {
      diaryCount = 1
    }
    return isActivityDay(store.value.goals, store.value.progress, dateKeyStr, diaryCount)
  }

  function refreshActivityForToday() {
    const store = useState<{ goals: any[]; progress: Record<string, number> }>(
      'patient-goals-store',
      () => ({ goals: [], progress: {} }),
    )
    const today = dateKey()
    const diaryDay = monthDiaryDays.value.find((day) => day.date === today)
    const active = isActivityDay(
      store.value.goals,
      store.value.progress,
      today,
      diaryDay?.entryCount || 0,
    )
    if (monthActivityMap.value.size) {
      monthActivityMap.value = new Map(monthActivityMap.value)
      monthActivityMap.value.set(today, active)
    }
  }

  async function bootstrapDailyHeader() {
    hydrateGoals()
    await Promise.allSettled([
      loadDailyNutrition(),
      loadCheckInStreak(),
      loadMonthActivity(),
    ])
  }

  watch(nutritionRefresh, () => {
    monthCacheKey.value = ''
    void loadDailyNutrition().then(() => {
      void loadMonthActivity(viewYear.value, viewMonth.value)
    })
  })

  watch(diaryDateKey, () => {
    void loadDailyNutrition()
  })

  return {
    dailySummary,
    targets,
    consumed,
    caloriePercent,
    calorieRingDash,
    streakDays,
    streakLabel,
    activeStreak,
    bestStreak,
    weekActiveCount,
    weekGoal,
    weekGoalProgress,
    weekBars,
    goalsAverage,
    calendarOpen,
    viewYear,
    viewMonth,
    selectedDateKey,
    monthLoading,
    monthActiveCount,
    selectedGoalsAverage,
    selectedIsActive,
    loadDailyNutrition,
    loadCheckInStreak,
    loadMonthActivity,
    bootstrapDailyHeader,
    openCalendar,
    closeCalendar,
    prevMonth,
    nextMonth,
    selectCalendarDay,
    isDayActive,
    refreshActivityForToday,
  }
}
