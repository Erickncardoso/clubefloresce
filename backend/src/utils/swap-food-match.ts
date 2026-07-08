import {
  normalizeFoodSearchQuery,
  pickBestFoodMatch,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
  expandTokenSynonyms,
  FOOD_SOURCE_SCORE_BOOST,
} from "./food-search";
import type { FoodItemDto } from "../types/food.types";
import { normalizePer100gMacros, type NormalizedPer100g } from "./food-macros";
import { resolveSwapGroup, type SwapGroup } from "../services/bella/food-category";
import {
  isProcessedFoodName,
  looksLikeFreshProduceLabel,
  scorePreparationSwapFit,
} from "../services/bella/swap-prep-state";

const COMPLEX_DISH_PATTERN =
  /sandu[ií]che|hamb[uú]rguer|hot dog|picol[eé]|sorvete|pizza|lasanha|nhoque|empanad|bolo\b|torta\b|misto quente|cheese salad|à parmegiana|charuto de|papa de|ravioli|massa com|refogad[oa].*c\/\s*(óleo|oleo)|salada\s+de|prato\s+de|feijoada|estrogonofe|escondidinho/i;

const PREPARED_IN_NAME = /\bc\/\s*(p[aã]o|molho|queijo|massa|farinha|alface|tomate)/i;

export function getPrimaryFoodSegment(name: string): string {
  return normalizeFoodSearchQuery(name.split(",")[0] || name);
}

export function isCompoundDishName(name: string): boolean {
  const commaCount = (name.match(/,/g) || []).length;
  if (COMPLEX_DISH_PATTERN.test(name)) return true;
  if (PREPARED_IN_NAME.test(name)) return true;
  if (/\s(e|com)\s/i.test(name.split(",")[0] || "")) return true;
  if (commaCount >= 3) return true;
  if (commaCount >= 2 && /\bc\/\b/i.test(name)) return true;
  return false;
}

export function isSimpleIngredientQuery(query: string): boolean {
  const tokens = tokenizeFoodQuery(query);
  const normalized = normalizeFoodSearchQuery(query);
  return tokens.length <= 2 && normalized.length > 0 && normalized.length <= 28;
}

export function scoreFoodForSwapMatch(
  query: string,
  name: string,
  source: "TACO" | "TBCA" | "CUSTOM",
): number {
  const normalizedQuery = normalizeFoodSearchQuery(query);
  const queryTokens = tokenizeFoodQuery(query);
  const primary = getPrimaryFoodSegment(name);
  const simpleQuery = isSimpleIngredientQuery(query);

  let score = scoreFoodSearchResult(query, name, source);

  if (primary === normalizedQuery) score += 220;
  else if (primary.startsWith(`${normalizedQuery} `)) score += 180;
  else if (normalizedQuery.startsWith(primary) && primary.length >= 4) score += 150;

  if (simpleQuery) {
    if (isCompoundDishName(name)) score -= 250;
    if (isProcessedFoodName(name)) score -= 360;
    if (/\b(cru|crus|crua|cruas|in\s+natura)\b/i.test(name)) score += 90;
    if (!primary.includes(normalizedQuery) && normalizeFoodSearchQuery(name).includes(normalizedQuery)) {
      score -= 180;
    }
    const commaCount = (name.match(/,/g) || []).length;
    if (commaCount <= 1 && queryTokens.every((token) => primary.includes(token))) {
      score += 45;
    }
  }

  if (COMPLEX_DISH_PATTERN.test(name)) score -= 120;
  if (PREPARED_IN_NAME.test(name)) score -= 45;
  if (/industrializad/i.test(name)) score -= 25;

  const commaCount = (name.match(/,/g) || []).length;
  if (commaCount >= 4) score -= 50;
  else if (commaCount >= 2) score -= 20;
  else if (commaCount <= 1) score += 12;

  if (name.length > 90) score -= 35;

  const matchedCore = queryTokens.filter((token) => {
    const variants = expandTokenSynonyms(token);
    return variants.some(
      (variant) =>
        primary.includes(variant) ||
        (variant.length > 3 && primary.split(/\s+/).some((part) => part.startsWith(variant))),
    );
  }).length;

  score += matchedCore * 18;

  score += FOOD_SOURCE_SCORE_BOOST[source] ?? 0;

  if (source === "TBCA" && /\bin\s+natura\b/i.test(name)) score += 55;

  return score;
}

function scoreMacroPlausibility(
  foodName: string,
  group: SwapGroup,
  per100g: NormalizedPer100g,
  planContext?: string,
): number {
  const kcal = per100g.caloriesKcal;
  if (kcal <= 0) return -40;

  let score = 0;
  const freshContext = looksLikeFreshProduceLabel(planContext || foodName);

  if (group === "fruit") {
    if (isProcessedFoodName(foodName)) return -500;
    if (freshContext && kcal > 150 && !/desidratad|passa|polpa concentrada|geleia|compota/i.test(foodName)) {
      score -= 280;
    }
    if (freshContext && kcal >= 80 && kcal <= 145) score += 35;
    if (/\bin\s+natura\b/i.test(foodName)) score += 50;
  }

  if (group === "vegetable" && freshContext) {
    if (kcal > 200 && !/batata|mandioca|inhame|baroa|aipim/i.test(foodName)) score -= 180;
    if (kcal <= 120) score += 20;
  }

  if (group === "carb_rich" && freshContext && kcal > 250 && /cru|crua|in natura/i.test(foodName)) {
    score -= 120;
  }

  return score;
}

export function pickBestFoodForSwap(
  query: string,
  items: FoodItemDto[],
  options?: { expectedGroup?: SwapGroup; minScore?: number; originalName?: string },
): FoodItemDto | null {
  if (!items.length) return null;

  const minScore = options?.minScore ?? 40;
  let best: FoodItemDto | null = null;
  let bestScore = 0;

  for (const item of items) {
    const per100g = normalizePer100gMacros(item);
    const group = resolveSwapGroup({
      category: item.category,
      name: item.name,
      per100g,
    });

    if (options?.expectedGroup && group !== options.expectedGroup) {
      continue;
    }

    const score =
      scoreFoodForSwapMatch(query, item.name, item.source) +
      (options?.originalName ? scorePreparationSwapFit(options.originalName, item.name) : 0) +
      scoreMacroPlausibility(item.name, group, per100g, options?.originalName);

    const preferTbcaTieBreak =
      item.source === "TBCA"
      && best?.source === "TACO"
      && score >= bestScore - 25
      && (looksLikeFreshProduceLabel(options?.originalName || "") || isSimpleIngredientQuery(query));

    if (score > bestScore || preferTbcaTieBreak) {
      bestScore = Math.max(bestScore, score);
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
