import {
  normalizeFoodSearchQuery,
  pickBestFoodMatch,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
  expandTokenSynonyms,
} from "./food-search";
import type { FoodItemDto } from "../types/food.types";
import { normalizePer100gMacros } from "./food-macros";
import { resolveSwapGroup, type SwapGroup } from "../services/bella/food-category";

const COMPLEX_DISH_PATTERN =
  /sandu[ií]che|hamb[uú]rguer|hot dog|picol[eé]|sorvete|pizza|lasanha|nhoque|empanad|bolo\b|torta\b|misto quente|cheese salad|à parmegiana|charuto de|papa de|ravioli|massa com|refogad[oa].*c\/\s*(óleo|oleo)/i;

const PREPARED_IN_NAME = /\bc\/\s*(p[aã]o|molho|queijo|massa|farinha)/i;

export function scoreFoodForSwapMatch(
  query: string,
  name: string,
  source: "TACO" | "TBCA",
): number {
  let score = scoreFoodSearchResult(query, name, source);

  if (COMPLEX_DISH_PATTERN.test(name)) score -= 120;
  if (PREPARED_IN_NAME.test(name)) score -= 35;
  if (/industrializad/i.test(name)) score -= 25;

  const commaCount = (name.match(/,/g) || []).length;
  if (commaCount >= 4) score -= 40;
  else if (commaCount >= 2) score -= 15;
  else if (commaCount === 0) score += 8;

  if (name.length > 90) score -= 30;

  const queryTokens = tokenizeFoodQuery(query);
  const firstSegment = normalizeFoodSearchQuery(name.split(",")[0] || name);
  const matchedCore = queryTokens.filter((token) => {
    const variants = expandTokenSynonyms(token);
    return variants.some(
      (variant) =>
        firstSegment.includes(variant) ||
        variant.length > 3 && firstSegment.split(/\s+/).some((part) => part.startsWith(variant)),
    );
  }).length;

  score += matchedCore * 14;

  if (source === "TACO") score += 12;

  return score;
}

export function pickBestFoodForSwap(
  query: string,
  items: FoodItemDto[],
  options?: { expectedGroup?: SwapGroup; minScore?: number },
): FoodItemDto | null {
  if (!items.length) return null;

  const minScore = options?.minScore ?? 40;
  let best: FoodItemDto | null = null;
  let bestScore = 0;

  for (const item of items) {
    const group = resolveSwapGroup({
      category: item.category,
      name: item.name,
      per100g: normalizePer100gMacros(item),
    });

    if (options?.expectedGroup && group !== options.expectedGroup) {
      continue;
    }

    const score = scoreFoodForSwapMatch(query, item.name, item.source);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore >= minScore) return best;

  if (options?.expectedGroup) {
    return pickBestFoodMatch(
      query,
      items.filter(
        (item) =>
          resolveSwapGroup({
            category: item.category,
            name: item.name,
            per100g: normalizePer100gMacros(item),
          }) === options.expectedGroup,
      ),
      minScore,
    );
  }

  return pickBestFoodMatch(query, items, minScore);
}
