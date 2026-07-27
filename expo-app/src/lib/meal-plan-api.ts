import { pickMealIcon } from '@/lib/meal-slot-icons';
import type { LucideIcon } from 'lucide-react-native';

/** Espelha `PatientMealPlanResponse` + `ParsedMealPlan` do backend. */
export type MealPlanFoodItem = {
  key?: string;
  name?: string;
  food?: string;
  display?: string;
  amount?: number | null;
  unit?: string;
  grams?: number | null;
  ml?: number | null;
  recipe?: { id: string; title: string; imageUrl?: string | null } | null;
  isSubstituted?: boolean;
  isExtra?: boolean;
  id?: string;
};

export type MealPlanMeal = {
  id: string;
  label: string;
  time?: string;
  short?: string;
  items?: MealPlanFoodItem[];
};

export type MappedMealPlanMeal = MealPlanMeal & {
  index: number;
  total: number;
  short: string;
  icon: LucideIcon;
  items: MealPlanFoodItem[];
  itemLabels: string[];
};

export type PatientMealPlanRecord = {
  id?: string;
  title?: string | null;
  patientName?: string | null;
  prescribedAt?: string | null;
  pdfUrl?: string | null;
  fileName?: string | null;
  plan?: {
    title?: string;
    patientName?: string | null;
    prescribedAt?: string | null;
    meals?: MealPlanMeal[];
  } | null;
};

export type MealPlanApiResponse = {
  plan?: PatientMealPlanRecord | null;
};

function mealShortLabel(label: string): string {
  const head = label.split('-')[0]?.trim() || label;
  const parts = head.split(':');
  return (parts[parts.length - 1]?.trim() || head).slice(0, 12);
}

function mapFoodItem(item: MealPlanFoodItem): MealPlanFoodItem {
  const name = String(item.name || item.food || '').trim();
  return {
    ...item,
    name,
    display: item.display || name || 'Alimento',
  };
}

export function mapMealsForUi(meals: MealPlanMeal[]): MappedMealPlanMeal[] {
  const total = meals.length;
  return meals.map((meal, index) => {
    const items = (meal.items || []).map(mapFoodItem);
    return {
      ...meal,
      index: index + 1,
      total,
      short: mealShortLabel(meal.label),
      icon: pickMealIcon(meal.label),
      items,
      itemLabels: items.map((item) => item.display || item.name || ''),
    };
  });
}

export function extractMealPlanMeals(record: PatientMealPlanRecord | null | undefined): MappedMealPlanMeal[] {
  const meals = record?.plan?.meals;
  if (!Array.isArray(meals)) return [];
  return mapMealsForUi(meals);
}

export function hasMealPlan(record: PatientMealPlanRecord | null | undefined): boolean {
  return extractMealPlanMeals(record).length > 0;
}

export function normalizeMealPlanResponse(res: MealPlanApiResponse | null | undefined) {
  const record = res?.plan ?? null;
  const meals = extractMealPlanMeals(record);
  return {
    record,
    meals,
    title: record?.title || record?.fileName || record?.plan?.title || 'Plano alimentar',
    patientName: record?.patientName || record?.plan?.patientName || null,
  };
}

export function getMealById(meals: MappedMealPlanMeal[], mealId: string) {
  return meals.find((meal) => meal.id === mealId) || null;
}
