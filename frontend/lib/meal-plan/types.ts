export type MealPlanStatus = 'draft' | 'active' | 'archived'
export type MealPlanMethodology = 'foods' | 'equivalents' | 'qualitative'

export interface MacroTotals {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  goalType?: string
  includeCalories?: boolean
  proteinPct?: number | null
  carbsPct?: number | null
  fatPct?: number | null
  proteinGPerKg?: number | null
  carbsGPerKg?: number | null
  fatGPerKg?: number | null
  patientWeightKg?: number | null
}

export interface FoodItemPer100g {
  caloriesKcal: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  fiberG?: number | null
  sodiumMg?: number | null
}

export interface MealItem {
  id: string
  name: string
  amount?: string
  unit?: string
  groupId?: string
  options?: string
  substitutions?: Array<{ id: string; name?: string; display?: string }>
  foodId?: string
  linkedFoodName?: string
  foodSource?: string
  per100g?: FoodItemPer100g | null
  nutrientsPer100g?: Record<string, number> | null
  grams?: number | null
  ml?: number | null
  portionAmount?: number | null
  portionMeasure?: string
  portionMode?: string
  display?: string
  itemType?: string
  recipeId?: string
  recipeSnapshot?: {
    id?: string
    title?: string
    macros?: MacroTotals
    servingsLabel?: string
    ingredients?: unknown[]
  } | null
  servingLabel?: string
  notes?: string
}

export interface MealEntry {
  id: string
  time: string
  label: string
  items: MealItem[]
  notes?: string
  macros?: MacroTotals | null
  pdfMacros?: MacroTotals | null
}

export interface MealPlanRecord {
  id: string
  title: string
  methodology: MealPlanMethodology
  status: MealPlanStatus
  objective?: string | null
  dietType?: string | null
  startDate?: string | null
  endDate?: string | null
  indefinite?: boolean
  editorText?: string
  editorHtml?: string
  finalNotes?: string
  meals: MealEntry[]
  nutritionTotals?: MacroTotals | null
  pdfNutritionTotals?: MacroTotals | null
  hydrationPrescription?: unknown
  shoppingList?: unknown
  authorName?: string
  createdAt?: string
  updatedAt?: string
}

export type MealPlanFormData = Omit<MealPlanRecord, 'id'> & { id?: string }

export interface PatientUser {
  id: string
  name: string
  email?: string | null
  avatar?: string | null
  role?: string
  patientProfile?: {
    mealPlans?: MealPlanRecord[]
    weightKg?: number | null
    heightCm?: number | null
    hydrationFeedback?: unknown[]
    hydrationLogs?: unknown[]
    [key: string]: unknown
  }
  patientProfileData?: {
    mealPlans?: MealPlanRecord[]
    weightKg?: number | null
    heightCm?: number | null
    hydrationFeedback?: unknown[]
    hydrationLogs?: unknown[]
    [key: string]: unknown
  }
}
