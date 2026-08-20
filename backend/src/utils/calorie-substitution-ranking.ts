import type { SubstitutionFoodResult } from "../services/food-substitution.service";
import type { FoodItemDto } from "../types/food.types";
import { resolveSwapGroup, type SwapGroup } from "../services/bella/food-category";
import {
  isCulinarySwapAllowed,
  resolveMealPeriod,
  scoreCulinarySwapFit,
  type MealPeriod,
} from "../services/bella/swap-culinary-fit";
import { isPreparationSwapAllowed } from "../services/bella/swap-prep-state";
import { isCompoundDishName, getPrimaryFoodSegment } from "./swap-food-match";
import { normalizePer100gMacros } from "./food-macros";

const FAMILY_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: "arroz", pattern: /\barroz\b/i },
  { key: "batata", pattern: /\bbatata\b/i },
  { key: "mandioca", pattern: /\b(mandioca|aipim|macaxeira)\b/i },
  { key: "macarrao", pattern: /\bmacarr[aã]o\b/i },
  { key: "feijao", pattern: /\bfeij[aã]o\b/i },
  { key: "inhame", pattern: /\b(inhame|baroa|cara\b)\b/i },
  { key: "quinoa", pattern: /\bquinoa\b/i },
  { key: "pao", pattern: /\bp[aã]o\b/i },
  { key: "aveia", pattern: /\baveia\b/i },
  { key: "milho", pattern: /\bmilho\b/i },
  { key: "cuscuz", pattern: /\b(cuscuz|polenta)\b/i },
  { key: "lentilha", pattern: /\blentilha\b/i },
];

export function getSubstituteFamilyKey(name: string): string {
  const text = String(name || "").trim();
  if (!text) return "other";

  for (const entry of FAMILY_PATTERNS) {
    if (entry.pattern.test(text)) return entry.key;
  }

  const primary = getPrimaryFoodSegment(text).split(/\s+/)[0];
  return primary || "other";
}

export function resolveSubstitutionGroupFilter(
  originalFood: FoodItemDto,
  requested: "all" | "carb_rich" | "protein_rich" | "fat_rich",
): "all" | "carb_rich" | "protein_rich" | "fat_rich" {
  if (requested !== "all") return requested;

  const group = resolveSwapGroup({
    category: originalFood.category,
    name: originalFood.name,
    per100g: normalizePer100gMacros(originalFood),
  });

  if (
    group === "carb_rich"
    || group === "protein_rich"
    || group === "fat_rich"
  ) {
    return group;
  }

  return "all";
}

export function isCalorieSubstitutionCandidateAllowed(
  originalFood: FoodItemDto,
  candidate: FoodItemDto,
  mealPeriod: MealPeriod,
  swapGroup: SwapGroup,
): boolean {
  if (candidate.id === originalFood.id) return false;
  if (isCompoundDishName(candidate.name)) return false;
  if (/sandu[ií]che|picol[eé]|sorvete|hamb[uú]rguer.*p[aã]o/i.test(candidate.name)) return false;

  if (
    !isCulinarySwapAllowed(originalFood.name, candidate.name, mealPeriod, swapGroup)
    || !isPreparationSwapAllowed(originalFood.name, candidate.name)
  ) {
    return false;
  }

  const originalFamily = getSubstituteFamilyKey(originalFood.name);
  const candidateFamily = getSubstituteFamilyKey(candidate.name);
  if (originalFamily !== "other" && candidateFamily === originalFamily) {
    return false;
  }

  return true;
}

export function buildRankedSubstitutionScore(
  originalName: string,
  substituteName: string,
  similarityPercent: number,
  mealPeriod: MealPeriod,
): number {
  return similarityPercent + scoreCulinarySwapFit(originalName, substituteName, mealPeriod) * 0.45;
}

export function pickDiverseSubstitutionSuggestions(
  ranked: SubstitutionFoodResult[],
  originalName: string,
  limit: number,
): SubstitutionFoodResult[] {
  const originalFamily = getSubstituteFamilyKey(originalName);
  const diverseTarget = Math.min(Math.max(4, Math.floor(limit * 0.35)), 8);
  const picked: SubstitutionFoodResult[] = [];
  const seenIds = new Set<string>();
  const seenFamilies = new Set<string>();

  for (const item of ranked) {
    if (picked.length >= diverseTarget) break;
    if (seenIds.has(item.id)) continue;
    const family = getSubstituteFamilyKey(item.name);
    if (family === originalFamily) continue;
    if (seenFamilies.has(family)) continue;
    seenFamilies.add(family);
    seenIds.add(item.id);
    picked.push(item);
  }

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (seenIds.has(item.id)) continue;
    const family = getSubstituteFamilyKey(item.name);
    if (family === originalFamily) continue;
    seenIds.add(item.id);
    picked.push(item);
  }

  return picked;
}

export function resolveSubstitutionMealPeriod(mealLabel?: string): MealPeriod {
  return resolveMealPeriod(String(mealLabel || "").trim());
}
