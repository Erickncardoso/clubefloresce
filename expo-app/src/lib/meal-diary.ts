export function createMealItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeMealItemsForSave(items: Array<Record<string, unknown>>) {
  return items
    .map((item) => ({
      id: (item.id as string) || createMealItemId(),
      name: String(item.name || '').trim(),
      grams: Math.max(1, Math.round(Number(item.grams) || 1)),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: Math.round(Number(item.carbsG || 0) * 10) / 10,
      proteinG: Math.round(Number(item.proteinG || 0) * 10) / 10,
      fatG: Math.round(Number(item.fatG || 0) * 10) / 10,
      foodId: (item.foodId as string) || null,
      source: (item.source as string) || (item.foodId ? 'food_bank' : item.caloriesKcal ? 'ai' : 'manual'),
      originalName: (item.originalName as string) || null,
    }))
    .filter((item) => item.name);
}
