import { FoodSource } from "@prisma/client";
import type { FoodItemDto } from "../types/food.types";
import { FoodRepository } from "../repositories/food.repository";
import type { SwapGroup } from "./bella/food-category";
import {
  isSimpleIngredientQuery,
  pickBestFoodForSwap,
} from "../utils/swap-food-match";
import { scoreFoodForMealPlanSearch } from "../utils/food-meal-plan-search";
import {
  buildIngredientSearchVariants,
  buildSwapSearchQueries,
} from "../utils/swap-search-queries";
import { isAbsurdFoodMatch } from "../utils/food-match-guards";
import { scoreIngredientNaturalness } from "./bella/swap-prep-state";

const foodRepository = new FoodRepository();

export interface SmartFoodMatchOptions {
  expectedGroup?: SwapGroup;
  originalName?: string;
  minScore?: number;
  /** Usa scoring de plano (aliases Dietbox → TBCA). Default: true. */
  preferMealPlanScoring?: boolean;
}

/** Remove marcas/ruído Dietbox, mas mantém sinônimos entre parênteses (ex.: couve-manteiga). */
export function cleanFoodMatchQuery(name: string): string {
  return String(name || "")
    .replace(/\(\s*marca\s*:[^)]*\)/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s*-\s+[A-Za-zÀ-ú0-9].*$/u, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function mergeSearchResults(
  merged: Map<string, FoodItemDto>,
  query: string,
  source?: FoodSource,
  limit = 40,
) {
  const { items } = await foodRepository.search({ q: query, source, limit });
  for (const item of items) {
    merged.set(item.id, item);
  }
}

function pickBestMealPlanCandidate(
  query: string,
  items: FoodItemDto[],
  minScore: number,
  originalName?: string,
): FoodItemDto | null {
  let best: FoodItemDto | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const context = originalName || query;
  for (const item of items) {
    if (isAbsurdFoodMatch(query, item.name, item.per100g)) continue;
    if (context !== query && isAbsurdFoodMatch(context, item.name, item.per100g)) continue;
    let score = scoreFoodForMealPlanSearch(query, item.name, item.source, item.sourceCode);
    // Reforço com o rótulo completo do plano (unidade, g, etc.)
    if (context !== query) {
      score += scoreIngredientNaturalness(context, item.name);
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < minScore) return null;
  return best;
}

/**
 * Escolhe o alimento mais coerente com o plano/TBCA, evitando matches absurdos
 * (ex.: banana doce em barra para banana in natura do plano).
 */
export async function smartMatchFood(
  name: string,
  options: SmartFoodMatchOptions = {},
): Promise<FoodItemDto | null> {
  const cleaned = cleanFoodMatchQuery(name);
  const trimmed = cleaned || name.trim();
  if (!trimmed) return null;

  const preferMealPlan = options.preferMealPlanScoring !== false;
  const pickOptions = {
    expectedGroup:
      options.expectedGroup && options.expectedGroup !== "mixed"
        ? options.expectedGroup
        : undefined,
    minScore: options.minScore,
    originalName: options.originalName || name,
  };

  const tbcaCandidates = new Map<string, FoodItemDto>();
  const allCandidates = new Map<string, FoodItemDto>();

  const addCandidate = (item: FoodItemDto) => {
    allCandidates.set(item.id, item);
    if (item.source === "TBCA") tbcaCandidates.set(item.id, item);
  };

  if (isSimpleIngredientQuery(trimmed)) {
    for (const item of await foodRepository.findByPrimaryIngredient(trimmed, 30)) {
      addCandidate(item);
    }
  }

  const exact = await foodRepository.findExactMatch(trimmed);
  if (exact) addCandidate(exact);

  const queries = new Set<string>([
    trimmed,
    ...buildSwapSearchQueries(trimmed),
    ...buildIngredientSearchVariants(trimmed),
  ]);

  if (isSimpleIngredientQuery(trimmed)) {
    queries.add(`${trimmed} in natura`);
    queries.add(`${trimmed}, in natura`);
  }

  for (const query of queries) {
    await mergeSearchResults(tbcaCandidates, query, "TBCA", 30);
    await mergeSearchResults(allCandidates, query, undefined, 40);
  }

  const pick = (items: FoodItemDto[], minScore: number) => {
    if (preferMealPlan) {
      return pickBestMealPlanCandidate(trimmed, items, minScore, pickOptions.originalName);
    }
    return pickBestFoodForSwap(trimmed, items, { ...pickOptions, minScore });
  };

  const tbcaList = [...tbcaCandidates.values()];
  const prefersCustomFirst =
    /\b(verde campo|growth|yopro|dr\.?\s*peanut|buen[ií]ssimo)\b/i.test(trimmed) ||
    /\bsalada de folhas|mix de folhas\b/i.test(trimmed) ||
    /\brequeij[aã]o cremoso light\b/i.test(trimmed);

  if (!prefersCustomFirst && tbcaList.length) {
    const tbcaPick = pick(
      tbcaList,
      pickOptions.minScore ?? (preferMealPlan ? 35 : isSimpleIngredientQuery(trimmed) ? 52 : 45),
    );
    if (tbcaPick) return tbcaPick;
  }

  const allList = [...allCandidates.values()];
  if (!allList.length) return null;

  return pick(
    allList,
    pickOptions.minScore ?? (preferMealPlan ? 25 : isSimpleIngredientQuery(trimmed) ? 55 : 40),
  );
}
