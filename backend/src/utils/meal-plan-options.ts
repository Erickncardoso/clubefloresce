import type { ParsedMeal } from "../types/meal-plan.types";
import { slugify } from "./slug";

export type MealOptionGroup = {
  slotKey: string;
  label: string;
  options: ParsedMeal[];
};

/** Nome “bonito” do slot, sem sufixo de opção. */
export function mealSlotDisplayLabel(label: string): string {
  const cleaned = String(label || "")
    .replace(/\s*[-–—/|]\s*op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, "")
    .replace(/\s+op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(label || "").trim() || "Refeição";
}

/** Texto da variante: "Panqueca de banana proteica" ou "Opção 1". */
export function mealOptionVariantLabel(label: string, index = 0): string {
  const raw = String(label || "");
  const afterColon = raw.match(/op(?:ç|c)(?:ã|a)o\s*\d+\s*:\s*(.+)$/i);
  if (afterColon?.[1]?.trim()) return afterColon[1].trim();
  const onlyOpt = raw.match(/op(?:ç|c)(?:ã|a)o\s*(\d+)/i);
  if (onlyOpt) return `Opção ${onlyOpt[1]}`;
  return `Opção ${index + 1}`;
}

/** Normaliza o label da refeição para agrupar opções (ignora “Opção N: …” e sufixos). */
export function normalizeMealSlotKey(label: string): string {
  let cleaned = String(label || "");

  // "Lanche da tarde - Opção 1: Panqueca..." → "Lanche da tarde"
  cleaned = cleaned.replace(/\s*[-–—/|]\s*op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, "");
  // "Jantar Opção 2: Pizza..." (sem hífen)
  cleaned = cleaned.replace(/\s+op(?:ç|c)(?:ã|a)o\s*\d+\s*:?.*/i, "");
  // residual "Opção N" solto
  cleaned = cleaned.replace(/\bop(?:ç|c)(?:ã|a)o\s*\d+\b/gi, " ");
  cleaned = cleaned.replace(/\bop\.?\s*\d+\b/gi, " ");
  cleaned = cleaned.replace(/[\/|–—-]+/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return slugify(cleaned) || "refeicao";
}

export function groupMealOptions(meals: ParsedMeal[]): MealOptionGroup[] {
  const bySlot = new Map<string, ParsedMeal[]>();

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
      label: mealSlotDisplayLabel(options[0]?.label || "") || slotKey,
      options,
    });
  }

  return groups;
}

export function validateSelectedMealBySlot(
  meals: ParsedMeal[],
  selectedMealBySlot: Record<string, string>,
): Record<string, string> {
  const groups = groupMealOptions(meals);
  const valid: Record<string, string> = {};

  for (const group of groups) {
    const chosen = String(selectedMealBySlot?.[group.slotKey] || "").trim();
    if (!chosen) {
      throw new Error(`Escolha uma opção para “${group.label}”.`);
    }
    if (!group.options.some((meal) => meal.id === chosen)) {
      throw new Error(`Opção inválida para “${group.label}”.`);
    }
    valid[group.slotKey] = chosen;
  }

  return valid;
}

/**
 * Refeições ativas: singles sempre; em slots com opções usa a seleção
 * ou, provisoriamente, a primeira opção.
 */
export function activeMeals(
  meals: ParsedMeal[],
  selectedMealBySlot?: Record<string, string> | null,
): ParsedMeal[] {
  if (!meals?.length) return [];

  const groups = groupMealOptions(meals);
  if (!groups.length) return [...meals];

  const selectedIds = new Set<string>();
  const optionIds = new Set<string>();

  for (const group of groups) {
    for (const option of group.options) optionIds.add(option.id);
    const chosen = String(selectedMealBySlot?.[group.slotKey] || "").trim();
    const match = group.options.find((meal) => meal.id === chosen);
    selectedIds.add(match?.id || group.options[0]!.id);
  }

  return meals.filter((meal) => !optionIds.has(meal.id) || selectedIds.has(meal.id));
}

export function needsMealOptionSelection(
  meals: ParsedMeal[],
  selectedMealBySlot?: Record<string, string> | null,
): boolean {
  const groups = groupMealOptions(meals);
  if (!groups.length) return false;

  for (const group of groups) {
    const chosen = String(selectedMealBySlot?.[group.slotKey] || "").trim();
    if (!chosen || !group.options.some((meal) => meal.id === chosen)) {
      return true;
    }
  }

  return false;
}
