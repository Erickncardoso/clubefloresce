import type { MealPlanMeal } from '@/lib/meal-plan-api';

function slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function mealSlotDisplayLabel(label: string) {
  const cleaned = String(label || '')
    .replace(/\s*[-–—/|]\s*op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, '')
    .replace(/\s+op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || String(label || '').trim() || 'Refeição';
}

export function mealOptionVariantLabel(label: string, index = 0) {
  const raw = String(label || '');
  const afterColon = raw.match(/op(?:ç|c)(?:ã|a)o\s*\d+\s*:\s*(.+)$/i);
  if (afterColon?.[1]?.trim()) return afterColon[1].trim();
  const onlyOpt = raw.match(/op(?:ç|c)(?:ã|a)o\s*(\d+)/i);
  if (onlyOpt) return `Opção ${onlyOpt[1]}`;
  return `Opção ${index + 1}`;
}

export function normalizeMealSlotKey(label: string) {
  let cleaned = String(label || '');
  cleaned = cleaned.replace(/\s*[-–—/|]\s*op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, '');
  cleaned = cleaned.replace(/\s+op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, '');
  cleaned = cleaned.replace(/\bop(?:ç|c)(?:ã|a)o\s*\d+\b/gi, ' ');
  cleaned = cleaned.replace(/\bop\.?\s*\d+\b/gi, ' ');
  cleaned = cleaned.replace(/[\/|–—-]+/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return slugify(cleaned) || 'refeicao';
}

export type MealOptionGroup = {
  slotKey: string;
  label: string;
  options: MealPlanMeal[];
};

export function groupMealOptions(meals: MealPlanMeal[] | null | undefined): MealOptionGroup[] {
  const bySlot = new Map<string, MealPlanMeal[]>();

  for (const meal of meals || []) {
    if (!meal?.id) continue;
    const slotKey = normalizeMealSlotKey(meal.label);
    const list = bySlot.get(slotKey) || [];
    list.push(meal);
    bySlot.set(slotKey, list);
  }

  const groups: MealOptionGroup[] = [];
  for (const [slotKey, options] of bySlot) {
    if (options.length < 2) continue;
    groups.push({
      slotKey,
      label: mealSlotDisplayLabel(options[0]?.label) || slotKey,
      options,
    });
  }

  return groups;
}

export function activeMeals(
  meals: MealPlanMeal[] | null | undefined,
  selectedMealBySlot: Record<string, string> | null | undefined,
): MealPlanMeal[] {
  if (!meals?.length) return [];

  const groups = groupMealOptions(meals);
  if (!groups.length) return [...meals];

  const selectedIds = new Set<string>();
  const optionIds = new Set<string>();

  for (const group of groups) {
    for (const option of group.options) optionIds.add(option.id);
    const chosen = String(selectedMealBySlot?.[group.slotKey] || '').trim();
    const match = group.options.find((meal) => meal.id === chosen);
    selectedIds.add(match?.id || group.options[0].id);
  }

  return meals.filter((meal) => !optionIds.has(meal.id) || selectedIds.has(meal.id));
}

export function needsMealOptionSelection(
  meals: MealPlanMeal[] | null | undefined,
  selectedMealBySlot: Record<string, string> | null | undefined,
) {
  const groups = groupMealOptions(meals);
  if (!groups.length) return false;

  for (const group of groups) {
    const chosen = String(selectedMealBySlot?.[group.slotKey] || '').trim();
    if (!chosen || !group.options.some((meal) => meal.id === chosen)) {
      return true;
    }
  }

  return false;
}

export function findOptionGroupForMealId(meals: MealPlanMeal[] | null | undefined, mealId: string) {
  if (!mealId) return null;
  return groupMealOptions(meals).find((group) =>
    group.options.some((meal) => meal.id === mealId),
  ) || null;
}
