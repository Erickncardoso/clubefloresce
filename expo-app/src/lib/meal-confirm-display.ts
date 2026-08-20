import type { MealDiaryItem } from '@/lib/meal-diary';

export function formatMacro(value: number) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
}

export function mealGramsTotal(items: MealDiaryItem[]) {
  return items.reduce((sum, item) => sum + Math.max(0, Math.round(item.grams || 0)), 0);
}

export function mealDishTitle(items: MealDiaryItem[], fallback = 'Sua refeição') {
  const names = items
    .map((item) => String(item.name || '').split(',')[0].trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!names.length) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e ${names[2]}`;
}

export function formatMealCapturedAt(date = new Date()) {
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 0) return `Hoje, ${time}`;
  if (diffDays === 1) return `Ontem, ${time}`;
  const label = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).replace('.', '');
  return `${label}, ${time}`;
}

export function mealHealthScore(caloriesKcal: number, grams: number, proteinG: number, fatG: number) {
  const density = grams > 0 ? (caloriesKcal / grams) * 100 : 220;
  let score = 8;
  if (density > 280) score -= 2;
  else if (density > 200) score -= 1;
  else if (density < 120) score += 0.5;
  if (proteinG >= 20) score += 0.5;
  if (fatG > 45) score -= 0.5;
  const clamped = Math.min(10, Math.max(4, score));
  return Math.round(clamped * 2) / 2;
}

export function applyMealTotalsToItems(
  items: MealDiaryItem[],
  next: {
    grams: number;
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    rescaleOnly: boolean;
  },
): MealDiaryItem[] {
  const prevGrams = Math.max(1, mealGramsTotal(items));
  const gramRatio = Math.max(0.01, next.grams / prevGrams);
  if (next.rescaleOnly) {
    return items.map((item) => rescaleMealItem(item, Math.max(1, Math.round((item.grams || 1) * gramRatio))));
  }
  return items.map((item) => {
    const share = (item.grams || 1) / prevGrams;
    return {
      ...item,
      grams: Math.max(1, Math.round((item.grams || 1) * gramRatio)),
      caloriesKcal: Math.max(0, Math.round(next.caloriesKcal * share)),
      carbsG: Math.round(next.carbsG * share * 10) / 10,
      proteinG: Math.round(next.proteinG * share * 10) / 10,
      fatG: Math.round(next.fatG * share * 10) / 10,
    };
  });
}

export function rescaleMealItem(item: MealDiaryItem, grams: number): MealDiaryItem {
  const prev = Math.max(1, Number(item.grams) || 1);
  const next = Math.max(1, Math.round(grams));
  const ratio = next / prev;
  return {
    ...item,
    grams: next,
    caloriesKcal: Math.max(0, Math.round((item.caloriesKcal || 0) * ratio)),
    carbsG: Math.round(((item.carbsG || 0) * ratio) * 10) / 10,
    proteinG: Math.round(((item.proteinG || 0) * ratio) * 10) / 10,
    fatG: Math.round(((item.fatG || 0) * ratio) * 10) / 10,
  };
}
