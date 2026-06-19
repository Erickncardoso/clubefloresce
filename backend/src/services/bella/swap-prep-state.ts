const RAW_PATTERN = /\b(cru|crus|crua|cruas|in\s+natura)\b/i;

const PROCESSED_FOOD_PATTERN =
  /\b(doce\s+em\s+barra|em\s+barra|passas?|desidratad[oa]s?|chips|frit[oa]s?|empanad[oa]s?|industrializad[oa]s?|conserv[oa]s?|geleia|geléia|compota|extrato|nuggets|polpa\s+concentrada|farinh[ao]\s+de)\b/i;

const FRESH_PRODUCE_PORTION_PATTERN =
  /\b(unidade|unidades|fatia|fatias|\(\s*\d+\s*g\s*\))/i;

const COOKED_PATTERN =
  /\b(cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|refogad[oa]s?|frit[oa]s?|banho\s+mar[ií]a|desidratad[oa]s?)\b/i;

const PREPARED_DISH_PATTERN =
  /\b(sopa|caldo|mingau|pur[eê]|refogad|guisad|estofad|creme\s+de|molho|canja)\b/i;

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

export function looksLikeFreshProduceLabel(label: string): boolean {
  const text = label.trim();
  if (!text) return false;
  if (PREPARED_DISH_PATTERN.test(text)) return false;
  if (COOKED_PATTERN.test(text)) return false;
  if (PROCESSED_FOOD_PATTERN.test(text)) return false;
  return FRESH_PRODUCE_PORTION_PATTERN.test(text);
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
  let score = 0;

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
