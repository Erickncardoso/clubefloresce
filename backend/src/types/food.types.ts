export interface FoodNutrientsPer100g {
  energyKcal?: number | null;
  energyKj?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  carbsG?: number | null;
  fiberG?: number | null;
  alcoholG?: number | null;
  carbsAvailableG?: number | null;
  carbsTotalG?: number | null;
  sodiumMg?: number | null;
  [key: string]: number | null | undefined;
}

export interface FoodItemDto {
  id: string;
  source: "TACO" | "TBCA";
  sourceCode: string;
  name: string;
  category: string | null;
  nutrients: {
    per100g: FoodNutrientsPer100g;
    rawNutrients?: unknown;
  };
  per100g: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
    sodiumMg: number | null;
  };
}

export interface FoodSearchResult {
  items: FoodItemDto[];
  total: number;
}
