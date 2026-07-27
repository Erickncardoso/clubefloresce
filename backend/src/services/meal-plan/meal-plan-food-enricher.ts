import type { FoodItemDto } from "../../types/food.types";
import type { ParsedFoodItem, ParsedMealPlan } from "../../types/meal-plan.types";
import { sanitizeFoodDisplay, sanitizeMealPlanSubstitutions } from "./meal-plan-text-sanitize";
import { resolveSwapGroup } from "../bella/food-category";
import { smartMatchFood } from "../food-smart-match.service";
import {
  isFoodAutoCustomEnabled,
  researchAndCreateCustomFood,
} from "../food-custom-research.service";
import {
  isAbsurdFoodMatch,
  sanitizeResearchedPer100g,
} from "../../utils/food-match-guards";

function inferExpectedGroupFromPlanName(name: string) {
  const group = resolveSwapGroup({ category: null, name, per100g: undefined });
  return group !== "mixed" ? group : undefined;
}

async function matchFoodCandidate(item: ParsedFoodItem): Promise<FoodItemDto | null> {
  const lookupName = resolveFoodMatchName(item);
  if (!lookupName) return null;

  // Preferir o nome do alimento (sem porção "1.5 Fatia(s) (30g)"), que confunde frescor/prep
  const originalName = String(item.name || item.display || lookupName).trim();
  return smartMatchFood(lookupName, {
    originalName,
    expectedGroup: inferExpectedGroupFromPlanName(lookupName),
  });
}

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

type MatchFoodBatchEntry =
  | { key: string; item: ParsedFoodItem }
  | { key: string; name: string };

function toMatchPlanItem(entry: MatchFoodBatchEntry): ParsedFoodItem {
  if ("name" in entry) {
    return {
      key: entry.key,
      name: entry.name,
      amount: null,
      unit: "",
      grams: null,
      ml: null,
      display: entry.name,
      substitutions: [],
    };
  }

  return entry.item;
}

export async function matchFoodCandidatesBatch(
  entries: MatchFoodBatchEntry[],
  concurrency = 10,
): Promise<Array<{ key: string; item: FoodItemDto | null }>> {
  return mapWithConcurrency(entries, concurrency, async (entry) => ({
    key: entry.key,
    item: await matchFoodCandidate(toMatchPlanItem(entry)),
  }));
}

/** Extrai o nome do alimento a partir do display Dietbox ("Ovo de galinha 1 Unidade(s) (50g)"). */
export function sanitizeParsedFoodItem(item: ParsedFoodItem): ParsedFoodItem {
  const fixedName = resolveFoodMatchName(item);
  const display = sanitizeFoodDisplay(String(item.display || "").trim());

  let grams = item.grams ?? null;
  let ml = item.ml ?? null;

  const parensMatch = display.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)\s*$/i);
  if (parensMatch) {
    const measure = Number(parensMatch[1]);
    const measureUnit = parensMatch[2].toLowerCase();
    if (measureUnit === "g") grams = measure;
    if (measureUnit === "ml") ml = measure;
  }

  return {
    ...item,
    name: fixedName || item.name,
    display,
    grams,
    ml,
  };
}

export function sanitizeParsedMealPlan(plan: ParsedMealPlan): ParsedMealPlan {
  sanitizeMealPlanSubstitutions(plan);
  walkParsedMealPlanItems(plan, (item) => {
    const sanitized = sanitizeParsedFoodItem(item);
    item.name = sanitized.name;
    item.grams = sanitized.grams;
    item.ml = sanitized.ml;
    item.display = sanitized.display;
  });
  return plan;
}

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
  if (!item.foodId || item.per100g?.caloriesKcal == null) return true;

  const lookupName = resolveFoodMatchName(item);
  if (
    isAbsurdFoodMatch(lookupName, String(item.linkedFoodName || item.name || ""), item.per100g)
  ) {
    return true;
  }

  // CUSTOM com kcal incoerente (ex.: kJ lido como kcal)
  if (item.foodSource === "CUSTOM" && item.per100g) {
    const sanitized = sanitizeResearchedPer100g({
      caloriesKcal: Number(item.per100g.caloriesKcal) || 0,
      proteinG: Number(item.per100g.proteinG) || 0,
      carbsG: Number(item.per100g.carbsG) || 0,
      fatG: Number(item.per100g.fatG) || 0,
      fiberG: item.per100g.fiberG == null ? null : Number(item.per100g.fiberG),
    });
    if (!sanitized) return true;
    if (Math.abs(sanitized.caloriesKcal - Number(item.per100g.caloriesKcal)) > 40) return true;
  }

  return false;
}

function clearBadFoodLink(item: ParsedFoodItem): void {
  item.foodId = undefined;
  item.foodSource = undefined;
  item.linkedFoodName = undefined;
  item.per100g = undefined;
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

async function researchUnmatchedFoodItem(item: ParsedFoodItem): Promise<FoodItemDto | null> {
  if (!isFoodAutoCustomEnabled()) return null;
  const lookupName = resolveFoodMatchName(item);
  if (!lookupName) return null;
  return researchAndCreateCustomFood(lookupName);
}

export async function enrichParsedFoodItem(item: ParsedFoodItem): Promise<ParsedFoodItem> {
  const enrichedSubs = await Promise.all(
    (item.substitutions || []).map((sub) => enrichParsedFoodItem(sub)),
  );

  if (!foodItemNeedsEnrichment(item)) {
    return { ...item, substitutions: enrichedSubs };
  }

  let matched = await matchFoodCandidate(item);
  if (!matched) {
    matched = await researchUnmatchedFoodItem(item);
  }
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
    if (!foodItemNeedsEnrichment(item)) return;
    // Limpa vínculo absurdo antes de remarcar
    if (item.foodId) {
      const lookupName = resolveFoodMatchName(item);
      if (
        isAbsurdFoodMatch(lookupName, String(item.linkedFoodName || item.name || ""), item.per100g)
      ) {
        clearBadFoodLink(item);
      } else if (item.foodSource === "CUSTOM" && item.per100g) {
        const sanitized = sanitizeResearchedPer100g({
          caloriesKcal: Number(item.per100g.caloriesKcal) || 0,
          proteinG: Number(item.per100g.proteinG) || 0,
          carbsG: Number(item.per100g.carbsG) || 0,
          fatG: Number(item.per100g.fatG) || 0,
          fiberG: item.per100g.fiberG == null ? null : Number(item.per100g.fiberG),
        });
        if (!sanitized || Math.abs(sanitized.caloriesKcal - Number(item.per100g.caloriesKcal)) > 40) {
          clearBadFoodLink(item);
        }
      }
    }
    if (foodItemNeedsEnrichment(item)) pending.push(item);
  });

  if (!pending.length) return plan;

  const batch = await matchFoodCandidatesBatch(
    pending.map((item, index) => ({
      key: String(index),
      item,
    })),
    4,
  );

  for (const entry of batch) {
    const item = pending[Number(entry.key)];
    if (!item || !entry.item) continue;
    if (isAbsurdFoodMatch(resolveFoodMatchName(item), entry.item.name, entry.item.per100g)) {
      continue;
    }
    applyFoodMatch(item, entry.item);
  }

  const stillPending = pending.filter((item) => foodItemNeedsEnrichment(item));
  if (stillPending.length && isFoodAutoCustomEnabled()) {
    await mapWithConcurrency(stillPending, 2, async (item) => {
      const researched = await researchUnmatchedFoodItem(item);
      if (!researched) return;
      if (isAbsurdFoodMatch(resolveFoodMatchName(item), researched.name, researched.per100g)) {
        return;
      }
      applyFoodMatch(item, researched);
    });
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
