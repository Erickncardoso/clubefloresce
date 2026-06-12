import { FoodService } from "../food.service";
import type { FoodItemDto } from "../../types/food.types";
import type { MealItemDraft } from "../../types/food-diary.types";
import { round1, sumItems } from "./meal-item-math";

const foodService = new FoodService();

function macrosFromFood(food: FoodItemDto, grams: number) {
  const per100g = food.per100g || {};
  const portion = Math.max(1, Math.round(grams));
  const ratio = portion / 100;

  return {
    caloriesKcal: Math.max(0, Math.round((per100g.caloriesKcal || 0) * ratio)),
    carbsG: round1((per100g.carbsG || 0) * ratio),
    proteinG: round1((per100g.proteinG || 0) * ratio),
    fatG: round1((per100g.fatG || 0) * ratio),
  };
}

async function enrichItem(item: MealItemDraft): Promise<MealItemDraft> {
  const matched = await foodService.matchByName(item.name);
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
