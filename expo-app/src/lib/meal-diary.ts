export type MealDiaryItem = {
  id?: string;
  name: string;
  grams?: number;
  caloriesKcal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
  foodId?: string | null;
  source?: string;
  originalName?: string | null;
};

function roundMacro(value: number) {
  return Math.round(Number(value) * 10) / 10;
}

export function createMealItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeMealItemsForSave(items: MealDiaryItem[]) {
  return items
    .map((item) => ({
      id: item.id || createMealItemId(),
      name: String(item.name || '').trim(),
      grams: Math.max(1, Math.round(Number(item.grams) || 1)),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: roundMacro(item.carbsG || 0),
      proteinG: roundMacro(item.proteinG || 0),
      fatG: roundMacro(item.fatG || 0),
      foodId: item.foodId || null,
      source: item.source || (item.foodId ? 'food_bank' : item.caloriesKcal ? 'ai' : 'manual'),
      originalName: item.originalName || null,
    }))
    .filter((item) => item.name);
}

export function sumMealItems(items: MealDiaryItem[]) {
  return items.reduce(
    (acc, item) => ({
      caloriesKcal: acc.caloriesKcal + (item.caloriesKcal || 0),
      carbsG: roundMacro(acc.carbsG + (item.carbsG || 0)),
      proteinG: roundMacro(acc.proteinG + (item.proteinG || 0)),
      fatG: roundMacro(acc.fatG + (item.fatG || 0)),
    }),
    { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
  );
}
