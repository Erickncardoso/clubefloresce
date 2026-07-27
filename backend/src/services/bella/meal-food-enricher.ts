import { FoodService } from "../food.service";
import type { FoodItemDto } from "../../types/food.types";
import type { MealItemDraft } from "../../types/food-diary.types";
import { macrosAtGramsFromPer100g, normalizePer100gMacros } from "../../utils/food-macros";
import { smartMatchFood } from "../food-smart-match.service";
import { resolveSwapGroup } from "./food-category";
import { sumItems } from "./meal-item-math";

const foodService = new FoodService();

function macrosFromFood(food: FoodItemDto, grams: number) {
  const per100g = normalizePer100gMacros(food);
  const macros = macrosAtGramsFromPer100g(per100g, grams);

  return {
    caloriesKcal: macros.caloriesKcal,
    carbsG: macros.carbsG,
    proteinG: macros.proteinG,
    fatG: macros.fatG,
  };
}

/** CUSTOM = produto/marca do plano; mantém o texto exato do PDF, só usa a tabela para macros. */
export function resolveEnrichedDisplayName(item: MealItemDraft, food: FoodItemDto): string {
  const pdfLabel = String(item.originalName || item.name || "").trim();
  if (food.source === "CUSTOM" && pdfLabel) return pdfLabel;
  return food.displayName || food.name;
}

async function enrichItem(item: MealItemDraft): Promise<MealItemDraft> {
  const lookupName = String(item.name || "").trim();
  const originalName = String(item.originalName || item.name || "").trim();
  const expectedGroup = resolveSwapGroup({ category: null, name: lookupName, per100g: undefined });
  const groupHint = expectedGroup !== "mixed" ? expectedGroup : undefined;

  // Match pelo texto do PDF — corrige vínculos errados gravados no plano (ex.: mix de castanhas).
  const smartMatched = lookupName
    ? await smartMatchFood(lookupName, { originalName, expectedGroup: groupHint })
    : null;

  if (smartMatched) {
    return {
      ...item,
      name: resolveEnrichedDisplayName(item, smartMatched),
      foodId: smartMatched.id,
      source: "food_bank",
      originalName: originalName || lookupName,
      ...macrosFromFood(smartMatched, item.grams),
    };
  }

  if (item.foodId) {
    const byId = await foodService.getById(item.foodId);
    if (byId) {
      return {
        ...item,
        name: resolveEnrichedDisplayName(item, byId),
        foodId: byId.id,
        source: "food_bank",
        originalName: originalName || lookupName,
        ...macrosFromFood(byId, item.grams),
      };
    }
  }

  return item;
}

export async function enrichMealItemsWithFoodBank(items: MealItemDraft[]): Promise<MealItemDraft[]> {
  const enriched = await Promise.all(items.map((item) => enrichItem(item)));
  return enriched;
}

export function recalculateMealTotals(items: MealItemDraft[]) {
  return sumItems(items);
}
