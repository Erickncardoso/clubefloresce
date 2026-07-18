import type { FoodItemDto } from "../../types/food.types";
import type { ParsedFoodItem, ParsedMealPlan } from "../../types/meal-plan.types";
import { FoodRepository } from "../../repositories/food.repository";

const foodRepository = new FoodRepository();

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
  return foodRepository.findBestMealPlanMatch(name);
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

/** Extrai o nome do alimento a partir do display Dietbox ("Ovo de galinha 1 Unidade(s) (50g)"). */
export function resolveFoodMatchName(item: ParsedFoodItem): string {
  const name = String(item.name || "").trim();
  const display = String(item.display || "").trim();

  if (display && display !== name) {
    const qtyMatch = display.match(
      /^(.+?)\s+(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|½|¼|¾)\s+(.+)$/i,
    );
    if (qtyMatch) {
      const parsedName = qtyMatch[1].trim();
      if (parsedName.length >= 3) return parsedName;
    }

    const dashMatch = display.match(/^(.+?)\s*-\s*\d+/);
    if (dashMatch) {
      const parsedName = dashMatch[1].trim();
      if (parsedName.length >= 3) return parsedName;
    }
  }

  return name || display;
}

export function foodItemNeedsEnrichment(item: ParsedFoodItem): boolean {
  if (item.itemType === "recipe") return false;
  if (!resolveFoodMatchName(item)) return false;
  return !item.foodId || item.per100g?.caloriesKcal == null;
}

function applyFoodMatch(item: ParsedFoodItem, matched: FoodItemDto): void {
  item.foodId = matched.id;
  item.foodSource = matched.source;
  item.linkedFoodName = matched.displayName || matched.name;
  item.per100g = mapPer100g(matched);
}

function visitFoodItemTree(item: ParsedFoodItem, visitor: (entry: ParsedFoodItem) => void): void {
  visitor(item);
  for (const sub of item.substitutions || []) {
    visitFoodItemTree(sub, visitor);
  }
}

export function walkParsedMealPlanItems(
  plan: ParsedMealPlan,
  visitor: (item: ParsedFoodItem) => void,
): void {
  for (const meal of plan.meals || []) {
    for (const item of meal.items || []) {
      visitFoodItemTree(item, visitor);
    }
  }
}

export async function enrichParsedFoodItem(item: ParsedFoodItem): Promise<ParsedFoodItem> {
  const enrichedSubs = await Promise.all(
    (item.substitutions || []).map((sub) => enrichParsedFoodItem(sub)),
  );

  if (!foodItemNeedsEnrichment(item)) {
    return { ...item, substitutions: enrichedSubs };
  }

  const matched = await matchFoodCandidate(resolveFoodMatchName(item));
  if (!matched) {
    return { ...item, substitutions: enrichedSubs };
  }

  return {
    ...item,
    foodId: matched.id,
    foodSource: matched.source,
    linkedFoodName: matched.displayName || matched.name,
    per100g: mapPer100g(matched),
    substitutions: enrichedSubs,
  };
}

export async function enrichParsedMealPlan(plan: ParsedMealPlan): Promise<ParsedMealPlan> {
  const pending: ParsedFoodItem[] = [];
  walkParsedMealPlanItems(plan, (item) => {
    if (foodItemNeedsEnrichment(item)) pending.push(item);
  });

  if (!pending.length) return plan;

  const batch = await matchFoodCandidatesBatch(
    pending.map((item, index) => ({
      key: String(index),
      name: resolveFoodMatchName(item),
    })),
    10,
  );

  for (const entry of batch) {
    const item = pending[Number(entry.key)];
    if (!item || !entry.item) continue;
    applyFoodMatch(item, entry.item);
  }

  return plan;
}

export function parsedMealPlanNeedsFoodEnrichment(plan: ParsedMealPlan | null | undefined): boolean {
  if (!plan?.meals?.length) return false;

  let needs = false;
  walkParsedMealPlanItems(plan, (item) => {
    if (foodItemNeedsEnrichment(item)) needs = true;
  });
  return needs;
}
