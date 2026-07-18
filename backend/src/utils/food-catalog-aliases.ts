/** Nomes amigáveis (estilo Dietbox) para itens canônicos da TBCA/TACO. */
export const FOOD_CANONICAL_LABELS: Record<string, string> = {
  BRC0145A: "Pão de forma",
  BRC0003A: "Pão de forma tradicional",
  BRC0155A: "Pão de forma integral",
  BRC0146A: "Pão de forma de milho",
  BRC0157A: "Pão de forma trigo/centeio",
  BRC0086N: "Pão de forma com fibras",
  BRC0150A: "Pão de forma fonte de fibra",
  BRC0151A: "Pão de forma aveia e soja",
  "TACO:50": "Pão de forma sem glúten",
  "TACO:49": "Pão de forma de milho",
  "TACO:48": "Pão de forma integral",
  "TACO:47": "Pão de forma aveia",
};

/** Termos extras indexados na busca (além do nome TBCA). */
export const FOOD_SEARCH_ALIASES: Record<string, string[]> = {
  BRC0145A: ["pao de forma", "pao forma", "pao de forma sem gluten"],
  BRC0003A: ["pao de forma tradicional", "pao forma tradicional"],
  BRC0155A: ["pao de forma integral", "pao integral forma"],
  BRC0146A: ["pao de forma milho", "pao forma milho"],
  BRC0157A: ["pao de forma centeio"],
  "TACO:50": ["pao de forma sem gluten", "pao forma sem gluten"],
  "TACO:48": ["pao de forma integral", "pao integral forma"],
};

export function foodCatalogKey(source: string, sourceCode: string): string {
  return source === "TACO" ? `TACO:${sourceCode}` : sourceCode;
}

export function getFoodDisplayName(
  name: string,
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode: string,
): string {
  if (source === "CUSTOM") return name;
  const key = foodCatalogKey(source, sourceCode);
  return FOOD_CANONICAL_LABELS[key] || name;
}

export function getFoodSearchAliasText(
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode: string,
): string {
  const key = foodCatalogKey(source, sourceCode);
  const aliases = FOOD_SEARCH_ALIASES[key] || FOOD_SEARCH_ALIASES[sourceCode] || [];
  return aliases.join(" ");
}
