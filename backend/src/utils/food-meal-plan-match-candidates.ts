const BRAND_SUFFIX = /\(\s*marca\s*:[^)]*\)/gi;
const PAREN_NOTE = /\([^)]{3,}\)/g;

/** Gera candidatos de busca a partir de nomes compostos do Dietbox (/, ou, +). */
export function extractFoodMatchCandidates(rawName: string): string[] {
  let name = String(rawName || "").trim();
  if (!name) return [];

  name = name
    .replace(BRAND_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();

  const candidates: string[] = [];

  const push = (value: string) => {
    const cleaned = String(value || "")
      .trim()
      .replace(/^[-–—]\s*/, "")
      .replace(PAREN_NOTE, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 3 && !candidates.includes(cleaned)) {
      candidates.push(cleaned);
    }
  };

  push(name);

  const simplified = name.replace(/[/|+]/g, " ").replace(/\s+/g, " ").trim();
  push(simplified);

  for (const altPart of name.split(/\s+ou\s+/i)) {
    for (const slashPart of altPart.split(/[/|+]/)) {
      push(slashPart);
    }
  }

  // Frases curtas costumam casar melhor (ex.: "Hortelã" em vez da linha inteira do chá)
  const sorted = [...candidates].sort((a, b) => a.length - b.length);
  return sorted;
}
