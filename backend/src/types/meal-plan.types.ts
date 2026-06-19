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
