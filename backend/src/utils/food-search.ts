export function normalizeFoodSearchQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "sem",
  "e",
  "ou",
  "a",
  "o",
  "c",
  "s",
]);

/** TBCA = fonte principal; TACO = complemento para itens básicos. */
export const FOOD_SOURCE_SCORE_BOOST: Record<"TACO" | "TBCA" | "CUSTOM", number> = {
  TBCA: 15,
  TACO: 0,
  CUSTOM: 25,
};

/** Termos coloquiais → formas comuns na TBCA/TACO */
const TOKEN_SYNONYMS: Record<string, string[]> = {
  branco: ["branco", "tipo 1", "polido"],
  preto: ["preto", "tipo 2"],
  vermelho: ["vermelho", "tipo 3", "roxo"],
  moido: ["moido", "moída", "moído", "moida"],
  grelhado: ["grelhado", "grelhada"],
  cozido: ["cozido", "cozida", "cozidos", "cozidas"],
  cru: ["cru", "crua", "crus", "cruas"],
  frito: ["frito", "frita", "fritos", "fritas"],
  // Termo comum no app, mas a TBCA/TACO nem sempre usa "whey" no nome.
  // Expandimos para termos que aparecem com mais frequência na base.
  whey: ["whey", "whey protein", "proteina", "proteico", "suplemento", "soro"],
  // Marcas frequentes → termos nas FoodOverride
  yopro: ["yopro", "yo pro", "danone yopro", "iogurte yopro"],
  growth: ["growth", "growth supplements", "whey growth"],
  max: ["max titanium", "max whey"],
  integralmedica: ["integralmedica", "integral medica"],
};

export function tokenizeFoodQuery(query: string): string[] {
  const normalized = normalizeFoodSearchQuery(query);
  if (!normalized) return [];

  const rawTokens = normalized
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return [...new Set(rawTokens)];
}

export function expandTokenSynonyms(token: string): string[] {
  const synonyms = TOKEN_SYNONYMS[token];
  if (!synonyms) return [token];
  return [...new Set([token, ...synonyms.map((entry) => normalizeFoodSearchQuery(entry))])];
}

export function scoreFoodSearchResult(query: string, name: string, source: "TACO" | "TBCA" | "CUSTOM"): number {
  const normalizedQuery = normalizeFoodSearchQuery(query);
  const normalizedName = normalizeFoodSearchQuery(name);
  const queryTokens = tokenizeFoodQuery(query);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 120;
  else if (normalizedName.startsWith(normalizedQuery)) score += 95;
  else if (normalizedQuery.startsWith(normalizedName)) score += 90;
  else if (normalizedName.includes(normalizedQuery)) {
    const primary = normalizeFoodSearchQuery(name.split(",")[0] || name);
    score += primary.includes(normalizedQuery) ? 80 : 20;
  }

  if (queryTokens.length) {
    const nameTokens = tokenizeFoodQuery(name);
    const matched = queryTokens.filter((token) => {
      const variants = expandTokenSynonyms(token);
      return variants.some(
        (variant) =>
          nameTokens.includes(variant) ||
          normalizedName.includes(variant) ||
          nameTokens.some((nameToken) => nameToken.includes(variant) || variant.includes(nameToken)),
      );
    }).length;
    score += Math.round((matched / queryTokens.length) * 70);
  }

  score += FOOD_SOURCE_SCORE_BOOST[source] ?? 0;

  if (name.length > 70) score -= 25;
  if (name.includes("Prato de comida")) score -= 40;
  if (name.includes("c/")) score -= 15;
  score -= Math.min(20, (name.match(/,/g) || []).length * 2);

  return score;
}

export function pickBestFoodMatch<T extends { name: string; source: "TACO" | "TBCA" | "CUSTOM" }>(
  query: string,
  items: T[],
  minScore = 45,
): T | null {
  if (!items.length) return null;

  let best: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const score = scoreFoodSearchResult(query, item.name, item.source);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= minScore ? best : null;
}
