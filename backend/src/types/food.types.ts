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
  source: "TACO" | "TBCA" | "CUSTOM";
  sourceCode: string;
  name: string;
  displayName?: string;
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

/** Registro compacto para cache offline no navegador. */
export interface FoodCatalogItemDto {
  id: string;
  source: "TACO" | "TBCA" | "CUSTOM";
  sourceCode: string;
  name: string;
  displayName: string;
  category: string | null;
  searchText: string;
  per100g: FoodItemDto["per100g"];
}

export interface FoodCatalogMetaDto {
  version: string;
  total: number;
  foodCount: number;
  overrideCount: number;
  updatedAt: string | null;
}

export interface FoodCatalogDto {
  version: string;
  items: FoodCatalogItemDto[];
}
