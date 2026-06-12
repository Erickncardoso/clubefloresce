/** Gera buscas TACO/TBCA a partir do nome do plano alimentar. */
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
