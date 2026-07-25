export type MealPlanRecipeIngredient = {
  id: string;
  foodId?: string | null;
  foodSource?: "TACO" | "TBCA" | "CUSTOM" | null;
  name: string;
  amount: string;
  unit: string;
  grams?: number | null;
  per100g?: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG?: number | null;
    sodiumMg?: number | null;
  } | null;
};

export type MealPlanRecipe = {
  id: string;
  title: string;
  imageUrl?: string | null;
  imagePosition?: string | null;
  servingsLabel?: string | null;
  prepMinutes?: number | null;
  shareWithAll?: boolean;
  sharedPatientIds?: string[];
  ingredients: MealPlanRecipeIngredient[];
  steps: string;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanRecipeMacros = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MealPlanRecipeSnapshot = MealPlanRecipe & {
  macros?: MealPlanRecipeMacros;
};
