export type UserRole = 'NUTRICIONISTA' | 'PACIENTE' | string

// ── Patient profile domain types ──────────────────────────────────────────────

export type Anamnese = {
  id: string
  title?: string | null
  content?: string | null
  formData?: Record<string, unknown> | null
  status?: 'draft' | 'completed' | string
  foodRestrictions?: string | null
  interpretation?: string | null
  authorName?: string | null
  createdAt?: string
  updatedAt?: string
}

export type Orientacao = {
  id: string
  title?: string | null
  content?: string | null
  templateId?: string | null
  previewModelId?: string | null
  status?: 'draft' | 'published' | string
  authorName?: string | null
  createdAt?: string
  updatedAt?: string
}

export type Documento = {
  id: string
  title?: string | null
  content?: string | null
  templateId?: string | null
  previewModelId?: string | null
  status?: 'draft' | 'published' | string
  authorName?: string | null
  createdAt?: string
  updatedAt?: string
}

export type BiomarkerRow = {
  id: string
  markerId?: string
  name: string
  value: number | string
  unit?: string
  refMin?: number | null
  refMax?: number | null
  category?: string
}

export type Exame = {
  id: string
  title: string
  collectedAt?: string | null
  labName?: string | null
  notes?: string | null
  status?: 'draft' | 'completed' | string
  authorName?: string | null
  biomarkers?: BiomarkerRow[]
  createdAt?: string
  updatedAt?: string
}

export type Antropometria = {
  id: string
  title?: string | null
  measuredAt?: string | null
  heightCm?: number | null
  weightKg?: number | null
  circumferences?: Record<string, number | null>
  boneDiameters?: Record<string, number | null>
  skinfoldMethod?: string
  skinfolds?: Record<string, number | null>
  bioimpedance?: Record<string, unknown>
  patientAppView?: string
  photos?: Record<string, string | null>
  bilateralCircumferences?: boolean
  dominantSide?: 'left' | 'right'
  notes?: string | null
  status?: 'draft' | 'completed' | string
  authorName?: string | null
  createdAt?: string
  updatedAt?: string
}

export type PatientProfile = {
  cpf?: string | null
  birthDate?: string | null
  gender?: string | null
  phone?: string | null
  anamneses?: Anamnese[]
  orientacoes?: Orientacao[]
  documentos?: Documento[]
  antropometrias?: Antropometria[]
  exames?: Exame[]
  [key: string]: unknown
}

export type PatientUser = {
  id: string
  name: string
  email?: string | null
  urlSlug?: string | null
  patientProfileData?: PatientProfile
  [key: string]: unknown
}

export type AuthUser = {
  id: string
  name: string
  email?: string | null
  role: UserRole
  avatar?: string | null
  phone?: string | null
  plan?: string | null
  createdAt?: string
}

export type RegistrationRequest = {
  id: string
  name: string
  email: string
  phone?: string | null
  message?: string | null
  createdAt: string
}

export type EngagementZones = {
  danger: AuthUser[]
  attention: AuthUser[]
  success: AuthUser[]
}

export type ConsumptionPatientRow = {
  patient: AuthUser
  meals: number
  caloriesKcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

export type ConsumptionSummary = {
  date?: string
  totals: {
    patients: number
    meals: number
    caloriesKcal: number
    proteinG?: number
    carbsG?: number
    fatG?: number
  }
  patients: ConsumptionPatientRow[]
}

export type DiaryFeedEntry = {
  id: string
  mealLabel?: string | null
  mealType?: string
  imageUrl?: string | null
  createdAt?: string
  patient?: { id: string; name: string; avatar?: string | null }
  user?: { id: string; name: string; avatar?: string | null }
  caloriesKcal?: number
  likesCount?: number
  likedByMe?: boolean
  commentsCount?: number
}

export type CheckinSchedule = {
  id: string
  templateTitle?: string
  scheduledAt: string
  allPatients?: boolean
  userIds?: string[]
}

export type DangerWaJob = {
  done?: boolean
  sent?: number
  failed?: number
  skipped?: number
  total?: number
  currentName?: string
}
