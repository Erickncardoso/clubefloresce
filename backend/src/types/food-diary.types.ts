export type MealItemSource = "ai" | "manual" | "food_bank";

export interface MealItemDraft {
  id: string;
  name: string;
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  foodId?: string | null;
  source?: MealItemSource;
  originalName?: string | null;
}

export interface MacroTotals {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export interface NutritionTargets extends MacroTotals {
  caloriesKcal: number;
}

export interface MealAnalysisDraft {
  items: MealItemDraft[];
  totals: MacroTotals;
  notes?: string;
}

export interface DailyDiarySummary {
  date: string;
  targets: NutritionTargets;
  consumed: MacroTotals;
  remaining: MacroTotals;
  entries: Array<{
    id: string;
    mealType: string;
    mealLabel: string | null;
    imageUrl: string | null;
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    items: MealItemDraft[];
    createdAt: string;
  }>;
}
