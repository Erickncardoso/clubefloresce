export interface HydrationActivityLevel {
  id: string
  label: string
  factor: number
  mlPerHour: number
}

export const HYDRATION_ACTIVITY_LEVELS: HydrationActivityLevel[] = [
  { id: 'sedentary', label: 'Sedentário', factor: 1, mlPerHour: 0 },
  { id: 'light', label: 'Leve', factor: 1.15, mlPerHour: 350 },
  { id: 'moderate', label: 'Moderado', factor: 1.25, mlPerHour: 500 },
  { id: 'intense', label: 'Intenso', factor: 1.35, mlPerHour: 650 },
]

export const HYDRATION_CLIMATE_FACTOR: Record<string, number> = {
  mild: 1,
  warm: 1.2,
}

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

export function computeBodySurfaceArea(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  const weight = Number(weightKg)
  const height = Number(heightCm)
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) return null
  return BSA_COEFF * Math.pow(weight, 0.425) * Math.pow(height, 0.725)
}

export interface HydrationPrescription {
  title: string
  scheduleMode: 'weekly' | 'daily'
  weightKg: number | null
  heightCm: number | null
  activityLevel: string
  activityDurationMin: number | null
  climate: string
  hotHumidClimate: boolean
  intervalHours: number
  wakeTime: string
  bedTime: string
  useConsumptionWindow: boolean
  unit: string
  customDailyMl: number | null
  manualOverride: boolean
  dailyGoals: Record<string, number>
  activeDay: string
  notes: string
}

export function createEmptyHydrationPrescription(
  { weightKg = null, heightCm = null, title = '' }: { weightKg?: number | null; heightCm?: number | null; title?: string } = {},
): HydrationPrescription {
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

export function normalizeHydrationPrescription(
  value: Partial<HydrationPrescription> | null | undefined,
  defaults: { weightKg?: number | null; heightCm?: number | null; title?: string } = {},
): HydrationPrescription {
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
      ? (HYDRATION_DAY_IDS.some((d) => d.id === value.activeDay && d.id !== 'all') ? value.activeDay! : 'mon')
      : 'all',
  }
}

export interface HydrationBreakdown {
  bsa: number | null
  baseMl: number
  activityBonusMl: number
  climateBonusMl: number
  totalMl: number
  activityLabel: string
  climateLabel: string
  isCustom: boolean
}

export function computeHydrationBreakdown(prescription: Partial<HydrationPrescription>): HydrationBreakdown {
  const data = normalizeHydrationPrescription(prescription)
  const activity = HYDRATION_ACTIVITY_LEVELS.find((item) => item.id === data.activityLevel)
    || HYDRATION_ACTIVITY_LEVELS[0]
  const climateFactor = data.hotHumidClimate ? HYDRATION_CLIMATE_FACTOR.warm : HYDRATION_CLIMATE_FACTOR.mild
  const climateLabel = data.hotHumidClimate ? 'Clima quente/úmido' : 'Clima ameno'

  if ((data.customDailyMl ?? 0) > 0) {
    return {
      bsa: computeBodySurfaceArea(data.weightKg, data.heightCm),
      baseMl: 0,
      activityBonusMl: 0,
      climateBonusMl: 0,
      totalMl: Math.round(data.customDailyMl!),
      activityLabel: activity.label,
      climateLabel,
      isCustom: true,
    }
  }

  const bsa = computeBodySurfaceArea(data.weightKg, data.heightCm)
  if (bsa == null) {
    return { bsa: null, baseMl: 0, activityBonusMl: 0, climateBonusMl: 0, totalMl: 0, activityLabel: activity.label, climateLabel, isCustom: false }
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

export function computeHydrationGoal(prescription: Partial<HydrationPrescription>, dayId = 'all'): number {
  const data = normalizeHydrationPrescription(prescription)
  if (data.scheduleMode === 'daily' && dayId && dayId !== 'all') {
    const perDay = data.dailyGoals?.[dayId]
    if (perDay != null && Number(perDay) > 0) return Math.round(Number(perDay))
  }
  if ((data.customDailyMl ?? 0) > 0) return Math.round(data.customDailyMl!)
  return computeHydrationBreakdown(data).totalMl
}

export function formatHydrationAmount(ml: number, unit = 'ml'): string {
  const value = Number(ml) || 0
  if (unit === 'l') {
    const liters = value / 1000
    return `${liters.toFixed(liters >= 10 ? 1 : 2).replace(/\.?0+$/, '')} L`
  }
  return `${Math.round(value).toLocaleString('pt-BR')} ml`
}

export function hasManualHydrationOverride(prescription: Partial<HydrationPrescription>, computedMl: number): boolean {
  const data = normalizeHydrationPrescription(prescription)
  if (data.manualOverride) return true
  if (data.customDailyMl != null && data.customDailyMl > 0 && data.customDailyMl !== computedMl) return true
  return false
}

const HYDRATION_CUP_ML = 240

export function parseTimeToMinutes(value: string): number | null {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

export function countRemindersInWindow(wakeTime: string, bedTime: string, intervalHours: number): number {
  const wake = parseTimeToMinutes(wakeTime)
  const bed = parseTimeToMinutes(bedTime)
  if (wake == null || bed == null) return Math.ceil(24 / Math.max(1, intervalHours))
  let diff = bed - wake
  if (diff <= 0) diff += 24 * 60
  const windowMin = Math.max(60, diff)
  const intervalMin = Math.max(1, Number(intervalHours) || 2) * 60
  return Math.max(1, Math.floor(windowMin / intervalMin) + 1)
}

export function hydrationPerReminder(dailyMl: number, wakeTime: string, bedTime: string, intervalHours: number): number {
  const reminders = countRemindersInWindow(wakeTime, bedTime, intervalHours)
  return Math.round((Number(dailyMl) || 0) / reminders)
}

export function formatHydrationCups(ml: number): string {
  const cups = Math.round((Number(ml) || 0) / HYDRATION_CUP_ML * 10) / 10
  if (!cups) return '0 copos'
  const label = cups === 1 ? 'copo' : 'copos'
  return `${cups.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${label}`
}
