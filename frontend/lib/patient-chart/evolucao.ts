import { apiFetch } from '@/lib/api'

export type DayConsumed = {
  caloriesKcal: number
  carbsG: number
  proteinG: number
  fatG: number
}

export type MonthDaySummary = {
  date: string
  entryCount: number
  consumed: DayConsumed
}

export type MonthSummary = {
  year: number
  month: number
  daysWithEntries: number
  totals: DayConsumed
  targets?: { caloriesKcal?: number }
  days: MonthDaySummary[]
}

export type DayEntry = {
  id: string
  mealLabel?: string | null
  mealType?: string | null
  imageUrl?: string | null
  caloriesKcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

export type PhotoEntry = {
  id: string
  mealLabel?: string | null
  mealType?: string | null
  entryDate?: string | null
  imageUrl?: string | null
  caloriesKcal?: number | null
  likesCount?: number
  likedByMe?: boolean
  commentsCount?: number
}

export type GoalItem = {
  id: string
  label: string
  type?: string
  target?: number
  unit?: string
  frequency?: string
}

export type GoalsProgress = Record<string, unknown>

export type GoalsData = {
  goals: GoalItem[]
  progress: GoalsProgress
}

export async function fetchFoodDiaryMonth(
  patientId: string,
  year: number,
  month: number,
): Promise<MonthSummary> {
  return apiFetch<MonthSummary>(
    `/patients/${encodeURIComponent(patientId)}/food-diary/month?year=${year}&month=${month}`,
  )
}

export async function fetchFoodDiaryDay(
  patientId: string,
  date: string,
): Promise<DayEntry[]> {
  const data = await apiFetch<{ entries?: DayEntry[] }>(
    `/patients/${encodeURIComponent(patientId)}/food-diary/day?date=${encodeURIComponent(date)}`,
  )
  return data.entries || []
}

export async function fetchFoodDiaryPhotos(
  patientId: string,
  limit = 60,
): Promise<PhotoEntry[]> {
  const data = await apiFetch<{ photos?: PhotoEntry[] }>(
    `/patients/${encodeURIComponent(patientId)}/food-diary/photos?limit=${limit}`,
  )
  return (data.photos || []).map((photo) => ({
    ...photo,
    likesCount: photo.likesCount ?? 0,
    likedByMe: Boolean(photo.likedByMe),
    commentsCount: photo.commentsCount ?? 0,
  }))
}

export async function fetchPatientGoals(patientId: string): Promise<GoalsData> {
  const data = await apiFetch<{ goals?: GoalItem[]; progress?: GoalsProgress }>(
    `/patients/${encodeURIComponent(patientId)}/goals`,
  )
  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    progress: data.progress && typeof data.progress === 'object' ? data.progress : {},
  }
}
