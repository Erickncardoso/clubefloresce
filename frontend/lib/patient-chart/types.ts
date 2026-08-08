/** Tipos partilhados para os componentes PatientChart* */

export type PatientUser = {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  plan?: string | null
  createdAt?: string | null
  accessExpiresAt?: string | null
  billingSubscriptionNextBillingAt?: string | null
  billingPaymentMethod?: string | null
  billingSubscriptionPaymentMethod?: string | null
  billingSubscriptionStatus?: string | null
  approvalEmailSentAt?: string | null
  approvalWhatsappSentAt?: string | null
  approvalWhatsappMessage?: string | null
}

export type PatientProfile = {
  cpf?: string | null
  occupation?: string | null
  maritalStatus?: string | null
  modality?: string | null
  objective?: string | null
  primaryGoal?: string | null
  street?: string | null
  streetNumber?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  heightCm?: number | string | null
  weightKg?: number | string | null
  athlete?: boolean | null
  pregnant?: boolean | null
  lactating?: boolean | null
  notes?: string | null
}

export type PatientCheckInItem = {
  id: string
  weekStart?: string | null
  mood?: number | null
  energy?: number | null
  weightKg?: number | null
}

export type PatientBellaMessage = {
  id: string
  topic?: string | null
  preview?: string | null
  createdAt?: string | null
}

export type PatientOverview = {
  patient?: PatientUser
  checkIn?: {
    total?: number
    missingThisWeek?: boolean
    latest?: {
      weightKg?: number | null
      weekStart?: string | null
      updatedAt?: string | null
      createdAt?: string | null
    }
    recent?: PatientCheckInItem[]
  }
  mealPlan?: {
    id?: string
    title?: string
    fileName?: string
    pdfUrl?: string | null
    mealCount?: number
    updatedAt?: string
    plan?: unknown
    status?: string
    hasMeals?: boolean
  } | null
  courseProgress?: {
    percent?: number
    totalLessons?: number
    watchedLessons?: number
  }
  foodDiary?: {
    today?: {
      consumed?: { caloriesKcal?: number }
      targets?: { caloriesKcal?: number }
    }
  }
  nutritionTarget?: { caloriesKcal?: number } | null
  bella?: {
    recentMessages?: PatientBellaMessage[]
  }
  metrics?: Record<string, unknown>
  recentCheckins?: unknown[]
}
