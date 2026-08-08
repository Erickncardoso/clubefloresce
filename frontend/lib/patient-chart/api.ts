import { apiFetch } from '@/lib/api'
import type { AuthUser } from '@/lib/types'

export type PatientProfileData = Record<string, unknown> & {
  nickname?: string | null
  gender?: string | null
  birthDate?: string | null
  cpf?: string | null
  tags?: string[] | null
  tagItems?: Array<{ id?: string; name: string; color?: string }> | null
  city?: string | null
  state?: string | null
  occupation?: string | null
  maritalStatus?: string | null
  modality?: string | null
  athlete?: boolean | null
  pregnant?: boolean | null
  lactating?: boolean | null
  objective?: string | null
  notes?: string | null
  zipCode?: string | null
  neighborhood?: string | null
  street?: string | null
  streetNumber?: string | null
  mealPlans?: unknown[]
  documentos?: unknown[]
  orientacoes?: unknown[]
  antropometria?: unknown[]
  exames?: unknown[]
  anamneseRecords?: unknown[]
}

export type PatientUser = AuthUser & {
  phone?: string | null
  status?: string | null
  plan?: string | null
  accessExpiresAt?: string | null
  paymentMethod?: string | null
  patientProfileData?: PatientProfileData | null
  approvedAt?: string | null
}

export type PatientOverview = {
  patient?: PatientUser
  mealPlan?: {
    id?: string
    title?: string
    fileName?: string
    pdfUrl?: string | null
    mealCount?: number
    updatedAt?: string
    plan?: unknown
  } | null
  nutritionTarget?: unknown
  metrics?: Record<string, unknown>
  recentCheckins?: unknown[]
  [key: string]: unknown
}

export type FoodDiaryEntry = {
  id: string
  mealLabel?: string | null
  mealType?: string | null
  entryDate?: string | null
  imageUrl?: string | null
  caloriesKcal?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
}

export type LegacyCheckIn = {
  id: string
  weekStart?: string
  mood?: number
  energy?: number
  adherence?: number
  weightKg?: number | null
  notes?: string | null
  updatedAt?: string
}

export type TemplateCheckInResponse = {
  id: string
  periodKey?: string | null
  answers?: Record<string, unknown> | null
  updatedAt?: string
  template?: {
    id?: string
    title?: string
    frequency?: string
    steps?: Array<{ id: string; type?: string; label?: string; question?: string; max?: number; unit?: string; yesLabel?: string; noLabel?: string }>
  } | null
}

export function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as PatientProfileData
}

export async function fetchPatientUser(patientId: string) {
  return apiFetch<PatientUser>(`/users/${encodeURIComponent(patientId)}`)
}

export async function fetchPatientOverview(patientId: string) {
  return apiFetch<PatientOverview>(`/patients/${encodeURIComponent(patientId)}/overview`)
}

export async function fetchPatientCheckIns(patientId: string) {
  const [legacy, responses] = await Promise.all([
    apiFetch<{ weekStart?: string; history?: LegacyCheckIn[] }>(
      `/checkin/patients/${encodeURIComponent(patientId)}`,
    ),
    apiFetch<{ responses?: TemplateCheckInResponse[] }>(
      `/checkin/patients/${encodeURIComponent(patientId)}/responses`,
    ),
  ])
  return {
    weekStart: legacy.weekStart || '',
    history: legacy.history || [],
    responses: responses.responses || [],
  }
}

export async function fetchPatientFoodDiary(patientId: string) {
  const data = await apiFetch<{ entries?: FoodDiaryEntry[] }>(
    `/patients/${encodeURIComponent(patientId)}/food-diary`,
  )
  return data.entries || []
}

export async function fetchPatientMealPlan(patientId: string) {
  const data = await apiFetch<{ plan?: unknown } | unknown>(
    `/patients/${encodeURIComponent(patientId)}/meal-plan`,
  )
  if (data && typeof data === 'object' && 'plan' in (data as object)) {
    return (data as { plan?: unknown }).plan || null
  }
  return data || null
}

export async function patchPatientUser(patientId: string, body: Record<string, unknown>) {
  return apiFetch<PatientUser>(`/users/${encodeURIComponent(patientId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function saveLegacyCheckIn(patientId: string, body: Record<string, unknown>) {
  return apiFetch(`/checkin/patients/${encodeURIComponent(patientId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function uploadPatientMealPlan(patientId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<{ plan?: unknown; user?: PatientUser }>(
    `/patients/${encodeURIComponent(patientId)}/meal-plan/upload`,
    { method: 'POST', body: form },
  )
}

export function formatCepMask(value: string) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatCpfMask(value: string) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
