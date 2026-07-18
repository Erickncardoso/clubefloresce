export interface MealPlanMealMacros {
  proteinG: number;
  fatG: number;
  carbsG: number;
  caloriesKcal: number;
}

export interface MealPlanNutritionTotals {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ParsedFoodItem {
  key: string;
  name: string;
  amount: number | null;
  unit: string;
  grams: number | null;
  ml: number | null;
  display: string;
  substitutions: ParsedFoodItem[];
  foodId?: string | null;
  foodSource?: "TACO" | "TBCA" | "CUSTOM" | null;
  linkedFoodName?: string | null;
  per100g?: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG?: number | null;
    sodiumMg?: number | null;
  } | null;
  itemType?: "food" | "recipe" | null;
  recipeId?: string | null;
  recipe?: {
    id: string;
    title: string;
    imageUrl?: string | null;
    imagePosition?: string | null;
    servingsLabel?: string | null;
    prepMinutes?: number | null;
    ingredients?: Array<{
      id: string;
      name: string;
      amount: string;
      unit: string;
      grams?: number | null;
      foodId?: string | null;
      per100g?: ParsedFoodItem["per100g"];
    }>;
    steps?: string;
    macros?: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
  } | null;
}

export interface ParsedMeal {
  id: string;
  time: string;
  label: string;
  items: ParsedFoodItem[];
  macros?: MealPlanMealMacros;
}

export interface ParsedMealPlan {
  title: string;
  patientName: string | null;
  prescribedAt: string | null;
  fileName: string;
  meals: ParsedMeal[];
  nutritionTotals?: MealPlanNutritionTotals;
  parserSource: "dietbox" | "ai";
}

export interface PatientMealPlanResponse {
  id: string;
  fileName: string;
  pdfUrl: string | null;
  title: string | null;
  patientName: string | null;
  prescribedAt: string | null;
  plan: ParsedMealPlan;
  parserSource: string;
  updatedAt: string;
}
