import { createMealItemId, type MealDiaryItem } from '@/lib/meal-diary';
import { macrosForFoodRecord } from '@/lib/food-bank';
import type { MappedMealPlanMeal, MealPlanFoodItem } from '@/lib/meal-plan-api';

type DiaryMacros = {
  caloriesKcal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
};

type DiarySummaryLike = {
  targets?: DiaryMacros;
  consumed?: DiaryMacros;
  entries?: Array<{
    id: string;
    mealType?: string;
    mealLabel?: string;
    caloriesKcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    imageUrl?: string | null;
    createdAt?: string;
    items?: unknown[];
  }>;
};

type MacroSet = {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
};

const EMPTY_MACROS: MacroSet = {
  caloriesKcal: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
};

function resolvePlanItemGrams(item: MealPlanFoodItem) {
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

export function macrosForPlanFoodItem(item: MealPlanFoodItem): MacroSet {
  if (!item) return { ...EMPTY_MACROS };

  if (item.isExtra) {
    return {
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: Number(item.carbsG) || 0,
      proteinG: Number(item.proteinG) || 0,
      fatG: Number(item.fatG) || 0,
    };
  }

  if (item.recipe?.macros) {
    return {
      caloriesKcal: Math.max(0, Math.round(Number(item.recipe.macros.caloriesKcal) || 0)),
      carbsG: Number(item.recipe.macros.carbsG) || 0,
      proteinG: Number(item.recipe.macros.proteinG) || 0,
      fatG: Number(item.recipe.macros.fatG) || 0,
    };
  }

  const grams = resolvePlanItemGrams(item);
  if (item.per100g && grams > 0) {
    return macrosForFoodRecord({ per100g: item.per100g }, grams);
  }

  return {
    caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
    carbsG: Number(item.carbsG) || 0,
    proteinG: Number(item.proteinG) || 0,
    fatG: Number(item.fatG) || 0,
  };
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

      const macros = macrosForPlanFoodItem(item);

      if (item.isExtra && item.foodId) {
        const grams = Math.max(1, Math.round(Number(item.grams) || 0));
        if (grams <= 0) return null;

        return {
          id: item.id || createMealItemId(),
          name,
          grams,
          ...macros,
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
        ...macros,
        foodId,
        source: foodId ? 'food_bank' : 'meal_plan',
        originalName: displayLabel,
      };
    })
    .filter(Boolean);
}

function roundConsumed(macros: MacroSet): MacroSet {
  return {
    caloriesKcal: Math.max(0, Math.round(macros.caloriesKcal)),
    carbsG: Math.max(0, Math.round(macros.carbsG * 10) / 10),
    proteinG: Math.max(0, Math.round(macros.proteinG * 10) / 10),
    fatG: Math.max(0, Math.round(macros.fatG * 10) / 10),
  };
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asKnownDiaryItems(raw: unknown): MealDiaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as MealDiaryItem;
      const name = String(item?.name || '').trim();
      if (!name) return null;
      return {
        name,
        originalName: item.originalName || null,
        caloriesKcal: Number(item.caloriesKcal) || 0,
        carbsG: Number(item.carbsG) || 0,
        proteinG: Number(item.proteinG) || 0,
        fatG: Number(item.fatG) || 0,
      };
    })
    .filter(Boolean) as MealDiaryItem[];
}

function macrosFromKnownItem(item: MealDiaryItem): MacroSet {
  return {
    caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
    carbsG: Number(item.carbsG) || 0,
    proteinG: Number(item.proteinG) || 0,
    fatG: Number(item.fatG) || 0,
  };
}

function matchKnownMacros(item: MealPlanFoodItem, knownItems: MealDiaryItem[]): MacroSet | null {
  if (item.isExtra) return macrosForPlanFoodItem(item);

  const labels = [item.display, item.name, item.originalName]
    .map((value) => normalizeLabel(String(value || '')))
    .filter(Boolean);

  const match = knownItems.find((known) => {
    const knownLabels = [known.originalName, known.name]
      .map((value) => normalizeLabel(String(value || '')))
      .filter(Boolean);
    return knownLabels.some((label) => labels.includes(label));
  });

  return match ? macrosFromKnownItem(match) : null;
}

/**
 * Só antecipa a barra quando já temos macros confirmados pela API
 * (ou extra escolhido no banco). Evita o pulo "número errado → corrige".
 */
export function applyOptimisticPlanCheck<T extends DiarySummaryLike>(
  summary: T | null,
  mealId: string,
  meal: MappedMealPlanMeal | null,
  checkedStates: boolean[],
): T | null {
  if (!summary || !mealId || !meal) return summary;

  const previous = (summary.entries || []).find((entry) => entry.mealType === mealId);
  const knownItems = asKnownDiaryItems(previous?.items);
  const contributing = (meal.items || [])
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => Boolean(checkedStates[index]))
    .filter(({ item }) => item.isExtra || resolvePlanItemGrams(item) > 0);

  const resolved: MacroSet[] = [];
  for (const { item } of contributing) {
    const macros = matchKnownMacros(item, knownItems);
    if (!macros) return summary;
    resolved.push(macros);
  }

  const mealTotals = roundConsumed(
    resolved.reduce(
      (acc, macros) => ({
        caloriesKcal: acc.caloriesKcal + macros.caloriesKcal,
        carbsG: acc.carbsG + macros.carbsG,
        proteinG: acc.proteinG + macros.proteinG,
        fatG: acc.fatG + macros.fatG,
      }),
      { ...EMPTY_MACROS },
    ),
  );

  const nextEntries = (summary.entries || []).filter((entry) => entry.mealType !== mealId);
  if (contributing.length) {
    nextEntries.push({
      ...previous,
      id: previous?.id || `preview-${mealId}`,
      mealType: mealId,
      mealLabel: meal.label || mealId,
      items: previous?.items,
      ...mealTotals,
    });
  }

  const consumed = roundConsumed(
    nextEntries.reduce(
      (acc, entry) => ({
        caloriesKcal: acc.caloriesKcal + (entry.caloriesKcal || 0),
        carbsG: acc.carbsG + (entry.carbsG || 0),
        proteinG: acc.proteinG + (entry.proteinG || 0),
        fatG: acc.fatG + (entry.fatG || 0),
      }),
      { ...EMPTY_MACROS },
    ),
  );

  return {
    ...summary,
    consumed,
    entries: nextEntries,
  };
}
