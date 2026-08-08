import { apiFetch } from '@/lib/api'
import type { MealPlanFormData, MealPlanRecord, PatientUser } from './types'
import {
  MAX_MEAL_PLANS,
  buildMealPlanRecord,
  buildParsedMealPlanFromPrescription,
  computeLiveNutritionTotals,
} from './prescription'

export { MAX_MEAL_PLANS }

export function getMealPlansFromUser(user: PatientUser | null | undefined): MealPlanRecord[] {
  const fromData = user?.patientProfileData?.mealPlans
  const fromProfile = user?.patientProfile?.mealPlans
  if (Array.isArray(fromData)) return [...fromData]
  if (Array.isArray(fromProfile)) return [...fromProfile]
  return []
}

export function upsertPlanList(
  currentPlans: MealPlanRecord[],
  nextItem: MealPlanRecord,
  removeId = '',
): MealPlanRecord[] {
  if (removeId) return currentPlans.filter((item) => item.id !== removeId)
  const idx = currentPlans.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    const next = [...currentPlans]
    next[idx] = nextItem
    return next
  }
  return [nextItem, ...currentPlans].slice(0, MAX_MEAL_PLANS)
}

export async function patchUserMealPlans(
  userId: string,
  nextList: MealPlanRecord[],
): Promise<PatientUser> {
  return apiFetch<PatientUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ patientProfile: { mealPlans: nextList } }),
  })
}

export async function saveDraftPlan(
  user: PatientUser,
  formPayload: MealPlanFormData,
  existingRecord: MealPlanRecord | null,
  authorName = 'Nutricionista',
): Promise<{ item: MealPlanRecord; updated: PatientUser }> {
  const current = getMealPlansFromUser(user)
  const item = buildMealPlanRecord(formPayload, 'draft', existingRecord, authorName)
  const nextList = upsertPlanList(current, item)
  const updated = await patchUserMealPlans(user.id, nextList)
  return { item, updated }
}

export async function publishPlan(
  user: PatientUser,
  formPayload: MealPlanFormData,
  existingRecord: MealPlanRecord | null,
  authorName = 'Nutricionista',
): Promise<{ item: MealPlanRecord; updated: PatientUser }> {
  const liveTotals = computeLiveNutritionTotals(formPayload)
  const enrichedPayload: MealPlanFormData = {
    ...formPayload,
    nutritionTotals: { ...liveTotals },
    pdfNutritionTotals: formPayload.pdfNutritionTotals ?? existingRecord?.pdfNutritionTotals ?? { ...liveTotals },
  }

  const current = getMealPlansFromUser(user)
  const item = buildMealPlanRecord(enrichedPayload, 'active', existingRecord, authorName)
  const nextList = upsertPlanList(current, item)
  const updated = await patchUserMealPlans(user.id, nextList)

  const parsed = buildParsedMealPlanFromPrescription(item, user.name ?? null)
  if (!parsed.meals.length) {
    throw new Error(
      item.methodology === 'qualitative'
        ? 'Escreva o plano qualitativo antes de publicar.'
        : 'Adicione ao menos uma refeição ou linha de alimento antes de publicar.',
    )
  }

  const result = await apiFetch<{ user?: PatientUser }>(`/patients/${user.id}/meal-plan/save`, {
    method: 'POST',
    body: JSON.stringify({ title: item.title, plan: parsed }),
  })

  return { item, updated: result?.user ?? updated }
}

export async function deletePlan(
  user: PatientUser,
  planId: string,
): Promise<PatientUser> {
  const current = getMealPlansFromUser(user)
  const nextList = upsertPlanList(current, {} as MealPlanRecord, planId)
  return patchUserMealPlans(user.id, nextList)
}
