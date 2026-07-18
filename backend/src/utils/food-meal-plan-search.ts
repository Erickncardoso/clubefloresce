import { getFoodDisplayName, getFoodSearchAliasText } from "./food-catalog-aliases";
import {
  normalizeFoodSearchQuery,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
} from "./food-search";

const COMPOUND_DISH =
  /sandu[ií]che|sandwich|benedit|misto quente|hamb[uú]rguer|hot dog|pizza|lasanha|bolo\b|torta\b|estrogonofe|feijoada|prato de|salada de/i;

const BREAD_VARIANT_MARKERS = [
  "milho",
  "integral",
  "centeio",
  "aveia",
  "soja",
  "light",
  "diet",
  "fibras",
  "preto",
  "multigraos",
  "multigrãos",
];

function isSimpleBreadFormQuery(queryTokens: string[]): boolean {
  return queryTokens.length >= 2 && queryTokens.includes("pao") && queryTokens.includes("forma");
}

export function scoreFoodForMealPlanSearch(
  query: string,
  name: string,
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode = "",
): number {
  let score = scoreFoodSearchResult(query, name, source);
  const normalizedQuery = normalizeFoodSearchQuery(query);
  const queryTokens = tokenizeFoodQuery(query);
  const normalizedName = normalizeFoodSearchQuery(name);
  const primary = normalizeFoodSearchQuery(name.split(",")[0] || name);
  const aliasText = getFoodSearchAliasText(source, sourceCode);
  const displayName = getFoodDisplayName(name, source, sourceCode);
  const normalizedDisplay = normalizeFoodSearchQuery(displayName);

  if (normalizedDisplay === normalizedQuery) score += 220;
  else if (normalizedQuery.startsWith(normalizedDisplay) && normalizedDisplay.length >= 8) {
    score += 120;
  }

  if (aliasText && normalizedQuery) {
    if (aliasText.includes(normalizedQuery)) score += 280;
    const aliasTokens = tokenizeFoodQuery(aliasText);
    const aliasHits = queryTokens.filter((token) => aliasTokens.includes(token)).length;
    if (aliasHits === queryTokens.length && queryTokens.length > 0) score += 110;
  }

  if (isSimpleBreadFormQuery(queryTokens)) {
    for (const marker of BREAD_VARIANT_MARKERS) {
      if (normalizedName.includes(marker) && !normalizedQuery.includes(marker)) {
        score -= 70;
      }
    }
  }

  if (COMPOUND_DISH.test(name)) score -= 220;
  if (/\([^)]{18,}\)/.test(name)) score -= 70;

  const commaCount = (name.match(/,/g) || []).length;
  if (commaCount >= 4) score -= 55;
  else if (commaCount >= 3) score -= 30;
  else if (commaCount <= 1) score += 18;

  if (queryTokens.includes("pao") && queryTokens.includes("forma")) {
    if (/^pao\b/.test(normalizedName) && /\bforma\b/.test(normalizedName) && !COMPOUND_DISH.test(name)) {
      score += 95;
    }
    if (source === "TBCA" && /\bforma\b/.test(normalizedName) && !/sanduiche|sandwich/i.test(normalizedName)) {
      score += 35;
    }
  }

  if (primary === normalizedQuery) score += 80;
  else if (queryTokens.length >= 2 && queryTokens.every((token) => primary.includes(token))) {
    score += 55;
  }

  if (normalizedName.includes(normalizedQuery) && !COMPOUND_DISH.test(name)) {
    score += 25;
  }

  return score;
}
