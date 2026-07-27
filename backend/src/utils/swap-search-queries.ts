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
  if (/ac[eé]m|m[uú]sculo|muscular|alcatra|picanha|contrafil|cox[aã]o|lagarto|fil[eé] mignon/.test(lower)) {
    queries.add("carne bovina grelhado");
    queries.add("carne boi de primeira");
    queries.add("carne bovina alcatra");
  }
  if (/frango desfiado/.test(lower)) {
    queries.add("frango peito cozida");
    queries.add("carne frango peito sem pele cozida");
    queries.add("frango desfiado");
  } else if (/frango|peito de frango/.test(lower)) {
    queries.add("frango peito sem pele grelhado");
  }
  if (/molho de tomate|molho tomate/.test(lower)) {
    queries.add("molho tomate artesanal");
    queries.add("molho de tomate molho sugo");
  }
  if (/salada de folhas|mix de folhas/.test(lower)) {
    queries.add("salada de folhas");
    queries.add("alface crua");
  }
  if (/couve/.test(lower) && !/couve[\s-]?flor|couve[\s-]?rabano/.test(lower)) {
    queries.add("couve manteiga");
    queries.add("couve manteiga crua");
  }
  if (/tapioca/.test(lower)) {
    queries.add("tapioca sem manteiga sem recheio");
    queries.add("tapioca sem recheio");
  }
  if (/morango/.test(lower) && !/creme|biscoito|bolo/.test(lower)) {
    queries.add("morango in natura");
    queries.add("morango cru");
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
