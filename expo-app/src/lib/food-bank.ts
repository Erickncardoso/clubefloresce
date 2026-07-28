type FoodWithMacros = {
  per100g?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  } | null;
  nutrients?: {
    per100g?: {
      caloriesKcal?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };
  };
};

function round1(value: number) {
  return Math.round(Number(value) * 10) / 10;
}

export function macrosForFoodRecord(food: FoodWithMacros | null | undefined, grams: number) {
  if (!food?.per100g && !food?.nutrients) {
    return {
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
    };
  }

  const per100g = food.per100g || food.nutrients?.per100g || {};
  const factor = Math.max(0, Number(grams) || 0) / 100;

  return {
    caloriesKcal: Math.round((Number(per100g.caloriesKcal) || 0) * factor),
    carbsG: round1((Number(per100g.carbsG) || 0) * factor),
    proteinG: round1((Number(per100g.proteinG) || 0) * factor),
    fatG: round1((Number(per100g.fatG) || 0) * factor),
  };
}

export function formatPer100gKcal(value: number) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR');
}
