import { normalizeFoodSearchQuery } from "../../utils/food-search";
import { resolveSwapGroup } from "./food-category";

const RAW_PATTERN = /\b(cru|crus|crua|cruas|in\s+natura)\b/i;

/** Industrializado / doce / empanado — quase nunca é o item “simples” do plano. */
const PROCESSED_FOOD_PATTERN =
  /\b(doce\s+em\s+barra|em\s+barra|passas?|desidratad[oa]s?|chips|frit[oa]s?|empanad[oa]s?|industrializad[oa]s?|conserv[oa]s?|geleia|gel[eé]ia|compota|extrato|nuggets|polpa\s+concentrada|farinh[ao]\s+de|caramelad[oa]s?|milanesa|cristalizad|cobertura|calda|brigadeiro|chocolate)\b/i;

const HEAVILY_ALTERED_PATTERN =
  /\b(caramelad[oa]s?|doce\s+em\s+barra|milanesa|c\/\s*a[cç][uú]car|com\s+a[cç][uú]car|geleia|gel[eé]ia|compota|chips|passas?|desidratad[oa]s?|nuggets|empanad[oa]s?|fruta\s+cristaliz|calda|cobertura|brigadeiro)\b/i;

const FRESH_PRODUCE_PORTION_PATTERN =
  /\b(unidade|unidades|fatia|fatias|\(\s*\d+\s*g\s*\))/i;

const COOKED_PATTERN =
  /\b(cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|refogad[oa]s?|frit[oa]s?|banho\s+mar[ií]a|desidratad[oa]s?|caramelad[oa]s?)\b/i;

const PREPARED_DISH_PATTERN =
  /\b(sopa|caldo|mingau|pur[eê]|refogad|guisad|estofad|creme\s+de|molho|canja|papa\s+de|salada\s+de)\b/i;

/** Alimentos do plano que normalmente já vêm cozidos/grelhados (não “in natura”). */
const COOKED_STAPLE_PATTERN =
  /\b(arroz|feij[aã]o|lentilha|gr[aã]o[\s-]?de[\s-]?bico|macarr[aã]o|quinoa|cuscuz|polenta|ovo|frango|carne|peixe|patinho|alcatra|atum|til[aá]pia|merluza|batata|mandioca|inhame|aipim|pure|pur[eê]|cafe|cha)\b/i;

export type PrepState = "raw" | "cooked" | "unknown";

export function resolvePrepState(name: string): PrepState {
  const text = name.trim();
  if (!text) return "unknown";
  if (PREPARED_DISH_PATTERN.test(text)) return "cooked";
  if (PROCESSED_FOOD_PATTERN.test(text)) return "cooked";
  if (RAW_PATTERN.test(text)) return "raw";
  if (COOKED_PATTERN.test(text)) return "cooked";
  return "unknown";
}

export function isProcessedFoodName(name: string): boolean {
  return PROCESSED_FOOD_PATTERN.test(name.trim());
}

export function isHeavilyAlteredFoodName(name: string): boolean {
  return HEAVILY_ALTERED_PATTERN.test(name.trim());
}

export function looksLikeFreshProduceLabel(label: string): boolean {
  const text = label.trim();
  if (!text) return false;
  if (PREPARED_DISH_PATTERN.test(text)) return false;
  if (COOKED_PATTERN.test(text)) return false;
  if (PROCESSED_FOOD_PATTERN.test(text)) return false;
  return FRESH_PRODUCE_PORTION_PATTERN.test(text);
}

export function queryImpliesFreshDefault(query: string): boolean {
  const q = normalizeFoodSearchQuery(query);
  if (!q) return false;
  if (PREPARED_DISH_PATTERN.test(query)) return false;
  if (COOKED_STAPLE_PATTERN.test(q)) return false;
  if (COOKED_PATTERN.test(query) || HEAVILY_ALTERED_PATTERN.test(query)) return false;
  // Laticínios / queijos não são “in natura” de hortifruti
  if (/\b(queijo|requeijao|iogurte|leite|ricota|cream cheese)\b/.test(q)) return false;
  const group = resolveSwapGroup({ category: null, name: query, per100g: undefined });
  if (group === "fruit" || group === "vegetable") return true;
  if (looksLikeFreshProduceLabel(query)) return true;
  // Nome curto sem prep (ex.: "Banana", "Maçã", "Tomate")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length <= 2 && !COOKED_PATTERN.test(query)) {
    // Evita "maçã" virar macaúba só por token "maca"
    if (tokens[0] === "maca" || tokens[0] === "laranja" || tokens[0] === "banana") return true;
    return true;
  }
  return false;
}

export function queryRequestsAlteration(query: string): boolean {
  return (
    HEAVILY_ALTERED_PATTERN.test(query) ||
    /\b(doce|caramel|milanesa|chips|passa|desidrat|geleia|compota|a[cç][uú]car)\b/i.test(
      normalizeFoodSearchQuery(query),
    )
  );
}

/**
 * Pontua se o candidato respeita o “modo” do alimento no plano/diário.
 * Ex.: banana → in natura; peito grelhado → grelhado; nunca banana caramelada.
 */
export function scoreIngredientNaturalness(query: string, candidateName: string): number {
  const q = normalizeFoodSearchQuery(query);
  const n = normalizeFoodSearchQuery(candidateName);
  if (!q || !n) return -100;

  let score = 0;
  const wantsAlteration = queryRequestsAlteration(query);
  const freshDefault = queryImpliesFreshDefault(query);
  const qPrep = resolvePrepState(query);
  const cPrep = resolvePrepState(candidateName);
  const staple = COOKED_STAPLE_PATTERN.test(q);

  if (!wantsAlteration && isHeavilyAlteredFoodName(candidateName)) score -= 520;
  if (!wantsAlteration && isProcessedFoodName(candidateName)) score -= 380;

  // Maçã ≠ macaúba; laranja ≠ só casca
  if (/\bmaca\b/.test(q) && !/\bmacauba\b/.test(q) && /\bmacauba\b/.test(n)) score -= 600;
  if (/\bmaca\b/.test(q) && !/\bmacadamia\b/.test(q) && /\bmacadamia\b/.test(n)) score -= 600;
  if (/\blaranja\b/.test(q) && !/\bcasca\b/.test(q) && /\bcasca\b/.test(n) && !/\bpolpa|suco|in natura\b/.test(n)) {
    score -= 450;
  }
  if (/\b(fruta|banana|maca|mamao|laranja|uva|morango|pera|abacaxi|manga)\b/.test(q) && /\bcasca\b/.test(n) && !/\bcasca\b/.test(q)) {
    score -= 400;
  }

  if (freshDefault) {
    if (RAW_PATTERN.test(candidateName)) score += 140;
    if (/\bin\s+natura\b/i.test(candidateName)) score += 160;
    if (!staple && cPrep === "cooked" && !RAW_PATTERN.test(candidateName)) score -= 320;
    if (isCompoundLookingDish(candidateName)) score -= 200;
  }

  // Prep explícita no query deve casar
  if (/\bcozid/.test(q) && /\bcozid/.test(n)) score += 110;
  if (/\bgrelhad/.test(q) && /\bgrelhad/.test(n)) score += 110;
  if (/\bassad/.test(q) && /\bassad/.test(n)) score += 110;
  if (/\bfrit/.test(q) && /\bfrit/.test(n)) score += 90;
  if (/\bcru/.test(q) && RAW_PATTERN.test(candidateName)) score += 120;

  if (qPrep === "cooked" && cPrep === "raw") score -= 200;
  if (qPrep === "cooked" && cPrep === "cooked") score += 40;

  if (staple && /\bcozid|grelhad|assad/.test(n) && !isHeavilyAlteredFoodName(candidateName)) {
    score += 50;
  }

  return score;
}

function isCompoundLookingDish(name: string): boolean {
  const commaCount = (name.match(/,/g) || []).length;
  if (commaCount >= 3) return true;
  if (PREPARED_DISH_PATTERN.test(name)) return true;
  if (/\bc\/\s*(a[cç][uú]car|manteiga|chocolate|farinha|ovo)\b/i.test(name)) return true;
  return false;
}

/** Bloqueio duro: candidato impossível para o texto do plano/diário. */
export function isAlteredFoodMismatch(query: string, candidateName: string): boolean {
  if (!query?.trim() || !candidateName?.trim()) return true;
  if (queryRequestsAlteration(query)) return false;

  const q = normalizeFoodSearchQuery(query);
  const n = normalizeFoodSearchQuery(candidateName);

  if (/\bmaca\b/.test(q) && !/\bmacauba\b/.test(q) && /\bmacauba\b/.test(n)) return true;
  if (/\bmaca\b/.test(q) && !/\bmacadamia\b/.test(q) && /\bmacadamia\b/.test(n)) return true;

  // "Pera" ≠ "Laranja, Pera"; o núcleo do nome TBCA deve bater com o pedido
  if (queryImpliesFreshDefault(query)) {
    const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
    const primary = normalizeFoodSearchQuery((candidateName.split(",")[0] || candidateName).trim());
    if (tokens.length >= 1 && tokens.length <= 2 && !tokens.some((t) => primary.includes(t))) {
      return true;
    }
  }
  if (
    /\b(banana|maca|mamao|laranja|uva|morango|pera|abacaxi|manga|tomate|alface)\b/.test(q) &&
    /\bcasca\b/.test(n) &&
    !/\bcasca\b/.test(q) &&
    !/\bpolpa|c\/ casca|com casca\b/.test(n)
  ) {
    return true;
  }

  if (isHeavilyAlteredFoodName(candidateName) && queryImpliesFreshDefault(query)) return true;
  if (
    queryImpliesFreshDefault(query) &&
    /\b(caramel|c\/\s*a[cç][uú]car|com\s+a[cç][uú]car|doce em barra|milanesa)\b/i.test(candidateName)
  ) {
    return true;
  }
  return false;
}

export function isPreparationSwapAllowed(originalName: string, substituteName: string): boolean {
  const originalPrep = resolvePrepState(originalName);
  const substitutePrep = resolvePrepState(substituteName);

  if (originalPrep === "cooked" && substitutePrep === "raw") return false;
  if (PREPARED_DISH_PATTERN.test(originalName) && substitutePrep === "raw") return false;

  return true;
}

export function scorePreparationSwapFit(originalName: string, substituteName: string): number {
  const originalPrep = resolvePrepState(originalName);
  const substitutePrep = resolvePrepState(substituteName);
  let score = scoreIngredientNaturalness(originalName, substituteName);

  if (originalPrep === "cooked" && substitutePrep === "cooked") score += 70;
  if (originalPrep === "cooked" && substitutePrep === "raw") score -= 250;
  if (PREPARED_DISH_PATTERN.test(originalName) && substitutePrep === "cooked") score += 40;
  if (PREPARED_DISH_PATTERN.test(originalName) && substitutePrep === "raw") score -= 300;

  if (originalPrep === "raw" && substitutePrep === "raw") score += 20;
  if (originalPrep === "unknown" && substitutePrep === "cooked") score += 15;

  if (looksLikeFreshProduceLabel(originalName)) {
    if (RAW_PATTERN.test(substituteName)) score += 90;
    if (/\bin\s+natura\b/i.test(substituteName)) score += 110;
    if (isProcessedFoodName(substituteName)) score -= 500;
  }

  return score;
}

export function buildPrepSwapRejection(originalName: string, substituteName: string): string {
  return (
    `**${substituteName.trim()}** não combina com **${originalName.trim()}**.\n\n` +
    "Para pratos preparados (sopa, cozidos, refogados), escolha substitutos **cozidos ou prontos para comer** — não ingredientes crus."
  );
}
