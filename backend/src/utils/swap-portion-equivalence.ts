import type { MacroAnchor } from "../services/bella/food-category";
import {
  ATWATER_CARBS_KCAL_PER_G,
  ATWATER_FAT_KCAL_PER_G,
  ATWATER_PROTEIN_KCAL_PER_G,
} from "./atwater";
import {
  macrosAtGramsFromPer100g,
  type NormalizedPer100g,
} from "./food-macros";

export interface PortionMacros {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

/**
 * Equivalência de porção com base na TACO/TBCA (valores por 100 g) e fatores de Atwater
 * (4 kcal/g carboidrato e proteína, 9 kcal/g gordura), alinhado a listas de substituição
 * isocalórica/isomacronutriente usadas em consultório.
 */
export function scorePortionEquivalence(
  target: PortionMacros,
  candidate: PortionMacros,
  anchor: MacroAnchor,
): number {
  const kcalGap = Math.abs(target.caloriesKcal - candidate.caloriesKcal);
  const carbGap = Math.abs(target.carbsG - candidate.carbsG) * ATWATER_CARBS_KCAL_PER_G;
  const proteinGap = Math.abs(target.proteinG - candidate.proteinG) * ATWATER_PROTEIN_KCAL_PER_G;
  const fatGap = Math.abs(target.fatG - candidate.fatG) * ATWATER_FAT_KCAL_PER_G;

  let score = kcalGap + carbGap * 0.35 + proteinGap * 0.35 + fatGap * 0.35;

  if (anchor === "carbs") score += carbGap * 0.9 + kcalGap * 0.25;
  else if (anchor === "protein") score += proteinGap * 0.9 + kcalGap * 0.25;
  else if (anchor === "fat") score += fatGap * 0.9 + kcalGap * 0.25;
  else score += kcalGap * 0.6;

  return score;
}

export function computeEquivalentPortionGrams(
  per100g: NormalizedPer100g,
  target: PortionMacros,
  anchor: MacroAnchor,
): number {
  if (per100g.caloriesKcal <= 0 && per100g.carbsG <= 0 && per100g.proteinG <= 0) {
    return Math.max(10, Math.round(target.grams));
  }

  const minG = 10;
  const maxG = Math.min(
    900,
    Math.max(250, Math.round(target.grams * 3.5)),
  );

  let bestGrams = Math.max(minG, Math.round(target.grams));
  let bestError = Number.POSITIVE_INFINITY;

  for (let grams = minG; grams <= maxG; grams += 5) {
    const macros = macrosAtGramsFromPer100g(per100g, grams);
    const error = scorePortionEquivalence(target, macros, anchor);
    if (error < bestError) {
      bestError = error;
      bestGrams = grams;
    }
  }

  const fineMin = Math.max(minG, bestGrams - 10);
  const fineMax = Math.min(maxG, bestGrams + 10);
  for (let grams = fineMin; grams <= fineMax; grams += 1) {
    const macros = macrosAtGramsFromPer100g(per100g, grams);
    const error = scorePortionEquivalence(target, macros, anchor);
    if (error < bestError) {
      bestError = error;
      bestGrams = grams;
    }
  }

  return bestGrams;
}

export function buildEquivalentPortion(
  per100g: NormalizedPer100g,
  target: PortionMacros,
  anchor: MacroAnchor,
): PortionMacros {
  const grams = computeEquivalentPortionGrams(per100g, target, anchor);
  return macrosAtGramsFromPer100g(per100g, grams);
}
