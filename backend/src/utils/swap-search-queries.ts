/** Gera buscas TBCA/TACO a partir do nome do plano alimentar. */
import { tokenizeFoodQuery } from "./food-search";

export function buildSwapSearchQueries(rawName: string): string[] {
  const trimmed = rawName.trim();
  const simplified = trimmed
    .replace(/\d+\s*Colher(?:\(es\))?[^)]*(\([^)]+\))?/gi, "")
    .replace(/\(\d+\s*g\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const queries = new Set<string>();
  if (trimmed) queries.add(trimmed);
  if (simplified && simplified !== trimmed) queries.add(simplified);

  const lower = simplified.toLowerCase();

  if (/patinho/.test(lower)) {
    queries.add("carne bovina patinho grelhado");
    queries.add("carne bovina patinho");
  }
  if (/ac[eé]m|m[uú]sculo|muscular|alcatra|picanha|contrafil/.test(lower)) {
    queries.add("carne bovina grelhado");
  }
  if (/frango|peito de frango/.test(lower)) {
    queries.add("frango peito sem pele grelhado");
  }
  if (/arroz/.test(lower)) {
    queries.add("arroz tipo 1 cozido");
  }
  if (/batata doce/.test(lower)) {
    queries.add("batata doce cozida");
  }

  return [...queries];
}

const INGREDIENT_PREP_VARIANTS = [
  "in natura",
  "cozida",
  "cozido",
  "crua",
  "cru",
  "grelhada",
  "grelhado",
];

/** Variantes TBCA (e TACO) para busca de ingrediente simples (ex.: banana → banana in natura). */
export function buildIngredientSearchVariants(rawName: string): string[] {
  const tokens = tokenizeFoodQuery(rawName);
  if (tokens.length !== 1) return [];

  const base = tokens[0];
  return INGREDIENT_PREP_VARIANTS.map((prep) => `${base} ${prep}`);
}
