export const HYDRATION_ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentário', factor: 1, mlPerHour: 0 },
  { id: 'light', label: 'Leve', factor: 1.15, mlPerHour: 350 },
  { id: 'moderate', label: 'Moderado', factor: 1.25, mlPerHour: 500 },
  { id: 'intense', label: 'Intenso', factor: 1.35, mlPerHour: 650 },
]

export const HYDRATION_CLIMATE_FACTOR = {
  mild: 1,
  warm: 1.2,
}

export const HYDRATION_CLIMATE_OPTIONS = [
  { id: 'mild', label: 'Clima ameno', factor: 1 },
  { id: 'warm', label: 'Clima quente/úmido', factor: 1.2 },
]

export const HYDRATION_UNIT_OPTIONS = [
  { id: 'ml', label: 'ml' },
  { id: 'l', label: 'L' },
]

export const HYDRATION_DAY_IDS = [
  { id: 'all', label: 'Todos os dias' },
  { id: 'mon', label: 'Segunda' },
  { id: 'tue', label: 'Terça' },
  { id: 'wed', label: 'Quarta' },
  { id: 'thu', label: 'Quinta' },
  { id: 'fri', label: 'Sexta' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' },
]

export const HYDRATION_SCHEDULE_MODES = [
  { id: 'weekly', label: 'Semanal' },
  { id: 'daily', label: 'Diária' },
]

const BSA_COEFF = 0.007184
const BASE_ML_PER_BSA = 1000

/** Du Bois — peso (kg), altura (cm) → m² */
export function computeBodySurfaceArea(weightKg, heightCm) {
  const weight = Number(weightKg)
  const height = Number(heightCm)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) {
    return null
  }
  return BSA_COEFF * (weight ** 0.425) * (height ** 0.725)
}

export function createEmptyHydrationPrescription({ weightKg = null, heightCm = null, title = '' } = {}) {
  return {
    title: String(title || '').trim(),
    scheduleMode: 'weekly',
    weightKg: weightKg != null ? Number(weightKg) : null,
    heightCm: heightCm != null ? Number(heightCm) : null,
    activityLevel: 'sedentary',
    activityDurationMin: null,
    climate: 'mild',
    hotHumidClimate: false,
    intervalHours: 2,
    wakeTime: '06:00',
    bedTime: '20:00',
    useConsumptionWindow: true,
    unit: 'ml',
    customDailyMl: null,
    manualOverride: false,
    dailyGoals: {},
    activeDay: 'all',
    notes: '',
  }
}

export function normalizeHydrationPrescription(value, defaults = {}) {
  const base = createEmptyHydrationPrescription(defaults)
  if (!value || typeof value !== 'object') return base

  const hotHumidClimate = value.hotHumidClimate === true
    || value.climate === 'warm'
    || value.climate === 'hot'

  return {
    ...base,
    ...value,
    scheduleMode: value.scheduleMode === 'daily' ? 'daily' : 'weekly',
    weightKg: value.weightKg != null ? Number(value.weightKg) : base.weightKg,
    heightCm: value.heightCm != null ? Number(value.heightCm) : base.heightCm,
    activityDurationMin: value.activityDurationMin != null ? Number(value.activityDurationMin) : null,
    intervalHours: Math.max(1, Math.min(12, Number(value.intervalHours) || base.intervalHours)),
    customDailyMl: value.customDailyMl != null ? Number(value.customDailyMl) : null,
    manualOverride: value.manualOverride === true,
    dailyGoals: value.dailyGoals && typeof value.dailyGoals === 'object' ? { ...value.dailyGoals } : {},
    hotHumidClimate,
    climate: hotHumidClimate ? 'warm' : 'mild',
    wakeTime: String(value.wakeTime || base.wakeTime).slice(0, 5),
    bedTime: String(value.bedTime || base.bedTime).slice(0, 5),
    useConsumptionWindow: value.useConsumptionWindow !== false,
    title: String(value.title ?? base.title ?? '').trim(),
    activeDay: value.scheduleMode === 'daily'
      ? (HYDRATION_DAY_IDS.some((d) => d.id === value.activeDay && d.id !== 'all') ? value.activeDay : 'mon')
      : 'all',
  }
}

export function computeHydrationBreakdown(prescription) {
  const data = normalizeHydrationPrescription(prescription)
  const activity = HYDRATION_ACTIVITY_LEVELS.find((item) => item.id === data.activityLevel)
    || HYDRATION_ACTIVITY_LEVELS[0]
  const climateFactor = data.hotHumidClimate ? HYDRATION_CLIMATE_FACTOR.warm : HYDRATION_CLIMATE_FACTOR.mild
  const climateLabel = data.hotHumidClimate ? 'Clima quente/úmido' : 'Clima ameno'

  if (data.customDailyMl > 0) {
    return {
      bsa: computeBodySurfaceArea(data.weightKg, data.heightCm),
      baseMl: 0,
      activityBonusMl: 0,
      climateBonusMl: 0,
      totalMl: Math.round(data.customDailyMl),
      activityLabel: activity.label,
      climateLabel,
      isCustom: true,
    }
  }

  const bsa = computeBodySurfaceArea(data.weightKg, data.heightCm)
  if (bsa == null) {
    return {
      bsa: null,
      baseMl: 0,
      activityBonusMl: 0,
      climateBonusMl: 0,
      totalMl: 0,
      activityLabel: activity.label,
      climateLabel,
      isCustom: false,
    }
  }

  const baseMl = Math.round(bsa * BASE_ML_PER_BSA)
  const activityScaledMl = Math.round(baseMl * activity.factor)
  const activityFactorBonusMl = activityScaledMl - baseMl

  const durationHours = Math.max(0, Number(data.activityDurationMin) || 0) / 60
  const durationBonusMl = Math.round((activity.mlPerHour || 0) * durationHours)

  const beforeClimateMl = activityScaledMl + durationBonusMl
  const totalMl = Math.round(beforeClimateMl * climateFactor)
  const climateBonusMl = totalMl - beforeClimateMl

  return {
    bsa,
    baseMl,
    activityBonusMl: activityFactorBonusMl + durationBonusMl,
    climateBonusMl,
    totalMl,
    activityLabel: activity.label,
    climateLabel,
    isCustom: false,
  }
}

export function computeHydrationGoal(prescription, dayId = 'all') {
  const data = normalizeHydrationPrescription(prescription)
  if (data.scheduleMode === 'daily' && dayId && dayId !== 'all') {
    const perDay = data.dailyGoals?.[dayId]
    if (perDay != null && Number(perDay) > 0) return Math.round(Number(perDay))
  }
  if (data.customDailyMl > 0) return Math.round(data.customDailyMl)
  return computeHydrationBreakdown(data).totalMl
}

export function displayUnitAmount(ml, unit = 'ml') {
  const value = Number(ml) || 0
  if (unit === 'l') {
    const liters = value / 1000
    return `${liters.toFixed(liters >= 10 ? 1 : 2).replace(/\.?0+$/, '')} L`
  }
  if (unit === 'oz') {
    const oz = value / 29.5735
    return `${Math.round(oz)} oz`
  }
  return `${Math.round(value).toLocaleString('pt-BR')} ml`
}

export function formatHydrationAmount(ml, unit = 'ml') {
  return displayUnitAmount(ml, unit)
}

export function hydrationPerInterval(dailyMl, intervalHours) {
  const hours = Math.max(1, Number(intervalHours) || 2)
  const intervals = Math.ceil(24 / hours)
  if (!intervals) return 0
  return Math.round((Number(dailyMl) || 0) / intervals)
}

export function hasManualHydrationOverride(prescription, computedMl) {
  const data = normalizeHydrationPrescription(prescription)
  if (data.manualOverride) return true
  if (data.customDailyMl != null && data.customDailyMl > 0 && data.customDailyMl !== computedMl) {
    return true
  }
  return false
}
