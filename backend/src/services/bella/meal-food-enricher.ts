import { FoodService } from "../food.service";
import type { FoodItemDto } from "../../types/food.types";
import type { MealItemDraft } from "../../types/food-diary.types";
import { macrosAtGramsFromPer100g, normalizePer100gMacros } from "../../utils/food-macros";
import { matchFoodCandidate } from "../meal-plan/meal-plan-food-enricher";
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

async function enrichItem(item: MealItemDraft): Promise<MealItemDraft> {
  if (item.foodId) {
    const byId = await foodService.getById(item.foodId);
    if (byId) {
      return {
        ...item,
        name: byId.name,
        foodId: byId.id,
        source: "food_bank",
        originalName: item.originalName || item.name,
        ...macrosFromFood(byId, item.grams),
      };
    }
  }

  // Matcher robusto: TBCA + TACO + overrides Florescer (CUSTOM), melhor score global.
  // Garante que itens sem foodId (ex.: whey, mussarela) também contabilizem calorias.
  const matched = await matchFoodCandidate(item.name);
  if (!matched) return item;

  const aiName = item.name;
  return {
    ...item,
    name: matched.name,
    foodId: matched.id,
    source: "food_bank",
    originalName: aiName,
    ...macrosFromFood(matched, item.grams),
  };
}

export async function enrichMealItemsWithFoodBank(items: MealItemDraft[]): Promise<MealItemDraft[]> {
  const enriched = await Promise.all(items.map((item) => enrichItem(item)));
  return enriched;
}

export function recalculateMealTotals(items: MealItemDraft[]) {
  return sumItems(items);
}
