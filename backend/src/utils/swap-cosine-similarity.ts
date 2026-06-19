import type { FoodItemDto } from "../types/food.types";
import type { MacroAnchor } from "../services/bella/food-category";
import { calculateAtwaterCalories } from "./atwater";
import type { NormalizedPer100g } from "./food-macros";

export type SubstitutionCriterion = MacroAnchor;

export interface NutrientVector {
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
}

const ENERGY_NORMALIZATION_KCAL = 100;

export function readFiberG(food: FoodItemDto): number {
  const fromColumn = food.per100g.fiberG;
  if (fromColumn != null && fromColumn >= 0) return fromColumn;
  const fromNutrients = food.nutrients?.per100g?.fiberG;
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients;
  return 0;
}

export function buildNutrientVector(
  per100g: NormalizedPer100g,
  grams: number,
  fiberPer100g = 0,
): NutrientVector {
  const ratio = Math.max(1, grams) / 100;
  return {
    carbsG: per100g.carbsG * ratio,
    proteinG: per100g.proteinG * ratio,
    fatG: per100g.fatG * ratio,
    fiberG: fiberPer100g * ratio,
  };
}

export function vectorToArray(vector: NutrientVector): [number, number, number, number] {
  return [vector.carbsG, vector.proteinG, vector.fatG, vector.fiberG];
}

export function vectorCalories(vector: NutrientVector): number {
  return calculateAtwaterCalories({
    carbsG: vector.carbsG,
    proteinG: vector.proteinG,
    fatG: vector.fatG,
  });
}

/** Normalização energética: escala o vetor para base calórica fixa (100 kcal). */
export function normalizeVectorToEnergyBase(vector: NutrientVector, targetKcal = ENERGY_NORMALIZATION_KCAL): NutrientVector {
  const kcal = vectorCalories(vector);
  if (kcal <= 0) return { ...vector };

  const scale = targetKcal / kcal;
  return {
    carbsG: vector.carbsG * scale,
    proteinG: vector.proteinG * scale,
    fatG: vector.fatG * scale,
    fiberG: vector.fiberG * scale,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA <= 0 || magB <= 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function criterionToAnchor(criterion: SubstitutionCriterion): MacroAnchor {
  return criterion;
}

export function scoreNutritionalSimilarity(
  original: NutrientVector,
  candidate: NutrientVector,
  _criterion: SubstitutionCriterion = "calories",
): number {
  const normalizedOriginal = normalizeVectorToEnergyBase(original);
  const normalizedCandidate = normalizeVectorToEnergyBase(candidate);

  const similarity = cosineSimilarity(
    vectorToArray(normalizedOriginal),
    vectorToArray(normalizedCandidate),
  );

  return Math.max(0, Math.min(1, similarity));
}

export function similarityToPercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}
