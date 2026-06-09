import type { MealItemDraft, MacroTotals } from "../../types/food-diary.types";

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function sumItems(items: MealItemDraft[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      caloriesKcal: acc.caloriesKcal + item.caloriesKcal,
      carbsG: round1(acc.carbsG + item.carbsG),
      proteinG: round1(acc.proteinG + item.proteinG),
      fatG: round1(acc.fatG + item.fatG),
    }),
    { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
  );
}

export function scaleItemGrams(item: MealItemDraft, newGrams: number): MealItemDraft {
  const grams = Math.max(1, Math.round(newGrams));
  const ratio = grams / Math.max(item.grams, 1);
  return {
    ...item,
    grams,
    caloriesKcal: Math.max(0, Math.round(item.caloriesKcal * ratio)),
    carbsG: round1(item.carbsG * ratio),
    proteinG: round1(item.proteinG * ratio),
    fatG: round1(item.fatG * ratio),
  };
}
