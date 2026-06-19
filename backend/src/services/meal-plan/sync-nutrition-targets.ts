import type { MealPlanNutritionTotals } from "../../types/meal-plan.types";
import { FoodDiaryRepository } from "../../repositories/food-diary.repository";

const foodDiaryRepository = new FoodDiaryRepository();

export function normalizeNutritionTotals(
  totals: MealPlanNutritionTotals | null | undefined,
): MealPlanNutritionTotals | null {
  if (!totals) return null;

  const caloriesKcal = Math.round(Number(totals.caloriesKcal) || 0);
  const proteinG = Number(totals.proteinG) || 0;
  const carbsG = Number(totals.carbsG) || 0;
  const fatG = Number(totals.fatG) || 0;

  if (caloriesKcal <= 0 || proteinG <= 0 || carbsG <= 0 || fatG <= 0) {
    return null;
  }

  return {
    caloriesKcal,
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
  };
}

export async function syncNutritionTargetsFromMealPlan(
  userId: string,
  totals: MealPlanNutritionTotals | null | undefined,
) {
  const normalized = normalizeNutritionTotals(totals);
  if (!normalized) return null;

  return foodDiaryRepository.upsertTargets(userId, normalized);
}
