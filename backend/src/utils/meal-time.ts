import type { ParsedMeal } from "../types/meal-plan.types";

export const DEFAULT_MEALS: Array<{ id: string; label: string; time: string }> = [
  { id: "breakfast", label: "Café da manhã", time: "07:00" },
  { id: "snack1", label: "Lanche da manhã", time: "10:00" },
  { id: "lunch", label: "Almoço", time: "12:30" },
  { id: "snack2", label: "Lanche da tarde", time: "16:00" },
  { id: "dinner", label: "Jantar", time: "19:30" },
];

export function normalizeMealTime(time: string): string | null {
  const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number {
  const normalized = normalizeMealTime(time);
  if (!normalized) return 0;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getMealsForReminder(planMeals: ParsedMeal[] = []): Array<{ id: string; label: string; time: string }> {
  if (planMeals.length > 0) {
    const fromPlan = planMeals
      .map((meal) => {
        const time = normalizeMealTime(meal.time || "");
        if (!time) return null;
        return { id: meal.id, label: meal.label, time };
      })
      .filter(Boolean) as Array<{ id: string; label: string; time: string }>;

    if (fromPlan.length > 0) return fromPlan;
  }

  return DEFAULT_MEALS;
}

export function inferMealSlotFromTime(
  date = new Date(),
  planMeals: ParsedMeal[] = [],
): { mealType: string; mealLabel: string } {
  const meals =
    planMeals.length > 0
      ? planMeals.map((m) => ({ id: m.id, label: m.label, time: m.time || "12:00" }))
      : DEFAULT_MEALS;

  const sorted = [...meals].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time),
  );

  const now = date.getHours() * 60 + date.getMinutes();
  let current = sorted[0];

  for (const meal of sorted) {
    if (now >= parseTimeToMinutes(meal.time)) current = meal;
  }

  return {
    mealType: current.id,
    mealLabel: current.label,
  };
}

export function inferMealLabel(mealType: string): string {
  const fromDefault = DEFAULT_MEALS.find((m) => m.id === mealType);
  if (fromDefault) return fromDefault.label;
  return mealType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Refeição";
}
