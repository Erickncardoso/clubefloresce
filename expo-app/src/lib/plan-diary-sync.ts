import { createMealItemId } from '@/lib/meal-diary';
import type { MappedMealPlanMeal } from '@/lib/meal-plan-api';

function resolvePlanItemGrams(item: MappedMealPlanMeal['items'][number]) {
  if (!item) return 0;
  if (item.unit === 'avontade') return 0;

  const grams = Number(item.grams);
  if (Number.isFinite(grams) && grams > 0) return Math.round(grams);

  const ml = Number(item.ml);
  if (Number.isFinite(ml) && ml > 0) return Math.round(ml);

  const amount = Number(item.amount);
  if (Number.isFinite(amount) && amount > 0) {
    if (item.unit === 'g' || item.unit === 'ml') return Math.round(amount);
  }

  return 100;
}

export function buildPlanDiaryItems(meal: MappedMealPlanMeal | null, checkedStates: boolean[] = []) {
  if (!meal?.items?.length) return [];

  return meal.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => Boolean(checkedStates[index]))
    .map(({ item, index }) => {
      const labelFallback = meal?.itemLabels?.[index] || '';
      const name = String(item.display || item.name || labelFallback).trim();
      if (!name) return null;

      if (item.isExtra && item.foodId) {
        const grams = Math.max(1, Math.round(Number(item.grams) || 0));
        if (grams <= 0) return null;

        return {
          id: item.id || createMealItemId(),
          name,
          grams,
          caloriesKcal: item.caloriesKcal || 0,
          carbsG: item.carbsG || 0,
          proteinG: item.proteinG || 0,
          fatG: item.fatG || 0,
          foodId: item.foodId,
          source: 'food_bank',
          originalName: name,
        };
      }

      const grams = resolvePlanItemGrams(item);
      if (grams <= 0) return null;

      const foodId = item.foodId || null;
      const displayLabel = item.display || labelFallback || name;

      return {
        id: createMealItemId(),
        name,
        grams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        foodId,
        source: foodId ? 'food_bank' : 'meal_plan',
        originalName: displayLabel,
      };
    })
    .filter(Boolean);
}
