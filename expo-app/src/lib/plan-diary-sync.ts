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
    .map(({ item }) => {
      const name = String(item.name || '').trim();
      if (!name) return null;

      const grams = resolvePlanItemGrams(item);
      if (grams <= 0) return null;

      return {
        id: createMealItemId(),
        name,
        grams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        foodId: null,
        source: 'meal_plan',
        originalName: item.key || item.display || name,
      };
    })
    .filter(Boolean);
}
