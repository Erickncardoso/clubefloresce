import type { ParsedMeal } from "../types/meal-plan.types";

const DEFAULT_MEALS: Array<{ id: string; label: string; time: string }> = [
  { id: "breakfast", label: "Café da manhã", time: "07:00" },
  { id: "snack1", label: "Lanche da manhã", time: "10:00" },
  { id: "lunch", label: "Almoço", time: "12:30" },
  { id: "snack2", label: "Lanche da tarde", time: "16:00" },
  { id: "dinner", label: "Jantar", time: "19:30" },
];

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
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
