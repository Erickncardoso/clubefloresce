import type { FoodItemDto } from "../types/food.types";
import { FoodRepository } from "../repositories/food.repository";
import type { SwapGroup } from "./bella/food-category";
import { resolveSwapGroup } from "./bella/food-category";
import {
  buildEquivalentPortion,
  type PortionMacros,
} from "../utils/swap-portion-equivalence";
import {
  buildNutrientVector,
  criterionToAnchor,
  readFiberG,
  scoreNutritionalSimilarity,
  similarityToPercent,
  type SubstitutionCriterion,
} from "../utils/swap-cosine-similarity";
import { macrosAtGramsFromPer100g, normalizePer100gMacros } from "../utils/food-macros";
import { smartMatchFood } from "./food-smart-match.service";

const foodRepository = new FoodRepository();

export type SubstitutionGroupFilter = "all" | "carb_rich" | "protein_rich" | "fat_rich";
export type SubstitutionMode = "multiple" | "specific";

export interface SubstitutionRequest {
  foodId?: string;
  foodName?: string;
  grams: number;
  mode?: SubstitutionMode;
  criterion?: SubstitutionCriterion;
  groupFilter?: SubstitutionGroupFilter;
  replacementId?: string;
  replacementName?: string;
  limit?: number;
}

export interface SubstitutionFoodResult {
  id: string;
  name: string;
  category: string | null;
  grams: number;
  macros: PortionMacros;
  similarityPercent: number;
  per100g: {
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    fiberG: number;
  };
}

export interface SubstitutionResponse {
  criterion: SubstitutionCriterion;
  groupFilter: SubstitutionGroupFilter;
  mode: SubstitutionMode;
  original: SubstitutionFoodResult;
  suggestions: SubstitutionFoodResult[];
}

const GROUP_FILTER_LABELS: Record<SubstitutionGroupFilter, string> = {
  all: "Todos os alimentos",
  carb_rich: "Carboidratos",
  protein_rich: "Proteínas",
  fat_rich: "Gorduras",
};

export function getSubstitutionGroupLabel(filter: SubstitutionGroupFilter): string {
  return GROUP_FILTER_LABELS[filter];
}

function groupsForFilter(filter: SubstitutionGroupFilter): SwapGroup[] {
  if (filter === "all") return ["carb_rich", "protein_rich", "fat_rich"];
  return [filter];
}

async function resolveOriginalFood(input: SubstitutionRequest): Promise<FoodItemDto | null> {
  if (input.foodId) {
    return foodRepository.findById(input.foodId);
  }

  const name = input.foodName?.trim();
  if (!name) return null;
  return smartMatchFood(name);
}

async function resolveReplacementFood(input: SubstitutionRequest): Promise<FoodItemDto | null> {
  if (input.replacementId) {
    return foodRepository.findById(input.replacementId);
  }

  const name = input.replacementName?.trim();
  if (!name) return null;
  return smartMatchFood(name);
}

function buildOriginalMacros(food: FoodItemDto, grams: number): PortionMacros {
  const per100g = normalizePer100gMacros(food);
  return macrosAtGramsFromPer100g(per100g, grams);
}

function toResult(
  food: FoodItemDto,
  macros: PortionMacros,
  similarityPercent: number,
): SubstitutionFoodResult {
  const per100g = normalizePer100gMacros(food);
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    grams: macros.grams,
    macros,
    similarityPercent,
    per100g: {
      caloriesKcal: per100g.caloriesKcal,
      carbsG: per100g.carbsG,
      proteinG: per100g.proteinG,
      fatG: per100g.fatG,
      fiberG: readFiberG(food),
    },
  };
}

async function loadCandidates(
  filter: SubstitutionGroupFilter,
  excludeIds: string[],
): Promise<FoodItemDto[]> {
  const merged = new Map<string, FoodItemDto>();

  for (const group of groupsForFilter(filter)) {
    const items = await foodRepository.findForSwapGroup(group, {
      excludeNames: [],
      limit: 220,
    });
    for (const item of items) {
      if (excludeIds.includes(item.id)) continue;
      const itemGroup = resolveSwapGroup({
        category: item.category,
        name: item.name,
        per100g: normalizePer100gMacros(item),
      });
      if (filter !== "all" && itemGroup !== filter) continue;
      merged.set(item.id, item);
    }
  }

  return [...merged.values()];
}

function rankCandidates(
  originalFood: FoodItemDto,
  originalMacros: PortionMacros,
  candidates: FoodItemDto[],
  criterion: SubstitutionCriterion,
): SubstitutionFoodResult[] {
  const originalPer100g = normalizePer100gMacros(originalFood);
  const originalVector = buildNutrientVector(
    originalPer100g,
    originalMacros.grams,
    readFiberG(originalFood),
  );
  const anchor = criterionToAnchor(criterion);

  return candidates
    .map((food) => {
      const per100g = normalizePer100gMacros(food);
      const equivalent = buildEquivalentPortion(per100g, originalMacros, anchor);
      const candidateVector = buildNutrientVector(
        per100g,
        equivalent.grams,
        readFiberG(food),
      );
      const similarity = scoreNutritionalSimilarity(originalVector, candidateVector, criterion);

      return toResult(food, equivalent, similarityToPercent(similarity));
    })
    .sort((a, b) => b.similarityPercent - a.similarityPercent);
}

export async function calculateFoodSubstitution(
  input: SubstitutionRequest,
): Promise<SubstitutionResponse | null> {
  const grams = Math.max(1, Math.round(input.grams || 100));
  const criterion = input.criterion || "calories";
  const groupFilter = input.groupFilter || "all";
  const mode = input.mode || "multiple";
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);

  const originalFood = await resolveOriginalFood(input);
  if (!originalFood) return null;

  const originalMacros = buildOriginalMacros(originalFood, grams);
  const originalResult = toResult(originalFood, originalMacros, 100);

  if (mode === "specific") {
    const replacement = await resolveReplacementFood(input);
    if (!replacement) {
      return {
        criterion,
        groupFilter,
        mode,
        original: originalResult,
        suggestions: [],
      };
    }

    const per100g = normalizePer100gMacros(replacement);
    const equivalent = buildEquivalentPortion(
      per100g,
      originalMacros,
      criterionToAnchor(criterion),
    );
    const originalVector = buildNutrientVector(
      normalizePer100gMacros(originalFood),
      originalMacros.grams,
      readFiberG(originalFood),
    );
    const candidateVector = buildNutrientVector(
      per100g,
      equivalent.grams,
      readFiberG(replacement),
    );
    const similarity = scoreNutritionalSimilarity(originalVector, candidateVector, criterion);

    return {
      criterion,
      groupFilter,
      mode,
      original: originalResult,
      suggestions: [toResult(replacement, equivalent, similarityToPercent(similarity))],
    };
  }

  const candidates = await loadCandidates(groupFilter, [originalFood.id]);
  const suggestions = rankCandidates(originalFood, originalMacros, candidates, criterion)
    .slice(0, limit);

  return {
    criterion,
    groupFilter,
    mode,
    original: originalResult,
    suggestions,
  };
}
