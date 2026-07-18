import { FoodService } from "../food.service";
import type { FoodItemDto } from "../../types/food.types";
import type { ParsedFoodItem, ParsedMealPlan } from "../../types/meal-plan.types";
import { extractFoodMatchCandidates } from "../../utils/food-meal-plan-match-candidates";

const foodService = new FoodService();

function mapPer100g(food: FoodItemDto) {
  return {
    caloriesKcal: food.per100g?.caloriesKcal ?? null,
    proteinG: food.per100g?.proteinG ?? null,
    carbsG: food.per100g?.carbsG ?? null,
    fatG: food.per100g?.fatG ?? null,
    fiberG: food.per100g?.fiberG ?? null,
    sodiumMg: food.per100g?.sodiumMg ?? null,
  };
}

async function matchFoodCandidate(name: string): Promise<FoodItemDto | null> {
  const candidates = extractFoodMatchCandidates(name);
  for (const candidate of candidates) {
    const tbca = await foodService.matchByName(candidate, "TBCA");
    if (tbca) return tbca;

    const [taco, any] = await Promise.all([
      foodService.matchByName(candidate, "TACO"),
      foodService.matchByName(candidate),
    ]);
    if (taco) return taco;
    if (any) return any;
  }
  return null;
}

export { matchFoodCandidate };

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function matchFoodCandidatesBatch(
  entries: Array<{ key: string; name: string }>,
  concurrency = 10,
): Promise<Array<{ key: string; item: FoodItemDto | null }>> {
  return mapWithConcurrency(entries, concurrency, async (entry) => ({
    key: entry.key,
    item: await matchFoodCandidate(entry.name),
  }));
}

export async function enrichParsedFoodItem(item: ParsedFoodItem): Promise<ParsedFoodItem> {
  if (item.foodId && item.per100g?.caloriesKcal != null) return item;
  if (!String(item.name || "").trim()) return item;

  const matched = await matchFoodCandidate(item.name);
  if (!matched) return item;

  return {
    ...item,
    foodId: matched.id,
    foodSource: matched.source,
    linkedFoodName: matched.displayName || matched.name,
    per100g: mapPer100g(matched),
  };
}

export async function enrichParsedMealPlan(plan: ParsedMealPlan): Promise<ParsedMealPlan> {
  const meals = await Promise.all(
    (plan.meals || []).map(async (meal) => ({
      ...meal,
      items: await Promise.all((meal.items || []).map((item) => enrichParsedFoodItem(item))),
    })),
  );

  return { ...plan, meals };
}

export function parsedMealPlanNeedsFoodEnrichment(plan: ParsedMealPlan | null | undefined): boolean {
  if (!plan?.meals?.length) return false;
  return plan.meals.some((meal) =>
    (meal.items || []).some((item) => String(item.name || "").trim() && !item.foodId),
  );
}
