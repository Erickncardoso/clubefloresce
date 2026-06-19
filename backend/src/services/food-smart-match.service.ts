import { FoodSource } from "@prisma/client";
import type { FoodItemDto } from "../types/food.types";
import { FoodRepository } from "../repositories/food.repository";
import type { SwapGroup } from "./bella/food-category";
import {
  isSimpleIngredientQuery,
  pickBestFoodForSwap,
} from "../utils/swap-food-match";
import {
  buildIngredientSearchVariants,
  buildSwapSearchQueries,
} from "../utils/swap-search-queries";

const foodRepository = new FoodRepository();

export interface SmartFoodMatchOptions {
  expectedGroup?: SwapGroup;
  originalName?: string;
  minScore?: number;
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

/**
 * Escolhe o alimento mais coerente com o plano/TBCA, evitando matches absurdos
 * (ex.: banana doce em barra para banana in natura do plano).
 */
export async function smartMatchFood(
  name: string,
  options: SmartFoodMatchOptions = {},
): Promise<FoodItemDto | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const pickOptions = {
    expectedGroup:
      options.expectedGroup && options.expectedGroup !== "mixed"
        ? options.expectedGroup
        : undefined,
    minScore: options.minScore,
    originalName: options.originalName,
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

  const tbcaList = [...tbcaCandidates.values()];
  if (tbcaList.length) {
    const tbcaPick = pickBestFoodForSwap(trimmed, tbcaList, {
      ...pickOptions,
      minScore: pickOptions.minScore ?? (isSimpleIngredientQuery(trimmed) ? 52 : 45),
    });
    if (tbcaPick) return tbcaPick;
  }

  const allList = [...allCandidates.values()];
  if (!allList.length) return null;

  return pickBestFoodForSwap(trimmed, allList, {
    ...pickOptions,
    minScore: pickOptions.minScore ?? (isSimpleIngredientQuery(trimmed) ? 55 : 40),
  });
}
